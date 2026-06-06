import { NextResponse } from "next/server";
import { MEMBERSHIP_PAYMENT_BUCKET } from "@/lib/membership-payment";
import { requireAdminApi } from "@/lib/admin/verify-admin-api";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: RouteParams) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Service role is not configured" }, { status: 503 });
  }

  const { data: row, error } = await admin
    .from("membership_requests")
    .select("proof_storage_path")
    .eq("id", id)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: signed, error: signErr } = await admin.storage
    .from(MEMBERSHIP_PAYMENT_BUCKET)
    .createSignedUrl(row.proof_storage_path, 600);

  if (signErr || !signed?.signedUrl) {
    return NextResponse.json({ error: signErr?.message ?? "Could not sign URL" }, { status: 500 });
  }

  return NextResponse.json({ signedUrl: signed.signedUrl, expiresIn: 600 });
}
