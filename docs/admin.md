# FIRE Nepal admin dashboard

## Route

- **`/admin`** — Next.js App Router layout verifies Supabase session + membership in `public.admin_users`.

## Prerequisites

1. **Supabase** — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and server-only `SUPABASE_SERVICE_ROLE_KEY` (used for Auth Admin list, aggregates, CSV exports, and cron health writes).
2. **Grant admin** — After migration, insert your auth user id:

```sql
insert into public.admin_users (user_id, role)
values ('YOUR_AUTH_USER_UUID', 'admin')
on conflict (user_id) do nothing;
```

3. **Migrations** — Apply `supabase/migrations/20250602160000_admin_dashboard.sql` (adds `profiles`, `subscriptions`, `revenue_events`, `reminder_logs`, `admin_users`, `system_health`).

## Data model notes

- **`profiles`** — `plan_type` (`free` | `premium` | `elite`). New signups get a row via trigger; existing users are backfilled from `user_profiles`.
- **`revenue_events`** — Append-only NPR amounts; dashboard “Total revenue” is the sum. Record real payments here (Stripe webhooks, manual adjustments).
- **`reminder_logs`** — `email_failed` rows are written when the scheduled reminder cron cannot deliver via Resend.
- **`scheduled_reminder_email_sends`** — Deduped send log; counts drive “reminder emails sent” and activity charts.

## Exports

Authenticated admins can download:

- `/api/admin/export/users`
- `/api/admin/export/reminders`
- `/api/admin/export/revenue`
