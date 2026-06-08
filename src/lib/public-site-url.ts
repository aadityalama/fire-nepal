/**
 * Origin used in Supabase `redirectTo` / `emailRedirectTo` (password reset, sign-up, resend).
 *
 * In production, set `NEXT_PUBLIC_SITE_URL` to your canonical HTTPS origin (e.g.
 * `https://firenepal.com`) so links in emails always point at the live site. If unset,
 * the browser falls back to `window.location.origin` (fine for local dev).
 */
export function getPublicSiteOrigin(): string {
  const raw =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_SITE_URL
      ? process.env.NEXT_PUBLIC_SITE_URL.trim()
      : "";
  if (raw) {
    return raw.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

/**
 * Same-origin base for Supabase auth redirects when running in a Route Handler.
 * Prefer `NEXT_PUBLIC_SITE_URL` in production; otherwise use the incoming request URL
 * (e.g. `https://preview.vercel.app` or `http://localhost:3000`).
 */
export function getSiteOriginForServerAuthRedirect(request: Request): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "";
  if (raw) {
    return raw.replace(/\/+$/, "");
  }
  return new URL(request.url).origin;
}
