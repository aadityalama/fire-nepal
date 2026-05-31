import type { ReminderPriority } from "@/lib/smart-reminders/types";

export function priorityAccent(p: ReminderPriority): {
  bar: string;
  chip: string;
  glow: string;
} {
  if (p === "overdue") {
    return {
      bar: "from-red-500 via-rose-400 to-red-600",
      chip: "border-red-400/35 bg-red-500/15 text-red-50",
      glow: "from-red-500/18 via-rose-400/10 to-transparent",
    };
  }
  if (p === "upcoming") {
    return {
      bar: "from-amber-400 via-yellow-300 to-amber-500",
      chip: "border-amber-400/35 bg-amber-500/12 text-amber-50",
      glow: "from-amber-400/16 via-yellow-300/10 to-transparent",
    };
  }
  if (p === "paid") {
    return {
      bar: "from-emerald-400 via-lime-300 to-emerald-600",
      chip: "border-emerald-400/35 bg-emerald-500/12 text-emerald-50",
      glow: "from-emerald-400/14 via-lime-300/10 to-transparent",
    };
  }
  return {
    bar: "from-emerald-500/70 via-teal-400/50 to-emerald-700/60",
    chip: "border-emerald-400/25 bg-emerald-500/10 text-emerald-50/90",
    glow: "from-emerald-400/10 via-teal-400/8 to-transparent",
  };
}
