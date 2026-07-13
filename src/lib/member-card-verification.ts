import "server-only";

import { mapVerificationPayload, type PublicMemberVerification } from "@/lib/member-card-profile";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type RpcClient = {
  rpc: (
    fn: "get_public_member_verification",
    args: { p_fire_nepal_id: string },
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

async function runVerificationRpc(client: RpcClient, fireNepalId: string): Promise<PublicMemberVerification> {
  const { data, error } = await client.rpc("get_public_member_verification", {
    p_fire_nepal_id: fireNepalId,
  });
  if (error) throw new Error(error.message);
  if (!data || typeof data !== "object") return { found: false };
  return mapVerificationPayload(data as Record<string, unknown>);
}

export async function fetchPublicMemberVerification(fireNepalId: string): Promise<PublicMemberVerification> {
  if (!isSupabaseConfigured()) {
    return { found: false };
  }

  try {
    const server = await createServerSupabaseClient();
    return await runVerificationRpc(server as unknown as RpcClient, fireNepalId);
  } catch {
    const admin = createSupabaseServiceRoleClient();
    if (!admin) return { found: false };
    try {
      return await runVerificationRpc(admin as unknown as RpcClient, fireNepalId);
    } catch {
      return { found: false };
    }
  }
}
