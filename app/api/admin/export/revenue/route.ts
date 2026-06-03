import { NextResponse } from "next/server";
import { requireAdminApi, toCsv } from "@/lib/admin/verify-admin-api";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";

export async function GET() {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;

  const sb = createSupabaseServiceRoleClient();
  if (!sb) {
    return NextResponse.json({ error: "Service role not configured" }, { status: 503 });
  }

  const { data, error } = await sb
    .from("revenue_events")
    .select("id,user_id,amount_npr,kind,note,external_ref,created_at")
    .order("created_at", { ascending: false })
    .limit(20000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  const headers = ["id", "user_id", "amount_npr", "kind", "note", "external_ref", "created_at"];
  const rows = (data ?? []).map((r) =>
    headers.map((h) => {
      const v = (r as Record<string, unknown>)[h];
      if (v === null || v === undefined) return "";
      return String(v);
    }),
  );

  const body = toCsv(headers, rows);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fire-nepal-revenue-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
