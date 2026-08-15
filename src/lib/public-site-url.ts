/**
 * Origin used in Supabase `redirectTo` / `emailRedirectTo` (password reset, sign-up, resend).
 *
 * On Vercel **Production**, set `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS origin
 * (e.g. `https://firenepal.com`) so links in emails always point at the live site.
 *
 * On Vercel **Preview** / **Development**, never prefer `NEXT_PUBLIC_SITE_URL` even if it
 * is present for all environments — otherwise auth redirects and session cookies target
 * production while the user is on a `*.vercel.app` host. Fall back to the current
 * browser or request origin instead.
 */

function vercelDeploymentEnv(): string {
  // NEXT_PUBLIC_VERCEL_ENV is inlined for the browser; VERCEL_ENV is available on the server.
  return (
    (typeof process !== "undefined" && (process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV)) ||
    ""
  ).trim();
}

/** True when the canonical production site URL should override the request/browser origin. */
export function shouldUseCanonicalSiteUrl(): boolean {
  const env = vercelDeploymentEnv();
  if (env === "preview" || env === "development") return false;
  return true;
}

export function getPublicSiteOrigin(): string {
  if (shouldUseCanonicalSiteUrl()) {
    const raw =
      typeof process !== "undefined" && process.env.NEXT_PUBLIC_SITE_URL
        ? process.env.NEXT_PUBLIC_SITE_URL.trim()
        : "";
    if (raw) {
      return raw.replace(/\/+$/, "");
    }
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

/**
 * Same-origin base for Supabase auth redirects when running in a Route Handler.
 * Prefer `NEXT_PUBLIC_SITE_URL` only on production (or non-Vercel); otherwise use the
 * incoming request URL (e.g. `https://….vercel.app` or `http://localhost:3000`).
 */
export function getSiteOriginForServerAuthRedirect(request: Request): string {
  if (shouldUseCanonicalSiteUrl()) {
    const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "";
    if (raw) {
      return raw.replace(/\/+$/, "");
    }
  }
  return new URL(request.url).origin;
}
