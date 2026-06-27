import { FIRE_AI_MODEL, FIRE_AI_TITLE_MODEL } from "@/lib/fire-nepal-ai/system-prompt";

export type OpenAiChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const OPENAI_BASE = "https://api.openai.com/v1";
const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 2;

function getOpenAiApiKey(): string {
  const key = (process.env.OPENAI_API_KEY ?? "").trim();
  if (!key) throw new Error("OpenAI is not configured");
  return key;
}

export function isOpenAiConfigured(): boolean {
  return (process.env.OPENAI_API_KEY ?? "").trim().length > 10;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function openAiFetch(path: string, body: unknown, timeoutMs?: number): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(
        `${OPENAI_BASE}${path}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getOpenAiApiKey()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
        timeoutMs,
      );

      if (res.ok || res.status < 500) return res;

      lastError = new Error(`OpenAI HTTP ${res.status}`);
      if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    } catch (e) {
      lastError = e instanceof Error ? e : new Error("OpenAI request failed");
      if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }

  throw lastError ?? new Error("OpenAI request failed");
}

export type StreamChunkHandler = (delta: string) => void;

/** Stream a chat completion; calls onDelta for each content token. */
export async function streamOpenAiChatCompletion(
  messages: OpenAiChatMessage[],
  onDelta: StreamChunkHandler,
  externalSignal?: AbortSignal,
): Promise<string> {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  externalSignal?.addEventListener("abort", onAbort);

  let res: Response;
  try {
    res = await fetchWithTimeout(
      `${OPENAI_BASE}/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getOpenAiApiKey()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: FIRE_AI_MODEL,
          messages,
          stream: true,
          temperature: 0.7,
          max_tokens: 2048,
        }),
        signal: controller.signal,
      },
      DEFAULT_TIMEOUT_MS,
    );
  } finally {
    externalSignal?.removeEventListener("abort", onAbort);
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(parseOpenAiError(res.status, errText));
  }

  if (!res.body) throw new Error("No response stream from OpenAI");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = "";
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;
        const payload = trimmed.slice(6);
        if (payload === "[DONE]") continue;

        try {
          const parsed = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const delta = parsed.choices?.[0]?.delta?.content ?? "";
          if (delta) {
            fullContent += delta;
            onDelta(delta);
          }
        } catch {
          /* skip malformed SSE chunks */
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullContent;
}

/** Generate a short conversation title from the first exchange. */
export async function generateConversationTitle(
  userMessage: string,
  assistantReply: string,
): Promise<string> {
  try {
    const res = await openAiFetch(
      "/chat/completions",
      {
        model: FIRE_AI_TITLE_MODEL,
        messages: [
          {
            role: "system",
            content:
              "Generate a short conversation title (max 6 words) based on the user's question. Reply with ONLY the title, no quotes. Match the language of the user's message (Nepali or English).",
          },
          {
            role: "user",
            content: `User: ${userMessage.slice(0, 200)}\nAssistant: ${assistantReply.slice(0, 200)}`,
          },
        ],
        temperature: 0.5,
        max_tokens: 30,
      },
      15_000,
    );

    if (!res.ok) return fallbackTitle(userMessage);

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const title = json.choices?.[0]?.message?.content?.trim();
    return title && title.length > 0 ? title.slice(0, 80) : fallbackTitle(userMessage);
  } catch {
    return fallbackTitle(userMessage);
  }
}

function fallbackTitle(userMessage: string): string {
  const trimmed = userMessage.trim();
  if (trimmed.length <= 48) return trimmed || "New conversation";
  return `${trimmed.slice(0, 45)}…`;
}

function parseOpenAiError(status: number, body: string): string {
  try {
    const j = JSON.parse(body) as { error?: { message?: string } };
    if (j.error?.message) return j.error.message;
  } catch {
    /* ignore */
  }
  if (status === 401) return "OpenAI authentication failed";
  if (status === 429) return "AI is busy — please try again in a moment";
  return `AI service error (${status})`;
}
