import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { ensureFireLendingDocumentsBucket } from "@/lib/supabase/ensure-fire-lending-documents-bucket";
import {
  FIRE_LENDING_DOC_STORAGE_BUCKET,
  FIRE_LENDING_DOC_MAX_BYTES,
  extFromLoanDocMime,
  fireLendingDocStoragePath,
} from "@/lib/fire-lending/loan-document-storage";
import { validateLoanDocumentFile } from "@/lib/fire-lending/loan-documents";

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
  const loanId = String(form.get("loanId") ?? "").trim();

  if (!(file instanceof File) || !loanId) {
    return NextResponse.json({ error: "file and loanId are required" }, { status: 400 });
  }
  if (loanId.length > 80 || /[\\/]/.test(loanId)) {
    return NextResponse.json({ error: "Invalid loanId" }, { status: 400 });
  }

  const validation = validateLoanDocumentFile({
    fileName: file.name || "document",
    mimeType: file.type,
    sizeBytes: file.size,
  });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  if (file.size > FIRE_LENDING_DOC_MAX_BYTES) {
    return NextResponse.json({ error: "File must be 8 MB or smaller" }, { status: 400 });
  }

  const ensured = await ensureFireLendingDocumentsBucket();
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
  const path = fireLendingDocStoragePath(
    user.id,
    loanId,
    fileId,
    extFromLoanDocMime(validation.mimeType, validation.fileName),
  );
  const buf = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await admin.storage.from(FIRE_LENDING_DOC_STORAGE_BUCKET).upload(path, buf, {
    contentType: validation.mimeType,
    upsert: false,
  });
  if (upErr) {
    console.error("FIRE_LENDING_DOC_UPLOAD_ERROR", upErr);
    return NextResponse.json({ error: "Could not upload file. Try again." }, { status: 500 });
  }

  const { data: signed, error: signErr } = await admin.storage
    .from(FIRE_LENDING_DOC_STORAGE_BUCKET)
    .createSignedUrl(path, 60 * 60);

  if (signErr || !signed?.signedUrl) {
    console.error("FIRE_LENDING_DOC_SIGN_ERROR", signErr);
    return NextResponse.json({ error: "Upload succeeded but could not create access URL." }, { status: 500 });
  }

  return NextResponse.json({
    url: signed.signedUrl,
    storagePath: path,
    mimeType: validation.mimeType,
    name: validation.fileName,
    sizeBytes: validation.sizeBytes,
  });
}
