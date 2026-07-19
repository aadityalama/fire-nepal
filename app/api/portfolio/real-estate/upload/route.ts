import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { ensureRealEstateStorageBucket } from "@/lib/supabase/ensure-real-estate-bucket";
import {
  REAL_ESTATE_ALLOWED_MIME,
  REAL_ESTATE_STORAGE_BUCKET,
  REAL_ESTATE_UPLOAD_MAX_BYTES,
  extFromMime,
  realEstateStorageObjectPath,
} from "@/lib/portfolio/real-estate-storage";

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const propertyId = String(form.get("propertyId") ?? "").trim();

  if (!(file instanceof File) || !propertyId) {
    return NextResponse.json({ error: "file and propertyId are required" }, { status: 400 });
  }
  if (propertyId.length > 80 || /[\\/]/.test(propertyId)) {
    return NextResponse.json({ error: "Invalid propertyId" }, { status: 400 });
  }
  const mime = (file.type || "application/octet-stream").toLowerCase();
  if (!REAL_ESTATE_ALLOWED_MIME.has(mime)) {
    return NextResponse.json({ error: "Use JPEG, PNG, WebP, GIF, or PDF" }, { status: 400 });
  }
  if (file.size > REAL_ESTATE_UPLOAD_MAX_BYTES) {
    return NextResponse.json({ error: "File must be 8 MB or smaller" }, { status: 400 });
  }

  const ensured = await ensureRealEstateStorageBucket();
  if (!ensured.ok) {
    return NextResponse.json({ error: ensured.message }, { status: 503 });
  }

  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Server storage is not configured (missing SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 503 },
    );
  }

  const fileId = randomUUID();
  const path = realEstateStorageObjectPath(user.id, propertyId, fileId, extFromMime(mime));
  const buf = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await admin.storage.from(REAL_ESTATE_STORAGE_BUCKET).upload(path, buf, {
    contentType: mime,
    upsert: false,
  });
  if (upErr) {
    console.error("REAL_ESTATE_UPLOAD_ERROR", upErr);
    return NextResponse.json({ error: "Could not upload file. Try again." }, { status: 500 });
  }

  const { data: signed, error: signErr } = await admin.storage
    .from(REAL_ESTATE_STORAGE_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 7);

  if (signErr || !signed?.signedUrl) {
    console.error("REAL_ESTATE_SIGN_ERROR", signErr);
    return NextResponse.json({ error: "Upload succeeded but could not create access URL." }, { status: 500 });
  }

  return NextResponse.json({
    url: signed.signedUrl,
    storagePath: path,
    mimeType: mime,
    name: file.name || `file.${extFromMime(mime)}`,
  });
}
