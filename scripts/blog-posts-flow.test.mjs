/**
 * Unit coverage for blog slug helpers + seed migration titles + admin builders.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeReadingTime, slugifyBlogTitle } from "../src/lib/blog-posts/slug.ts";
import { HOMEPAGE_BLOG_SEED, homepageBlogFallbackList } from "../src/lib/blog-posts/seed-posts.ts";
import {
  buildBlogPostInsert,
  buildBlogPostPatch,
} from "../src/services/blog-posts-supabase.ts";

function mockClient(existingSlugs = []) {
  const chain = (slug) => {
    const api = {
      eq() {
        return api;
      },
      is() {
        return api;
      },
      neq() {
        return api;
      },
      limit() {
        return api;
      },
      async maybeSingle() {
        const hit = existingSlugs.includes(slug);
        return { data: hit ? { id: "existing" } : null, error: null };
      },
    };
    return api;
  };
  return {
    from() {
      return {
        select() {
          return {
            eq(_col, slug) {
              return chain(slug);
            },
          };
        },
      };
    },
  };
}

describe("slugifyBlogTitle", () => {
  it("creates URL-safe slugs", () => {
    assert.equal(
      slugifyBlogTitle("How to invest your abroad salary for Nepal goals"),
      "how-to-invest-your-abroad-salary-for-nepal-goals",
    );
    assert.equal(slugifyBlogTitle("  FIRE Mistakes!!!  "), "fire-mistakes");
  });
});

describe("normalizeReadingTime", () => {
  it("normalizes minutes into 'N min read'", () => {
    assert.equal(normalizeReadingTime("5"), "5 min read");
    assert.equal(normalizeReadingTime("5 minutes read"), "5 min read");
    assert.equal(normalizeReadingTime("7 min read"), "7 min read");
  });
});

describe("homepage seed", () => {
  it("preserves the three hardcoded homepage titles", () => {
    const titles = HOMEPAGE_BLOG_SEED.map((p) => p.title);
    assert.deepEqual(titles, [
      "How to invest your abroad salary for Nepal goals",
      "FIRE mistakes Nepali workers make abroad",
      "Multi-currency remittance: what to track before coming home",
    ]);
    assert.equal(homepageBlogFallbackList().length, 3);
    for (const post of HOMEPAGE_BLOG_SEED) {
      assert.ok(post.slug);
      assert.ok(post.content.length > 40);
      assert.ok(post.category);
      assert.ok(post.reading_time.includes("min"));
    }
  });

  it("keeps the abroad-salary money guide upgraded and published-ready", () => {
    const post = HOMEPAGE_BLOG_SEED.find(
      (p) => p.slug === "how-to-invest-your-abroad-salary-for-nepal-goals",
    );
    assert.ok(post);
    assert.equal(post.category, "Money guide");
    assert.equal(post.slug, "how-to-invest-your-abroad-salary-for-nepal-goals");
    assert.match(post.reading_time, /^\d+ min read$/);
    assert.ok(Number(post.reading_time.match(/\d+/)[0]) >= 12);
    assert.ok(post.excerpt.toLowerCase().includes("nepal"));
    assert.ok(post.content.includes("Abroad-to-Nepal Wealth Framework"));
    assert.ok(post.content.includes("Illustrative example only"));
    assert.ok(post.content.includes("turn overseas income into lasting financial freedom"));
    assert.ok(post.content.includes("/currency-converter"));
    assert.ok(post.content.includes("/remittance-calculator"));
    assert.ok(post.content.includes("/savings-tracker"));
    assert.ok(post.content.includes("/fire-summary"));
  });
});

describe("admin blog flow builders", () => {
  it("creates a published insert", async () => {
    const insert = await buildBlogPostInsert(mockClient(), {
      title: "How to invest your abroad salary for Nepal goals",
      category: "Money guide",
      reading_time: "5",
      content: "## Hello\n\nBody",
      status: "published",
      display_order: 1,
      updated_by: "admin-user",
    });
    assert.ok(!("error" in insert));
    assert.equal(insert.slug, "how-to-invest-your-abroad-salary-for-nepal-goals");
    assert.equal(insert.reading_time, "5 min read");
    assert.equal(insert.status, "published");
    assert.ok(insert.published_at);
  });

  it("requires title and content", async () => {
    const missing = await buildBlogPostInsert(mockClient(), {
      title: "",
      content: "x",
      updated_by: "admin-user",
    });
    assert.ok("error" in missing);

    const missingContent = await buildBlogPostInsert(mockClient(), {
      title: "Title",
      content: "  ",
      updated_by: "admin-user",
    });
    assert.ok("error" in missingContent);
  });

  it("avoids slug collisions", async () => {
    const insert = await buildBlogPostInsert(mockClient(["my-post"]), {
      title: "My Post",
      content: "Body",
      updated_by: "admin-user",
    });
    assert.ok(!("error" in insert));
    assert.equal(insert.slug, "my-post-2");
  });

  it("supports publish / unpublish / soft delete / edit patch", async () => {
    const published = await buildBlogPostPatch(mockClient(), {
      id: "1",
      action: "publish",
      updated_by: "admin-user",
    });
    assert.ok(!("error" in published));
    assert.equal(published.status, "published");

    const unpublished = await buildBlogPostPatch(mockClient(), {
      id: "1",
      action: "unpublish",
      updated_by: "admin-user",
    });
    assert.ok(!("error" in unpublished));
    assert.equal(unpublished.status, "draft");

    const deleted = await buildBlogPostPatch(mockClient(), {
      id: "1",
      action: "soft_delete",
      updated_by: "admin-user",
    });
    assert.ok(!("error" in deleted));
    assert.ok(deleted.deleted_at);

    const edited = await buildBlogPostPatch(mockClient(), {
      id: "1",
      title: "Updated title",
      category: "Retirement",
      reading_time: "7 min read",
      content: "Updated body",
      display_order: 2,
      updated_by: "admin-user",
    });
    assert.ok(!("error" in edited));
    assert.equal(edited.title, "Updated title");
    assert.equal(edited.category, "Retirement");
    assert.equal(edited.display_order, 2);
    assert.equal(edited.slug, undefined);
  });
});
