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

  const { data, error } = await admin
    .from("membership_requests")
    .select(
      "id, user_id, email, plan_type, payment_method, reference, created_at, status, reviewed_at, reviewed_by, proof_url",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ requests: data ?? [] });
}
