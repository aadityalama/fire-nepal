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

  const { data: profiles } = await sb.from("profiles").select("id, plan_type, expires_at, suspended_at, archived_at");
  const { data: names } = await sb.from("user_profiles").select("id, display_name");
  const planBy = new Map((profiles ?? []).map((p) => [p.id, p.plan_type]));
  const nameBy = new Map((names ?? []).map((n) => [n.id, n.display_name]));

  const expBy = new Map(
    (profiles ?? []).map((p) => [p.id, (p as { expires_at?: string | null }).expires_at ?? ""]),
  );
  const suspBy = new Map(
    (profiles ?? []).map((p) => [p.id, (p as { suspended_at?: string | null }).suspended_at ?? ""]),
  );

  const archBy = new Map(
    (profiles ?? []).map((p) => [p.id, (p as { archived_at?: string | null }).archived_at ?? ""]),
  );

  const headers = [
    "id",
    "email",
    "display_name",
    "plan_type",
    "expires_at",
    "suspended_at",
    "archived_at",
    "created_at",
    "last_sign_in_at",
    "email_confirmed_at",
  ];
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
      expBy.get(u.id) ?? "",
      suspBy.get(u.id) ?? "",
      archBy.get(u.id) ?? "",
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
