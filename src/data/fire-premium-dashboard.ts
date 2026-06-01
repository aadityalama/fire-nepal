/** NPR / USD display helpers for the premium portfolio shell (no seed portfolio data). */

export type NetWorthPoint = {
  label: string;
  nw: number;
  milestone?: string;
};

export function nprToUsdLabel(npr: number, usdPerNpr: number): string {
  const usd = npr * usdPerNpr;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: usd >= 100_000 ? 0 : 2,
  }).format(usd);
}

export function formatNpr(npr: number, compact = false): string {
  if (compact && npr >= 1_000_000) {
    const m = npr / 1_000_000;
    return `NPR ${m.toFixed(2)}M`;
  }
  return new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(npr);
}
