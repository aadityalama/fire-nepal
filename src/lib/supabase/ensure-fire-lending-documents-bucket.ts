import "server-only";

import {
  FIRE_LENDING_DOC_ALLOWED_MIME,
  FIRE_LENDING_DOC_MAX_BYTES,
  FIRE_LENDING_DOC_STORAGE_BUCKET,
} from "@/lib/fire-lending/loan-document-storage";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";

/** Ensures private `fire_lending_documents` bucket exists. */
export async function ensureFireLendingDocumentsBucket(): Promise<
  { ok: true } | { ok: false; message: string }
> {
  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return {
      ok: false,
      message: "SUPABASE_SERVICE_ROLE_KEY is required to provision the fire lending documents bucket.",
    };
  }

  const { data: buckets, error: listErr } = await admin.storage.listBuckets();
  if (listErr) {
    return { ok: false, message: listErr.message };
  }

  if (buckets?.some((b) => b.id === FIRE_LENDING_DOC_STORAGE_BUCKET)) {
    return { ok: true };
  }

  const { error: createErr } = await admin.storage.createBucket(FIRE_LENDING_DOC_STORAGE_BUCKET, {
    public: false,
    fileSizeLimit: FIRE_LENDING_DOC_MAX_BYTES,
    allowedMimeTypes: [...FIRE_LENDING_DOC_ALLOWED_MIME],
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
