import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/verify-admin-api";
import { fetchMemberCrmPayload } from "@/lib/admin/fetch-member-crm";
import { withApiRouteTiming } from "@/lib/mutation-perf";


type RouteParams = { params: Promise<{ userId: string }> };

async function GETHandler(_request: Request, ctx: RouteParams) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;

  const { userId } = await ctx.params;
  if (!userId) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  const payload = await fetchMemberCrmPayload(userId);
  if (!payload) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, crm: payload });
}

export const GET = withApiRouteTiming<RouteParams>("admin/members/[userId]/crm:GET", GETHandler);
