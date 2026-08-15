import {
  FIRE_LENDING_DOC_ALLOWED_EXTENSIONS,
  FIRE_LENDING_DOC_ALLOWED_MIME,
  FIRE_LENDING_DOC_MAX_BYTES,
  mimeFromFileName,
} from "@/lib/fire-lending/loan-document-storage";
import type { FireLendingDocument, FireLendingStore } from "@/lib/fire-lending/types";
import { todayIso, uid } from "@/lib/fire-lending/format";

export type LoanDocValidationOk = { ok: true; mimeType: string; fileName: string; sizeBytes: number };
export type LoanDocValidationErr = { ok: false; error: string };
export type LoanDocValidationResult = LoanDocValidationOk | LoanDocValidationErr;

export type PendingLoanDocument = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  status: "uploading" | "ready" | "error";
  error?: string;
  url?: string;
  storagePath?: string;
  kind: FireLendingDocument["kind"];
  createdAt: string;
};

/** Format bytes for UI (e.g. 1.2 MB). */
export function formatLoanDocSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function loanDocTypeLabel(mimeType: string, fileName?: string): string {
  const m = (mimeType || "").toLowerCase();
  if (m === "application/pdf") return "PDF";
  if (m === "image/jpeg") return "JPG";
  if (m === "image/png") return "PNG";
  if (m === "application/msword") return "DOC";
  if (m === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "DOCX";
  const ext = (fileName ?? "").split(".").pop()?.toUpperCase();
  return ext || "FILE";
}

/**
 * Validate file type and size before upload. Never silently accept invalid files.
 */
export function validateLoanDocumentFile(input: {
  fileName: string;
  mimeType?: string;
  sizeBytes: number;
}): LoanDocValidationResult {
  const fileName = String(input.fileName || "").trim();
  if (!fileName) {
    return { ok: false, error: "File name is required." };
  }
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    return { ok: false, error: "File is empty or unreadable." };
  }
  if (input.sizeBytes > FIRE_LENDING_DOC_MAX_BYTES) {
    return {
      ok: false,
      error: `File is too large. Maximum size is ${Math.floor(FIRE_LENDING_DOC_MAX_BYTES / (1024 * 1024))} MB.`,
    };
  }

  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const mime = (input.mimeType || "").toLowerCase() || mimeFromFileName(fileName) || "";

  const extOk = FIRE_LENDING_DOC_ALLOWED_EXTENSIONS.has(ext);
  const mimeOk = mime ? FIRE_LENDING_DOC_ALLOWED_MIME.has(mime) : false;

  if (!extOk && !mimeOk) {
    return {
      ok: false,
      error: "Invalid file type. Allowed: PDF, JPG, PNG, DOC, DOCX.",
    };
  }
  // Prefer extension allowlist when browser sends empty/generic mime.
  if (extOk && mime && !mimeOk && mime !== "application/octet-stream") {
    return {
      ok: false,
      error: "Invalid file type. Allowed: PDF, JPG, PNG, DOC, DOCX.",
    };
  }

  const resolvedMime = mimeOk ? mime : mimeFromFileName(fileName) || "application/octet-stream";
  return { ok: true, mimeType: resolvedMime, fileName, sizeBytes: input.sizeBytes };
}

export function canAccessLoanDocument(
  store: FireLendingStore,
  opts: { documentId: string; loanId: string; actorPartyId: string },
): { ok: true; document: FireLendingDocument; loanId: string } | { ok: false; error: string } {
  if (!opts.actorPartyId || opts.actorPartyId !== store.currentUserId) {
    return { ok: false, error: "You are not authorized to access this loan’s documents." };
  }
  const loan = store.loans.find((l) => l.id === opts.loanId);
  if (!loan) {
    return { ok: false, error: "Loan not found." };
  }
  const document = store.documents.find((d) => d.id === opts.documentId);
  if (!document) {
    return { ok: false, error: "Document not found." };
  }
  const belongs = assertDocumentBelongsToLoan(document, opts.loanId);
  if (!belongs.ok) return belongs;
  return { ok: true, document, loanId: opts.loanId };
}

/** Prevent downloading a document when the requested loanId does not match. */
export function assertDocumentBelongsToLoan(
  document: FireLendingDocument | undefined,
  loanId: string,
): { ok: true } | { ok: false; error: string } {
  if (!document) return { ok: false, error: "Document not found." };
  if (!document.loanId || document.loanId !== loanId) {
    return { ok: false, error: "Unauthorized: document belongs to a different loan." };
  }
  return { ok: true };
}

