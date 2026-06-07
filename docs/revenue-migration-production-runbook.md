# Production revenue migration runbook

Use this when **`revenue_events` is empty**, **`membership_requests` has approved rows**, and **Admin Revenue (NPR)** shows **0**.

---

## 1. Confirm the exact production Supabase URL

1. Open the **Supabase Dashboard** and select the **same project** your live app uses (match the ref you see in production browser network calls or in Vercel env `NEXT_PUBLIC_SUPABASE_URL`).
2. Go to **Project Settings → API**.
3. Copy **Project URL** exactly.  
   - Format: `https://<project-ref>.supabase.co`  
   - This value is what you must set as **`NEXT_PUBLIC_SUPABASE_URL`** for the backfill script (same host the production Next app uses).

**Sanity check:** After you run the backfill (step 4), the first line should print `Supabase host: <project-ref>.supabase.co`. If the ref is wrong, stop — you are not on production.

---

## 2. Confirm the exact service role key

1. Same page: **Project Settings → API**.
2. Under **Project API keys**, copy the **`service_role`** secret (long JWT).  
   - **Do not** use the `anon` / public key — inserts into `revenue_events` will fail or not apply as intended.
3. Set this as **`SUPABASE_SERVICE_ROLE_KEY`** in `.env.production.local` (step 3).

**Security:** Treat this key like root database access. Never commit it, never paste it into tickets or chat logs.

---

## 3. Create `.env.production.local` in the project root

1. Repo root = directory that contains `package.json` (same level as `app/`, `scripts/`).
2. Copy the template:

   ```bash
   cp docs/templates/env.production.local.template .env.production.local
   ```

3. Edit **`.env.production.local`** and replace:
   - `NEXT_PUBLIC_SUPABASE_URL` with the **Project URL** from step 1.
   - `SUPABASE_SERVICE_ROLE_KEY` with the **service_role** key from step 2.

4. Save. The file is listed in `.gitignore` — it will not be committed.

The backfill script loads `.env.local` first, then fills **empty** keys from `.env.production.local`, so `npm run revenue:backfill-membership` works when only this file defines Supabase credentials.

---

## 4. Run the backfill (optional dry-run first)

```bash
cd /path/to/fire-nepal-homepage
npm run revenue:backfill-membership -- --dry-run
```

Review `Inserted` / skips, then apply:

```bash
npm run revenue:backfill-membership
```

Expect: `Inserted: <N>` for each approved request that had no ledger row yet, then a **verification** block (counts and NPR sums).

---

## 5. Run revenue verification

```bash
npm run revenue:verify-membership
```

Same credentials as step 4. Read-only; no inserts.

---

## 6. Numbers to capture (for your own log / ticket)

From the verification section of either command’s output, record:

| Metric | Where in output |
|--------|------------------|
| **Approved `membership_requests` count** | Line `approved membership_requests: X premium, Y elite (total Z)` — **Z** is total approved. |
| **`revenue_events` row count** | `revenue_events row count:` |
| **Total revenue NPR** | `revenue_events sum(amount_npr) [all rows]:` — matches admin “total revenue” source. |

**Expected after success:** `revenue_events row count` ≥ 1; membership-linked row count aligns with approved requests that passed validation; `OK:` lines when ledger matches approved `amount_npr` sums.

---

## 7. Verify Admin Dashboard Revenue (NPR) and Total Revenue

1. Open your **production** site **`/admin`** (logged in as an admin user).
2. Hard refresh (or open in a private window) so the server snapshot reloads.
3. **Revenue (NPR)** and **Total revenue** both use the sum of **`revenue_events.amount_npr`** from `fetchAdminSnapshot` — they should match the script’s **`sum(amount_npr) [all rows]`** (modulo any other non-membership rows you add later).

If the DB has rows but the UI is still **0**, the deployed app’s **`NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`** may point at a **different** Supabase project than the one you backfilled — reconcile Vercel (or host) env with the project you used in `.env.production.local`.

---

## 8. Historical revenue vs future catalog prices

**Design (already implemented):**

- **New approvals:** `PATCH` `app/api/admin/membership-requests/[id]/route.ts` reads **`amount_npr` from the `membership_requests` row** and inserts that value into **`revenue_events.amount_npr`**. It does not re-read `MEMBERSHIP_PLAN_PRICE_NPR` at approval time for the ledger amount.
- **Backfill:** `scripts/backfill-membership-revenue-events.mjs` inserts **`req.amount_npr`** from each approved **`membership_requests`** row.
- **Catalog** (`MEMBERSHIP_PLAN_PRICE_NPR` in `src/lib/membership-payment.ts`) is used when **creating** a new payment request (`POST /api/membership-requests`) to set **`membership_requests.amount_npr`** for new submissions only.

Changing list prices in code **does not** update existing **`membership_requests.amount_npr`** or **`revenue_events`** rows; historical revenue stays tied to the stored request amount.

---

## SQL cross-check (optional)

In Supabase **SQL Editor** (same production project):

```sql
select count(*) filter (where status = 'approved') as approved_requests from membership_requests;
select count(*) as revenue_events from revenue_events;
select coalesce(sum(amount_npr), 0) as total_npr from revenue_events;
```

---

## Troubleshooting

| Symptom | Action |
|---------|--------|
| Script exits: need URL / service key | Complete step 3; ensure no quotes broken and no trailing spaces. |
| `Inserted: 0`, high `Skipped invalid` | Inspect `membership_requests`: `amount_npr`, `payment_method`, `plan_type` must match API rules (`khalti_qr` / `esewa_qr` / `global_ime_qr`, `premium` / `elite`). |
| `column revenue_events.membership_request_id does not exist` | Apply **`20260607120000_revenue_events_membership_ledger_columns.sql`** (or **`20250607180000_...`** revenue_events section). |
| `column membership_requests.amount_npr does not exist` | Apply **`20260608100000_membership_requests_amount_npr.sql`**, or the **`membership_requests`** section of **`20250607180000_membership_amount_and_revenue_event_details.sql`**. If **`SET NOT NULL`** fails, some rows still have null `amount_npr` after the `UPDATE` (e.g. invalid `plan_type`); fix those rows, then re-run. |
| Admin still 0 | Same Supabase project as backfill + redeploy/cache bust (step 7). |
