import { todayIso, uid } from "@/lib/fire-lending/format";
import {
  type PendingLoanDocument,
  validateLoanDocumentFile,
} from "@/lib/fire-lending/loan-documents";

const DATA_URL_MAX_CHARS = 1_500_000;

function readFileAsDataUrl(file: File, maxChars: number): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      resolve(result && result.length <= maxChars ? result : null);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export type LoanDocUploadResult = {
  url: string;
  storagePath?: string;
  mimeType: string;
  fileName: string;
  sizeBytes: number;
};

/**
 * Prefer private Supabase Storage via authenticated API; fall back to inline data URL
 * for guests / when storage is unavailable. Never silently ignores validation failures.
 */
export async function uploadLoanSupportingDocument(args: {
  file: File;
  loanId: string;
}): Promise<{ ok: true; result: LoanDocUploadResult } | { ok: false; error: string }> {
  const validation = validateLoanDocumentFile({
    fileName: args.file.name || "document",
    mimeType: args.file.type,
    sizeBytes: args.file.size,
  });
  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  const form = new FormData();
  form.set("file", args.file);
  form.set("loanId", args.loanId);

  try {
    const res = await fetch("/api/fire-lending/documents/upload", { method: "POST", body: form });
    if (res.ok) {
      const json = (await res.json()) as {
        url?: string;
        storagePath?: string;
        mimeType?: string;
        name?: string;
        sizeBytes?: number;
      };
      if (json.url) {
        return {
          ok: true,
          result: {
            url: json.url,
            storagePath: json.storagePath,
            mimeType: json.mimeType || validation.mimeType,
            fileName: json.name || validation.fileName,
            sizeBytes: json.sizeBytes ?? validation.sizeBytes,
          },
        };
      }
    } else if (res.status === 400 || res.status === 401) {
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      return { ok: false, error: json?.error || "Upload failed. Check the file and try again." };
    }
  } catch {
    /* fall through to inline guest path */
  }

  const dataUrl = await readFileAsDataUrl(args.file, DATA_URL_MAX_CHARS);
  if (!dataUrl) {
    return {
      ok: false,
      error: "Could not upload this file. Try a smaller PDF, JPG, PNG, DOC, or DOCX.",
    };
  }

  return {
    ok: true,
    result: {
      url: dataUrl,
      mimeType: validation.mimeType,
      fileName: validation.fileName,
      sizeBytes: validation.sizeBytes,
    },
  };
}

export async function uploadFilesToPendingDocuments(args: {
  files: FileList | File[];
  draftLoanId: string;
  existing: PendingLoanDocument[];
  onProgress?: (docs: PendingLoanDocument[]) => void;
}): Promise<{ docs: PendingLoanDocument[]; errors: string[] }> {
  const list = Array.from(args.files);
  const errors: string[] = [];
  let docs = [...args.existing];

  for (const file of list) {
    const id = uid("doc");
    const createdAt = todayIso();
    const validation = validateLoanDocumentFile({
      fileName: file.name || "document",
      mimeType: file.type,
      sizeBytes: file.size,
    });

    if (!validation.ok) {
      errors.push(`${file.name || "File"}: ${validation.error}`);
      const failed: PendingLoanDocument = {
        id,
        fileName: file.name || "document",
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        status: "error",
        error: validation.error,
        kind: "other",
        createdAt,
      };
      docs = [...docs, failed];
      args.onProgress?.(docs);
      continue;
    }

    const uploading: PendingLoanDocument = {
      id,
      fileName: validation.fileName,
      mimeType: validation.mimeType,
      sizeBytes: validation.sizeBytes,
      status: "uploading",
      kind: "other",
      createdAt,
    };
    docs = [...docs, uploading];
    args.onProgress?.(docs);

    const uploaded = await uploadLoanSupportingDocument({ file, loanId: args.draftLoanId });
    if (!uploaded.ok) {
      errors.push(`${validation.fileName}: ${uploaded.error}`);
      docs = docs.map((d) =>
        d.id === id ? { ...d, status: "error" as const, error: uploaded.error } : d,
      );
      args.onProgress?.(docs);
      continue;
    }

    docs = docs.map((d) =>
      d.id === id
        ? {
            ...d,
            status: "ready" as const,
            url: uploaded.result.url,
            storagePath: uploaded.result.storagePath,
            mimeType: uploaded.result.mimeType,
            fileName: uploaded.result.fileName,
            sizeBytes: uploaded.result.sizeBytes,
            error: undefined,
          }
        : d,
    );
    args.onProgress?.(docs);
  }

  return { docs, errors };
}
