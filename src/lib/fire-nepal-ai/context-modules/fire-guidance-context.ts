import "server-only";

import { buildFireGuidance } from "@/lib/fire-nepal-ai/fire-guidance-data";
import { compactLines, formatNpr, formatPct } from "@/lib/fire-nepal-ai/context-modules/format";
import { getFireAiFinancialSnapshot } from "@/services/fire-ai-financial-snapshot";

export async function buildFireGuidanceContext(userId: string): Promise<string | null> {
  const snapshot = await getFireAiFinancialSnapshot(userId);
  const summary = snapshot.wealth.summary;

  if (!summary) {
    return compactLines([
      "FIRE Guidance: no synced portfolio/net-worth data found.",
      "If the user asks for FIRE guidance, explain that FIRE progress needs at least portfolio/net-worth data and monthly spending or cashflow inputs.",
    ]);
  }

  const guidance = buildFireGuidance(summary);
  const hasCashflow = summary.monthlyIncome > 0 || summary.monthlyExpenses > 0;
  const monthlySavingsTarget =
    summary.monthlyExpenses > 0 ? Math.max(0, summary.monthlyExpenses * 0.3) : null;

  return compactLines([
    `FIRE progress: ${summary.fireProgressPct == null ? "unavailable because monthly expenses/cashflow are not synced server-side" : formatPct(summary.fireProgressPct)}.`,
    `Current net worth: ${formatNpr(summary.totalNetWorthNpr)}; investable assets: ${formatNpr(summary.totalInvestableAssetsNpr)}.`,
    `Monthly income: ${hasCashflow ? formatNpr(summary.monthlyIncome) : "missing"}; monthly expenses: ${hasCashflow ? formatNpr(summary.monthlyExpenses) : "missing"}.`,
    `Savings rate: ${summary.savingsRatePct == null ? "missing" : formatPct(summary.savingsRatePct)}.`,
    `FIRE number (25x annual spend): ${summary.fireNumber25xAnnualSpendNpr > 0 ? formatNpr(summary.fireNumber25xAnnualSpendNpr) : "unavailable until monthly expenses are synced"}.`,
    `Estimated retirement timeline: ${summary.fireProgressPct == null ? "cannot estimate without actual monthly expenses/savings rate" : "can discuss directionally from FIRE progress; avoid inventing dates without savings inputs"}.`,
    `Monthly savings target: ${monthlySavingsTarget == null ? "missing; needs monthly expense target" : `${formatNpr(monthlySavingsTarget)} minimum starter target (30% of tracked monthly expenses)`}.`,
    guidance.items.length > 0
      ? `Rule-based guidance from current data:\n${guidance.items.map((item) => `- [${item.priority}] ${item.title}: ${item.body}`).join("\n")}`
      : `Missing guidance data: ${guidance.missingDataHint ?? "cashflow data is needed for more precise FIRE guidance."}`,
    "Action rule: do not invent retirement date, monthly savings, or FIRE target when cashflow is missing. Ask the user to add Cashflow Dashboard data or provide the numbers in chat.",
  ]);
}
