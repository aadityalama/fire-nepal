import "server-only";

import type { User } from "@supabase/supabase-js";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";

export async function listAllAuthUsers(): Promise<{ users: User[]; error: string | null }> {
  const sb = createSupabaseServiceRoleClient();
  if (!sb) return { users: [], error: "Missing service role client" };

  const users: User[] = [];
  let page = 1;
  const perPage = 1000;
  for (;;) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage });
    if (error) return { users, error: error.message };
    const batch = data.users ?? [];
    users.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
    if (page > 50) break;
  }
  return { users, error: null };
}
