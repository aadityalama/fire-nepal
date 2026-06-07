import { addDays } from "date-fns";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/verify-admin-api";
import { insertAdminMemberCrmEvent } from "@/lib/admin/member-crm-events";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";

type RouteParams = { params: Promise<{ userId: string }> };

type Body = {
  action?: string;
  /** Renew: calendar days to add from max(now, current expiry). Default 365. */
  extendDays?: number;
  /** Optional NPR amount recorded on renewal (ledger / audit). Default 0. */
  amountNpr?: number;
};

export async function PATCH(request: Request, ctx: RouteParams) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;
  const adminUserId = gate.userId;

  const { userId } = await ctx.params;
  if (!userId) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action =
    body.action === "renew" || body.action === "suspend" || body.action === "reactivate" ? body.action : null;
  if (!action) {
    return NextResponse.json({ error: "action must be renew, suspend, or reactivate" }, { status: 400 });
  }

  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Service role is not configured" }, { status: 503 });
  }

  const nowIso = new Date().toISOString();
  const now = new Date();

  const { data: profile, error: profFetchErr } = await admin.from("profiles").select("*").eq("id", userId).maybeSingle();

  if (profFetchErr) {
    return NextResponse.json({ error: profFetchErr.message }, { status: 500 });
  }

  if (!profile) {
    return NextResponse.json({ error: "Profile not found for this user" }, { status: 404 });
  }

  if (action === "suspend") {
    const { data: updated, error: updErr } = await admin
      .from("profiles")
      .update({ suspended_at: nowIso, updated_at: nowIso })
      .eq("id", userId)
      .select("id");
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }
    if (!updated?.length) {
      return NextResponse.json({ error: "Profile not found for this user" }, { status: 404 });
    }
    const log = await insertAdminMemberCrmEvent(admin, {
      user_id: userId,
      event_type: "user_suspended",
      title: "Membership suspended",
      body: "Paid access blocked until reactivation.",
      actor_id: adminUserId,
    });
    if (!log.ok) console.error("[admin/members] crm event suspend:", log.message);
    return NextResponse.json({ ok: true, status: "suspended", actor: adminUserId });
  }

  if (action === "reactivate") {
    const { data: updated, error: updErr } = await admin
      .from("profiles")
      .update({ suspended_at: null, updated_at: nowIso })
      .eq("id", userId)
      .select("id");
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }
    if (!updated?.length) {
      return NextResponse.json({ error: "Profile not found for this user" }, { status: 404 });
    }
    const logR = await insertAdminMemberCrmEvent(admin, {
      user_id: userId,
      event_type: "user_reactivated",
      title: "Membership reactivated",
      body: "Suspension cleared.",
      actor_id: adminUserId,
    });
    if (!logR.ok) console.error("[admin/members] crm event reactivate:", logR.message);
    return NextResponse.json({ ok: true, status: "reactivated", actor: adminUserId });
  }

  // renew
  const plan = (profile as { plan_type?: string } | null)?.plan_type;
  if (plan !== "premium" && plan !== "elite") {
    return NextResponse.json({ error: "Renew only applies to premium or elite members" }, { status: 400 });
  }

  const extendDaysRaw = Number(body.extendDays);
  const extendDays = Number.isFinite(extendDaysRaw)
    ? Math.min(Math.max(Math.floor(extendDaysRaw), 1), 3650)
    : 365;

  const amountRaw = body.amountNpr;
  const amountNpr = Number.isFinite(Number(amountRaw)) ? Math.max(0, Number(amountRaw)) : 0;

  const existingExpiry = (profile as { expires_at?: string | null } | null)?.expires_at;
  const base = existingExpiry ? new Date(existingExpiry) : now;
  const startFrom = base.getTime() > now.getTime() ? base : now;
  const newEnd = addDays(startFrom, extendDays);

  const newEndIso = newEnd.toISOString();

  const { data: profUpdated, error: profErr } = await admin
    .from("profiles")
    .update({
      expires_at: newEndIso,
      updated_at: nowIso,
    })
    .eq("id", userId)
    .select("id");

  if (profErr) {
    return NextResponse.json({ error: profErr.message }, { status: 500 });
  }

  if (!profUpdated?.length) {
    return NextResponse.json({ error: "Profile not found for this user" }, { status: 404 });
  }

  const { data: subRow } = await admin.from("subscriptions").select("user_id").eq("user_id", userId).maybeSingle();

  if (subRow) {
    const { error: subErr } = await admin
      .from("subscriptions")
      .update({
        status: "active",
        current_period_end: newEndIso,
        updated_at: nowIso,
      })
      .eq("user_id", userId);
    if (subErr) {
      return NextResponse.json({ error: `Subscription update failed: ${subErr.message}` }, { status: 500 });
    }
  }

  const { error: revErr } = await admin.from("revenue_events").insert({
    user_id: userId,
    amount_npr: amountNpr,
    kind: amountNpr > 0 ? "subscription" : "adjustment",
    note: `Admin membership renewal (+${extendDays}d)${amountNpr > 0 ? "" : "; NPR amount not recorded"}`,
    external_ref: `admin_renew:${adminUserId}:${nowIso}`,
    event_type: null,
    plan_type: plan === "premium" || plan === "elite" ? plan : null,
    payment_method: null,
    membership_request_id: null,
    created_at: nowIso,
  });

  if (revErr) {
    return NextResponse.json({ error: `Revenue log failed: ${revErr.message}` }, { status: 500 });
  }

  const logRen = await insertAdminMemberCrmEvent(admin, {
    user_id: userId,
    event_type: "membership_renewed",
    title: "Membership renewed",
    body: `Extended ${extendDays} days. New expiry ${newEndIso.slice(0, 10)}.`,
    meta: { extendDays, amount_npr: amountNpr, new_expires_at: newEndIso },
    actor_id: adminUserId,
  });
  if (!logRen.ok) console.error("[admin/members] crm event renew:", logRen.message);

  return NextResponse.json({
    ok: true,
    status: "renewed",
    expires_at: newEndIso,
    extendDays,
    actor: adminUserId,
  });
}
