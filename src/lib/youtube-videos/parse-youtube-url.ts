/** Extract a YouTube video id from common watch / short / embed / youtu.be URLs. */
export function extractYoutubeVideoId(raw: string): string | null {
  const input = raw.trim();
  if (!input) return null;

  let url: URL;
  try {
    url = new URL(input.includes("://") ? input : `https://${input}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();

  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return isValidYoutubeVideoId(id) ? id : null;
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    const v = url.searchParams.get("v");
    if (v && isValidYoutubeVideoId(v)) return v;

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live" || parts[0] === "v") {
      const id = parts[1] ?? "";
      return isValidYoutubeVideoId(id) ? id : null;
    }
  }

  return null;
}

export function isValidYoutubeVideoId(id: string): boolean {
  return /^[\w-]{11}$/.test(id);
}

export function youtubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function normalizeYoutubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/** Official YouTube iframe embed URL for a validated 11-char video id. */
export function youtubeEmbedUrl(videoId: string, options?: { autoplay?: boolean }): string | null {
  if (!isValidYoutubeVideoId(videoId)) return null;
  const params = new URLSearchParams();
  if (options?.autoplay) params.set("autoplay", "1");
  const query = params.toString();
  return `https://www.youtube.com/embed/${videoId}${query ? `?${query}` : ""}`;
}

/**
 * Prefer a stored video id; otherwise parse common YouTube URL shapes.
 * Returns null when neither yields a valid id (e.g. channel-only links).
 */
export function resolveYoutubeVideoId(
  videoId: string | null | undefined,
  youtubeUrl?: string | null,
): string | null {
  const stored = (videoId ?? "").trim();
  if (isValidYoutubeVideoId(stored)) return stored;
  if (youtubeUrl) return extractYoutubeVideoId(youtubeUrl);
  return null;
}

/** Normalize duration display (e.g. "9:05", "1:02:18"). Empty string allowed. */
export function normalizeDuration(raw: string | undefined | null): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(value)) return value;
  return value;
}
