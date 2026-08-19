import { NextResponse } from "next/server";
import {
  NEPSE_HUB_TEMPORARILY_DISABLED,
  nepseHubMaintenanceResponse,
} from "@/lib/market/nepse-hub-maintenance";
import { loadTerminalBoard } from "@/services/market/nepse-terminal-board";

/** Professional market terminal board: indices, movers, heatmap, breadth. Hub-only. */
export async function GET() {
  if (NEPSE_HUB_TEMPORARILY_DISABLED) return nepseHubMaintenanceResponse();
  try {
    const payload = await loadTerminalBoard();
    return NextResponse.json(payload, {
      headers: { "cache-control": "public, max-age=20, s-maxage=30, stale-while-revalidate=90" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load terminal board";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
