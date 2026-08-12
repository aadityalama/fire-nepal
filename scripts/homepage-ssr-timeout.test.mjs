import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("homepage public SSR fetch resilience", () => {
  it("uses cookie-free public client and timeouts (not createServerSupabaseClient)", () => {
    for (const rel of [
      "src/lib/community-reviews/fetch-public-reviews.ts",
      "src/lib/youtube-videos/fetch-public-videos.ts",
      "src/lib/blog-posts/fetch-public-posts.ts",
    ]) {
      const src = readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
      assert.match(src, /createPublicSupabaseClient/);
      assert.match(src, /withServerTimeout/);
      assert.match(src, /PUBLIC_FETCH_TIMEOUT_MS\s*=\s*2_500/);
      assert.doesNotMatch(src, /createServerSupabaseClient/);
      assert.doesNotMatch(src, /from "next\/headers"/);
    }
  });

  it("exposes withServerTimeout helper on the server supabase module", () => {
    const src = readFileSync(new URL("../src/lib/supabase/server.ts", import.meta.url), "utf8");
    assert.match(src, /export function createPublicSupabaseClient/);
    assert.match(src, /export async function withServerTimeout/);
    assert.match(src, /persistSession:\s*false/);
  });

  it("homepage and blog index opt into ISR revalidate", () => {
    const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
    const blog = readFileSync(new URL("../app/blog/page.tsx", import.meta.url), "utf8");
    assert.match(home, /export const revalidate = 60/);
    assert.match(blog, /export const revalidate = 60/);
  });
});
