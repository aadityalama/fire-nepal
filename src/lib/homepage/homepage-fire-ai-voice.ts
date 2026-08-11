/**
 * Free browser voice helpers for homepage FIRE AI.
 * Uses only Web Speech API (SpeechRecognition + SpeechSynthesis) — no paid voice services.
 */

import type { LanguageCode } from "@/lib/i18n/homepage-translations";

export type FireAiVoiceUiState = "idle" | "listening" | "processing" | "speaking";

/** Minimal SpeechRecognition surface used by FIRE AI (browser-native). */
export type FireAiSpeechRecognitionResultEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

export type FireAiSpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onstart: ((ev: Event) => void) | null;
  onresult: ((ev: FireAiSpeechRecognitionResultEvent) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onend: ((ev: Event) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

export type FireAiSpeechRecognitionConstructor = new () => FireAiSpeechRecognitionLike;

type SpeechWindow = Window & {
  SpeechRecognition?: FireAiSpeechRecognitionConstructor;
  webkitSpeechRecognition?: FireAiSpeechRecognitionConstructor;
};

export function getSpeechRecognitionConstructor(
  win: SpeechWindow | undefined = typeof window !== "undefined" ? (window as SpeechWindow) : undefined,
): FireAiSpeechRecognitionConstructor | null {
  if (!win) return null;
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(
  win: SpeechWindow | undefined = typeof window !== "undefined" ? (window as SpeechWindow) : undefined,
): boolean {
  return getSpeechRecognitionConstructor(win) != null;
}

export function isSpeechSynthesisSupported(
  win: (Window & { SpeechSynthesisUtterance?: unknown }) | undefined = typeof window !== "undefined"
    ? (window as Window & { SpeechSynthesisUtterance?: unknown })
    : undefined,
): boolean {
  return Boolean(
    win &&
      typeof win.speechSynthesis?.speak === "function" &&
      typeof win.SpeechSynthesisUtterance === "function",
  );
}

/** BCP-47 locale for SpeechRecognition based on homepage language selector. */
export function languageToSpeechRecognitionLocale(language: LanguageCode): string {
  switch (language) {
    case "np":
      return "ne-NP";
    case "kr":
      return "ko-KR";
    case "ja":
      return "ja-JP";
    case "en":
    default:
      return "en-US";
  }
}

/** Ordered SpeechSynthesis locale preferences for the active advisor language. */
export function languageToSpeechSynthesisLocales(language: LanguageCode): string[] {
  switch (language) {
    case "np":
      return ["ne-NP", "ne", "en-US", "en-GB", "en"];
    case "kr":
      return ["ko-KR", "ko", "en-US", "en"];
    case "ja":
      return ["ja-JP", "ja", "en-US", "en"];
    case "en":
    default:
      return ["en-US", "en-GB", "en"];
  }
}

/** Strip markdown so SpeechSynthesis reads clean educational prose. */
export function stripMarkdownForSpeech(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/[>|]/g, " ")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export type SpeechVoiceLike = {
  lang: string;
  name: string;
  localService?: boolean;
  default?: boolean;
};

/**
 * Pick the best available browser voice for the requested locales.
 * Pure helper — safe for unit tests with mocked voice lists.
 */
export function pickSynthesisVoice<T extends SpeechVoiceLike>(
  voices: T[],
  preferredLocales: string[],
): T | null {
  if (!voices.length) return null;
  const normalized = preferredLocales.map((l) => l.toLowerCase());

  for (const locale of normalized) {
    const exact = voices.find((v) => v.lang.toLowerCase() === locale);
    if (exact) return exact;
  }
  for (const locale of normalized) {
    const prefix = locale.split("-")[0];
    const fuzzy = voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
    if (fuzzy) return fuzzy;
  }
  return voices.find((v) => v.default) ?? voices[0] ?? null;
}

export function deriveVoiceUiState(opts: {
  recognitionSupported: boolean;
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
}): FireAiVoiceUiState {
  if (opts.isListening) return "listening";
  if (opts.isProcessing) return "processing";
  if (opts.isSpeaking) return "speaking";
  return "idle";
}

export function voiceStateLabel(
  state: FireAiVoiceUiState,
  copy: { listening: string; processing: string; speaking: string },
): string | null {
  if (state === "listening") return copy.listening;
  if (state === "processing") return copy.processing;
  if (state === "speaking") return copy.speaking;
  return null;
}
