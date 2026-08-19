import { NextResponse } from "next/server";

/**
 * Temporary kill-switch for the Premium NEPSE Hub product surface only.
 *
 * Hub-only (disabled while true):
 * - `/market` UI (terminal, screener, company pages, live polls, 52w scans)
 * - Hub-only APIs listed below
 *
 * Must remain enabled:
 * - NEPSE Portfolio / My NEPSE Holdings (`/portfolio/investments`)
 * - Shared APIs: `/api/market/summary`, `/api/market/gold-price`,
 *   `/api/market/nepse/search`, `/api/market/nepse/portfolio-analytics-context`
 *
 * Do not use this flag to skip portfolio RLS, auth, or holdings queries.
 */
export const NEPSE_HUB_TEMPORARILY_DISABLED = true;

export const NEPSE_HUB_MAINTENANCE_MESSAGE = "We are working on it";

export const NEPSE_HUB_MAINTENANCE_DETAIL =
  "Premium NEPSE Hub is temporarily unavailable. Your NEPSE Portfolio and My NEPSE Holdings are unchanged.";

/** JSON body for Hub-only API routes. Never attach this to shared portfolio/holdings APIs. */
export function nepseHubMaintenanceResponse(): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      disabled: true,
      error: "NEPSE Hub is temporarily unavailable.",
      message: NEPSE_HUB_MAINTENANCE_MESSAGE,
    },
    {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": "86400",
      },
    },
  );
}
