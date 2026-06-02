# Authentication (FIRE Nepal)

## Two modes

1. **Supabase (production)** — When `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set, sign-up and sign-in use the Supabase browser client (`signUp`, `signInWithPassword`). Sessions are stored in Supabase cookies; middleware refreshes them via `@supabase/ssr`.

2. **Legacy (local dev only)** — Without those env vars, the app uses `/api/auth/*` routes and an **in-memory** user map (`src/auth/server/user-store.ts`). Verified users are **not** shared across Vercel/serverless instances. **Production deployments without Supabase now return HTTP 503** from legacy auth routes so accounts are not silently lost.

## Common issues

### “Invalid email or password” after sign-up (Supabase)

If **Confirm email** is enabled in Supabase, new users have no password session until they confirm. Sign-in fails until the email is verified (magic link or OTP, depending on your Supabase templates). The app maps this to a clearer message when Supabase returns `email_not_confirmed`.

### Forgot password (Supabase)

`resetPasswordForEmail` is correct in code; **emails are sent by Supabase Auth**. Configure SMTP or a provider in the Supabase dashboard (**Authentication → Emails**) and add your site URL to **Redirect URLs** (include `https://your-domain/auth/callback`).

### Forgot password (legacy)

Uses **Resend** (`RESEND_API_KEY`, `RESEND_FROM_EMAIL` or `EMAIL_FROM`) like sign-up verification. After requesting a reset, complete the flow at `/reset-password`.

### Vercel env

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the **same** project you use in the Supabase dashboard. Mismatched keys cause auth to fail in non-obvious ways.
