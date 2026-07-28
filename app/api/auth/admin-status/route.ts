import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/check-session-is-admin";
import { getNepseHubAdminSession } from "@/lib/admin/nepse-hub-admin";
import { withApiRouteTiming } from "@/lib/mutation-perf";


export const runtime = "nodejs";

/** Returns admin flags for the signed-in user. NEPSE Hub Admin is email-gated server-side. */
async function GETHandler() {
  const [session, nepseHub] = await Promise.all([getAdminSession(), getNepseHubAdminSession()]);
  const isAdmin = Boolean(session);
  const isSuperAdmin = session?.role === "super_admin";
  const isNepseHubAdmin = Boolean(nepseHub);
  return NextResponse.json({
    isAdmin,
    isSuperAdmin,
    isNepseHubAdmin,
    role: session?.role ?? null,
  });
}

export const GET = withApiRouteTiming("auth/admin-status:GET", GETHandler);
