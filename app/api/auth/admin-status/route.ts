import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/check-session-is-admin";

export const runtime = "nodejs";

/** Returns whether the signed-in Supabase user is in `admin_users` (RLS-safe self-read). */
export async function GET() {
  const session = await getAdminSession();
  const isAdmin = Boolean(session);
  const isSuperAdmin = session?.role === "super_admin";
  return NextResponse.json({ isAdmin, isSuperAdmin, role: session?.role ?? null });
}
