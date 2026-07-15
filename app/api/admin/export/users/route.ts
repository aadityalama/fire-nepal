import { NextResponse } from "next/server";
import { listAllAuthUsers } from "@/lib/admin/list-all-auth-users";
import { requireAdminApi, toCsv } from "@/lib/admin/verify-admin-api";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { getMembershipMapByUserIds } from "@/services/membership-service";

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

  let membershipBy: Awaited<ReturnType<typeof getMembershipMapByUserIds>>;
  try {
    membershipBy = await getMembershipMapByUserIds(
      sb,
      users.map((u) => u.id),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Membership batch load failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
  const { data: names } = await sb.from("user_profiles").select("id, full_name");
  const nameBy = new Map((names ?? []).map((n) => [n.id, n.full_name]));

  const headers = [
    "id",
    "email",
    "full_name",
    "plan_type",
    "expires_at",
    "suspended_at",
    "archived_at",
    "created_at",
    "last_sign_in_at",
    "email_confirmed_at",
  ];
  const rows = users.map((u) => {
    const display = (nameBy.get(u.id) ?? "").trim();
    const m = membershipBy.get(u.id);
    return [
      u.id,
      u.email ?? "",
      display,
      m?.plan ?? "free",
      m?.membershipExpiry ?? "",
      // Null-safe CSV cells when access flags are absent pre-migration.
      m?.suspendedAt ?? "",
      m?.archivedAt ?? "",
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
