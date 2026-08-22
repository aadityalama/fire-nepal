import { NextResponse } from "next/server";
import { loadIndexExplorer } from "@/services/market/nepse-index-explorer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Official NEPSE Index Explorer board — all indices with live/EOD levels + Company Master counts. */
export async function GET() {
  const payload = await loadIndexExplorer();
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, s-maxage=15, stale-while-revalidate=45",
    },
  });
}
