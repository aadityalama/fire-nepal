export type FireAiMessageRole = "user" | "assistant";

export type FireAiMessageStatus = "complete" | "streaming" | "failed";

export type FireAiChatMessage = {
  id: string;
  role: FireAiMessageRole;
  content: string;
  timestamp: string;
  status?: FireAiMessageStatus;
};

export type FireAiConversation = {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
  messages: FireAiChatMessage[];
};

export type FireAiConversationSummary = Omit<FireAiConversation, "messages">;

export type FireAiMembershipPlan = "free" | "premium" | "elite";

export type FireAiQuotaSnapshot = {
  plan: FireAiMembershipPlan;
  scope: "day" | "month";
  limit: number;
  used: number;
  remaining: number;
  resetAt: string;
  usageMonth: string;
  tokensUsedThisMonth: number;
  estimatedCostThisMonth: number;
};

export type FireAiHealthStatus = "excellent" | "needs_attention" | "unavailable";

export type FireAiHealthScore = {
  score: number | null;
  maxScore: number;
  status: FireAiHealthStatus;
  statusLabel: string;
};

export type FireAiTodayInsight = {
  text: string;
  available: boolean;
};

export type FireAiSmartSuggestion = {
  id: string;
  label: string;
  href: string;
  prompt?: string;
};

export type FireAiGuidanceItem = {
  id: string;
  title: string;
  body: string;
  priority: "high" | "medium" | "low";
};

export type FireAiExpenseMetric = {
  id: string;
  label: string;
  value: string;
  detail?: string;
};
