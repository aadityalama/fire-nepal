import test from "node:test";
import assert from "node:assert/strict";
// Compile-free: duplicate the tiny pure helpers for regression coverage.
function isMissingRelationError(message) {
  const m = (message ?? "").toLowerCase();
  return (
    m.includes("pgrst205") ||
    m.includes("could not find the table") ||
    m.includes("does not exist") ||
    m.includes("schema cache")
  );
}

function withContentSchemaHint(message) {
  const hint =
    "Apply scripts/admin-content-production-migration-combined.sql in the Supabase SQL Editor (or npm run db:apply:admin-content with SUPABASE_DB_URL), then reload.";
  if (!isMissingRelationError(message)) return message;
  if (message.includes("admin-content-production-migration-combined.sql")) return message;
  return `${message} — ${hint}`;
}

test("detects missing relation errors", () => {
  assert.equal(isMissingRelationError("PGRST205: Could not find the table"), true);
  assert.equal(isMissingRelationError("permission denied"), false);
});

test("appends migration hint once", () => {
  const msg = withContentSchemaHint("Could not find the table 'public.youtube_videos' in the schema cache");
  assert.match(msg, /admin-content-production-migration-combined\.sql/);
  assert.equal(withContentSchemaHint(msg), msg);
});
