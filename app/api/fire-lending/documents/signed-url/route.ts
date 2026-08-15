import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { FIRE_LENDING_DOC_STORAGE_BUCKET } from "@/lib/fire-lending/loan-document-storage";
import { loadFireLendingSnapshotForUser } from "@/lib/fire-lending/loan-document-server";

/**
 * Refresh a short-lived signed URL for a private loan document.
 * Requires auth + storage path ownership (`{userId}/…`) + loan/document association in the caller's snapshot.
 */
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

  const body = (await req.json().catch(() => null)) as {
    storagePath?: string;
    loanId?: string;
    documentId?: string;
  } | null;

  const storagePath = String(body?.storagePath ?? "").trim();
  const loanId = String(body?.loanId ?? "").trim();
  const documentId = String(body?.documentId ?? "").trim();

  if (!storagePath || storagePath.includes("..") || !storagePath.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Invalid storage path" }, { status: 400 });
  }
  if (!loanId || !documentId) {
    return NextResponse.json({ error: "loanId and documentId are required" }, { status: 400 });
  }

  const access = await loadFireLendingSnapshotForUser(user.id, { loanId, documentId, storagePath });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Service role is not configured" }, { status: 503 });
  }

  const { data, error } = await admin.storage
    .from(FIRE_LENDING_DOC_STORAGE_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? "Could not sign URL" }, { status: 500 });
  }

  return NextResponse.json({
    url: data.signedUrl,
    fileName: access.document.fileName || access.document.title || "document",
    mimeType: access.document.mimeType || "application/octet-stream",
  });
}
