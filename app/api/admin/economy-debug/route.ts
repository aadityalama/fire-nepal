import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/verify-admin-api";
import { getEconomyDebugSnapshots } from "@/lib/economy/service";

export const runtime = "nodejs";

/** Admin-only economy engine diagnostics (latest DB rows + freshness). */
export async function GET() {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;

  try {
    const snapshots = await getEconomyDebugSnapshots();
    return NextResponse.json({
      ok: true,
      fetchedAt: new Date().toISOString(),
      metrics: snapshots,
    });
  } catch (error) {
    console.error("[admin/economy-debug] failed", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
