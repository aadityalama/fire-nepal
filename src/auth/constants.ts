/** STEP 6B — shared auth constants (Edge-safe; no Node APIs). */

export const FN_SESSION_COOKIE = "fn_session";

/** Signed payload for legacy email OTP before account activation (httpOnly). */
export const FN_PENDING_VERIFY_COOKIE = "fn_pending_verify";

/** Signed payload for legacy password-reset OTP (httpOnly). */
export const FN_PENDING_RESET_COOKIE = "fn_pending_reset";

/** max-age seconds for httpOnly session cookie (remember me) */
export const FN_SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;

/** Shorter session when "Remember me" is unchecked */
export const FN_SESSION_SHORT_AGE_SEC = 60 * 60 * 24 * 7;

/** Paths guarded by middleware when using legacy cookie auth (non-Supabase). */
export const FN_PROTECTED_PREFIXES = [
  "/hub",
  "/onboarding",
  "/account",
  "/dashboard",
  "/portfolio",
  "/family",
  "/children",
  "/education",
  "/health",
  "/family-calendar",
  "/parenting-ai",
  "/family-ai-insights",
  "/family-settings",
  "/child-records-vault",
  "/admin",
  "/fire-biz",
  "/more",
  "/fire-ai",
] as const;
