export type SavingsGoalStatus = "active" | "paused" | "completed";

export type SavingsReminderTiming =
  | "7 days before"
  | "3 days before"
  | "1 day before"
  | "Goal completed"
  | "Monthly reminder";

export type SavingsGoal = {
  id: string;
  templateId: string;
  name: string;
  icon: string;
  category: string;
  targetAmountNpr: number;
  savedAmountNpr: number;
  monthlyContributionNpr: number;
  targetDate: string;
  reminderEnabled: boolean;
  reminderTimings: SavingsReminderTiming[];
  notes?: string;
  status: SavingsGoalStatus;
  aiRecommendation?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type SavingsTransaction = {
  id: string;
  goalId: string;
  goalName: string;
  amountNpr: number;
  date: string;
  source: string;
  createdAt: string;
};

export type SavingsWorkspaceState = {
  version: 1;
  goals: SavingsGoal[];
  transactions: SavingsTransaction[];
  balanceHidden: boolean;
};

export type SavingsGoalFormInput = {
  templateId: string;
  name: string;
  icon: string;
  category: string;
  targetAmountNpr: number;
  savedAmountNpr: number;
  monthlyContributionNpr: number;
  targetDate: string;
  reminderEnabled: boolean;
  reminderTimings: SavingsReminderTiming[];
  notes?: string;
};

export type SavingsGoalProgress = {
  savedPct: number;
  remainingAmountNpr: number;
  daysRemaining: number;
  remainingLabel: string;
  expectedCompletionDate: string | null;
  statusTone: "green" | "orange" | "red";
};
