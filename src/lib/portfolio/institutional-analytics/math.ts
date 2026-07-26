/** Shared numeric helpers for institutional portfolio analytics. Never invent inputs. */

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function mean(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function sampleStdev(values: number[]): number | null {
  if (values.length < 2) return null;
  const m = mean(values);
  if (m == null) return null;
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function populationStdev(values: number[]): number | null {
  if (values.length < 2) return null;
  const m = mean(values);
  if (m == null) return null;
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function pctChange(from: number, to: number): number | null {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === 0) return null;
  return ((to - from) / from) * 100;
}

export function daysBetweenIso(fromIso: string, toIso: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromIso) || !/^\d{4}-\d{2}-\d{2}$/.test(toIso)) return null;
  const [fy, fm, fd] = fromIso.split("-").map(Number);
  const [ty, tm, td] = toIso.split("-").map(Number);
  const a = Date.UTC(fy, fm - 1, fd);
  const b = Date.UTC(ty, tm - 1, td);
  return Math.floor((b - a) / 86_400_000);
}

export function addCalendarDaysIso(iso: string, deltaDays: number): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

/**
 * Newton–Raphson XIRR on dated cashflows.
 * Amounts: negative = outflow (buy), positive = inflow (sell/dividend/terminal).
 * Returns annual rate as fraction (0.12 = 12%), or null when unsolvable.
 */
export function computeXirr(cashflows: { date: string; amount: number }[], guess = 0.1): number | null {
  const flows = cashflows
    .filter((cf) => Number.isFinite(cf.amount) && cf.amount !== 0 && /^\d{4}-\d{2}-\d{2}$/.test(cf.date))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (flows.length < 2) return null;
  const hasPos = flows.some((f) => f.amount > 0);
  const hasNeg = flows.some((f) => f.amount < 0);
  if (!hasPos || !hasNeg) return null;

  const t0 = Date.parse(`${flows[0]!.date}T00:00:00Z`);
  const years = flows.map((f) => (Date.parse(`${f.date}T00:00:00Z`) - t0) / (365.25 * 86_400_000));

  const npv = (rate: number) =>
    flows.reduce((sum, f, i) => sum + f.amount / Math.pow(1 + rate, years[i]!), 0);
  const dNpv = (rate: number) =>
    flows.reduce((sum, f, i) => {
      const y = years[i]!;
      return sum - (y * f.amount) / Math.pow(1 + rate, y + 1);
    }, 0);

  let rate = guess;
  for (let i = 0; i < 64; i++) {
    const f = npv(rate);
    const df = dNpv(rate);
    if (!Number.isFinite(f) || !Number.isFinite(df) || Math.abs(df) < 1e-12) break;
    const next = rate - f / df;
    if (!Number.isFinite(next) || next <= -0.999999) break;
    if (Math.abs(next - rate) < 1e-9) {
      return Number.isFinite(next) ? next : null;
    }
    rate = next;
  }

  // Bracketed bisection fallback for difficult cashflow shapes.
  let lo = -0.99;
  let hi = 10;
  let flo = npv(lo);
  let fhi = npv(hi);
  if (!Number.isFinite(flo) || !Number.isFinite(fhi) || flo * fhi > 0) return null;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const fm = npv(mid);
    if (!Number.isFinite(fm)) return null;
    if (Math.abs(fm) < 1e-8) return mid;
    if (flo * fm <= 0) {
      hi = mid;
      fhi = fm;
    } else {
      lo = mid;
      flo = fm;
    }
  }
  return (lo + hi) / 2;
}

export function linearRegressionBeta(assetReturns: number[], benchReturns: number[]): number | null {
  const n = Math.min(assetReturns.length, benchReturns.length);
  if (n < 20) return null;
  const a = assetReturns.slice(-n);
  const b = benchReturns.slice(-n);
  const meanA = mean(a);
  const meanB = mean(b);
  if (meanA == null || meanB == null) return null;
  let cov = 0;
  let varB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i]! - meanA;
    const db = b[i]! - meanB;
    cov += da * db;
    varB += db * db;
  }
  if (varB <= 0) return null;
  return cov / varB;
}

export function maxDrawdownPct(equity: number[]): number | null {
  if (equity.length < 2) return null;
  let peak = equity[0]!;
  let maxDd = 0;
  for (const v of equity) {
    if (!Number.isFinite(v) || v <= 0) continue;
    if (v > peak) peak = v;
    const dd = peak > 0 ? ((peak - v) / peak) * 100 : 0;
    if (dd > maxDd) maxDd = dd;
  }
  return maxDd;
}

export function sharpeFromDailyReturns(dailyReturns: number[], riskFreeDaily = 0): number | null {
  if (dailyReturns.length < 20) return null;
  const excess = dailyReturns.map((r) => r - riskFreeDaily);
  const m = mean(excess);
  const s = sampleStdev(excess);
  if (m == null || s == null || s === 0) return null;
  return (m / s) * Math.sqrt(252);
}

export function sortinoFromDailyReturns(dailyReturns: number[], riskFreeDaily = 0): number | null {
  if (dailyReturns.length < 20) return null;
  const excess = dailyReturns.map((r) => r - riskFreeDaily);
  const m = mean(excess);
  if (m == null) return null;
  const downside = excess.filter((r) => r < 0);
  if (downside.length < 2) return null;
  const downDev = sampleStdev(downside);
  if (downDev == null || downDev === 0) return null;
  return (m / downDev) * Math.sqrt(252);
}
