# Supabase (FIRE Nepal)

## Environment variables

Copy to `.env.local` (local) and set the same keys in **Vercel → Project → Settings → Environment Variables** for **Production** (and Preview if you test PRs against a real project):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key
# Production: forces password-reset and sign-up email links to the live site.
NEXT_PUBLIC_SITE_URL=https://firenepal.com
```

Values come from the [Supabase dashboard](https://supabase.com/dashboard) → **Project Settings → API** (Project URL and `anon` `public` key).

After changing env vars on Vercel, **redeploy** so the new `NEXT_PUBLIC_*` values are baked into the client bundle.

When these are set, the app uses **Supabase Auth** (email/password, PKCE + cookies via `@supabase/ssr`), **middleware** for protected routes, **portfolio / watchlist sync** to Postgres (RLS), and **`public.user_profiles`** for display name and avatar.

When they are **unset** in production, legacy `/api/auth/*` routes return **503** (accounts are not persisted across serverless instances). Legacy mode remains for **local development** only.

## Supabase dashboard checklist

1. **Authentication → Providers**  
   Enable **Email** and turn on **Email / password** (confirm sign-in is optional per your product policy).

2. **Authentication → URL configuration** (production project — **FIRE Nepal**)

   - **Site URL**: `https://firenepal.com`  
     Do **not** leave this as `http://localhost:3000`. Supabase uses it as the default base for some auth flows and email templates.
   - **Redirect URLs** (Additional Redirect URLs): allow exactly what users should land on after email links. For production, include at least:  
     `https://firenepal.com/auth/callback`  
     Optional: `https://www.firenepal.com/auth/callback` if you serve the app on `www`.  
     **Remove** `http://localhost:3000` and `http://localhost:3000/auth/callback` from this **production** project so emailed links cannot send users to localhost.
   - **Email templates** (Authentication → Email): confirm links use `{{ .ConfirmationURL }}` (recommended). Avoid hard-coding `localhost` in custom HTML.

   **Local development:** use a separate Supabase project, *or* temporarily add `http://localhost:3000/auth/callback` to Redirect URLs while testing—then remove it from the production project before go-live.

3. **Authentication → Emails / SMTP**  
   Configure **custom SMTP** for production. Supabase’s **built-in (default) mailer is not intended for production**: without custom SMTP it only sends to addresses authorized for your **organization team**, and other addresses fail with **`Email address not authorized`** (see [Supabase: custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)).  
   **Recommended:** Resend (or another SMTP provider) in **Authentication → SMTP Settings** — exact host/user/port/password and DNS steps: **`docs/password-reset-email-delivery.md`**.  
   **Important:** when Supabase is enabled, reset mail is sent by **Supabase Auth**, not by the app’s **Resend API** keys (`RESEND_API_KEY` is for legacy OTP, reminders, and cron—not Supabase’s `resetPasswordForEmail` pipeline).

4. **Forgot password flow**  
   The app calls **`POST /api/auth/request-password-reset`**, which invokes Supabase `resetPasswordForEmail` with `redirectTo` → `/auth/callback?next=/dashboard/security%3Fpw%3D1` (origin from `NEXT_PUBLIC_SITE_URL` or the request host). After the user opens the email link, they land on **Security center** with a short banner and an authenticated recovery session; they set a new password with **Update password** (`auth.updateUser`). Server logs use the prefix `[FIRE Nepal auth][request-password-reset]` (events: `reset_request_received`, `supabase_reset_attempt`, `supabase_reset_accepted`, `supabase_reset_rejected`).

## Database

Migrations live in `supabase/migrations/` (see `supabase/config.toml`). Apply them in **timestamp order** so foreign keys resolve (`scheduled_reminders` before `admin_dashboard`).

**Remote (production) apply + membership checks** — set `SUPABASE_DB_URL` (Dashboard → **Connect** → Postgres URI; percent-encode special characters in the password), `NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`, then:

```bash
npm run db:apply-verify:membership
```

This runs `supabase db push`, `supabase migration list --db-url`, confirms `public.membership_requests` and the `membership_payment_proofs` storage bucket, hits the public `POST /api/membership-requests` smoke URL (expects **401** without cookies), and by default runs a **service-role** upload + row insert + cleanup (same columns/paths as the app). Set `MEMBERSHIP_E2E_INFRA=0` to skip that write test.

**Recommended (repeatable):** from this repo root, with the **Postgres connection URI** exported (Dashboard → **Project Settings → Database** → *Connection string* → URI):

```bash
export SUPABASE_DB_URL='postgresql://...'
npm run db:push:remote
```

**Optional — fill `.env.local` from Supabase CLI** (same account as the dashboard project; no secrets in git):

```bash
npx supabase login
export SUPABASE_PROJECT_REF=your_ref   # from URL: app.supabase.com/project/<ref>
npm run env:sync:supabase
```

Then run `npm run reminders:status` and `npm run db:verify:reminders`.

After migrations, confirm **`public.scheduled_reminders`** and smoke-test inserts:

```bash
npm run reminders:status
npm run db:verify:reminders
```

`reminders:status` loads `.env.local` (if present) and prints each variable and table probe. Apply migrations and reload in one step when `SUPABASE_DB_URL` is set:

```bash
npm run reminders:status:push
```

**PostgREST schema cache:** if the table exists in Postgres but the app still errors with “relation does not exist”, reload the API schema: **Dashboard → Project Settings → Data API → Reload schema**, or run in the **SQL Editor**:

```sql
notify pgrst, 'reload schema';
```

The migration `20250603120000_postgrest_reload_schema.sql` runs this automatically after other pending migrations apply.

**Alternative:** open each file under `supabase/migrations/` in the Supabase **SQL Editor** and run in order.

### What the migrations create

`20250524120000_fire_nepal_portfolio.sql` — **`user_profiles`**, portfolio tables, RLS, and a trigger that inserts a profile row when a row is added to `auth.users`.

`20250525130000_nepse_watchlist.sql` — **`nepse_watchlist`**.

`20250602140000_scheduled_reminders.sql` — **Smart Reminders** cloud storage:

- **`public.scheduled_reminders`** — title, amount, `due_date`, `due_time`, `timezone`, `email`, `repeat_frequency`, per-channel booleans (`notify_7d`, `notify_3d`, `notify_1d`, `notify_at_due`, `notify_overdue`), plus optional notes and family share. RLS: users can only read/write their own rows.
- **`public.scheduled_reminder_email_sends`** — dedupe log for cron-sent emails (written by the **service role** only).

`20250602160000_admin_dashboard.sql` — **`profiles`**, **`subscriptions`**, **`revenue_events`**, **`reminder_logs`**, **`admin_users`**, **`system_health`** (admin dashboard + cron health metadata).

Optional: enable **Realtime** replication for `public.portfolio_extensions` in the dashboard for live cross-tab portfolio updates.

### Granting `/admin` access

After migrations, insert the auth user’s UUID into **`public.admin_users`** (SQL Editor or any privileged client). See `docs/admin.md`.

### Scheduled reminder emails (Vercel + Resend)

1. Set **`SUPABASE_SERVICE_ROLE_KEY`** on Vercel (server-only; never expose to the client). The cron route uses it to read all active reminders and insert send rows.
2. Set **`CRON_SECRET`** in Vercel (recommended). Vercel will send `Authorization: Bearer <CRON_SECRET>` on cron invocations when this variable is set. Cron is declared in **`vercel.json`** (`/api/cron/scheduled-reminders`). You can also add or override jobs under **Project → Settings → Cron Jobs**. On **Pro** and above you can use a **per-minute** schedule (e.g. `* * * * *`) in `vercel.json` for sub-daily reminder windows. **Hobby** plans only allow **once-per-day** crons—use an external scheduler (or upgrade) if you need sub-daily email checks.
3. Configure **`RESEND_API_KEY`** and **`RESEND_FROM_EMAIL`** (or `EMAIL_FROM`) so transactional emails can send.

**GitHub Actions (Hobby / sub-daily Vercel cron):** add repo secrets **`CRON_TARGET_URL`** (full `https://…/api/cron/scheduled-reminders`) and **`CRON_SECRET`**, then enable the workflow in `.github/workflows/scheduled-reminders-cron.yml` (runs every 5 minutes).

## Auth URLs in code

Sign-up uses `emailRedirectTo` → `{origin}/auth/callback`. Password reset (`POST /api/auth/request-password-reset`) uses the same `{origin}` with `redirectTo` → `/auth/callback?next=/dashboard/security?pw=1`. Resend verification passes the same `emailRedirectTo`.

The app resolves `{origin}` as **`NEXT_PUBLIC_SITE_URL`** (trimmed, no trailing slash) when set; otherwise the **browser** uses `window.location.origin`, and **forgot-password API routes** use the incoming request origin. Set `NEXT_PUBLIC_SITE_URL=https://firenepal.com` on Vercel Production so email links always target the live site. Ensure those full URLs are allowed under **Redirect URLs** as above.
