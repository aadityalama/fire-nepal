export const REMINDER_TYPES = [
  "room_rent",
  "school_fees",
  "insurance",
  "internet",
  "electricity",
  "tuition",
  "exams",
  "subscriptions",
  "medicine",
  "birthdays",
] as const;

export type ReminderType = (typeof REMINDER_TYPES)[number];

export const REPEAT_FREQUENCIES = ["once", "daily", "weekly", "monthly", "yearly"] as const;
export type RepeatFrequency = (typeof REPEAT_FREQUENCIES)[number];

/** @deprecated use REPEAT_FREQUENCIES — kept for sanitize migration */
export const RECURRENCE = ["once", "monthly", "yearly"] as const;
export type Recurrence = (typeof RECURRENCE)[number];

export type ReminderPriority = "overdue" | "upcoming" | "paid" | "ok";

export type Reminder = {
  id: string;
  title: string;
  reminderType: ReminderType;
  /** Optional amount in NPR for household budgeting */
  amountNpr: number | null;
  /** Next due date (YYYY-MM-DD) */
  dueDate: string;
  /** Local wall time for email scheduling, HH:mm (24h) */
  dueTime: string;
  /** IANA time zone for due date + due time */
  timezone: string;
  /** Destination for automated reminder emails */
  email: string;
  repeatFrequency: RepeatFrequency;
  notify7DaysBefore: boolean;
  notify3DaysBefore: boolean;
  notify1DayBefore: boolean;
  notifyAtDueTime: boolean;
  notifyOverdue: boolean;
  /** Shared visibility for spouse / parents / kids at home */
  sharedWithFamily: boolean;
  notes?: string;
  createdAt: string;
  /**
   * Legacy single flag — if true, treat as all notify toggles on for local-first stores.
   * Prefer explicit `notify*` fields.
   */
  emailNotify?: boolean;
};

export type ReminderHistoryEntry = {
  id: string;
  reminderId: string;
  title: string;
  reminderType: ReminderType;
  amountNpr: number | null;
  paidAt: string;
  dueDate: string;
  repeatFrequency: RepeatFrequency;
  sharedWithFamily: boolean;
};

export type InAppNotificationKind = "payment_due" | "overdue" | "email_sent" | "family_shared";

export type InAppNotification = {
  id: string;
  reminderId: string | null;
  kind: InAppNotificationKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};

export type SmartRemindersSettings = {
  emailNotificationsEnabled: boolean;
  /** Days ahead to treat as “upcoming” (yellow) */
  upcomingWithinDays: number;
};

export type SmartRemindersStore = {
  version: 1;
  reminders: Reminder[];
  history: ReminderHistoryEntry[];
  notifications: InAppNotification[];
  settings: SmartRemindersSettings;
};
