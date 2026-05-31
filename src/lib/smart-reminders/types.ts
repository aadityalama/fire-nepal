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

export const RECURRENCE = ["once", "monthly", "yearly"] as const;
export type Recurrence = (typeof RECURRENCE)[number];

export type ReminderPriority = "overdue" | "upcoming" | "paid" | "ok";

export type Reminder = {
  id: string;
  title: string;
  reminderType: ReminderType;
  /** Optional amount in NPR for household budgeting */
  amountNpr: number | null;
  /** Next due date (YYYY-MM-DD, Asia/Kathmandu calendar day) */
  dueDate: string;
  recurrence: Recurrence;
  /** Shared visibility for spouse / parents / kids at home */
  sharedWithFamily: boolean;
  notes?: string;
  createdAt: string;
  /** When enabled, demo engine simulates outbound email on due/overdue transitions */
  emailNotify: boolean;
};

export type ReminderHistoryEntry = {
  id: string;
  reminderId: string;
  title: string;
  reminderType: ReminderType;
  amountNpr: number | null;
  paidAt: string;
  dueDate: string;
  recurrence: Recurrence;
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
