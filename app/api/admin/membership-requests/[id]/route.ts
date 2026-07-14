import { NextResponse } from "next/server";
import { type MembershipRequestPlan } from "@/lib/membership-payment";
import { requireAdminApi } from "@/lib/admin/verify-admin-api";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { writeMembership } from "@/services/membership-service";

type RouteParams = { params: Promise<{ id: string }> };

type Body = { action?: string };

export async function PATCH(request: Request, ctx: RouteParams) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;
  const adminUserId = gate.userId;

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action === "approve" || body.action === "reject" ? body.action : null;
  if (!action) {
    return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });
  }

  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Service role is not configured" }, { status: 503 });
  }

  const { data: row, error: fetchErr } = await admin.from("membership_requests").select("*").eq("id", id).maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (row.status !== "pending") {
    return NextResponse.json({ error: "Request is not pending" }, { status: 409 });
  }

  const now = new Date().toISOString();

  if (action === "reject") {
    const { error: updErr } = await admin
      .from("membership_requests")
      .update({
        status: "rejected",
        reviewed_at: now,
        reviewed_by: adminUserId,
      })
      .eq("id", id);

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  // approve — NPR amount and plan snapshot come from the request row (price at submission time).
  const plan = row.plan_type as MembershipRequestPlan;
  const amountNpr = Number((row as { amount_npr?: unknown }).amount_npr);
  if (!Number.isFinite(amountNpr) || amountNpr <= 0) {
    return NextResponse.json(
      { error: "This membership request has no valid amount_npr; apply DB migrations and ensure new requests store amount_npr." },
      { status: 500 },
    );
  }
  const paymentMethod = (row as { payment_method?: string }).payment_method;
  if (paymentMethod !== "khalti_qr" && paymentMethod !== "esewa_qr" && paymentMethod !== "global_ime_qr") {
    return NextResponse.json({ error: "Request has invalid payment_method" }, { status: 500 });
  }

  const periodStart = now;
  const periodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  const { error: reqErr } = await admin
    .from("membership_requests")
    .update({
      status: "approved",
      reviewed_at: now,
      reviewed_by: adminUserId,
    })
    .eq("id", id);

  if (reqErr) {
    return NextResponse.json({ error: reqErr.message }, { status: 500 });
  }

  // 1) Write SOT first (user_profiles via MembershipService)
  try {
    await writeMembership(admin, row.user_id, {
      plan,
      membershipStart: periodStart,
      membershipExpiry: periodEnd,
      suspendedAt: null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "User profile membership sync failed" },
      { status: 500 },
    );
  }

  // 2) Mirror to profiles for legacy admin tooling (reads must still use user_profiles)
  const { data: existingProfile } = await admin.from("profiles").select("*").eq("id", row.user_id).maybeSingle();
  const { error: profErr } = await admin.from("profiles").upsert(
    {
      id: row.user_id,
      plan_type: plan,
      last_active_at: (existingProfile as { last_active_at?: string | null } | null)?.last_active_at ?? null,
      membership_activated_at:
        (existingProfile as { membership_activated_at?: string | null } | null)?.membership_activated_at ??
        periodStart,
      expires_at: periodEnd,
      suspended_at: null,
      updated_at: now,
    },
    { onConflict: "id" },
  );

  if (profErr) {
    return NextResponse.json({ error: `Profile mirror update failed: ${profErr.message}` }, { status: 500 });
  }

  const amount_minor = Math.round(amountNpr * 100);

  const { error: subErr } = await admin.from("subscriptions").upsert(
    {
      user_id: row.user_id,
      plan,
      status: "active",
      amount_minor,
      currency: "NPR",
      current_period_start: periodStart,
      current_period_end: periodEnd,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );

  if (subErr) {
    return NextResponse.json({ error: `Subscription upsert failed: ${subErr.message}` }, { status: 500 });
  }

  const { error: revErr } = await admin.from("revenue_events").insert({
    user_id: row.user_id,
    membership_request_id: id,
    plan_type: plan,
    amount_npr: amountNpr,
    payment_method: paymentMethod,
    event_type: "membership_payment",
    kind: "subscription",
    created_at: now,
    external_ref: `membership_request:${id}`,
  });

  if (revErr) {
    return NextResponse.json({ error: `Revenue log failed: ${revErr.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: "approved", plan, current_period_end: periodEnd });
}
