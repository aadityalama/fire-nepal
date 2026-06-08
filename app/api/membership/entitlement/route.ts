import { NextResponse } from "next/server";
import { effectiveMembershipPeriodEnd } from "@/lib/membership-effective-period-end";
import { membershipUiBucket } from "@/lib/membership-profile-status";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PaidPlan = "premium" | "elite";

/** Set FN_ENTITLEMENT_ROUTE_DEBUG=1 to log Supabase query outcomes (remove after incident). */
const ENTITLEMENT_DEBUG = process.env.FN_ENTITLEMENT_ROUTE_DEBUG === "1";

/** Current plan from `profiles` + `subscriptions` (only active subscription unlocks paid features). */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
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

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("plan_type, suspended_at, archived_at")
      .eq("id", user.id)
      .maybeSingle();

    const {
      data: sub,
      error: subError,
    } = await supabase
      .from("subscriptions")
      .select("status, current_period_end, plan")
      .eq("user_id", user.id)
      .maybeSingle();

    if (ENTITLEMENT_DEBUG) {
      console.warn(
        "[membership/entitlement]",
        JSON.stringify({
          userId: user.id,
          profile,
          profileError: profileError
            ? { message: profileError.message, code: profileError.code, details: profileError.details }
            : null,
          subscription: sub,
          subscriptionError: subError
            ? { message: subError.message, code: subError.code, details: subError.details }
            : null,
        }),
      );
    }

    let profilePlan = profile?.plan_type ?? "free";
    const suspendedAt = (profile as { suspended_at?: string | null } | null)?.suspended_at ?? null;
    const archivedAt = (profile as { archived_at?: string | null } | null)?.archived_at ?? null;
    const subActive = sub?.status === "active";
    const subPlan = sub?.plan;

    /**
     * If `public.profiles` has RLS enabled but no usable SELECT policy, PostgREST returns `profile: null`
     * with `profileError: null` while `subscriptions` can still be readable. SQL against the DB then
     * shows elite on profiles, but this route never sees it — planType becomes "free" incorrectly.
     * Prefer fixing RLS (`supabase/migrations/20250607140000_profiles_select_own_rls.sql`). Until then,
     * when there is no profile row in the API response and no error, trust an active paid subscription row.
     */
    if (
      profile == null &&
      !profileError &&
      subActive &&
      (subPlan === "premium" || subPlan === "elite")
    ) {
      profilePlan = subPlan;
    }

    const profilePaid = profilePlan === "premium" || profilePlan === "elite";
    const subPaid = subPlan === "premium" || subPlan === "elite";

    const expiryIso = effectiveMembershipPeriodEnd(sub?.current_period_end, null);
    const now = new Date();
    const suspended = Boolean(suspendedAt);
    const archived = Boolean(archivedAt);
    const expiredByDate = Boolean(expiryIso && !Number.isNaN(new Date(expiryIso).getTime()) && new Date(expiryIso) <= now);

    const rawEffective: PaidPlan | "free" =
      subActive && profilePaid && subPaid && profilePlan === subPlan ? (profilePlan as PaidPlan) : "free";

    const effectivePlan: PaidPlan | "free" =
      suspended || archived || expiredByDate ? "free" : rawEffective;

    const uiBucket = membershipUiBucket({
      planType: profilePlan === "premium" || profilePlan === "elite" || profilePlan === "free" ? profilePlan : "free",
      expiresAtIso: expiryIso,
      suspendedAtIso: suspendedAt,
      archivedAtIso: archivedAt,
      now,
    });

    const { data: pendingRow } = await supabase
      .from("membership_requests")
      .select("plan_type")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const pendingPlan = pendingRow?.plan_type === "elite" || pendingRow?.plan_type === "premium" ? pendingRow.plan_type : null;

    return NextResponse.json({
      planType: profilePlan,
      subscriptionStatus: sub?.status ?? null,
      effectivePlan,
      currentPeriodEnd: expiryIso ?? sub?.current_period_end ?? null,
      membershipUiBucket: uiBucket,
      expiresAt: expiryIso,
      suspendedAt,
      archivedAt,
      pendingMembershipRequest: pendingPlan ? { plan: pendingPlan } : null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
