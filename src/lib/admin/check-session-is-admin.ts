import "server-only";

import type { AdminApiRole } from "@/lib/admin/verify-admin-api";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** True when the current Supabase session user has a row in `public.admin_users`. */
export async function checkSessionIsAdmin(): Promise<boolean> {
  const s = await getAdminSession();
  return Boolean(s);
}

export type AdminSessionInfo = { userId: string; role: AdminApiRole };

/** Admin session with role (RLS-safe self-read on `admin_users`). */
export async function getAdminSession(): Promise<AdminSessionInfo | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user?.id) return null;
    const { data, error } = await supabase
      .from("admin_users")
      .select("user_id, role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error || !data) return null;
    const role: AdminApiRole = data.role === "super_admin" ? "super_admin" : "admin";
    return { userId: user.id, role };
  } catch {
    return null;
  }
}
