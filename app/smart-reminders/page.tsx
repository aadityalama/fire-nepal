import type { Metadata } from "next";
import { SmartRemindersDashboard } from "@/components/smart-reminders/SmartRemindersDashboard";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: "Smart Reminders | FIRE Nepal",
  description:
    "FIRE Nepal Smart Reminder Engine — exact date & time scheduling, Supabase storage when signed in, Vercel cron + Resend email, and family-shared alerts.",
  alternates: buildCanonicalAlternates("/smart-reminders"),
};

export default function SmartRemindersPage() {
  return <SmartRemindersDashboard />;
}
