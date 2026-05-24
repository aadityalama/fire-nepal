import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase-database";

type Client = SupabaseClient<Database>;

export async function upsertUserProfileFields(
  client: Client,
  userId: string,
  fields: { display_name?: string | null; avatar_url?: string | null; preferred_currency?: "NPR" | "KRW" | "USD" },
) {
  await client.from("user_profiles").upsert(
    {
      id: userId,
      ...fields,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
}

export async function fetchUserProfile(client: Client, userId: string) {
  const { data, error } = await client.from("user_profiles").select("*").eq("id", userId).maybeSingle();
  if (error) return null;
  return data;
}
