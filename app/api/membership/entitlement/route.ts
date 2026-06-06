import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PaidPlan = "premium" | "elite";

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

    const { data: profile } = await supabase.from("profiles").select("plan_type").eq("id", user.id).maybeSingle();

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status, current_period_end, plan")
      .eq("user_id", user.id)
      .maybeSingle();

    const profilePlan = profile?.plan_type ?? "free";
    const subActive = sub?.status === "active";
    const subPlan = sub?.plan;

    const profilePaid = profilePlan === "premium" || profilePlan === "elite";
    const subPaid = subPlan === "premium" || subPlan === "elite";

    const effectivePlan: PaidPlan | "free" =
      subActive && profilePaid && subPaid && profilePlan === subPlan
        ? (profilePlan as PaidPlan)
        : "free";

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
      currentPeriodEnd: sub?.current_period_end ?? null,
      pendingMembershipRequest: pendingPlan ? { plan: pendingPlan } : null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
