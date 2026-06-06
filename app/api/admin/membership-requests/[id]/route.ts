import { NextResponse } from "next/server";
import { MEMBERSHIP_PLAN_PRICE_NPR, type MembershipRequestPlan } from "@/lib/membership-payment";
import { requireAdminApi } from "@/lib/admin/verify-admin-api";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";

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

  // approve
  const plan = row.plan_type as MembershipRequestPlan;
  const amountNpr = MEMBERSHIP_PLAN_PRICE_NPR[plan];
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

  const { error: profErr } = await admin.from("profiles").upsert(
    { id: row.user_id, plan_type: plan, updated_at: now },
    { onConflict: "id" },
  );

  if (profErr) {
    return NextResponse.json({ error: `Profile update failed: ${profErr.message}` }, { status: 500 });
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
    amount_npr: amountNpr,
    kind: "subscription",
    note: `Manual membership approval (${plan})`,
    external_ref: `membership_request:${id}`,
  });

  if (revErr) {
    return NextResponse.json({ error: `Revenue log failed: ${revErr.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: "approved", plan, current_period_end: periodEnd });
}
