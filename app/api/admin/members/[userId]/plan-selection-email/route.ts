import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/verify-admin-api";
import { sendPlanSelectionEmailForAdmin } from "@/lib/membership-plan-selection-email/send-plan-selection-email";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { getMembershipByUserId } from "@/services/membership-service";

type RouteParams = { params: Promise<{ userId: string }> };

export async function POST(_request: Request, ctx: RouteParams) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;

  const { userId } = await ctx.params;
  if (!userId) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Service role is not configured" }, { status: 503 });
  }

  const membership = await getMembershipByUserId(admin, userId);
  if (membership.plan !== "free") {
    return NextResponse.json({ error: "Plan selection emails apply to Free members only." }, { status: 400 });
  }
  if (membership.archivedAt) {
    return NextResponse.json({ error: "Archived accounts cannot receive plan selection emails." }, { status: 400 });
  }
  if (membership.suspendedAt) {
    return NextResponse.json({ error: "Suspended accounts cannot receive plan selection emails." }, { status: 400 });
  }

  const { data: up } = await admin.from("user_profiles").select("full_name, display_name").eq("id", userId).maybeSingle();
  const memberName = up?.full_name?.trim() || up?.display_name?.trim() || "";

  const result = await sendPlanSelectionEmailForAdmin(admin, {
    userId,
    memberName,
    plan: membership.plan,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error, code: result.code ?? null }, { status: result.status });
  }

  return NextResponse.json({ ok: true, message: result.message, resendId: result.resendId ?? null });
}
