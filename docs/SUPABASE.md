# Supabase (FIRE Nepal)

Copy to `.env.local` and fill with values from your [Supabase project](https://supabase.com/dashboard) → **Settings → API**.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key
```

When these are set, the app uses **Supabase Auth** (email/password, session cookies, protected `/portfolio` and `/dashboard` routes) and **cloud portfolio sync** (Postgres + RLS).

When they are **unset**, the app keeps the previous **legacy cookie auth** and **localStorage-only** portfolio (no breaking change for local demos).

## Database

Run the SQL in `supabase/migrations/20250524120000_fire_nepal_portfolio.sql` in the Supabase SQL editor (or use the Supabase CLI).

Optional: enable **Realtime** replication for `public.portfolio_extensions` in the dashboard so multi-tab portfolio updates propagate instantly.

## Auth URLs

Add to Supabase **Authentication → URL configuration**:

- **Site URL**: your production origin (e.g. `https://firenepal.example`)
- **Redirect URLs**: `http://localhost:3000/auth/callback`, your production `/auth/callback`, and the same with `?next=/dashboard/settings` if you use password recovery.

Email templates should link to `{origin}/auth/callback` (handled by `signUp` / `resetPasswordForEmail` in code).
