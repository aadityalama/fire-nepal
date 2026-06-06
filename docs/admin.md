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

Or grant by **sign-in email** (same database as production):

- Copy `supabase/snippets/grant_admin_by_email.sql`, set your email, run in **SQL Editor**.

**CLI (needs service role in `.env.local`)** — lists Auth user ids, then upserts `admin_users`:

```bash
npm run admin:list-users
npm run admin:grant -- --email you@example.com
```

3. **Migrations** — Apply `supabase/migrations/20250602160000_admin_dashboard.sql` (adds `profiles`, `subscriptions`, `revenue_events`, `reminder_logs`, `admin_users`, `system_health`). If that migration is already applied, `admin_users` exists; you only need the insert/upsert above.

## Troubleshooting

- **`/admin` → `/hub`** (while logged in): the session user is not in `public.admin_users`, or Supabase env vars are missing server-side (layout treats “not configured” like non-admin and sends you to `/hub`).
- **`/admin` → `/login?next=%2Fadmin`** (while logged out): expected; middleware protects `/admin`.

## Data model notes

- **`profiles`** — `plan_type` (`free` | `premium` | `elite`). New signups get a row via trigger; existing users are backfilled from `user_profiles`.
- **`revenue_events`** — Append-only NPR amounts; dashboard “Total revenue” is the sum. Record real payments here (Stripe webhooks, manual adjustments).
- **`reminder_logs`** — `email_failed` rows are written when the scheduled reminder cron cannot deliver via Resend.
- **`scheduled_reminder_email_sends`** — Deduped send log; counts drive “reminder emails sent” and activity charts.

## Membership QR payments

- **`/admin/membership-requests`** — Review pending **Premium** / **Elite** payment proofs (Khalti, eSewa, Global IME QR). **Approve** updates `profiles.plan_type`, upserts `subscriptions` (one year), and appends `revenue_events`. **Reject** only updates request status.
- **Migration** — `supabase/migrations/20250606180000_membership_payment_requests.sql` adds `public.membership_requests` and storage. **`20250606220000_ensure_membership_payment_storage_bucket.sql`** re-applies bucket + policies if storage was skipped earlier.
- **Runtime** — `POST /api/membership-requests` provisions the bucket via the Storage API when missing (needs `SUPABASE_SERVICE_ROLE_KEY`) and uploads proof files with the service role so uploads work even before storage RLS is applied. Proof paths stay `{user_id}/{request_id}.ext` in `proof_storage_path`.
- **QR artwork** — Optional env: `NEXT_PUBLIC_MEMBERSHIP_QR_KHALTI`, `NEXT_PUBLIC_MEMBERSHIP_QR_ESEWA`, `NEXT_PUBLIC_MEMBERSHIP_QR_GLOBAL_IME`. Khalti defaults to `/public/payment-qr/khalti.png`, Global IME to `/public/payment-qr/global-ime.png`; eSewa uses `/public/payment-qr/esewa-placeholder.svg` until you add a PNG or set env URLs.

## Exports

Authenticated admins can download:

- `/api/admin/export/users`
- `/api/admin/export/reminders`
- `/api/admin/export/revenue`
