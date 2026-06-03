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
    .from("scheduled_reminders")
    .select(
      "id,user_id,title,amount,due_date,due_time,timezone,email,repeat_frequency,is_completed,created_at,updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(20000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  const headers = [
    "id",
    "user_id",
    "title",
    "amount",
    "due_date",
    "due_time",
    "timezone",
    "email",
    "repeat_frequency",
    "is_completed",
    "created_at",
    "updated_at",
  ];
  const rows = (data ?? []).map((r) =>
    headers.map((h) => {
      const v = (r as Record<string, unknown>)[h];
      if (v === null || v === undefined) return "";
      if (typeof v === "boolean") return v ? "true" : "false";
      return String(v);
    }),
  );

  const body = toCsv(headers, rows);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fire-nepal-reminders-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
