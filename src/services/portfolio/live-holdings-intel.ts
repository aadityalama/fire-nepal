import { valueInvestmentRow } from "@/components/portfolio/calculations";
import type { InvestmentRow } from "@/components/portfolio/types";
import { getInstrumentByKey } from "@/lib/investment-market/catalog";
import { estimateSipIrrAnnualPct } from "@/services/portfolio/sip-irr";
import type { MarketSnapshot } from "@/types/market";

function annualizedCagrRatio(costNpr: number, liveNpr: number, purchaseIso: string | undefined): number | null {
  if (!purchaseIso?.trim() || costNpr <= 0 || liveNpr <= 0) return null;
  const start = new Date(`${purchaseIso.trim()}T12:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
  const years = (Date.now() - start.getTime()) / msPerYear;
  if (years < 1 / 365) return null;
  const ratio = liveNpr / costNpr;
  if (!Number.isFinite(ratio) || ratio <= 0) return null;
  return ratio ** (1 / years) - 1;
}

function monthsHeld(startIso: string | undefined): number | null {
  if (!startIso?.trim()) return null;
  const start = new Date(`${startIso.trim()}T12:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  const months = (Date.now() - start.getTime()) / (30.44 * 24 * 60 * 60 * 1000);
  return months >= 1 ? Math.floor(months) : null;
}

function nepseQuoteSymbol(row: InvestmentRow): string | undefined {
  const inst = getInstrumentByKey(row.instrumentKey);
  if (inst?.universe === "nepse") return inst.symbol.toUpperCase();
  if (inst?.universe === "closed_end_mf") return inst.ticker.toUpperCase();
  if (inst?.universe === "open_end_mf") {
    const code = inst.key.split(":").pop()?.toUpperCase();
    return code || undefined;
  }
  return undefined;
}

export type HoldingRealtimeMetrics = {
  rowId: string;
  label: string;
  /** NEPSE board symbol when this row maps to the live NEPSE map (equities / listed MF). */
  nepseQuoteSymbol?: string;
  liveValueNpr: number;
  unrealizedPnlNpr: number;
  dayChangePct: number | null;
  allocationVsInvestmentsPct: number;
  fireNetWorthImpactPct: number;
  cagrAnnualizedPct: number | null;
  sipGrowthIrrPct: number | null;
};

export function buildHoldingRealtimeMetrics(
  rows: InvestmentRow[],
  krwPerNpr: number,
  usdPerNpr: number,
  live: MarketSnapshot | null,
  netWorthLiveNpr: number,
): HoldingRealtimeMetrics[] {
  let investmentsLivePool = 0;
  const marks = rows.map((row) => ({
    row,
    v: valueInvestmentRow(row, krwPerNpr, usdPerNpr, live),
  }));
  for (const { v } of marks) investmentsLivePool += v.liveValueNpr;

  const nw = Math.max(netWorthLiveNpr, 1e-9);

  return marks.map(({ row, v }) => {
    const sym = nepseQuoteSymbol(row);
    let dayChangePct: number | null = null;
    if (sym && live) {
      const t = live.nepseBySymbol[sym];
      if (t?.changePct != null && Number.isFinite(t.changePct)) dayChangePct = t.changePct;
    }

    const cagrRatio = annualizedCagrRatio(v.costNpr, v.liveValueNpr, row.purchaseDate);
    const cagrAnnualizedPct = cagrRatio != null && Number.isFinite(cagrRatio) ? cagrRatio * 100 : null;

    const allocationVsInvestmentsPct =
      investmentsLivePool > 0 ? (v.liveValueNpr / investmentsLivePool) * 100 : 0;
    const fireNetWorthImpactPct = (v.liveValueNpr / nw) * 100;

    let sipGrowthIrrPct: number | null = null;
    if (row.kind === "sip" && row.sipMonthlyContributionNpr && row.sipMonthlyContributionNpr > 0) {
      const anchor = row.sipStartedAt ?? row.purchaseDate;
      const mo = monthsHeld(anchor);
      if (mo != null) {
        sipGrowthIrrPct = estimateSipIrrAnnualPct({
          monthlyContributionNpr: row.sipMonthlyContributionNpr,
          months: mo,
          currentValueNpr: v.liveValueNpr,
        });
      }
    }

    return {
      rowId: row.id,
      label: row.name.trim() || "Untitled",
      nepseQuoteSymbol: sym,
      liveValueNpr: v.liveValueNpr,
      unrealizedPnlNpr: v.pnlNpr,
      dayChangePct,
      allocationVsInvestmentsPct,
      fireNetWorthImpactPct,
      cagrAnnualizedPct,
      sipGrowthIrrPct,
    };
  });
}
