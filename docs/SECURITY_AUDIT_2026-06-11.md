# Security audit — portfolio data isolation (2026-06-11)

## Executive summary

Cross-account portfolio exposure was traced to **client-side state**, not missing Supabase RLS:

1. **Cloud sync gap**: When a signed-in user had **no** rows in Postgres, `WealthPortfolioCloudSync` did not call `setState`, so the UI kept whatever was already in memory — often another user’s data from **shared `localStorage`** on the same browser.
2. **Unscoped `localStorage`**: Portfolio (`fire-nepal-portfolio-v2`) and cashflow (`fire-nepal-cashflow-v1`) used a **single key for all users**, so Account B could hydrate Account A’s disk cache before (or instead of) cloud data.

Fixes: per-user storage keys when `userId` is known, reset to `defaultWealthState()` when cloud load returns empty, and `useLocalStorageJsonState` reload safety when the storage key changes (avoid writing the previous user’s JSON into the new key).

---

## 1. Supabase queries and `user_id` / `auth.uid()`

| Area | Client filtering | RLS |
|------|------------------|-----|
| Portfolio tables (`bank_accounts`, `investments`, `gold_assets`, `real_estate`, `vehicles`, `liabilities`, `retirement_assets`, `portfolio_extensions`, `fire_goals`) | `src/services/portfolio-supabase.ts` uses `.eq("user_id", userId)` on all reads/writes | `20250524120000_fire_nepal_portfolio.sql`: `auth.uid() = user_id` (or `id` for `user_profiles`) |
| `profiles`, `subscriptions` | Server/admin routes use `.eq("user_id", …)` / service role where appropriate | `20250602160000_admin_dashboard.sql` + `20250607140000_profiles_select_own_rls.sql` |
| `scheduled_reminders` (“reminders”) | API routes use `.eq("user_id", u.user.id)` | `20250602140000_scheduled_reminders.sql`: insert/select/update/delete own rows |
| `nepse_watchlist` | `watchlist-supabase.ts` uses `.eq("user_id", userId)` | `20250525130000_nepse_watchlist.sql` |

RLS remains the source of truth: a malicious client cannot read another user’s rows with the anon/authenticated JWT even if `.eq` were omitted.

---

## 2. “Workspaces”, “assets”, “transactions”, “portfolio_snapshots”

This codebase does **not** use separate public tables with those exact names. Mapping for the audit checklist:

| Requested name | Implementation |
|----------------|----------------|
| **profiles** | `public.profiles` |
| **workspaces** | No multi-tenant workspace table; “workspace” is a **client** bundle (portfolio + cashflow + related local modules). Isolation is now **per `userId` in `localStorage`** plus Supabase `user_id`. |
| **assets** | Rows in `bank_accounts`, `investments`, `gold_assets`, `real_estate`, `vehicles`, `retirement_assets`, `retirement_assets`, etc. |
| **transactions** | `portfolio_extensions.ledger` JSON (and module payloads) |
| **portfolio_snapshots** | Same portfolio tables + `portfolio_extensions` |
| **subscriptions** | `public.subscriptions` |
| **reminders** | `public.scheduled_reminders` |

---

## 3. RLS status (tables checked)

| Table | RLS enabled | Policies (authenticated) | Notes |
|-------|-------------|---------------------------|-------|
| `user_profiles` | Yes | `user_profiles_self` (all) | `auth.uid() = id` |
| `bank_accounts` … `fire_goals`, `portfolio_extensions` | Yes | `*_self` per table | `auth.uid() = user_id` |
| `profiles` | Yes | select/insert/update own | `auth.uid() = id` |
| `subscriptions` | Yes | `subscriptions_select_own` | `auth.uid() = user_id` |
| `scheduled_reminders` | Yes | CRUD own rows | `auth.uid() = user_id` |
| `scheduled_reminder_email_sends` | Yes | **None** for JWT | Intended: cron/service role only; default **deny** for anon/auth |
| `revenue_events`, `reminder_logs`, `system_health` | Yes | No JWT policies | Service role / server only |
| `nepse_watchlist` | Yes | `nepse_watchlist_self` | |
| `admin_users` | Yes | `admin_users_select_self` | |

---

## 4. Service role / frontend

- **Browser** uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` only (`src/lib/supabase/browser-client.ts`, `src/lib/supabase/config.ts`).
- **`SUPABASE_SERVICE_ROLE_KEY`** appears only in server scripts and `src/lib/supabase/admin.ts` (API routes, cron, admin). No `NEXT_PUBLIC_*` variant for the service role was found.

---

## 5. Hardcoded demo users / portfolio seed

- No demo **user UUID** or shared workspace ID drives live portfolio persistence.
- Demo content exists only for **illustrative UI** (e.g. SSF/CIT demo constants, market “demo” prices) — not loaded as another user’s Supabase portfolio.

---

## 6. Vulnerabilities fixed (this change set)

| Issue | Fix |
|-------|-----|
| New / empty cloud user kept previous in-memory portfolio | `WealthPortfolioCloudSync`: on empty Supabase response, `setState(defaultWealthState())` and align `lastSavedRef`. |
| Shared `localStorage` across accounts | `portfolioStorageKey(userId)`, `cashflowStorageKey(userId)`; providers and dashboards pass `user?.id`. |
| Key switch overwrote wrong user’s cashflow file | `useLocalStorageJsonState`: on `storageKey` change, set `hydrated` false, load or default, then persist. |
| Dividend / FD sync wrote global cashflow key | `addDividendIncomeToCashflowStorage`, `replaceDepositInterestIncomeFromPortfolioNpr`, `recordInvestmentCashDividend` take optional `userId`. |
| Global reset cleared wrong namespace | `performGlobalFireNepalWorkspaceDataReset(userId)`; clears scoped portfolio + guest legacy when signed in. |

---

## 7. Manual test plan (two accounts, data isolation)

Prerequisites: Supabase configured; two distinct emails (Account A and Account B).

1. **Account A**: Sign in, add a unique marker on the portfolio dashboard (e.g. a liquid cash line named `ACCOUNT_A_MARKER`, non-trivial amount). Confirm cloud save (or wait for debounced sync).
2. Sign **out**.
3. **Account B**: Sign in on the **same browser / profile**. Open the portfolio dashboard.
4. **Expected**: No `ACCOUNT_A_MARKER`, empty or B-only data. Net worth / tiles must not reflect A’s amounts.
5. Optional: DevTools → Application → Local Storage — keys should include `fire-nepal-portfolio-v2:user:<uuid-B>` for B, not only the legacy `fire-nepal-portfolio-v2` (legacy is guest / signed-out).

Automated E2E against live Supabase was not added (needs test credentials and CI secrets); the above is the acceptance checklist.

---

## 8. Follow-ups (optional)

- Payslip / other modules that still use **global** keys (e.g. payslip history) should be scoped similarly if they can contain PII across accounts on one device.
- SQL `SECURITY LABEL` / periodic `SELECT` audits in Supabase Dashboard for drift vs these migrations.
