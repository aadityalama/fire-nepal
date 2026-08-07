#!/usr/bin/env node
/**
 * Apply scheduled reminders email lifecycle migration to production Postgres.
 * Requires SUPABASE_DB_URL (or DATABASE_URL).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sqlPath = path.join(root, "supabase/migrations/20260807120000_scheduled_reminders_email_lifecycle.sql");
const dbUrl = process.env.SUPABASE_DB_URL?.trim() || process.env.DATABASE_URL?.trim();

if (!dbUrl) {
  console.error("Missing SUPABASE_DB_URL (or DATABASE_URL)");
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, "utf8");
const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query("begin");
  await client.query(sql);
  await client.query("commit");
  console.log(JSON.stringify({ ok: true, applied: path.basename(sqlPath) }, null, 2));
} catch (e) {
  await client.query("rollback").catch(() => {});
  console.error(JSON.stringify({ ok: false, error: String(e?.message || e) }, null, 2));
  process.exit(1);
} finally {
  await client.end();
}
