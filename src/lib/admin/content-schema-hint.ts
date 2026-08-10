/** Shared operator hint when Admin Content tables are missing in production. */
export const ADMIN_CONTENT_MIGRATION_HINT =
  "Apply scripts/admin-content-production-migration-combined.sql in the Supabase SQL Editor (or npm run db:apply:admin-content with SUPABASE_DB_URL), then reload.";

export function isMissingRelationError(message: string | null | undefined): boolean {
  const m = (message ?? "").toLowerCase();
  return (
    m.includes("pgrst205") ||
    m.includes("could not find the table") ||
    m.includes("does not exist") ||
    m.includes("schema cache")
  );
}

export function withContentSchemaHint(message: string): string {
  if (!isMissingRelationError(message)) return message;
  if (message.includes("admin-content-production-migration-combined.sql")) return message;
  return `${message} — ${ADMIN_CONTENT_MIGRATION_HINT}`;
}
