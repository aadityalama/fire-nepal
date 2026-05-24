/** Default landing after sign-in when no safe `next` is provided. */
export const DEFAULT_POST_LOGIN_PATH = "/hub";

const AUTH_PATH_EXACT = new Set(["/login", "/signup", "/verify-email", "/forgot-password"]);

function pathnameOnly(path: string): string {
  const q = path.indexOf("?");
  const h = path.indexOf("#");
  let end = path.length;
  if (q >= 0) end = Math.min(end, q);
  if (h >= 0) end = Math.min(end, h);
  return path.slice(0, end);
}

/**
 * Returns a same-origin path safe to pass as `next` after login.
 * Blocks open redirects (`//evil`) and auth-page loops (`next=/login`).
 */
export function sanitizeInternalNextPath(
  raw: string | null | undefined,
  fallback: string = DEFAULT_POST_LOGIN_PATH,
): string {
  if (!raw) return fallback;
  let decoded = raw.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    return fallback;
  }
  if (!decoded.startsWith("/") || decoded.startsWith("//")) return fallback;

  const base = pathnameOnly(decoded);
  const lower = base.toLowerCase();
  if (AUTH_PATH_EXACT.has(lower)) return fallback;
  if (lower.startsWith("/auth/")) return fallback;
  return decoded;
}