export function pendingToFireLendingDocument(
  pending: PendingLoanDocument,
  loanId: string,
  requestId?: string,
): FireLendingDocument {
  return {
    id: pending.id || uid("doc"),
    loanId,
    requestId,
    title: pending.fileName,
    fileName: pending.fileName,
    mimeType: pending.mimeType,
    sizeBytes: pending.sizeBytes,
    kind: pending.kind,
    createdAt: pending.createdAt || todayIso(),
    url: pending.url,
    storagePath: pending.storagePath,
    uploadStatus: pending.status === "ready" ? "ready" : pending.status === "error" ? "error" : "ready",
    uploadError: pending.error,
  };
}

export function attachDocumentsToStore(
  store: FireLendingStore,
  loanId: string,
  docs: FireLendingDocument[],
  requestId?: string,
): FireLendingStore {
  if (!store.loans.some((l) => l.id === loanId)) {
    return store;
  }
  const prepared = docs.map((d) => ({
    ...d,
    loanId,
    requestId: requestId ?? d.requestId,
    uploadStatus: d.uploadStatus ?? ("ready" as const),
  }));
  return {
    ...store,
    documents: [...prepared, ...store.documents],
  };
}

export function removeDocumentFromStore(
  store: FireLendingStore,
  documentId: string,
): FireLendingStore {
  return {
    ...store,
    documents: store.documents.filter((d) => d.id !== documentId),
  };
}

export function documentsForLoan(store: FireLendingStore, loanId: string): FireLendingDocument[] {
  return store.documents.filter((d) => d.loanId === loanId);
}

export function agreementPdfFileName(loanId: string): string {
  const safe = loanId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "loan";
  return `FIRE-Nepal-Loan-Agreement-${safe}.pdf`;
}

/** Text lines embedded in the agreement PDF — used by generation + tests. */
export function buildAgreementPdfContentLines(input: {
  loanId: string;
  agreementNumber: string;
  lenderName: string;
  lenderFireId: string;
  borrowerName: string;
  borrowerFireId: string;
  amountLabel: string;
  interestRate: number;
  durationMonths: number;
  installmentCount: number;
  purpose: string;
  generatedAt: string;
  status: string;
  lenderSigned: boolean;
  borrowerSigned: boolean;
  lenderSignedAt?: string;
  borrowerSignedAt?: string;
  emiLines: string[];
}): string[] {
  return [
    "FIRE Nepal Peer Loan Digital Agreement",
    `Loan ID: ${input.loanId}`,
    `Agreement / Reference: ${input.agreementNumber}`,
    `Generated: ${input.generatedAt}`,
    `Status: ${input.status}`,
    `Lender: ${input.lenderName} (${input.lenderFireId})`,
    `Borrower: ${input.borrowerName} (${input.borrowerFireId})`,
    `Principal: ${input.amountLabel}`,
    `Interest rate: ${input.interestRate}% p.a.`,
    `Duration: ${input.durationMonths} months`,
    `Installments: ${input.installmentCount}`,
    `Purpose: ${input.purpose}`,
    ...input.emiLines.map((l) => `EMI: ${l}`),
    `Lender signature: ${input.lenderSigned ? `Signed ${input.lenderSignedAt ?? ""}`.trim() : "Pending"}`,
    `Borrower signature: ${input.borrowerSigned ? `Signed ${input.borrowerSignedAt ?? ""}`.trim() : "Pending"}`,
  ];
}

/** Trigger a reliable blob download (desktop + mobile) and revoke the object URL. */
export function downloadBlobAsFile(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName || "document";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}

export async function downloadFromUrlAsFile(url: string, fileName: string): Promise<void> {
  if (!url) {
    throw new Error("Download URL is missing.");
  }
  if (url.startsWith("data:")) {
    const res = await fetch(url);
    const blob = await res.blob();
    downloadBlobAsFile(blob, fileName);
    return;
  }
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    throw new Error("Could not download the file. Try again.");
  }
  const blob = await res.blob();
  if (blob.size === 0) {
    throw new Error("Downloaded file was empty.");
  }
  downloadBlobAsFile(blob, fileName);
}
