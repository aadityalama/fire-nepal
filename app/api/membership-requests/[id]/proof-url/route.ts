import { NextResponse } from "next/server";
import { MEMBERSHIP_PAYMENT_BUCKET } from "@/lib/membership-payment";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type RouteParams = { params: Promise<{ id: string }> };

/** Signed URL for the request owner to preview or download their proof (short-lived). */
export async function GET(_request: Request, ctx: RouteParams) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const { id } = await ctx.params;
  if (!id || id.length < 10) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: row, error } = await supabase
      .from("membership_requests")
      .select("user_id, proof_url")
      .eq("id", id)
      .maybeSingle();

    if (error || !row || row.user_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const admin = createSupabaseServiceRoleClient();
    if (!admin) {
      return NextResponse.json({ error: "Server storage is not configured." }, { status: 503 });
    }

    const { data: signed, error: signErr } = await admin.storage
      .from(MEMBERSHIP_PAYMENT_BUCKET)
      .createSignedUrl(row.proof_url, 120);

    if (signErr || !signed?.signedUrl) {
      return NextResponse.json({ error: signErr?.message ?? "Could not sign URL" }, { status: 500 });
    }

    return NextResponse.json({ signedUrl: signed.signedUrl, expiresIn: 120 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
