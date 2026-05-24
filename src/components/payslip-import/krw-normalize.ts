/**
 * Normalize Korean won strings from OCR: commas, spaces, 원, 만/천 units, noisy digits.
 */

const MAN = 10_000;
const CHEON = 1_000;

function stripNoise(s: string): string {
  return s
    .replace(/\u00a0/g, " ")
    .replace(/[₩]/g, "")
    .replace(/원/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract first plausible integer from mixed OCR garbage. */
function digitsOnlyLoose(s: string): string {
  const m = s.replace(/[^\d]/g, "");
  return m;
}

/**
 * Parse KRW amount from OCR text.
 * Handles: 2,450,000 / 2450000 / 245만 / 245만원 / 1,234만 5천
 */
export function parseKrwFromOcrText(raw: string | undefined | null): number | null {
  if (raw == null || typeof raw !== "string") return null;
  let s = stripNoise(raw);
  if (!s) return null;

  let total = 0;

  // 만 (10_000) chunks
  const manMatch = s.match(/([\d,.]+)\s*만/);
  if (manMatch) {
    const n = parseFloat(manMatch[1]!.replace(/,/g, ""));
    if (Number.isFinite(n)) total += Math.round(n * MAN);
    s = s.replace(manMatch[0], " ");
  }

  // 천
  const cheonMatch = s.match(/([\d,.]+)\s*천/);
  if (cheonMatch) {
    const n = parseFloat(cheonMatch[1]!.replace(/,/g, ""));
    if (Number.isFinite(n)) total += Math.round(n * CHEON);
    s = s.replace(cheonMatch[0], " ");
  }

  // Remaining comma-separated number
  const rest = digitsOnlyLoose(s);
  if (rest.length > 0) {
    const v = parseInt(rest, 10);
    if (Number.isFinite(v)) total += v;
  }

  if (total <= 0) return null;
  return total;
}

/** Convert KRW → NPR given KRW per 1 NPR (e.g. ~9.27). */
export function krwToNpr(krw: number, krwPerNpr: number): number {
  if (!Number.isFinite(krw) || !Number.isFinite(krwPerNpr) || krwPerNpr <= 0) return 0;
  return krw / krwPerNpr;
}
