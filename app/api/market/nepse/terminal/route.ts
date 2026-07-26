import { NextResponse } from "next/server";
import { loadTerminalBoard } from "@/services/market/nepse-terminal-board";

/** Professional market terminal board: indices, movers, heatmap, breadth. */
export async function GET() {
  try {
    const payload = await loadTerminalBoard();
    return NextResponse.json(payload, {
      headers: { "cache-control": "public, max-age=15, s-maxage=20, stale-while-revalidate=60" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load terminal board";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
