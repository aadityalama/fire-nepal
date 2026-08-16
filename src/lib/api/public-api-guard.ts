import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/api/rate-limit";

/**
 * Soft bot classifier for public JSON APIs.
 * Allows major search/social bots at a reduced budget; throttles scrapers harder.
 */
export function isSuspiciousBotUserAgent(ua: string | null): boolean {
  const value = (ua ?? "").trim();
  if (value.length < 12) return true;
  if (
    /googlebot|bingbot|applebot|duckduckbot|slurp|yandex(bot)?|baiduspider|facebookexternalhit|twitterbot|linkedinbot|embedly|quora link preview|redditbot|slackbot|whatsapp|telegrambot/i.test(
      value,
    )
  ) {
    return false;
  }
  return /(?:^|[^a-z])(?:bot|crawler|spider|scrapy|httpclient|python-requests|go-http-client|curl\/|wget\/|libwww|aiohttp|okhttp|headlesschrome|phantomjs|selenium|puppeteer|playwright|bytespider|semrush|ahrefs|dataforseo|mj12bot|dotbot|petalbot)(?:[^a-z]|$)/i.test(
    value,
  );
}

/**
 * Rate-limit public market/intel routes. Suspicious UAs get a tighter budget.
 * Returns a 429 response when limited; otherwise null.
 */
export function guardPublicApi(
  req: NextRequest,
  opts: { keyPrefix: string; max: number; windowMs?: number; botMax?: number },
): NextResponse | null {
  const windowMs = opts.windowMs ?? 60_000;
  const ua = req.headers.get("user-agent");
  const suspicious = isSuspiciousBotUserAgent(ua);
  const max = suspicious ? (opts.botMax ?? Math.max(4, Math.floor(opts.max / 4))) : opts.max;
  const keyPrefix = suspicious ? `${opts.keyPrefix}:bot` : opts.keyPrefix;
  const rl = checkRateLimit(req, { windowMs, max, keyPrefix });
  if (rl.ok) return null;
  return NextResponse.json(
    { error: "Too many requests", retryAfterSec: rl.retryAfterSec },
    {
      status: 429,
      headers: {
        "Retry-After": String(rl.retryAfterSec),
        "Cache-Control": "private, no-store",
      },
    },
  );
}
