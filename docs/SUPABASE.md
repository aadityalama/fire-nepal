# Supabase (FIRE Nepal)

## Environment variables

Copy to `.env.local` (local) and set the same keys in **Vercel → Project → Settings → Environment Variables** for **Production** (and Preview if you test PRs against a real project):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key
```

Values come from the [Supabase dashboard](https://supabase.com/dashboard) → **Project Settings → API** (Project URL and `anon` `public` key).

After changing env vars on Vercel, **redeploy** so the new `NEXT_PUBLIC_*` values are baked into the client bundle.

When these are set, the app uses **Supabase Auth** (email/password, PKCE + cookies via `@supabase/ssr`), **middleware** for protected routes, **portfolio / watchlist sync** to Postgres (RLS), and **`public.user_profiles`** for display name and avatar.

When they are **unset** in production, legacy `/api/auth/*` routes return **503** (accounts are not persisted across serverless instances). Legacy mode remains for **local development** only.

## Supabase dashboard checklist

1. **Authentication → Providers**  
   Enable **Email** and turn on **Email / password** (confirm sign-in is optional per your product policy).

2. **Authentication → URL configuration**  
   - **Site URL**: production origin (e.g. `https://your-domain.com`).  
   - **Redirect URLs**: include  
     `http://localhost:3000/auth/callback`  
     `https://your-domain.com/auth/callback`  
     and any preview URLs you use (wildcard `https://*.vercel.app/auth/callback` if acceptable for your security model).

3. **Authentication → Emails**  
   Configure **SMTP** or a provider so sign-up, verification, magic links, and password reset emails actually send.

4. **Forgot password flow**  
   The app calls `resetPasswordForEmail` with `redirectTo` → `/auth/callback?next=/dashboard/security%3Fpw%3D1`. After the user opens the email link, they land on **Security center** with a short banner and an authenticated recovery session; they set a new password with **Update password** (`auth.updateUser`).

## Database

Run the SQL in `supabase/migrations/20250524120000_fire_nepal_portfolio.sql` in the Supabase SQL editor (or use the Supabase CLI). This creates **`user_profiles`**, portfolio tables, RLS, and a trigger that inserts a profile row when a row is added to `auth.users`.

Also run `supabase/migrations/20250602140000_scheduled_reminders.sql` for **Smart Reminders** cloud storage:

- **`public.scheduled_reminders`** — title, amount, `due_date`, `due_time`, `timezone`, `email`, `repeat_frequency`, per-channel booleans (`notify_7d`, `notify_3d`, `notify_1d`, `notify_at_due`, `notify_overdue`), plus optional notes and family share. RLS: users can only read/write their own rows.
- **`public.scheduled_reminder_email_sends`** — dedupe log for cron-sent emails (written by the **service role** only).

Optional: enable **Realtime** replication for `public.portfolio_extensions` in the dashboard for live cross-tab portfolio updates.

### Scheduled reminder emails (Vercel + Resend)

1. Set **`SUPABASE_SERVICE_ROLE_KEY`** on Vercel (server-only; never expose to the client). The cron route uses it to read all active reminders and insert send rows.
2. Set **`CRON_SECRET`** and add a **Vercel Cron** (Project → Settings → Cron Jobs) that **`GET`**s **`/api/cron/scheduled-reminders`** with header `Authorization: Bearer <CRON_SECRET>`. On **Pro** and above you can use a **per-minute** schedule (e.g. `* * * * *`). **Hobby** plans only allow **once-per-day** crons—use an external scheduler (or upgrade) if you need sub-daily email checks.
3. Configure **`RESEND_API_KEY`** and **`RESEND_FROM_EMAIL`** (or `EMAIL_FROM`) so transactional emails can send.

## Auth URLs in code

Sign-up uses `emailRedirectTo` → `{origin}/auth/callback`. Password reset uses the same callback with `next=/dashboard/security`. Ensure those paths are allowed in **Redirect URLs** as above.
