import "server-only";

import {
  REAL_ESTATE_ALLOWED_MIME,
  REAL_ESTATE_STORAGE_BUCKET,
  REAL_ESTATE_UPLOAD_MAX_BYTES,
} from "@/lib/portfolio/real-estate-storage";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";

/** Ensures `portfolio_real_estate` exists (creates via Storage API when missing). */
export async function ensureRealEstateStorageBucket(): Promise<{ ok: true } | { ok: false; message: string }> {
  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return {
      ok: false,
      message: "SUPABASE_SERVICE_ROLE_KEY is required to provision the real estate storage bucket.",
    };
  }

  const { data: buckets, error: listErr } = await admin.storage.listBuckets();
  if (listErr) {
    return { ok: false, message: listErr.message };
  }

  if (buckets?.some((b) => b.id === REAL_ESTATE_STORAGE_BUCKET)) {
    return { ok: true };
  }

  const { error: createErr } = await admin.storage.createBucket(REAL_ESTATE_STORAGE_BUCKET, {
    public: false,
    fileSizeLimit: REAL_ESTATE_UPLOAD_MAX_BYTES,
    allowedMimeTypes: [...REAL_ESTATE_ALLOWED_MIME],
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
