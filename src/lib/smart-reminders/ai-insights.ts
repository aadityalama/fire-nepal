import type { Reminder } from "./types";
import { reminderPriority } from "./reminder-engine";

export type AiInsightTone = "risk" | "watch" | "calm" | "family";

export type AiReminderInsight = {
  id: string;
  title: string;
  body: string;
  tone: AiInsightTone;
};

export function buildAiReminderInsights(input: {
  reminders: Reminder[];
  upcomingWithinDays: number;
  historyCountLast30Approx: number;
}): AiReminderInsight[] {
  const now = new Date();
  const prios = input.reminders.map((r) => reminderPriority(r, now, input.upcomingWithinDays));
  const overdue = prios.filter((p) => p === "overdue").length;
  const upcoming = prios.filter((p) => p === "upcoming").length;
  const shared = input.reminders.filter((r) => r.sharedWithFamily).length;

  const insights: AiReminderInsight[] = [];

  if (overdue > 0) {
    insights.push({
      id: "ov",
      title: "Cashflow guardrail",
      body: `You have ${overdue} overdue reminder${overdue === 1 ? "" : "s"}. Clear rent, utilities, or insurance first — they silently compound stress at home.`,
      tone: "risk",
    });
  } else {
    insights.push({
      id: "ov_ok",
      title: "Discipline signal",
      body: "No overdue items right now. Keep autopay + a shared family calendar so this stays green when you’re on night shifts abroad.",
      tone: "calm",
    });
  }

  if (upcoming >= 4) {
    insights.push({
      id: "cluster",
      title: "Bill clustering",
      body: "Several items land in the same window. Consider staggering due dates with providers so NPR outflows don’t stack in one week.",
      tone: "watch",
    });
  } else if (upcoming > 0) {
    insights.push({
      id: "soft",
      title: "Gentle runway",
      body: `${upcoming} item${upcoming === 1 ? "" : "s"} are within your “yellow” window. Confirm you’ve budgeted NPR for school fees and subscriptions.`,
      tone: "watch",
    });
  }

  insights.push({
    id: "fam",
    title: "Family transparency",
    body:
      shared > 0
        ? `${shared} reminder${shared === 1 ? "" : "s"} are shared with family — perfect for parents coordinating school fees from Nepal.`
        : "Turn on “Share with family” for rent and school fees so everyone sees the same truth, even when you’re in different time zones.",
    tone: "family",
  });

  insights.push({
    id: "hist",
    title: "Payment rhythm",
    body:
      input.historyCountLast30Approx > 0
        ? "Your recent payment history looks active — keep logging “mark paid” so recurring bills advance cleanly."
        : "Start marking items paid when you settle them. The engine learns your cadence and keeps the calendar honest.",
    tone: "calm",
  });

  return insights.slice(0, 4);
}
