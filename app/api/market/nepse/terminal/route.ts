import { NextRequest, NextResponse } from "next/server";
import { guardPublicApi } from "@/lib/api/public-api-guard";
import { loadTerminalBoard } from "@/services/market/nepse-terminal-board";

/** Professional market terminal board: indices, movers, heatmap, breadth. */
export async function GET(req: NextRequest) {
  const blocked = guardPublicApi(req, { keyPrefix: "nepse-terminal", max: 30, botMax: 6 });
  if (blocked) return blocked;

  try {
    const payload = await loadTerminalBoard();
    return NextResponse.json(payload, {
      headers: { "cache-control": "public, max-age=30, s-maxage=90, stale-while-revalidate=180" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load terminal board";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
