import { NextResponse } from "next/server";
import { listAllAuthUsers } from "@/lib/admin/list-all-auth-users";
import { requireAdminApi, toCsv } from "@/lib/admin/verify-admin-api";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";

export async function GET() {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;

  const sb = createSupabaseServiceRoleClient();
  if (!sb) {
    return NextResponse.json({ error: "Service role not configured" }, { status: 503 });
  }

  const { users, error } = await listAllAuthUsers();
  if (error) {
    return NextResponse.json({ error }, { status: 502 });
  }

  const { data: profiles } = await sb.from("profiles").select("id, plan_type");
  const { data: names } = await sb.from("user_profiles").select("id, display_name");
  const planBy = new Map((profiles ?? []).map((p) => [p.id, p.plan_type]));
  const nameBy = new Map((names ?? []).map((n) => [n.id, n.display_name]));

  const headers = ["id", "email", "display_name", "plan_type", "created_at", "last_sign_in_at", "email_confirmed_at"];
  const rows = users.map((u) => {
    const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
    const metaName =
      (typeof meta.name === "string" && meta.name) ||
      (typeof meta.full_name === "string" && meta.full_name) ||
      "";
    const display = (nameBy.get(u.id) ?? "").trim() || metaName;
    return [
      u.id,
      u.email ?? "",
      display,
      planBy.get(u.id) ?? "free",
      u.created_at ?? "",
      u.last_sign_in_at ?? "",
      u.email_confirmed_at ?? "",
    ];
  });

  const body = toCsv(headers, rows);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fire-nepal-users-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
