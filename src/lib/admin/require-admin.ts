import "server-only";

import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** Server-only: redirects to login or hub if not an admin. Returns Supabase auth user id. */
export async function requireAdminUserId(): Promise<string> {
  if (!isSupabaseConfigured()) {
    redirect("/hub");
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user?.id) {
    redirect("/login?next=%2Fadmin");
  }

  const { data: row, error } = await supabase.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
  if (error || !row) {
    redirect("/hub");
  }

  return user.id;
}
