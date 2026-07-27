/**
 * Backfill / refresh official NEPSE financial statements.
 * Same production path as cron `ingestCompanyStatements`.
 *
 *   npx tsx scripts/ingest-nepse-statements.ts
 *   npx tsx scripts/ingest-nepse-statements.ts --limit=400 --pdfLimit=250
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ingestCompanyStatements } from "../src/services/market/nepse-market-data-engine";

function loadDotEnvLocal() {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadDotEnvLocal();

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const args = process.argv.slice(2);
const arg = (name: string, fallback: string) => {
  const hit = args.find((item) => item.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const securityLimit = Number(arg("limit", "400")) || 400;
const pdfLimit = Number(arg("pdfLimit", "250")) || 250;
const prioritize = String(arg("priority", "NABIL,NICA,GBIME,UPPER,API,HIDCL,NLIC,SHIVM,NRIC,CHCL"))
  .split(",")
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean);
const parsePdfs = !args.includes("--no-pdf");

const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const result = await ingestCompanyStatements(sb, { securityLimit, pdfLimit, prioritize, parsePdfs });
console.log(JSON.stringify(result, null, 2));
if (result.status === "error") process.exit(1);
