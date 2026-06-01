import type { Metadata } from "next";
import { SmartRemindersDashboard } from "@/components/smart-reminders/SmartRemindersDashboard";

export const metadata: Metadata = {
  title: "Smart Reminders | FIRE Nepal",
  description:
    "FIRE Nepal Smart Reminder Engine — recurring bills, school fees, family-shared alerts, calendar view, and optional email notifications (local-first).",
};

export default function SmartRemindersPage() {
  return <SmartRemindersDashboard />;
}
