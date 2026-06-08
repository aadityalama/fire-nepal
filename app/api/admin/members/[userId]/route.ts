import { addDays } from "date-fns";
import { NextResponse } from "next/server";
import { MEMBER_PERMANENT_DELETE_CONFIRMATION } from "@/lib/admin/member-permanent-delete-phrase";
import { insertAdminMemberCrmEvent } from "@/lib/admin/member-crm-events";
import { requireAdminApi, requireSuperAdminApi } from "@/lib/admin/verify-admin-api";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";

type RouteParams = { params: Promise<{ userId: string }> };

type Body = {
  action?: string;
  /** Renew: calendar days to add from max(now, current expiry). Default 365. */
  extendDays?: number;
  /** Optional NPR amount recorded on renewal (ledger / audit). Default 0. */
  amountNpr?: number;
  /** Super-admin permanent removal: must match MEMBER_PERMANENT_DELETE_CONFIRMATION exactly. */
  confirmationText?: string;
};

const MEMBER_ACTIONS = new Set([
  "renew",
  "suspend",
  "reactivate",
  "archive",
  "restore_archive",
  "permanent_remove",
]);

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

  const action = typeof body.action === "string" && MEMBER_ACTIONS.has(body.action) ? body.action : null;
  if (!action) {
    return NextResponse.json(
      {
        error:
          "action must be renew, suspend, reactivate, archive, restore_archive, or permanent_remove (super admin)",
      },
      { status: 400 },
    );
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

  const archivedAt = (profile as { archived_at?: string | null }).archived_at ?? null;

  if (action === "permanent_remove") {
    const superGate = await requireSuperAdminApi();
    if (superGate instanceof NextResponse) return superGate;
    if (userId === superGate.userId) {
      return NextResponse.json({ error: "You cannot remove your own account." }, { status: 400 });
    }
    const phrase = typeof body.confirmationText === "string" ? body.confirmationText.trim() : "";
    if (phrase !== MEMBER_PERMANENT_DELETE_CONFIRMATION) {
      return NextResponse.json(
        { error: `Type the confirmation phrase exactly: ${MEMBER_PERMANENT_DELETE_CONFIRMATION}` },
        { status: 400 },
      );
    }

    const { error: banErr } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: "876000h",
    });
    if (banErr) {
      return NextResponse.json({ error: `Auth ban failed: ${banErr.message}` }, { status: 500 });
    }

    const { error: upErr } = await admin
      .from("user_profiles")
      .update({ display_name: "Former member", updated_at: nowIso })
      .eq("id", userId);
    if (upErr) {
      console.error("[admin/members] permanent_remove user_profiles:", upErr.message);
    }

    const { data: profUpdated, error: profErr } = await admin
      .from("profiles")
      .update({
        plan_type: "free",
        expires_at: null,
        suspended_at: null,
        archived_at: nowIso,
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

    const { error: subErr } = await admin
      .from("subscriptions")
      .update({ status: "canceled", updated_at: nowIso })
      .eq("user_id", userId);
    if (subErr) {
      console.error("[admin/members] permanent_remove subscriptions:", subErr.message);
    }

    const log = await insertAdminMemberCrmEvent(admin, {
      user_id: userId,
      event_type: "user_permanently_removed",
      title: "Account permanently removed",
      body: "User banned; profile cleared; revenue and audit tables not deleted.",
      meta: { banned_by: superGate.userId },
      actor_id: superGate.userId,
    });
    if (!log.ok) console.error("[admin/members] crm event permanent_remove:", log.message);

    return NextResponse.json({ ok: true, status: "permanently_removed", actor: superGate.userId });
  }

  const logCrm = async (
    event_type: Parameters<typeof insertAdminMemberCrmEvent>[1]["event_type"],
    title: string,
    bodyText?: string,
    meta?: Record<string, unknown>,
  ) => {
    const log = await insertAdminMemberCrmEvent(admin, {
      user_id: userId,
      event_type,
      title,
      body: bodyText ?? null,
      meta: meta ?? {},
      actor_id: adminUserId,
    });
    if (!log.ok) console.error("[admin/members] crm event:", event_type, log.message);
  };

  if (action === "suspend") {
    if (archivedAt) {
      return NextResponse.json({ error: "Archived members cannot be suspended — restore from archive first." }, { status: 400 });
    }
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
    const { error: subErr } = await admin
      .from("subscriptions")
      .update({ status: "canceled", updated_at: nowIso })
      .eq("user_id", userId);
    if (subErr) {
      return NextResponse.json({ error: `Subscription update failed: ${subErr.message}` }, { status: 500 });
    }
    await logCrm("user_suspended", "Membership suspended", "Paid access blocked until reactivation.");
    return NextResponse.json({ ok: true, status: "suspended", actor: adminUserId });
  }

  if (action === "reactivate") {
    if (archivedAt) {
      return NextResponse.json({ error: "Member is archived — use Restore from archive before reactivating." }, { status: 400 });
    }
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
    const plan = (profile as { plan_type?: string }).plan_type;
    const subStatus = plan === "premium" || plan === "elite" ? "active" : "canceled";
    const { error: subErr } = await admin
      .from("subscriptions")
      .update({ status: subStatus, updated_at: nowIso })
      .eq("user_id", userId);
    if (subErr) {
      return NextResponse.json({ error: `Subscription update failed: ${subErr.message}` }, { status: 500 });
    }
    await logCrm("user_reactivated", "Membership reactivated", "Suspension cleared.");
    return NextResponse.json({ ok: true, status: "reactivated", actor: adminUserId });
  }

  if (action === "archive") {
    if (archivedAt) {
      return NextResponse.json({ error: "Member is already archived." }, { status: 400 });
    }
    const { data: updated, error: updErr } = await admin
      .from("profiles")
      .update({
        archived_at: nowIso,
        suspended_at: null,
        updated_at: nowIso,
      })
      .eq("id", userId)
      .select("id");
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }
    if (!updated?.length) {
      return NextResponse.json({ error: "Profile not found for this user" }, { status: 404 });
    }
    const { error: subErr } = await admin
      .from("subscriptions")
      .update({ status: "canceled", updated_at: nowIso })
      .eq("user_id", userId);
    if (subErr) {
      return NextResponse.json({ error: `Subscription update failed: ${subErr.message}` }, { status: 500 });
    }
    await logCrm("user_archived", "Member archived", "Hidden from active roster; ledger and history retained.");
    return NextResponse.json({ ok: true, status: "archived", actor: adminUserId });
  }

  if (action === "restore_archive") {
    if (!archivedAt) {
      return NextResponse.json({ error: "Member is not archived." }, { status: 400 });
    }
    const { data: updated, error: updErr } = await admin
      .from("profiles")
      .update({ archived_at: null, updated_at: nowIso })
      .eq("id", userId)
      .select("id");
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }
    if (!updated?.length) {
      return NextResponse.json({ error: "Profile not found for this user" }, { status: 404 });
    }
    await logCrm("user_restored", "Archive cleared", "Member visible in active roster again.");
    return NextResponse.json({ ok: true, status: "restored", actor: adminUserId });
  }

  // renew
  const plan = (profile as { plan_type?: string } | null)?.plan_type;
  if (archivedAt) {
    return NextResponse.json({ error: "Cannot renew an archived member — restore from archive first." }, { status: 400 });
  }
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

  await logCrm("membership_renewed", "Membership renewed", `Extended ${extendDays} days. New expiry ${newEndIso.slice(0, 10)}.`, {
    extendDays,
    amount_npr: amountNpr,
    new_expires_at: newEndIso,
  });

  return NextResponse.json({
    ok: true,
    status: "renewed",
    expires_at: newEndIso,
    extendDays,
    actor: adminUserId,
  });
}
