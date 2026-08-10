#!/usr/bin/env node
/**
 * Verify youtube_videos table + service-role CRUD / publish / reorder / soft-delete flow.
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
const report = { ok: false, steps: [] };

function step(name, ok, detail) {
  report.steps.push({ name, ok, detail });
  console.log(`${ok ? "OK" : "FAIL"} ${name}${detail ? `: ${detail}` : ""}`);
}

const { error: tableErr } = await admin.from("youtube_videos").select("id").limit(1);
if (tableErr) {
  step("table exists", false, tableErr.message);
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}
step("table exists", true);

const stamp = Date.now();
const videoId = "dQw4w9WgXcQ";
const { data: created, error: createErr } = await admin
  .from("youtube_videos")
  .insert({
    title: `CRUD probe ${stamp}`,
    youtube_url: `https://www.youtube.com/watch?v=${videoId}`,
    youtube_video_id: videoId,
    duration: "9:05",
    thumbnail_url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    display_order: 999,
    status: "draft",
  })
  .select("id, status, thumbnail_url")
  .single();

if (createErr || !created?.id) {
  step("CRUD create", false, createErr?.message ?? "no id");
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}
step("CRUD create", true, created.id);
step("auto thumbnail stored", Boolean(created.thumbnail_url?.includes(videoId)), created.thumbnail_url);

const { data: published, error: publishErr } = await admin
  .from("youtube_videos")
  .update({ status: "published", published_at: new Date().toISOString() })
  .eq("id", created.id)
  .select("status")
  .single();
step("publish", !publishErr && published?.status === "published", publishErr?.message);

const { data: homepage, error: homeErr } = await admin
  .from("youtube_videos")
  .select("id, display_order, created_at")
  .eq("status", "published")
  .is("deleted_at", null)
  .order("display_order", { ascending: true })
  .order("created_at", { ascending: false });
step("homepage published query", !homeErr && (homepage ?? []).some((r) => r.id === created.id), homeErr?.message);

const { error: editErr } = await admin
  .from("youtube_videos")
  .update({ title: `CRUD probe ${stamp} edited`, duration: "12:18", display_order: 1 })
  .eq("id", created.id);
step("edit", !editErr, editErr?.message);

const { data: unpublished, error: unpubErr } = await admin
  .from("youtube_videos")
  .update({ status: "draft", published_at: null })
  .eq("id", created.id)
  .select("status")
  .single();
step("unpublish", !unpubErr && unpublished?.status === "draft", unpubErr?.message);

const { error: deleteErr } = await admin
  .from("youtube_videos")
  .update({ deleted_at: new Date().toISOString() })
  .eq("id", created.id);
step("soft delete", !deleteErr, deleteErr?.message);

const { error: hardDeleteErr } = await admin.from("youtube_videos").delete().eq("id", created.id);
step("cleanup hard delete", !hardDeleteErr, hardDeleteErr?.message);

report.ok = report.steps.every((s) => s.ok);
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
