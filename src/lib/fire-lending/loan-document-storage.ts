/** Supabase Storage bucket for peer-loan supporting documents (private). */
export const FIRE_LENDING_DOC_STORAGE_BUCKET = "fire_lending_documents" as const;

/** 8 MB — aligned with other private vault uploads. */
export const FIRE_LENDING_DOC_MAX_BYTES = 8 * 1024 * 1024;

export const FIRE_LENDING_DOC_ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const FIRE_LENDING_DOC_ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "doc",
  "docx",
]);

export function fireLendingDocStoragePath(
  userId: string,
  loanId: string,
  fileId: string,
  ext: string,
): string {
  const safeUser = userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "user";
  const safeLoan = loanId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "loan";
  const safeFile = fileId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "file";
  const safeExt = ext.replace(/[^a-z0-9]/gi, "").slice(0, 8).toLowerCase() || "bin";
  return `${safeUser}/${safeLoan}/${safeFile}.${safeExt}`;
}

export function extFromLoanDocMime(mime: string, fileName?: string): string {
  const m = mime.toLowerCase();
  if (m === "application/pdf") return "pdf";
  if (m === "image/jpeg") return "jpg";
  if (m === "image/png") return "png";
  if (m === "application/msword") return "doc";
  if (m === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  const fromName = (fileName ?? "").split(".").pop()?.toLowerCase() ?? "";
  if (FIRE_LENDING_DOC_ALLOWED_EXTENSIONS.has(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  return "bin";
}

export function mimeFromFileName(fileName: string): string | null {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "application/pdf";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "doc") return "application/msword";
  if (ext === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return null;
}
