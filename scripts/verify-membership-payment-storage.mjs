#!/usr/bin/env node
/**
 * Smoke-test: ensure `membership_payment_proofs` bucket exists and service role can upload/remove a tiny PNG.
 * Requires `.env.local` with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (same as app server).
 *
 * Usage: node scripts/verify-membership-payment-storage.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { loadDotEnvLocal } from "./load-dotenv-local.mjs";

const BUCKET = "membership_payment_proofs";
// 1×1 transparent PNG
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

loadDotEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: buckets, error: listErr } = await admin.storage.listBuckets();
if (listErr) {
  console.error("listBuckets:", listErr.message);
  process.exit(1);
}

if (!buckets?.some((b) => b.id === BUCKET)) {
  const { error: cErr } = await admin.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });
  if (cErr && !cErr.message.toLowerCase().includes("already")) {
    console.error("createBucket:", cErr.message);
    process.exit(1);
  }
  console.log("Created bucket:", BUCKET);
} else {
  console.log("Bucket exists:", BUCKET);
}

const path = `__smoke__/${Date.now()}.png`;
const { error: upErr } = await admin.storage.from(BUCKET).upload(path, PNG_1X1, {
  contentType: "image/png",
  upsert: true,
});
if (upErr) {
  console.error("upload:", upErr.message);
  process.exit(1);
}
console.log("Upload OK:", path);

const { error: rmErr } = await admin.storage.from(BUCKET).remove([path]);
if (rmErr) {
  console.error("remove:", rmErr.message);
  process.exit(1);
}
console.log("Remove OK. Storage smoke test passed.");
