"use client";

import Link from "next/link";
import { Bot, Loader2, Mic, MicOff, SendHorizontal, Sparkles, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useHomepageLanguage } from "@/contexts/HomepageLanguageContext";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import {
  FireAiQuotaError,
  createOptimisticUserMessage,
  createStreamingAssistantMessage,
  streamFireAiChat,
} from "@/lib/fire-nepal-ai/conversation-api";
import type { FireAiChatMessage } from "@/lib/fire-nepal-ai/types";
import { useUnifiedFireSummary } from "@/lib/fire-nepal/use-unified-fire-summary";
import {
  HOMEPAGE_AI_LANGUAGE_OPTIONS,
  getHomepageFireAiCopy,
} from "@/lib/homepage/homepage-fire-ai-copy";
import {
  buildHomepageFireAiLocalResponse,
  buildHomepageFireSnapshot,
  withLanguageDirective,
} from "@/lib/homepage/homepage-fire-ai-local";
import {
  deriveVoiceUiState,
  getSpeechRecognitionConstructor,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  languageToSpeechRecognitionLocale,
  languageToSpeechSynthesisLocales,
  pickSynthesisVoice,
  stripMarkdownForSpeech,
  voiceStateLabel,
  type FireAiSpeechRecognitionLike,
  type FireAiVoiceUiState,
} from "@/lib/homepage/homepage-fire-ai-voice";
import type { LanguageCode } from "@/lib/i18n/homepage-translations";

