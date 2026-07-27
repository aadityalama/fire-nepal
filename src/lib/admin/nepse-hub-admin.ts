import "server-only";

import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** Sole email authorized for the NEPSE Hub Admin Panel (server-side only). */
export const NEPSE_HUB_ADMIN_EMAIL = "aadityalama853@gmail.com";

export function isNepseHubAdminEmail(email: string | null | undefined): boolean {
  return (email ?? "").trim().toLowerCase() === NEPSE_HUB_ADMIN_EMAIL;
}

export type NepseHubAdminSession = {
  userId: string;
  email: string;
};

export async function getNepseHubAdminSession(): Promise<NepseHubAdminSession | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user?.id) return null;
    const email = (user.email ?? "").trim().toLowerCase();
    if (!isNepseHubAdminEmail(email)) return null;
    return { userId: user.id, email };
  } catch {
    return null;
  }
}

/** Page gate: redirects unauthenticated / wrong-email users. Never trust the client. */
export async function requireNepseHubAdminUser(): Promise<NepseHubAdminSession> {
  if (!isSupabaseConfigured()) {
    redirect("/hub");
  }
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user?.id) {
    redirect("/login?next=%2Fnepse-hub-admin");
  }
  const email = (user.email ?? "").trim().toLowerCase();
  if (!isNepseHubAdminEmail(email)) {
    redirect("/hub");
  }
  return { userId: user.id, email };
}

/** API gate: 401 / 403. Never trust the client. */
export async function requireNepseHubAdminApi(): Promise<NepseHubAdminSession | NextResponse> {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const email = (user.email ?? "").trim().toLowerCase();
  if (!isNepseHubAdminEmail(email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return { userId: user.id, email };
}
