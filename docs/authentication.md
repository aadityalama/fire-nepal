# Authentication (FIRE Nepal)

## Two modes

1. **Supabase (required for production)** — When `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set, the app uses the Supabase browser client for **sign-up** (`signUp` with `emailRedirectTo`), **sign-in** (`signInWithPassword`), **email verification** (`verifyOtp` for signup type, plus magic links via `/auth/callback`), **resend verification** (`resend` with `emailRedirectTo`), and **password update** (`updateUser` on **Dashboard → Security**). **Forgot password** uses **`POST /api/auth/request-password-reset`**, which calls Supabase `resetPasswordForEmail` on the server (logging + clearer API errors). Redirect targets use `NEXT_PUBLIC_SITE_URL` when set (`getPublicSiteOrigin()` / `getSiteOriginForServerAuthRedirect()` in `src/lib/public-site-url.ts`), otherwise the current browser or request origin. Sessions use Supabase cookies; middleware refreshes them via `@supabase/ssr`. **User profiles** are stored in `public.user_profiles` (insert trigger on `auth.users` plus client `upsert` after sign-up / verify).

2. **Legacy (local dev only)** — Without those env vars, the app uses `/api/auth/*` and an **in-memory** user map (`src/auth/server/user-store.ts`). **Production** hosts without Supabase return **HTTP 503** from legacy auth routes so accounts are not silently lost (`src/auth/server/legacy-auth-production.ts`).

## Production setup (checklist)

1. **Vercel (or your host)**  
   Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for the **Production** environment. Set **`NEXT_PUBLIC_SITE_URL=https://firenepal.com`** so Supabase `redirectTo` / `emailRedirectTo` values baked into the client point at production (fixes password reset and confirmation emails that would otherwise follow a wrong origin). **Redeploy** after changes.

2. **Supabase → Authentication → Providers**  
   Enable **Email** and **Email / password**.

3. **Supabase → Authentication → URL configuration**  
   Set **Site URL** to **`https://firenepal.com`**. Under **Redirect URLs**, allow **`https://firenepal.com/auth/callback`** (and `www` if used). Remove localhost entries from the **production** Supabase project. Details: `docs/SUPABASE.md`.

4. **Supabase → Authentication → Emails / SMTP**  
   Use **custom SMTP** in production. Supabase’s **default** email is restricted (e.g. non–team addresses → **`Email address not authorized`**) and is not meant for production workloads — see [Supabase docs](https://supabase.com/docs/guides/auth/auth-smtp) and **`docs/password-reset-email-delivery.md`** for Resend + DNS + dashboard steps.

5. **Database**  
   Apply `supabase/migrations/20250524120000_fire_nepal_portfolio.sql` (and any follow-up migrations) to the **same** project as your API keys.

## Common issues

### “Invalid email or password” after sign-up (Supabase)

If **Confirm email** is enabled, new users have no password session until they confirm. Sign-in fails until the email is verified (magic link or OTP, depending on your Supabase templates). The app maps this to a clearer message when Supabase returns `email_not_confirmed`.

### Forgot password (Supabase)

Reset links are sent by **Supabase Auth** (configure **custom SMTP** in the Supabase dashboard — **not** via `RESEND_API_KEY`). The app uses **`POST /api/auth/request-password-reset`** with `redirectTo` → `/auth/callback?next=/dashboard/security?pw=1`. After opening the link, use **Update password** on **Dashboard → Security** (`auth.updateUser`). If the redirect URL is not allowlisted, the API returns **400** with Supabase’s error message. Vercel logs: **`supabase_reset_accepted`** vs **`supabase_reset_rejected`** (`message` / `code` / `status`). **`accepted` does not prove inbox delivery** — see **`docs/password-reset-email-delivery.md`**.

### Forgot password (legacy)

Uses **Resend** (`RESEND_API_KEY`, `RESEND_FROM_EMAIL` or `EMAIL_FROM`) like sign-up verification. After requesting a reset, complete the flow at `/reset-password` with the emailed 6-digit code.

### Vercel env

Use URL and `anon` key from the **same** Supabase project. Mismatched keys cause auth failures that are hard to debug.
