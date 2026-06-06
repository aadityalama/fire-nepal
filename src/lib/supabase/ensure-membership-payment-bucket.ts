import "server-only";

import { MEMBERSHIP_PAYMENT_BUCKET } from "@/lib/membership-payment";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";

/** Ensures `membership_payment_proofs` exists (creates via Storage API when missing). */
export async function ensureMembershipPaymentProofsBucket(): Promise<{ ok: true } | { ok: false; message: string }> {
  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return {
      ok: false,
      message: "SUPABASE_SERVICE_ROLE_KEY is required to provision the membership payment storage bucket.",
    };
  }

  const { data: buckets, error: listErr } = await admin.storage.listBuckets();
  if (listErr) {
    return { ok: false, message: listErr.message };
  }

  if (buckets?.some((b) => b.id === MEMBERSHIP_PAYMENT_BUCKET)) {
    return { ok: true };
  }

  const { error: createErr } = await admin.storage.createBucket(MEMBERSHIP_PAYMENT_BUCKET, {
    public: false,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });

  if (createErr) {
    const msg = createErr.message.toLowerCase();
    if (msg.includes("already exists") || msg.includes("duplicate") || msg.includes("resource already")) {
      return { ok: true };
    }
    return { ok: false, message: createErr.message };
  }

  return { ok: true };
}
