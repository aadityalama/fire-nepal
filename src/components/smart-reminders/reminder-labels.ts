import type { ReminderType } from "@/lib/smart-reminders/types";

export const REMINDER_TYPE_LABEL: Record<ReminderType, string> = {
  room_rent: "Room rent",
  school_fees: "School fees",
  insurance: "Insurance",
  internet: "Internet",
  electricity: "Electricity",
  tuition: "Tuition",
  exams: "Exams",
  subscriptions: "Subscriptions",
  medicine: "Medicine",
  birthdays: "Birthdays",
};

export function formatReminderType(t: ReminderType): string {
  return REMINDER_TYPE_LABEL[t];
}