function HomepageAiMarkdown({ content }: { content: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed text-slate-700 [&_strong]:font-black [&_strong]:text-emerald-950">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h3 className="mb-1.5 mt-2 text-base font-black text-emerald-950 first:mt-0">{children}</h3>
          ),
          h2: ({ children }) => (
            <h4 className="mb-1.5 mt-2 text-sm font-black text-emerald-950 first:mt-0">{children}</h4>
          ),
          h3: ({ children }) => (
            <h5 className="mb-1 mt-2 text-sm font-bold text-emerald-900 first:mt-0">{children}</h5>
          ),
          p: ({ children }) => <p className="text-sm leading-relaxed text-slate-700">{children}</p>,
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-4 text-sm text-slate-700">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-4 text-sm text-slate-700">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          a: ({ href, children }) => (
            <a
              href={href}
              className="font-bold text-emerald-700 underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function formatSnapshotNpr(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  const abs = Math.abs(amount);
  if (abs >= 10_000_000) return `NPR ${(amount / 10_000_000).toFixed(amount % 10_000_000 === 0 ? 0 : 1)} Cr`;
  if (abs >= 100_000) return `NPR ${(amount / 100_000).toFixed(amount % 100_000 === 0 ? 0 : 1)} Lakh`;
  try {
    return `NPR ${Math.round(amount).toLocaleString("en-NP")}`;
  } catch {
    return `NPR ${Math.round(amount).toLocaleString("en-US")}`;
  }
}

function formatYears(years: number, suffix: string): string {
  if (years <= 0) return "Now";
  const rounded = years < 1 ? years.toFixed(1) : String(Math.round(years * 10) / 10);
  return `${rounded} ${suffix}`;
}

/**
 * Homepage AI Financial Advisor / FIRE Bot — upgraded in place.
 * Preserves section placement; wires live summary + optional FIRE AI chat API.
 */
export function HomepageFireAiAdvisor() {
  const { language, setLanguage } = useHomepageLanguage();
  const copy = useMemo(() => getHomepageFireAiCopy(language), [language]);
  const { user, loading: authLoading } = useProductAuth();
  const { summary } = useUnifiedFireSummary();
  const snapshot = useMemo(() => buildHomepageFireSnapshot(summary), [summary]);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<FireAiChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [recognitionSupported, setRecognitionSupported] = useState(false);
  const [synthesisSupported, setSynthesisSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceHint, setVoiceHint] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const responseRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<FireAiSpeechRecognitionLike | null>(null);
  const autoSpeakAfterReplyRef = useRef(false);
  const speakRequestIdRef = useRef(0);

  const voiceUiState: FireAiVoiceUiState = deriveVoiceUiState({
    recognitionSupported,
    isListening,
    isProcessing: isGenerating,
    isSpeaking,
  });
  const voiceStatusText = voiceStateLabel(voiceUiState, {
    listening: copy.listening,
    processing: copy.processing,
    speaking: copy.speaking,
  });

  useEffect(() => {
    setRecognitionSupported(isSpeechRecognitionSupported());
    setSynthesisSupported(isSpeechSynthesisSupported());
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      responseRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [messages, isGenerating]);

  const stopSpeaking = useCallback(() => {
    speakRequestIdRef.current += 1;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const speakText = useCallback(
    (raw: string) => {
      if (!isSpeechSynthesisSupported() || typeof window === "undefined") return;
      const plain = stripMarkdownForSpeech(raw);
      if (!plain) return;

      stopSpeaking();
      const requestId = speakRequestIdRef.current;
      const utter = new SpeechSynthesisUtterance(plain);
      const locales = languageToSpeechSynthesisLocales(language);
      utter.lang = locales[0] ?? languageToSpeechRecognitionLocale(language);
      const voice = pickSynthesisVoice(window.speechSynthesis.getVoices(), locales);
      if (voice) utter.voice = voice as SpeechSynthesisVoice;

      utter.onstart = () => {
        if (speakRequestIdRef.current === requestId) setIsSpeaking(true);
      };
      utter.onend = () => {
        if (speakRequestIdRef.current === requestId) setIsSpeaking(false);
      };
      utter.onerror = () => {
        if (speakRequestIdRef.current === requestId) setIsSpeaking(false);
      };
      window.speechSynthesis.speak(utter);
    },
    [language, stopSpeaking],
  );

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  useEffect(() => {
    // Stop in-flight voice when language changes so locale stays consistent.
    stopListening();
    stopSpeaking();
  }, [language, stopListening, stopSpeaking]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        /* ignore */
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const applyLocalResponse = useCallback(
    (prompt: string) => {
      const userMsg = createOptimisticUserMessage(prompt);
      const assistantMsg = createStreamingAssistantMessage();
      const content = buildHomepageFireAiLocalResponse(prompt, summary, language);
      setMessages([userMsg, { ...assistantMsg, content, status: "complete" }]);
      setIsGenerating(false);
      if (autoSpeakAfterReplyRef.current) {
        autoSpeakAfterReplyRef.current = false;
        window.setTimeout(() => speakText(content), 120);
      }
    },
    [summary, language, speakText],
  );

  const sendMessage = useCallback(
    async (raw: string, opts?: { fromVoice?: boolean }) => {
      const trimmed = raw.trim();
      if (!trimmed || isGenerating || isListening) return;

      setError(null);
      setVoiceHint(null);
      setInput("");
      setIsGenerating(true);
      stopSpeaking();
      if (opts?.fromVoice) autoSpeakAfterReplyRef.current = true;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      // Guests / still-loading auth: educational local engine only (real summary data).
      if (authLoading || !user) {
        window.setTimeout(() => applyLocalResponse(trimmed), 280);
        return;
      }

      const userMsg = createOptimisticUserMessage(trimmed);
      const assistantMsg = createStreamingAssistantMessage();
      let assistantLocalId = assistantMsg.id;
      setMessages((prev) => [...prev, userMsg, assistantMsg]);

      let activeConvId = conversationId;
      let finalContent = "";

      try {
        await streamFireAiChat({
          conversationId: activeConvId,
          message: withLanguageDirective(trimmed, language),
          signal: controller.signal,
          onEvent: (event) => {
            if (event.type === "conversation") {
              activeConvId = event.conversationId;
              setConversationId(event.conversationId);
            } else if (event.type === "message" && event.role === "assistant") {
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantLocalId ? { ...m, id: event.messageId } : m)),
              );
              assistantLocalId = event.messageId;
            } else if (event.type === "delta") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantLocalId
                    ? { ...m, content: m.content + event.content, status: "streaming" }
                    : m,
                ),
              );
            } else if (event.type === "done") {
              finalContent = event.content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantLocalId
                    ? {
                        ...m,
                        id: event.assistantMessageId,
                        content: event.content,
                        status: "complete",
                      }
                    : m,
                ),
              );
            } else if (event.type === "error") {
              setError(event.message);
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantLocalId ? { ...m, status: "failed", content: "" } : m)),
              );
            }
          },
        });
        if (autoSpeakAfterReplyRef.current && finalContent) {
          autoSpeakAfterReplyRef.current = false;
          speakText(finalContent);
        } else {
          autoSpeakAfterReplyRef.current = false;
        }
      } catch (e) {
        if (controller.signal.aborted) return;
        setError(copy.errorTitle);
        const content = buildHomepageFireAiLocalResponse(trimmed, summary, language);
        setMessages([userMsg, { ...createStreamingAssistantMessage(), content, status: "complete" }]);
        if (autoSpeakAfterReplyRef.current) {
          autoSpeakAfterReplyRef.current = false;
          speakText(content);
        }
        if (!(e instanceof FireAiQuotaError)) {
          /* soft error already set */
        }
      } finally {
        setIsGenerating(false);
        abortRef.current = null;
      }
    },
    [
      isGenerating,
      isListening,
      authLoading,
      user,
      conversationId,
      language,
      applyLocalResponse,
      copy.errorTitle,
      summary,
      stopSpeaking,
      speakText,
    ],
  );

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionConstructor();
    if (!Ctor) {
      setVoiceHint(copy.voiceUnsupported);
      return;
    }
    if (isGenerating || isListening) return;

    stopSpeaking();
    setVoiceHint(null);
    setError(null);

    const recognition = new Ctor();
    recognition.lang = languageToSpeechRecognitionLocale(language);
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim() ?? "";
      setIsListening(false);
      recognitionRef.current = null;
      if (!transcript) return;
      setInput(transcript);
      void sendMessage(transcript, { fromVoice: true });
    };
    recognition.onerror = (event) => {
      setIsListening(false);
      recognitionRef.current = null;
      const errName = (event as Event & { error?: string }).error;
      if (errName === "not-allowed" || errName === "service-not-allowed") {
        setVoiceHint(copy.voicePermissionDenied);
      } else if (errName !== "aborted" && errName !== "no-speech") {
        setVoiceHint(copy.voiceUnsupported);
      }
    };
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setIsListening(false);
      recognitionRef.current = null;
      setVoiceHint(copy.voiceUnsupported);
    }
  }, [
    copy.voiceUnsupported,
    copy.voicePermissionDenied,
    isGenerating,
    isListening,
    language,
    sendMessage,
    stopSpeaking,
  ]);

  const onAsk = (e: FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant" && m.content);
  const showEmpty = messages.length === 0 && !isGenerating && !error && !isListening;
  const botStatus =
    voiceStatusText ??
    (isGenerating ? copy.statusThinking : copy.statusOnline);

  return (
    <section
      id="ai-financial-advisor"
      aria-labelledby="homepage-ai-advisor-heading"
      className="dark-glass-card relative mt-8 overflow-x-clip overflow-hidden rounded-[2rem] p-5 text-white sm:p-6 md:p-8"
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-emerald-400/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-40 w-40 rounded-full bg-lime-300/10 blur-3xl" aria-hidden />

      <div className="relative grid items-start gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
        {/* Hero copy */}
        <div className="min-w-0">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-2 text-sm font-black text-emerald-100 sm:mb-4 sm:px-4">
            <Bot size={18} aria-hidden />
            <span id="homepage-ai-advisor-heading">{copy.badge}</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl md:text-4xl">
            {copy.title}
          </h2>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-emerald-50/90 sm:mt-4 sm:text-base">
            {copy.subtitle}
          </p>
          <p className="mt-2 max-w-2xl text-xs font-medium leading-relaxed text-emerald-100/55 sm:text-sm">
            {copy.trustLine}
          </p>

          {/* Language selector */}
          <div
            className="mt-5 flex flex-wrap gap-2"
            role="group"
            aria-label={copy.languageAria}
          >
            {HOMEPAGE_AI_LANGUAGE_OPTIONS.map((opt) => {
              const selected = language === opt.code;
              return (
                <button
                  key={opt.code}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setLanguage(opt.code as LanguageCode)}
                  className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-bold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/40 ${
                    selected
                      ? "border-emerald-300/50 bg-emerald-400/20 text-white shadow-[0_0_0_1px_rgba(167,243,208,0.25)]"
                      : "border-white/15 bg-white/5 text-emerald-50/85 hover:bg-white/10"
                  }`}
                >
                  <span aria-hidden>{opt.flag}</span>
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick prompts — horizontal scroll on mobile */}
          <div className="mt-5">
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {copy.quickPrompts.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void sendMessage(item.prompt)}
                  disabled={isGenerating || isListening}
                  className="shrink-0 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-left text-xs font-bold text-emerald-50 transition hover:bg-white/15 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/40 disabled:opacity-60 sm:text-sm"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* FIRE Readiness snapshot — only real metrics */}
          {snapshot.hasAnyData ? (
            <div className="mt-5 grid grid-cols-2 gap-2 sm:gap-2.5">
              {snapshot.readinessPct != null ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 backdrop-blur-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/45">
                    {copy.readinessTitle}
                  </p>
                  <p className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">
                    {Math.round(snapshot.readinessPct)}%
                  </p>
                </div>
              ) : null}
              {snapshot.estimatedReturnYears != null ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 backdrop-blur-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/45">
                    {copy.estimatedReturn}
                  </p>
                  <p className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">
                    {formatYears(snapshot.estimatedReturnYears, copy.yearsSuffix)}
                  </p>
                </div>
              ) : null}
              {snapshot.monthlySavingsNpr != null ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 backdrop-blur-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/45">
                    {copy.monthlySavings}
                  </p>
                  <p className="mt-1 truncate text-base font-black tracking-tight text-white sm:text-lg">
                    {formatSnapshotNpr(snapshot.monthlySavingsNpr)}
                  </p>
                </div>
              ) : null}
              {snapshot.fireTargetNpr != null ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 backdrop-blur-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/45">
                    {copy.fireTarget}
                  </p>
                  <p className="mt-1 truncate text-base font-black tracking-tight text-white sm:text-lg">
                    {formatSnapshotNpr(snapshot.fireTargetNpr)}
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-5 text-xs font-semibold text-emerald-100/45">{copy.missingDataHint}</p>
          )}
        </div>

        {/* FIRE Bot card */}
        <div className="glass-card min-w-0 rounded-[1.7rem] p-4 text-emerald-950 sm:p-5">
          <div className="flex items-center gap-3 border-b border-emerald-100 pb-3.5 sm:pb-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-700 to-lime-500 text-white shadow-lg shadow-emerald-950/20 sm:h-14 sm:w-14">
              <Bot aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="font-black">{copy.fireBot}</p>
              <p className="text-xs font-bold text-emerald-700" aria-live="polite">
                {botStatus}
              </p>
            </div>
            <Sparkles className="ml-auto h-4 w-4 shrink-0 text-emerald-600/70" aria-hidden />
          </div>

          {voiceUiState !== "idle" ? (
            <div
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-emerald-800"
              aria-live="polite"
            >
              {voiceUiState === "listening" ? <Mic size={12} aria-hidden /> : null}
              {voiceUiState === "processing" ? <Loader2 size={12} className="animate-spin" aria-hidden /> : null}
              {voiceUiState === "speaking" ? <Volume2 size={12} aria-hidden /> : null}
              {voiceStatusText}
            </div>
          ) : null}

          {voiceHint ? (
            <p className="mt-3 text-xs font-semibold text-amber-800" role="status">
              {voiceHint}
            </p>
          ) : null}

          <div ref={responseRef} className="mt-3.5 max-h-[min(52vh,28rem)] space-y-3 overflow-y-auto overscroll-contain pr-0.5">
            {showEmpty ? (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4">
                <p className="text-sm font-black text-emerald-950">{copy.emptyTitle}</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {copy.startActions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => void sendMessage(action.prompt)}
                      disabled={isGenerating || isListening}
                      className="min-h-[48px] rounded-xl border border-emerald-200/80 bg-white/90 px-3 py-2.5 text-left text-xs font-bold leading-snug text-emerald-900 transition hover:border-emerald-400 hover:bg-emerald-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 disabled:opacity-60"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {messages.map((msg) => {
              if (msg.role === "user") {
                return (
                  <div
                    key={msg.id}
                    className="ml-6 rounded-2xl bg-emerald-700 px-3.5 py-2.5 text-sm font-semibold text-white"
                  >
                    {msg.content}
                  </div>
                );
              }
              if (msg.status === "streaming" && !msg.content) {
                return (
                  <div
                    key={msg.id}
                    className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm font-bold text-emerald-800"
                    aria-live="polite"
                  >
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    {copy.statusThinking}
                  </div>
                );
              }
              if (!msg.content) return null;
              return (
                <div
                  key={msg.id}
                  className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-3.5 text-sm leading-relaxed text-slate-700"
                >
                  <HomepageAiMarkdown content={msg.content} />
                </div>
              );
            })}

            {isGenerating && !lastAssistant?.content ? (
              <div
                className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm font-bold text-emerald-800"
                aria-live="polite"
              >
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {copy.statusThinking}
              </div>
            ) : null}

            {error ? (
              <div
                role="alert"
                className="rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-950"
              >
                <p className="font-black">{copy.errorTitle}</p>
                <p className="mt-1 text-xs font-semibold text-amber-900/80">{copy.errorBody}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {copy.toolLinks.slice(0, 3).map((tool) => (
                    <Link
                      key={tool.href}
                      href={tool.href}
                      className="rounded-full border border-amber-300/60 bg-white px-3 py-1.5 text-[11px] font-black text-amber-950 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-200"
                    >
                      {tool.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            {lastAssistant && lastAssistant.status === "complete" && !isGenerating ? (
              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700/70">
                    {copy.followUpsLabel}
                  </p>
                  {synthesisSupported ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (isSpeaking) stopSpeaking();
                        else speakText(lastAssistant.content);
                      }}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-[11px] font-black text-emerald-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
                      aria-label={isSpeaking ? copy.stopSpeaking : copy.speak}
                    >
                      {isSpeaking ? <VolumeX size={13} aria-hidden /> : <Volume2 size={13} aria-hidden />}
                      {isSpeaking ? copy.stopSpeaking : copy.speak}
                    </button>
                  ) : null}
                </div>
                <div className="-mx-0.5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {copy.followUps.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => void sendMessage(item)}
                      disabled={isListening || isGenerating}
                      className="shrink-0 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-[11px] font-bold text-emerald-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 disabled:opacity-60"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <form onSubmit={onAsk} className="mt-3.5 flex flex-wrap gap-2 sm:flex-nowrap">
            <label className="sr-only" htmlFor="homepage-fire-ai-input">
              {copy.askPlaceholder}
            </label>
            <input
              id="homepage-fire-ai-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="min-h-[48px] min-w-0 flex-1 basis-[min(100%,12rem)] rounded-2xl border border-emerald-100 bg-white/90 px-4 py-3 text-sm font-semibold text-emerald-950 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
              placeholder={copy.askPlaceholder}
              autoComplete="off"
              enterKeyHint="send"
              disabled={isGenerating || isListening}
            />
            {recognitionSupported ? (
              <button
                type="button"
                onClick={() => {
                  if (isListening) stopListening();
                  else startListening();
                }}
                disabled={isGenerating}
                aria-pressed={isListening}
                aria-label={isListening ? copy.stopListening : copy.talkToFireAi}
                title={isListening ? copy.stopListening : copy.talkToFireAi}
                className={`inline-flex min-h-[48px] min-w-[48px] shrink-0 items-center justify-center gap-1.5 rounded-2xl border px-3 text-sm font-black transition focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[3rem] ${
                  isListening
                    ? "border-rose-300 bg-rose-50 text-rose-700"
                    : "border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50"
                }`}
              >
                {isListening ? <MicOff className="h-5 w-5" aria-hidden /> : <Mic className="h-5 w-5" aria-hidden />}
                <span className="hidden lg:inline">{isListening ? copy.stopListening : copy.talkToFireAi}</span>
              </button>
            ) : null}
            <button
              type="submit"
              disabled={isGenerating || isListening || !input.trim()}
              aria-label={copy.ask}
              className="glow-button inline-flex min-h-[48px] min-w-[48px] shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[5.5rem] sm:px-5 sm:text-base"
            >
              {isGenerating ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              ) : (
                <>
                  <span className="hidden sm:inline">{copy.ask}</span>
                  <SendHorizontal className="h-5 w-5 sm:hidden" aria-hidden />
                </>
              )}
            </button>
          </form>

          {!recognitionSupported ? (
            <p className="mt-2 text-[11px] font-semibold text-emerald-800/60" role="note">
              {copy.voiceUnsupported}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <Link
              href="/fire-ai"
              className="text-xs font-black text-emerald-800 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
            >
              {copy.openFullChat}
            </Link>
            <p className="text-[10px] font-semibold leading-snug text-emerald-800/55 sm:max-w-[70%] sm:text-right">
              {copy.disclaimer}
            </p>
          </div>

          <div className="mt-3 border-t border-emerald-100 pt-3">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700/60">
              {copy.toolsLabel}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {copy.toolLinks.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="rounded-full border border-emerald-200/80 bg-white/80 px-2.5 py-1 text-[10px] font-bold text-emerald-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
                >
                  {tool.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
