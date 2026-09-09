/**
 * Coverage for Admin Content seed-sync authorization + payload shape.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { HOMEPAGE_BLOG_SEED } from "../src/lib/blog-posts/seed-posts.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("ensure-admin-content seed sync", () => {
  it("exposes syncSeed query handling and preserves published status semantics", () => {
    const src = readFileSync(join(root, "app/api/schema/ensure-admin-content/route.ts"), "utf8");
    assert.match(src, /syncSeed/);
    assert.match(src, /HOMEPAGE_BLOG_SEED/);
    assert.match(src, /status !== "published"/);
    assert.match(src, /DEFAULT_SYNC_SLUG/);
    assert.match(src, /how-to-invest-your-abroad-salary-for-nepal-goals/);
    assert.doesNotMatch(src, /CRON_SECRET/);
  });

  it("abroad-salary seed is ready for production sync", () => {
    const post = HOMEPAGE_BLOG_SEED.find(
      (p) => p.slug === "how-to-invest-your-abroad-salary-for-nepal-goals",
    );
    assert.ok(post);
    assert.equal(post.category, "Money guide");
    assert.equal(post.reading_time, "16 min read");
    assert.ok(post.content.includes("Abroad-to-Nepal Wealth Framework"));
    assert.ok(post.excerpt.toLowerCase().includes("nepal"));
  });
});
