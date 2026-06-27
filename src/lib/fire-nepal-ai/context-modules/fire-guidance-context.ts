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
  const hasCashflow = snapshot.wealth.cashflowSynced && (summary.monthlyIncome > 0 || summary.monthlyExpenses > 0);
  const monthlySavingsTarget =
    summary.monthlyExpenses > 0 ? Math.max(0, summary.monthlyExpenses * 0.3) : null;
  const monthlySavings = summary.monthlyIncome - summary.monthlyExpenses;
  const timeline =
    summary.fireProgressPct == null || summary.fireProgressPct >= 100 || monthlySavings <= 0 || summary.fireNumber25xAnnualSpendNpr <= 0
      ? null
      : (summary.fireNumber25xAnnualSpendNpr - summary.totalNetWorthNpr) / (monthlySavings * 12);

  return compactLines([
    `FIRE progress: ${summary.fireProgressPct == null ? "unavailable because monthly expenses/cashflow are missing" : formatPct(summary.fireProgressPct)}.`,
    `Current net worth: ${formatNpr(summary.totalNetWorthNpr)}; investable assets: ${formatNpr(summary.totalInvestableAssetsNpr)}.`,
    `Monthly income: ${hasCashflow ? formatNpr(summary.monthlyIncome) : "missing"}; monthly expenses: ${hasCashflow ? formatNpr(summary.monthlyExpenses) : "missing"}.`,
    `Monthly savings / surplus: ${hasCashflow ? formatNpr(monthlySavings) : "missing"}.`,
    `Savings rate: ${summary.savingsRatePct == null ? "missing" : formatPct(summary.savingsRatePct)}.`,
    `FIRE number (25x annual spend): ${summary.fireNumber25xAnnualSpendNpr > 0 ? formatNpr(summary.fireNumber25xAnnualSpendNpr) : "unavailable until monthly expenses are added"}.`,
    `Estimated retirement timeline: ${timeline == null ? "cannot estimate unless FIRE gap and positive monthly savings are available" : `${Math.max(0, timeline).toFixed(1)} years at current monthly savings, before investment growth assumptions`}.`,
    `Monthly savings target: ${monthlySavingsTarget == null ? "missing; needs monthly expense target" : `${formatNpr(monthlySavingsTarget)} minimum starter target (30% of tracked monthly expenses)`}.`,
    guidance.items.length > 0
      ? `Rule-based guidance from current data:\n${guidance.items.map((item) => `- [${item.priority}] ${item.title}: ${item.body}`).join("\n")}`
      : `Missing guidance data: ${guidance.missingDataHint ?? "cashflow data is needed for more precise FIRE guidance."}`,
    "Action rule: do not invent retirement date, monthly savings, or FIRE target when cashflow is missing. Use only the numbers above.",
  ]);
}
