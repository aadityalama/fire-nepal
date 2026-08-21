/**
 * Unit coverage for YouTube URL parsing + admin insert/patch builders.
 * Mirrors the Admin → Add → Publish → Edit → Unpublish/Delete flow at the data layer.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractYoutubeVideoId,
  normalizeDuration,
  normalizeYoutubeWatchUrl,
  resolveYoutubeVideoId,
  youtubeEmbedUrl,
  youtubeThumbnailUrl,
} from "../src/lib/youtube-videos/parse-youtube-url.ts";
import {
  buildYoutubeVideoInsert,
  buildYoutubeVideoPatch,
  parseYoutubeFields,
} from "../src/services/youtube-videos-supabase.ts";

describe("extractYoutubeVideoId", () => {
  it("parses watch, short, embed, and youtu.be URLs", () => {
    assert.equal(extractYoutubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), "dQw4w9WgXcQ");
    assert.equal(extractYoutubeVideoId("https://youtu.be/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
    assert.equal(extractYoutubeVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
    assert.equal(extractYoutubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
    assert.equal(extractYoutubeVideoId("youtube.com/watch?v=dQw4w9WgXcQ&t=30s"), "dQw4w9WgXcQ");
  });

  it("rejects invalid input", () => {
    assert.equal(extractYoutubeVideoId(""), null);
    assert.equal(extractYoutubeVideoId("https://example.com/watch?v=dQw4w9WgXcQ"), null);
    assert.equal(extractYoutubeVideoId("not a url"), null);
  });
});

describe("youtube helpers", () => {
  it("builds thumbnail and canonical watch URL", () => {
    assert.equal(youtubeThumbnailUrl("dQw4w9WgXcQ"), "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
    assert.equal(normalizeYoutubeWatchUrl("dQw4w9WgXcQ"), "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    assert.equal(normalizeDuration(" 9:05 "), "9:05");
  });

  it("builds embed URLs and resolves video ids without crashing on bad input", () => {
    assert.equal(youtubeEmbedUrl("dQw4w9WgXcQ"), "https://www.youtube.com/embed/dQw4w9WgXcQ");
    assert.equal(
      youtubeEmbedUrl("dQw4w9WgXcQ", { autoplay: true }),
      "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1",
    );
    assert.equal(youtubeEmbedUrl(""), null);
    assert.equal(youtubeEmbedUrl("short"), null);
    assert.equal(resolveYoutubeVideoId("dQw4w9WgXcQ"), "dQw4w9WgXcQ");
    assert.equal(resolveYoutubeVideoId("", "https://youtu.be/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
    assert.equal(resolveYoutubeVideoId("", "https://www.youtube.com/@Firenepal853"), null);
    assert.equal(resolveYoutubeVideoId(null, null), null);
  });
});

describe("admin video flow builders", () => {
  it("creates a published insert with auto thumbnail", () => {
    const insert = buildYoutubeVideoInsert({
      title: "Overseas income to FIRE strategy",
      youtube_url: "https://youtu.be/dQw4w9WgXcQ",
      duration: "9:05",
      display_order: 1,
      status: "published",
      updated_by: "admin-user",
    });
    assert.ok(!("error" in insert));
    assert.equal(insert.title, "Overseas income to FIRE strategy");
    assert.equal(insert.youtube_video_id, "dQw4w9WgXcQ");
    assert.equal(insert.thumbnail_url, "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
    assert.equal(insert.status, "published");
    assert.ok(insert.published_at);
  });

  it("rejects bad URLs on create", () => {
    const insert = buildYoutubeVideoInsert({
      title: "Bad",
      youtube_url: "https://vimeo.com/123",
      updated_by: "admin-user",
    });
    assert.ok("error" in insert);
  });

  it("supports publish / unpublish / soft delete / edit patch", () => {
    const published = buildYoutubeVideoPatch({
      action: "publish",
      updated_by: "admin-user",
    });
    assert.ok(!("error" in published));
    assert.equal(published.status, "published");
    assert.equal(published.deleted_at, null);

    const unpublished = buildYoutubeVideoPatch({
      action: "unpublish",
      updated_by: "admin-user",
    });
    assert.ok(!("error" in unpublished));
    assert.equal(unpublished.status, "draft");
    assert.equal(unpublished.published_at, null);

    const deleted = buildYoutubeVideoPatch({
      action: "soft_delete",
      updated_by: "admin-user",
    });
    assert.ok(!("error" in deleted));
    assert.ok(deleted.deleted_at);

    const edited = buildYoutubeVideoPatch({
      title: "Updated title",
      youtube_url: "https://www.youtube.com/watch?v=abcdefghijk",
      duration: "12:18",
      display_order: 2,
      updated_by: "admin-user",
    });
    assert.ok(!("error" in edited));
    assert.equal(edited.title, "Updated title");
    assert.equal(edited.youtube_video_id, "abcdefghijk");
    assert.equal(edited.duration, "12:18");
    assert.equal(edited.display_order, 2);
  });

  it("parseYoutubeFields normalizes input", () => {
    const parsed = parseYoutubeFields("https://www.youtube.com/watch?v=abcdefghijk");
    assert.ok(!("error" in parsed));
    assert.equal(parsed.youtube_video_id, "abcdefghijk");
    assert.equal(parsed.youtube_url, "https://www.youtube.com/watch?v=abcdefghijk");
  });
});
