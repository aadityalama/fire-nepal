#!/usr/bin/env node
/**
 * Verify blog_posts table, seed titles, publish flow, and service-role CRUD.
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
const expected = [
  "How to invest your abroad salary for Nepal goals",
  "FIRE mistakes Nepali workers make abroad",
  "Multi-currency remittance: what to track before coming home",
];
const report = { ok: false, steps: [] };

function step(name, ok, detail) {
  report.steps.push({ name, ok, detail });
  console.log(`${ok ? "OK" : "FAIL"} ${name}${detail ? `: ${detail}` : ""}`);
}

const { error: tableErr } = await admin.from("blog_posts").select("id").limit(1);
if (tableErr) {
  step("table exists", false, tableErr.message);
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}
step("table exists", true);

const { data: seeded, error: seedErr } = await admin
  .from("blog_posts")
  .select("title, slug, category, reading_time, status, display_order")
  .eq("status", "published")
  .is("deleted_at", null)
  .order("display_order", { ascending: true });

if (seedErr) {
  step("seed read", false, seedErr.message);
} else {
  const titles = (seeded ?? []).map((r) => r.title);
  const missing = expected.filter((t) => !titles.includes(t));
  step(
    "seed homepage posts",
    missing.length === 0,
    missing.length ? `missing: ${missing.join(" | ")}` : `${seeded?.length} published`,
  );
}

const stamp = Date.now();
const slug = `crud-probe-${stamp}`;
const { data: created, error: createErr } = await admin
  .from("blog_posts")
  .insert({
    title: `CRUD probe ${stamp}`,
    slug,
    category: "Money guide",
    reading_time: "5 min read",
    excerpt: "Probe excerpt",
    content: "## Probe\n\nBody",
    display_order: 999,
    status: "draft",
  })
  .select("id, status")
  .single();

if (createErr || !created?.id) {
  step("CRUD create", false, createErr?.message ?? "no id");
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}
step("CRUD create", true, created.id);

const { data: published, error: publishErr } = await admin
  .from("blog_posts")
  .update({ status: "published", published_at: new Date().toISOString() })
  .eq("id", created.id)
  .select("status")
  .single();
step("publish", !publishErr && published?.status === "published", publishErr?.message);

const { data: bySlug, error: slugErr } = await admin
  .from("blog_posts")
  .select("id, title")
  .eq("slug", slug)
  .eq("status", "published")
  .is("deleted_at", null)
  .maybeSingle();
step("open by slug", !slugErr && bySlug?.id === created.id, slugErr?.message);

const { error: editErr } = await admin
  .from("blog_posts")
  .update({ title: `CRUD probe ${stamp} edited`, reading_time: "7 min read", display_order: 1 })
  .eq("id", created.id);
step("edit", !editErr, editErr?.message);

const { data: unpublished, error: unpubErr } = await admin
  .from("blog_posts")
  .update({ status: "draft", published_at: null })
  .eq("id", created.id)
  .select("status")
  .single();
step("unpublish", !unpubErr && unpublished?.status === "draft", unpubErr?.message);

const { error: deleteErr } = await admin
  .from("blog_posts")
  .update({ deleted_at: new Date().toISOString() })
  .eq("id", created.id);
step("soft delete", !deleteErr, deleteErr?.message);

const { error: hardDeleteErr } = await admin.from("blog_posts").delete().eq("id", created.id);
step("cleanup hard delete", !hardDeleteErr, hardDeleteErr?.message);

report.ok = report.steps.every((s) => s.ok);
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
