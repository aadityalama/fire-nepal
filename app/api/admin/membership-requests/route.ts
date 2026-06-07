import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/verify-admin-api";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";

export async function GET() {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;

  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Service role is not configured" }, { status: 503 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const { count: pendingCount, error: pendErr } = await admin
    .from("membership_requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");
  if (pendErr) {
    return NextResponse.json({ error: pendErr.message }, { status: 500 });
  }

  const { data: reviewedToday, error: revErr } = await admin
    .from("membership_requests")
    .select("status")
    .not("reviewed_at", "is", null)
    .gte("reviewed_at", todayStart.toISOString())
    .lte("reviewed_at", todayEnd.toISOString());
  if (revErr) {
    return NextResponse.json({ error: revErr.message }, { status: 500 });
  }
  let approvedToday = 0;
  let rejectedToday = 0;
  for (const row of reviewedToday ?? []) {
    if (row.status === "approved") approvedToday += 1;
    if (row.status === "rejected") rejectedToday += 1;
  }

  const { data, error } = await admin
    .from("membership_requests")
    .select(
      "id, user_id, email, plan_type, payment_method, amount_npr, reference, created_at, status, reviewed_at, reviewed_by, proof_url",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    requests: data ?? [],
    stats: {
      pending: pendingCount ?? 0,
      approvedToday,
      rejectedToday,
    },
  });
}
