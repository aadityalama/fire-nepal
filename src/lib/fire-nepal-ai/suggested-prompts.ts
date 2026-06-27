export type FireAiSuggestedPrompt = {
  id: string;
  label: string;
  emoji: string;
};

export const FIRE_AI_SUGGESTED_PROMPTS: FireAiSuggestedPrompt[] = [
  { id: "analyze-expenses", label: "Analyze my monthly expenses", emoji: "📊" },
  { id: "fire-progress", label: "Review my FIRE progress", emoji: "🔥" },
  { id: "build-budget", label: "Help me build a budget", emoji: "💰" },
  { id: "investment-portfolio", label: "Explain my investment portfolio", emoji: "📈" },
  { id: "retirement-plan", label: "Plan my retirement", emoji: "🏖️" },
  { id: "reach-fi", label: "Help me reach financial independence", emoji: "🎯" },
];
