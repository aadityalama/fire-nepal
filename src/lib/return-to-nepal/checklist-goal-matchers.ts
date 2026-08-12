import type { SavingsGoal } from "@/lib/savings/savings-types";

function testGoal(goal: SavingsGoal, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(goal.name) || pattern.test(goal.category));
}

/** Emergency Fund savings goal (template or named). */
export function findEmergencySavingsGoal(goals: SavingsGoal[]): SavingsGoal | undefined {
  return goals.find(
    (goal) =>
      goal.templateId === "emergency" ||
      /^emergency$/i.test(goal.category) ||
      /emergency\s*fund/i.test(goal.name),
  );
}

/** House / land / Nepal property fund — excludes generic "Nepal Return Fund" only when house|land|property also match. */
export function findHouseSavingsGoal(goals: SavingsGoal[]): SavingsGoal | undefined {
  const byTemplate = goals.find((goal) => goal.templateId === "house");
  if (byTemplate) return byTemplate;
  return goals.find((goal) => testGoal(goal, [/house|land|property/i]));
}

/**
 * Business / startup capital only — does NOT match generic "Investment Fund"
 * (templateId investment / category Investment).
 */
export function findBusinessCapitalGoal(goals: SavingsGoal[]): SavingsGoal | undefined {
  return goals.find((goal) => {
    if (goal.templateId === "investment" || /^investment$/i.test(goal.category)) return false;
    if (goal.templateId === "business" || /^business$/i.test(goal.category)) return true;
    return /business|startup|entrepreneur|capital\s*for\s*business/i.test(goal.name) ||
      /business|startup/i.test(goal.category);
  });
}

/** Canonical portfolio/investment savings goal (template investment or Investment category). */
export function findInvestmentSavingsGoal(goals: SavingsGoal[]): SavingsGoal | undefined {
  return goals.find(
    (goal) =>
      goal.templateId === "investment" ||
      /^investment$/i.test(goal.category) ||
      /^investment\s*fund$/i.test(goal.name),
  );
}

export function houseProgressPctFromGoal(goal: SavingsGoal | undefined, fallbackPct: number): number {
  if (!goal || goal.targetAmountNpr <= 0) return Math.max(0, fallbackPct);
  return Math.min(100, Math.max(0, (goal.savedAmountNpr / goal.targetAmountNpr) * 100));
}
