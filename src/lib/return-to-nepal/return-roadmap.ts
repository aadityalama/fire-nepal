import { computeGoalProgress } from "@/lib/savings/savings-utils";
import type { SavingsGoal } from "@/lib/savings/savings-types";
import type { PlannerSnapshot } from "@/lib/return-to-nepal/planner-engine";

export type RoadmapMilestoneStatus = "completed" | "in_progress" | "upcoming";

export type ReturnRoadmapMilestone = {
  year: number;
  label: string;
  status: RoadmapMilestoneStatus;
  icon: "shield" | "home" | "chart" | "education" | "flag";
};

const GOAL_ICON: Record<string, ReturnRoadmapMilestone["icon"]> = {
  emergency: "shield",
  house: "home",
  land: "home",
  investment: "chart",
  passive: "chart",
  education: "education",
  child: "education",
  return: "flag",
  nepal: "flag",
};

function iconForGoal(goal: SavingsGoal): ReturnRoadmapMilestone["icon"] {
  const hay = `${goal.name} ${goal.category}`.toLowerCase();
  for (const [key, icon] of Object.entries(GOAL_ICON)) {
    if (hay.includes(key)) return icon;
  }
  return "chart";
}

function statusForGoal(goal: SavingsGoal, now = new Date()): RoadmapMilestoneStatus {
  if (goal.status === "completed") return "completed";
  const progress = computeGoalProgress(goal, now);
  if (progress.savedPct >= 100) return "completed";
  if (progress.savedPct >= 25) return "in_progress";
  return "upcoming";
}

export function computeReturnRoadmap(
  goals: SavingsGoal[],
  snapshot: PlannerSnapshot,
  targetReturnYear: number,
): ReturnRoadmapMilestone[] {
  const nowYear = snapshot.nowYear;
  const milestones: ReturnRoadmapMilestone[] = [];

  const activeGoals = goals
    .filter((g) => g.status === "active" || g.status === "completed")
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate));

  for (const goal of activeGoals.slice(0, 4)) {
    const year = new Date(goal.targetDate).getFullYear();
    if (!Number.isFinite(year)) continue;
    milestones.push({
      year,
      label: goal.name,
      status: statusForGoal(goal),
      icon: iconForGoal(goal),
    });
  }

  const returnMilestone: ReturnRoadmapMilestone = {
    year: targetReturnYear,
    label: "Return to Nepal",
    status:
      targetReturnYear <= nowYear
        ? "completed"
        : targetReturnYear <= nowYear + 2
          ? "in_progress"
          : "upcoming",
    icon: "flag",
  };

  const combined = [...milestones, returnMilestone];
  const unique = new Map<number, ReturnRoadmapMilestone>();
  for (const m of combined) {
    if (!unique.has(m.year) || m.icon === "flag") unique.set(m.year, m);
  }

  return [...unique.values()].sort((a, b) => a.year - b.year).slice(0, 6);
}
