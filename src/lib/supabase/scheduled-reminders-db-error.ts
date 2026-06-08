/**
 * Maps raw Postgres / PostgREST messages to actionable copy for the reminders API.
 */
export function formatScheduledRemindersDbError(message: string | undefined): string {
  const raw = message?.trim() ?? "";
  if (!raw) return "Could not save reminder (unknown database error).";

  const lower = raw.toLowerCase();
  const mentionsTable =
    lower.includes("scheduled_reminders") ||
    lower.includes("public.scheduled_reminders") ||
    lower.includes("'scheduled_reminders'");

  if (
    mentionsTable &&
    (lower.includes("does not exist") || lower.includes("not exist") || lower.includes("undefined table"))
  ) {
    return [
      "The table public.scheduled_reminders is not in your Supabase database.",
      "Fix: from the repo root, set SUPABASE_DB_URL (Settings → Database → connection string) and run npm run db:push:remote,",
      "or paste and run supabase/migrations/20250602140000_scheduled_reminders.sql in the SQL Editor (then later migrations in order).",
      "Then run notify pgrst, 'reload schema'; in SQL or apply migration 20250603120000_postgrest_reload_schema.sql.",
    ].join(" ");
  }

  if (mentionsTable && lower.includes("schema cache")) {
    return [
      "Supabase API schema cache is stale or the table was just created.",
      "Fix: SQL Editor → run: notify pgrst, 'reload schema';",
      "(Dashboard: Project Settings → Data API → reload schema, if available.)",
    ].join(" ");
  }

  return raw;
}
