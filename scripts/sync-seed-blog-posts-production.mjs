#!/usr/bin/env node
/**
 * Sync HOMEPAGE_BLOG_SEED into production blog_posts by slug (service-role PATCH).
 *
 * Requires in `.env.local` (or environment):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node scripts/sync-seed-blog-posts-production.mjs
 *   node scripts/sync-seed-blog-posts-production.mjs --slug=how-to-invest-your-abroad-salary-for-nepal-goals
 */
import { createClient } from "@supabase/supabase-js";
import { loadDotEnvLocal } from "./load-dotenv-local.mjs";
import { HOMEPAGE_BLOG_SEED } from "../src/lib/blog-posts/seed-posts.ts";

loadDotEnvLocal();

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
const onlySlug = (process.argv.find((a) => a.startsWith("--slug=")) ?? "").slice("--slug=".length);

if (url.length < 20 || serviceKey.length < 20) {
  console.error(`
FAIL: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.

Add them to .env.local, then re-run:
  node scripts/sync-seed-blog-posts-production.mjs
`);
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const seeds = onlySlug
  ? HOMEPAGE_BLOG_SEED.filter((p) => p.slug === onlySlug)
  : HOMEPAGE_BLOG_SEED;

if (!seeds.length) {
  console.error(`FAIL: no seed posts matched ${onlySlug || "(all)"}`);
  process.exit(1);
}

let updated = 0;
for (const seed of seeds) {
  const { data: existing, error: readErr } = await admin
    .from("blog_posts")
    .select("id, title, category, reading_time, excerpt, content, status, deleted_at")
    .eq("slug", seed.slug)
    .is("deleted_at", null)
    .maybeSingle();

  if (readErr) {
    console.error(`FAIL ${seed.slug}: ${readErr.message}`);
    process.exit(1);
  }
  if (!existing) {
    console.error(`FAIL ${seed.slug}: row not found`);
    process.exit(1);
  }
  if (existing.status !== "published") {
    console.error(`FAIL ${seed.slug}: expected published, got ${existing.status}`);
    process.exit(1);
  }

  const same =
    existing.title === seed.title &&
    existing.category === seed.category &&
    existing.reading_time === seed.reading_time &&
    existing.excerpt === seed.excerpt &&
    existing.content === seed.content;

  if (same) {
    console.log(`OK   ${seed.slug}: already in sync (${seed.reading_time})`);
    continue;
  }

  const { error: writeErr } = await admin
    .from("blog_posts")
    .update({
      title: seed.title,
      category: seed.category,
      reading_time: seed.reading_time,
      excerpt: seed.excerpt,
      content: seed.content,
    })
    .eq("id", existing.id)
    .is("deleted_at", null);

  if (writeErr) {
    console.error(`FAIL ${seed.slug}: ${writeErr.message}`);
    process.exit(1);
  }

  updated += 1;
  console.log(`OK   ${seed.slug}: synced (${existing.reading_time} → ${seed.reading_time})`);
}

console.log(`\nDone. Updated ${updated}/${seeds.length} post(s).\n`);
