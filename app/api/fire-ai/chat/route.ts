import type { NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { buildFireAiUserContext } from "@/lib/fire-nepal-ai/context-builder";
import { truncatePreview } from "@/lib/fire-nepal-ai/db-mapper";
import { isOpenAiConfigured, streamOpenAiChatCompletion } from "@/lib/fire-nepal-ai/openai";
import { buildFireAiSystemPrompt } from "@/lib/fire-nepal-ai/system-prompt";
import type { OpenAiChatMessage } from "@/lib/fire-nepal-ai/openai";
import { formatFireAiDbError } from "@/services/fire-ai-conversations";
import {
  FireAiQuotaExceededError,
  assertFireAiQuota,
  estimateOpenAiCostUsd,
  recordFireAiUsage,
} from "@/services/fire-ai-usage";

export const runtime = "nodejs";

function sse(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

type ChatBody = {
  conversationId?: string;
  message?: string;
  regenerate?: boolean;
};

function fallbackConversationTitle(userMessage: string): string {
  const trimmed = userMessage.trim();
  if (!trimmed) return "New conversation";
  return trimmed.length <= 48 ? trimmed : `${trimmed.slice(0, 45)}…`;
}

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return Response.json({ ok: false, error: "Supabase is not configured" }, { status: 503 });
  }
  if (!isOpenAiConfigured()) {
    return Response.json({ ok: false, error: "OpenAI is not configured" }, { status: 503 });
  }

  const rate = checkRateLimit(req, { windowMs: 60_000, max: 30, keyPrefix: "fire-ai-chat" });
  if (!rate.ok) {
    return Response.json(
      { ok: false, error: `Rate limit exceeded. Retry in ${rate.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const body = raw as ChatBody;
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const regenerate = Boolean(body.regenerate);
  const conversationIdInput = typeof body.conversationId === "string" ? body.conversationId.trim() : "";

  if (!message && !regenerate) {
    return Response.json({ ok: false, error: "Message is required" }, { status: 400 });
  }
  if (message.length > 8000) {
    return Response.json({ ok: false, error: "Message is too long" }, { status: 400 });
  }

  const sb = await createServerSupabaseClient();
  const { data: authData } = await sb.auth.getUser();
  const user = authData.user;
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let quota;
  try {
    quota = await assertFireAiQuota(user.id);
  } catch (e) {
    if (e instanceof FireAiQuotaExceededError) {
      return Response.json(
        {
          ok: false,
          code: "AI_QUOTA_EXCEEDED",
          error: "AI usage limit reached",
          quota: e.quota,
        },
        { status: 402 },
      );
    }
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "Usage check failed" }, { status: 500 });
  }

  const abortSignal = req.signal;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: unknown) => {
        if (abortSignal.aborted) return;
        controller.enqueue(encoder.encode(sse(event)));
      };

      try {
        let conversationId = conversationIdInput;

        if (conversationId) {
          const { data: existing } = await sb
            .from("fire_ai_conversations")
            .select("id")
            .eq("id", conversationId)
            .eq("user_id", user.id)
            .maybeSingle();
          if (!existing) {
            send({ type: "error", message: "Conversation not found" });
            controller.close();
            return;
          }
        } else {
          const { data: created, error: createErr } = await sb
            .from("fire_ai_conversations")
            .insert({ user_id: user.id, title: "New conversation", preview: "" })
            .select("id")
            .single();
          if (createErr || !created) {
            send({ type: "error", message: formatFireAiDbError(createErr?.message ?? "Failed to create conversation") });
            controller.close();
            return;
          }
          conversationId = created.id;
        }

        send({ type: "conversation", conversationId });

        const { data: historyRows, error: histErr } = await sb
          .from("fire_ai_messages")
          .select("id, role, content")
          .eq("conversation_id", conversationId)
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (histErr) {
          send({ type: "error", message: formatFireAiDbError(histErr.message) });
          controller.close();
          return;
        }

        const history = historyRows ?? [];
        let userMessageContent = message;
        let messagesForOpenAi: OpenAiChatMessage[] = [];

        if (regenerate) {
          const lastAssistantIdx = [...history].reverse().findIndex((m) => m.role === "assistant");
          if (lastAssistantIdx < 0) {
            send({ type: "error", message: "Nothing to regenerate" });
            controller.close();
            return;
          }
          const cutFrom = history.length - 1 - lastAssistantIdx;
          const lastUser = [...history.slice(0, cutFrom)].reverse().find((m) => m.role === "user");
          if (!lastUser) {
            send({ type: "error", message: "No user message to regenerate from" });
            controller.close();
            return;
          }
          userMessageContent = lastUser.content;

          const lastAssistant = history[cutFrom];
          await sb.from("fire_ai_messages").delete().eq("id", lastAssistant.id).eq("user_id", user.id);

          messagesForOpenAi = history
            .slice(0, cutFrom)
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
        } else {
          const { data: userRow, error: userInsertErr } = await sb
            .from("fire_ai_messages")
            .insert({
              conversation_id: conversationId,
              user_id: user.id,
              role: "user",
              content: userMessageContent,
            })
            .select("id")
            .single();

          if (userInsertErr || !userRow) {
            send({ type: "error", message: formatFireAiDbError(userInsertErr?.message ?? "Failed to save message") });
            controller.close();
            return;
          }

          send({ type: "message", messageId: userRow.id, role: "user" });

          messagesForOpenAi = [
            ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
            { role: "user" as const, content: userMessageContent },
          ];
        }

        const contextBlock = await buildFireAiUserContext(user.id);
        const systemPrompt = buildFireAiSystemPrompt(contextBlock);

        const { data: assistantRow, error: asstInsertErr } = await sb
          .from("fire_ai_messages")
          .insert({
            conversation_id: conversationId,
            user_id: user.id,
            role: "assistant",
            content: "",
          })
          .select("id")
          .single();

        if (asstInsertErr || !assistantRow) {
          send({ type: "error", message: formatFireAiDbError(asstInsertErr?.message ?? "Failed to create assistant message") });
          controller.close();
          return;
        }

        send({ type: "message", messageId: assistantRow.id, role: "assistant" });

        let fullContent = "";
        let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
        let model = "gpt-4o-mini";
        const responseStartedAt = Date.now();
        try {
          const result = await streamOpenAiChatCompletion(
            [{ role: "system", content: systemPrompt }, ...messagesForOpenAi],
            (delta) => {
              send({ type: "delta", content: delta });
            },
            abortSignal,
          );
          fullContent = result.content;
          usage = result.usage;
          model = result.model;
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : "AI generation failed";
          await sb.from("fire_ai_messages").delete().eq("id", assistantRow.id);
          send({ type: "error", message: errMsg });
          controller.close();
          return;
        }

        if (abortSignal.aborted) {
          if (fullContent.trim()) {
            await sb.from("fire_ai_messages").update({ content: fullContent }).eq("id", assistantRow.id);
          } else {
            await sb.from("fire_ai_messages").delete().eq("id", assistantRow.id);
          }
          controller.close();
          return;
        }

        const preview = truncatePreview(fullContent || userMessageContent);
        let title: string | undefined;

        const isFirstExchange = history.length === 0 && !regenerate;

        if (isFirstExchange && userMessageContent) {
          title = fallbackConversationTitle(userMessageContent);
          send({ type: "title", title });
        }

        await sb
          .from("fire_ai_messages")
          .update({ content: fullContent })
          .eq("id", assistantRow.id);

        await sb
          .from("fire_ai_conversations")
          .update({
            preview,
            updated_at: new Date().toISOString(),
            ...(title ? { title } : {}),
          })
          .eq("id", conversationId)
          .eq("user_id", user.id);

        const updatedQuota = await recordFireAiUsage({
          userId: user.id,
          conversationId,
          model,
          membershipPlan: quota.plan,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
          estimatedCost: estimateOpenAiCostUsd(model, usage.promptTokens, usage.completionTokens),
          responseTimeMs: Date.now() - responseStartedAt,
        });

        send({ type: "quota", quota: updatedQuota });
        send({ type: "done", assistantMessageId: assistantRow.id, content: fullContent });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (e) {
        send({ type: "error", message: e instanceof Error ? e.message : "Server error" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
