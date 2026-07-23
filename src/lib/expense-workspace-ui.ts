export type ExpenseRepeat = "Never" | "Weekly" | "Monthly" | "Yearly";

export type ExpenseReminderTiming =
  | "On Due Date"
  | "1 Day Before"
  | "3 Days Before"
  | "7 Days Before"
  | "Custom";

export type ExpenseWorkspaceMeta = {
  dueDate?: string;
  account?: string;
  paymentMethod?: string;
  repeat?: ExpenseRepeat;
  reminderEnabled?: boolean;
  reminderTiming?: ExpenseReminderTiming;
  reminderEmail?: boolean;
  /** Cloud `scheduled_reminders.id` when email delivery is wired via cron/Resend. */
  scheduledReminderId?: string;
  paidAt?: string;
  cancelled?: boolean;
  paymentHistory?: Array<{ date: string; amount: number }>;
  reminderHistory?: Array<{ date: string; type: string }>;
};

export type ExpenseWorkspaceNotification = {
  id: string;
  expenseId: number;
  title: string;
  message: string;
  tone: "overdue" | "today" | "tomorrow" | "upcoming" | "completed";
  amountNpr: number;
  dueDate: string;
};

export type ExpenseWorkspaceUiState = {
  version: 1;
  meta: Record<number, ExpenseWorkspaceMeta>;
  readNotificationIds: string[];
};

const STORAGE_KEY = "fire-nepal-expense-workspace-ui-v1";

const DEFAULT_STATE: ExpenseWorkspaceUiState = {
  version: 1,
  meta: {},
  readNotificationIds: [],
};

export function loadExpenseWorkspaceUiState(): ExpenseWorkspaceUiState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as ExpenseWorkspaceUiState;
    if (!parsed || parsed.version !== 1 || typeof parsed.meta !== "object") return DEFAULT_STATE;
    return {
      version: 1,
      meta: parsed.meta ?? {},
      readNotificationIds: Array.isArray(parsed.readNotificationIds) ? parsed.readNotificationIds : [],
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveExpenseWorkspaceUiState(state: ExpenseWorkspaceUiState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
