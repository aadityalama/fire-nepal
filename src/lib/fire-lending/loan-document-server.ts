import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { sanitizeFireLendingStore } from "@/lib/fire-lending/storage";
import type { FireLendingDocument, FireLendingStore } from "@/lib/fire-lending/types";
import { assertDocumentBelongsToLoan } from "@/lib/fire-lending/loan-documents";

export type LoanDocAccessOk = {
  ok: true;
  store: FireLendingStore;
  document: FireLendingDocument;
};

export type LoanDocAccessErr = {
  ok: false;
  error: string;
  status: number;
};

/**
 * Load the caller's fire_lending module snapshot and verify the document belongs to the loan.
 * Used by signed-url / download routes so users cannot fetch another loan's files.
 */
export async function loadFireLendingSnapshotForUser(
  userId: string,
  opts: { loanId: string; documentId: string; storagePath?: string },
): Promise<LoanDocAccessOk | LoanDocAccessErr> {
  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return { ok: false, error: "Service role is not configured", status: 503 };
  }

  const { data, error } = await admin
    .from("user_module_snapshots")
    .select("state")
    .eq("user_id", userId)
    .eq("module_key", "fire_lending")
    .maybeSingle();

  if (error) {
    console.error("FIRE_LENDING_SNAPSHOT_LOAD", error);
    return { ok: false, error: "Could not load loan documents.", status: 500 };
  }

  const store = sanitizeFireLendingStore(data?.state ?? null);
  // Guest/demo snapshots may be empty in cloud — still enforce path ownership via storagePath prefix.
  const document = store.documents.find((d) => d.id === opts.documentId);

  if (document) {
    const belongs = assertDocumentBelongsToLoan(document, opts.loanId);
    if (!belongs.ok) {
      return { ok: false, error: belongs.error, status: 403 };
    }
    if (opts.storagePath && document.storagePath && document.storagePath !== opts.storagePath) {
      return { ok: false, error: "Storage path does not match this document.", status: 403 };
    }
    return { ok: true, store, document };
  }

  // Snapshot may not yet include the just-uploaded doc (debounce). Allow when path is under this user + loan.
  if (opts.storagePath) {
    const prefix = `${userId}/${opts.loanId}/`;
    if (!opts.storagePath.startsWith(prefix) && !opts.storagePath.startsWith(`${userId}/draft_`)) {
      return { ok: false, error: "Unauthorized storage path for this loan.", status: 403 };
    }
    const synthetic: FireLendingDocument = {
      id: opts.documentId,
      loanId: opts.loanId,
      title: "Document",
      kind: "other",
      createdAt: new Date().toISOString().slice(0, 10),
      storagePath: opts.storagePath,
    };
    return { ok: true, store, document: synthetic };
  }

  return { ok: false, error: "Document not found for this loan.", status: 404 };
}
