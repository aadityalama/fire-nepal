import "server-only";

import { computeFinancialHealthScore } from "@/lib/fire-nepal-ai/financial-health-score";
import { compactLines, formatNpr, formatPct } from "@/lib/fire-nepal-ai/context-modules/format";
import { getFireAiFinancialSnapshot } from "@/services/fire-ai-financial-snapshot";

function allocationLine(label: string, value: number, total: number): string | null {
  if (!Number.isFinite(value) || value <= 0 || total <= 0) return null;
  return `${label}: ${formatNpr(value)} (${formatPct((value / total) * 100)})`;
}

export async function buildWealthSummaryContext(userId: string): Promise<string | null> {
  const snapshot = await getFireAiFinancialSnapshot(userId);
  const totals = snapshot.wealth.wealthTotals;
  const summary = snapshot.wealth.summary;
  const portfolio = snapshot.wealth.portfolio;

  if (!totals || !summary || !portfolio) {
    return compactLines([
      "Wealth Summary: no synced portfolio / net worth data found in Supabase.",
      "If the user asks about wealth, clearly explain that net worth, assets, liabilities, cash, investments, savings, and debt data are missing or not synced yet.",
    ]);
  }

  const health = computeFinancialHealthScore(summary);
  const totalAssets = totals.totalAssetsNpr;
  const hasDebt = totals.liabilitiesNpr > 0;
  const hasInvestments = totals.investmentsLiveNpr > 0 || totals.retirementNpr > 0;
  const hasCash = totals.liquidNpr + totals.fixedDepositsPrincipalNpr > 0;

  return compactLines([
    `Profile: ${snapshot.profile.displayName ?? "member"}; membership: ${snapshot.profile.membershipPlan ?? "unknown"}; preferred currency: ${snapshot.profile.preferredCurrency ?? "not set"}.`,
    `Net worth: ${formatNpr(totals.netWorthNpr)}.`,
    `Total assets: ${formatNpr(totals.totalAssetsNpr)}; liabilities/debt: ${formatNpr(totals.liabilitiesNpr)}.`,
    `Cash and fixed deposits: ${formatNpr(totals.liquidNpr + totals.fixedDepositsPrincipalNpr)} (cash ${formatNpr(totals.liquidNpr)}, FD principal ${formatNpr(totals.fixedDepositsPrincipalNpr)}).`,
    `Investments: ${formatNpr(totals.totalInvestmentNpr)} (listed total); retirement assets: ${formatNpr(totals.retirementNpr)}; real estate: ${formatNpr(totals.realEstateNpr)}; metals: ${formatNpr(totals.metalsNpr)}; vehicles: ${formatNpr(totals.vehiclesNpr)}.`,
    `Investable assets: ${formatNpr(totals.investableNpr)}; investment P/L: ${formatNpr(totals.investmentsPnlNpr)}.`,
    `Asset allocation:\n${[
      allocationLine("Cash + FD", totals.liquidNpr + totals.fixedDepositsPrincipalNpr, totalAssets),
      allocationLine("Investments", totals.totalInvestmentNpr, totalAssets),
      allocationLine("Retirement", totals.retirementNpr, totalAssets),
      allocationLine("Real estate", totals.realEstateNpr, totalAssets),
      allocationLine("Metals", totals.metalsNpr, totalAssets),
      allocationLine("Vehicles", totals.vehiclesNpr, totalAssets),
    ].filter(Boolean).join("\n") || "No positive asset allocation rows available."}`,
    `Wealth score: ${health.score == null ? "unavailable" : `${health.score}/${health.maxScore}`} (${health.statusLabel}).`,
    `Financial strengths: ${[hasCash ? "cash/FD base exists" : null, hasInvestments ? "investment or retirement assets are tracked" : null, !hasDebt ? "no synced liabilities" : null].filter(Boolean).join("; ") || "not enough data to identify strengths"}.`,
    `Areas for improvement: ${[hasDebt ? "review debt reduction plan" : null, !hasCash ? "add cash/FD data" : null, !hasInvestments ? "add investment/retirement data" : null].filter(Boolean).join("; ") || "continue updating data for sharper insights"}.`,
    snapshot.wealth.cashflowSynced
      ? `Synced cashflow is available for savings and FIRE calculations: income ${formatNpr(summary.monthlyIncome)}, expenses ${formatNpr(summary.monthlyExpenses)}, savings rate ${summary.savingsRatePct == null ? "unavailable" : formatPct(summary.savingsRatePct)}.`
      : "Cashflow is not synced yet, so do not claim savings rate, monthly savings, retirement date, or FIRE number unless the user provides those numbers in chat.",
  ]);
}
