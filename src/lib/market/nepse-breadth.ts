import type { NepseSecurityTick } from "@/types/market";
import type { NepseSortDirection, NepseTableSortKey } from "@/types/market/terminal-ui";

export const NEPSE_BREADTH_CATEGORIES = [
  {
    slug: "all-listed",
    label: "All Listed Companies",
    description: "Every company with a live quote on NEPSE today",
    showRank: false,
    showSector: true,
    showMarketCap: true,
  },
  {
    slug: "advanced",
    label: "Advanced",
    description: "Companies trading higher than previous close",
    showRank: true,
    showSector: false,
    showMarketCap: false,
  },
  {
    slug: "declined",
    label: "Declined",
    description: "Companies trading lower than previous close",
    showRank: true,
    showSector: false,
    showMarketCap: false,
  },
  {
    slug: "unchanged",
    label: "Unchanged",
    description: "Companies flat versus previous close",
    showRank: true,
    showSector: false,
    showMarketCap: false,
  },
  {
    slug: "upper-circuit",
    label: "Upper Circuit",
    description: "Companies at or near the upper price band",
    showRank: true,
    showSector: false,
    showMarketCap: false,
  },
  {
    slug: "lower-circuit",
    label: "Lower Circuit",
    description: "Companies at or near the lower price band",
    showRank: true,
    showSector: false,
    showMarketCap: false,
  },
] as const;

export type NepseBreadthCategory = (typeof NEPSE_BREADTH_CATEGORIES)[number]["slug"];

const CATEGORY_SET = new Set<string>(NEPSE_BREADTH_CATEGORIES.map((item) => item.slug));

export function isNepseBreadthCategory(value: string): value is NepseBreadthCategory {
  return CATEGORY_SET.has(value);
}

export function getBreadthCategoryMeta(slug: NepseBreadthCategory) {
  return NEPSE_BREADTH_CATEGORIES.find((item) => item.slug === slug)!;
}

function hasQuote(tick: NepseSecurityTick): boolean {
  return Number.isFinite(tick.ltpNpr) && tick.ltpNpr > 0;
}

/** Matches server-side breadth thresholds in buildNepseTerminalSnapshot. */
export function filterCompaniesByBreadth(
  ticks: NepseSecurityTick[],
  category: NepseBreadthCategory,
): NepseSecurityTick[] {
  const listed = ticks.filter(hasQuote);

  switch (category) {
    case "all-listed":
      return listed;
    case "advanced":
      return listed.filter((tick) => {
        const change = tick.changePct;
        // Official NEPSE homepage: percentageChange > 0
        return change != null && Number.isFinite(change) && change > 0;
      });
    case "declined":
      return listed.filter((tick) => {
        const change = tick.changePct;
        return change != null && Number.isFinite(change) && change < 0;
      });
    case "unchanged":
      return listed.filter((tick) => {
        const change = tick.changePct;
        return change != null && Number.isFinite(change) && change === 0;
      });
    case "upper-circuit":
      return listed.filter((tick) => {
        const change = tick.changePct;
        return change != null && Number.isFinite(change) && change >= 9.9;
      });
    case "lower-circuit":
      return listed.filter((tick) => {
        const change = tick.changePct;
        return change != null && Number.isFinite(change) && change <= -9.9;
      });
    default:
      return listed;
  }
}

export function getDefaultSortForBreadth(
  category: NepseBreadthCategory,
): { key: NepseTableSortKey; direction: NepseSortDirection } {
  switch (category) {
    case "advanced":
      return { key: "changePct", direction: "desc" };
    case "declined":
      return { key: "changePct", direction: "asc" };
    case "unchanged":
      return { key: "symbol", direction: "asc" };
    case "upper-circuit":
    case "lower-circuit":
      return { key: "turnoverNpr", direction: "desc" };
    case "all-listed":
    default:
      return { key: "symbol", direction: "asc" };
  }
}

export function compareNepseTicks(
  a: NepseSecurityTick,
  b: NepseSecurityTick,
  key: NepseTableSortKey,
  direction: NepseSortDirection,
): number {
  const factor = direction === "asc" ? 1 : -1;

  const stringCompare = (left: string, right: string) => left.localeCompare(right, "en", { sensitivity: "base" });

  switch (key) {
    case "symbol":
      return factor * stringCompare(a.symbol, b.symbol);
    case "companyName":
      return factor * stringCompare(a.companyName ?? a.symbol, b.companyName ?? b.symbol);
    case "sector":
      return factor * stringCompare(a.sector ?? "", b.sector ?? "");
    case "ltpNpr":
      return factor * ((a.ltpNpr ?? 0) - (b.ltpNpr ?? 0));
    case "changePct":
      return factor * ((a.changePct ?? -Infinity) - (b.changePct ?? -Infinity));
    case "changeNpr":
      return factor * ((a.changeNpr ?? -Infinity) - (b.changeNpr ?? -Infinity));
    case "volume":
      return factor * ((a.volume ?? 0) - (b.volume ?? 0));
    case "turnoverNpr":
      return factor * ((a.turnoverNpr ?? 0) - (b.turnoverNpr ?? 0));
    case "marketCap":
      return factor * ((a.marketCap ?? 0) - (b.marketCap ?? 0));
    case "intradayRangePct":
      return factor * ((a.intradayRangePct ?? 0) - (b.intradayRangePct ?? 0));
    default:
      return 0;
  }
}

export function sortNepseTicks(
  ticks: NepseSecurityTick[],
  key: NepseTableSortKey,
  direction: NepseSortDirection,
): NepseSecurityTick[] {
  return [...ticks].sort((a, b) => compareNepseTicks(a, b, key, direction));
}

export function collectSectors(ticks: NepseSecurityTick[]): string[] {
  const sectors = new Set<string>();
  for (const tick of ticks) {
    const label = (tick.sector ?? "").trim();
    if (label) sectors.add(label);
  }
  return [...sectors].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
}
