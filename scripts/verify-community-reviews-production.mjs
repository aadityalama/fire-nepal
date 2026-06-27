#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import { loadDotEnvLocal } from "./load-dotenv-local.mjs";

loadDotEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });
const expected = ["Bikash Gurung", "Sita Magar", "Rajesh Chaudhary", "Anita Shrestha"];

const { error: tableErr } = await admin.from("community_reviews").select("id").limit(1);
if (tableErr) {
  console.log(JSON.stringify({ ok: false, tableExists: false, error: tableErr.message }, null, 2));
  process.exit(1);
}

const { data, error } = await admin
  .from("community_reviews")
  .select("full_name, city, country, is_demo, status, display_order, verified, rating")
  .eq("is_demo", true)
  .eq("status", "approved")
  .order("display_order");

if (error) {
  console.log(JSON.stringify({ ok: false, tableExists: true, error: error.message }, null, 2));
  process.exit(1);
}

const names = (data ?? []).map((r) => r.full_name);
const missing = expected.filter((n) => !names.includes(n));
const report = {
  ok: missing.length === 0 && (data?.length ?? 0) >= 4,
  tableExists: true,
  demoCount: data?.length ?? 0,
  missing,
  reviews: data ?? [],
};
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
