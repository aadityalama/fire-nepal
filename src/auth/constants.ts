/** STEP 6B — shared auth constants (Edge-safe; no Node APIs). */

export const FN_SESSION_COOKIE = "fn_session";

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
] as const;
