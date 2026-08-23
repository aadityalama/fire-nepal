import { NextResponse } from "next/server";
import { refreshEconomyMetrics } from "@/lib/economy/service";
import type { EconomyMetricKey } from "@/lib/economy/types";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Nepal Economy refresh job.
 * Auth: Authorization: Bearer <CRON_SECRET> when CRON_SECRET is set.
 *
 * Do NOT register this in vercel.json — use Supabase pg_cron / GitHub Actions /
 * or another non-Vercel scheduler.
 *
 * Manual:
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *     "https://www.firenepal.com/api/cron/nepal-economy-refresh?force=1"
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";
  const keysParam = url.searchParams.get("keys");
  const keys = keysParam
    ? (keysParam
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean) as EconomyMetricKey[])
    : undefined;

  try {
    const report = await refreshEconomyMetrics({ force, keys });
    return NextResponse.json(
      {
        ok: report.ok,
        startedAt: report.startedAt,
        finishedAt: report.finishedAt,
        items: report.items,
        errors: report.errors,
      },
      { status: report.ok ? 200 : 500 },
    );
  } catch (error) {
    console.error("[cron/nepal-economy-refresh] failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
