import type { Reminder, SmartRemindersStore } from "./types";

function seedReminders(_now: Date): Reminder[] {
  return [];
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
