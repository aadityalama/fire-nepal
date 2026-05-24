import type { NextRequest } from "next/server";

type Bucket = { resetAt: number; count: number };

const globalBuckets = new Map<string, Bucket>();

function clientKey(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "global";
}

/**
 * Simple sliding-window style limiter keyed by client IP (best-effort).
 */
export function checkRateLimit(
  req: NextRequest,
  opts: { windowMs: number; max: number; keyPrefix: string },
): { ok: true } | { ok: false; retryAfterSec: number } {
  const key = `${opts.keyPrefix}:${clientKey(req)}`;
  const now = Date.now();
  let b = globalBuckets.get(key);
  if (!b || now > b.resetAt) {
    b = { resetAt: now + opts.windowMs, count: 0 };
    globalBuckets.set(key, b);
  }
  if (b.count >= opts.max) {
    const retryAfterSec = Math.max(1, Math.ceil((b.resetAt - now) / 1000));
    return { ok: false, retryAfterSec };
  }
  b.count += 1;
  return { ok: true };
}
