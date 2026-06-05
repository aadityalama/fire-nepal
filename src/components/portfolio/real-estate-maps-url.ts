/** Max stored length for a Google Maps link (query strings can be long). */
export const MAX_REAL_ESTATE_MAPS_URL_LEN = 2000;

/**
 * Accepts only https URLs that point at Google Maps (or official short links).
 * Used when loading from localStorage / Supabase and before opening in a new tab.
 */
export function sanitizeGoogleMapsUrl(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const t = raw.trim().slice(0, MAX_REAL_ESTATE_MAPS_URL_LEN);
  if (!t) return undefined;
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    return undefined;
  }
  if (u.protocol !== "https:") return undefined;
  const host = u.hostname.toLowerCase();
  const path = u.pathname.toLowerCase();

  const isGoogleMapsPath = path === "/maps" || path.startsWith("/maps/");

  if (host === "maps.google.com") return t;
  if (host === "maps.app.goo.gl") return t;
  if (host === "goo.gl" && path.startsWith("/maps")) return t;
  if ((host === "www.google.com" || host === "google.com") && isGoogleMapsPath) return t;

  return undefined;
}
