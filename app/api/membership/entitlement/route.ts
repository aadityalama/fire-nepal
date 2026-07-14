import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import {
  getMembershipByUserId,
  toAccessRecord,
} from "@/services/membership-service";

/**
 * Membership entitlement — reads ONLY from public.user_profiles via MembershipService.
 * No profiles/subscriptions/localStorage dual-source fallbacks.
 */
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

    // Prefer service role so SOT is never masked by RLS quirks; fall back to user client.
    const admin = createSupabaseServiceRoleClient();
    const client = admin ?? supabase;

    let membership;
    try {
      membership = await getMembershipByUserId(client, user.id);
    } catch (loadErr) {
      const message = loadErr instanceof Error ? loadErr.message : "Membership load failed";
      // Never invent Free on load failure — client must preserve prior UI state.
      return NextResponse.json({ error: message, loaded: false }, { status: 503 });
    }
    const access = toAccessRecord(membership);

    const { data: pendingRow } = await supabase
      .from("membership_requests")
      .select("plan_type")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const pendingPlan =
      pendingRow?.plan_type === "elite" || pendingRow?.plan_type === "premium" ? pendingRow.plan_type : null;

    return NextResponse.json({
      /** Stored plan on user_profiles (display SOT — Admin and Profile must match this). */
      planType: membership.plan,
      /** Effective access plan after suspend/archive/expiry (gates / AI). */
      effectivePlan: membership.accessPlan,
      membershipStart: membership.membershipStart,
      membershipExpiry: membership.membershipExpiry,
      currentPeriodEnd: membership.membershipExpiry,
      expiresAt: membership.membershipExpiry,
      suspendedAt: membership.suspendedAt,
      archivedAt: membership.archivedAt,
      membershipUiBucket: membership.status,
      status: membership.status,
      accessStatus: access.status,
      daysRemaining: membership.daysRemaining,
      pendingMembershipRequest: pendingPlan ? { plan: pendingPlan } : null,
      sourceOfTruth: "public.user_profiles",
      loaded: true,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
