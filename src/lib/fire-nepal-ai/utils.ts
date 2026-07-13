import type { FireAiSmartSuggestion } from "@/lib/fire-nepal-ai/types";

export const FIRE_AI_SMART_SUGGESTIONS: FireAiSmartSuggestion[] = [
  { id: "review-expenses", label: "Review this month's expenses", href: "/fire-ai/expense-insights" },
  { id: "fire-progress", label: "Check FIRE progress", href: "/fire-ai/fire-guidance" },
  { id: "analyze-savings", label: "Analyze savings", href: "/fire-ai/wealth-summary" },
  {
    id: "ask-investments",
    label: "Ask AI about investments",
    href: "/fire-ai/chat",
    prompt: "Should I increase SIP?",
  },
  {
    id: "settlement",
    label: "Understand settlement report",
    href: "/fire-ai/chat",
    prompt: "Explain my settlement.",
  },
];

export function getTimeGreeting(): "Good Morning" | "Good Afternoon" | "Good Evening" {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export function firstName(displayName?: string | null): string {
  if (displayName?.trim()) {
    return displayName.trim().split(/\s+/)[0] ?? "";
  }
  return "";
}
