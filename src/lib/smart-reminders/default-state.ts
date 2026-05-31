import { formatYmd, addDays, addMonths } from "./date-utils";
import type { Reminder, SmartRemindersStore } from "./types";

function seedReminders(now: Date): Reminder[] {
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return [
    {
      id: "seed_rent",
      title: "Room rent — Seoul flat",
      reminderType: "room_rent",
      amountNpr: null,
      dueDate: formatYmd(addDays(t, 3)),
      recurrence: "monthly",
      sharedWithFamily: true,
      notes: "Send to landlord by the 5th KST window.",
      createdAt: new Date(t.getTime() - 86400000 * 12).toISOString(),
      emailNotify: true,
    },
    {
      id: "seed_school",
      title: "Daughter’s school fees (Term)",
      reminderType: "school_fees",
      amountNpr: 185000,
      dueDate: formatYmd(addDays(t, 9)),
      recurrence: "yearly",
      sharedWithFamily: true,
      createdAt: new Date(t.getTime() - 86400000 * 20).toISOString(),
      emailNotify: true,
    },
    {
      id: "seed_insurance",
      title: "Term life insurance",
      reminderType: "insurance",
      amountNpr: 4200,
      dueDate: formatYmd(addDays(t, -2)),
      recurrence: "monthly",
      sharedWithFamily: true,
      createdAt: new Date(t.getTime() - 86400000 * 40).toISOString(),
      emailNotify: true,
    },
    {
      id: "seed_internet",
      title: "Home fiber (Korea)",
      reminderType: "internet",
      amountNpr: null,
      dueDate: formatYmd(addDays(t, 6)),
      recurrence: "monthly",
      sharedWithFamily: false,
      createdAt: new Date(t.getTime() - 86400000 * 6).toISOString(),
      emailNotify: false,
    },
    {
      id: "seed_exam",
      title: "EPS exam prep fee",
      reminderType: "exams",
      amountNpr: 3500,
      dueDate: formatYmd(addMonths(t, 2)),
      recurrence: "once",
      sharedWithFamily: false,
      createdAt: new Date(t.getTime() - 86400000 * 3).toISOString(),
      emailNotify: true,
    },
    {
      id: "seed_bday",
      title: "Aama’s birthday",
      reminderType: "birthdays",
      amountNpr: null,
      dueDate: formatYmd(addMonths(t, 4)),
      recurrence: "yearly",
      sharedWithFamily: true,
      createdAt: new Date(t.getTime() - 86400000 * 60).toISOString(),
      emailNotify: false,
    },
  ];
}

export function createDefaultSmartRemindersStore(now = new Date()): SmartRemindersStore {
  return {
    version: 1,
    reminders: seedReminders(now),
    history: [],
    notifications: [],
    settings: {
      emailNotificationsEnabled: true,
      upcomingWithinDays: 10,
    },
  };
}
