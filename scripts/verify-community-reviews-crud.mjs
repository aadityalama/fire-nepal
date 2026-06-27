#!/usr/bin/env node
/**
 * Verify community_reviews table, demo seed, sort order, and service-role CRUD.
 */
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
const report = { ok: false, steps: [] };

function step(name, ok, detail) {
  report.steps.push({ name, ok, detail });
  console.log(`${ok ? "OK" : "FAIL"} ${name}${detail ? `: ${detail}` : ""}`);
}

const { error: tableErr } = await admin.from("community_reviews").select("id").limit(1);
if (tableErr) {
  step("table exists", false, tableErr.message);
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}
step("table exists", true);

const { data: columnsProbe, error: colErr } = await admin
  .from("community_reviews")
  .select(
    "id, full_name, city, country, rating, review_title, review_text, status, review_type, display_order, created_at, updated_at",
  )
  .limit(1);
step("required columns", !colErr, colErr?.message);
if (colErr) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}
void columnsProbe;

const { data: demos, error: demoErr } = await admin
  .from("community_reviews")
  .select("full_name, display_order, status, is_demo, review_type")
  .eq("is_demo", true)
  .eq("status", "approved")
  .order("display_order", { ascending: true })
  .order("created_at", { ascending: false });

if (demoErr) {
  step("demo seed read", false, demoErr.message);
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}

const names = (demos ?? []).map((r) => r.full_name);
const missing = expected.filter((n) => !names.includes(n));
step("demo seed (4 reviews)", missing.length === 0 && (demos?.length ?? 0) >= 4, missing.length ? `missing: ${missing.join(", ")}` : `${demos?.length} rows`);

const { data: homepageOrder, error: orderErr } = await admin
  .from("community_reviews")
  .select("display_order, created_at")
  .eq("status", "approved")
  .is("deleted_at", null)
  .order("display_order", { ascending: true })
  .order("created_at", { ascending: false });

if (orderErr) {
  step("homepage sort query", false, orderErr.message);
} else {
  const sorted = [...(homepageOrder ?? [])].sort((a, b) => {
    if (a.display_order !== b.display_order) return a.display_order - b.display_order;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  const orderOk = JSON.stringify(sorted) === JSON.stringify(homepageOrder ?? []);
  step("homepage sort (display_order ASC, created_at DESC)", orderOk);
}

const testTitle = `CRUD probe ${Date.now()}`;
const { data: created, error: createErr } = await admin
  .from("community_reviews")
  .insert({
    user_id: null,
    full_name: "CRUD Probe",
    city: "Kathmandu",
    country: "Nepal",
    rating: 4,
    review_title: testTitle,
    review_text: "Automated CRUD verification row.",
    verified: false,
    is_demo: false,
    status: "pending",
    review_type: "community",
    display_order: 999,
  })
  .select("id")
  .single();

if (createErr || !created?.id) {
  step("CRUD create", false, createErr?.message ?? "no id");
} else {
  step("CRUD create", true, created.id);

  const { error: updateErr } = await admin
    .from("community_reviews")
    .update({ review_title: `${testTitle} updated`, status: "approved" })
    .eq("id", created.id);
  step("CRUD update", !updateErr, updateErr?.message);

  const { error: deleteErr } = await admin.from("community_reviews").delete().eq("id", created.id);
  step("CRUD delete", !deleteErr, deleteErr?.message);
}

report.ok = report.steps.every((s) => s.ok);
report.demoCount = demos?.length ?? 0;
report.missing = missing;
report.reviews = demos ?? [];
console.log("\n" + JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
