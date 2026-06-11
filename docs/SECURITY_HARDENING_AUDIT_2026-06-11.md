# Security hardening audit — workspace ownership (2026-06-11)

## Scope

This pass hardens the prior localStorage isolation fix by adding a first-class Supabase workspace owner record and by forcing cloud portfolio reads/writes through the authenticated user session.

## Verification checklist

| Requirement | Status | Evidence |
|---|---:|---|
| Every portfolio query filters by auth user | Complete | `src/services/portfolio-supabase.ts` now calls `ensureAuthenticatedWorkspace()` before portfolio table access and filters every portfolio table by `ownerId = workspace.user_id`. Static security test asserts there is no `.eq("user_id", userId)` or `user_id: userId` in the cloud portfolio service. |
| Every workspace belongs to exactly one user | Complete | `20260611130000_user_workspaces_rls.sql` creates `public.workspaces` with `user_id uuid not null` and `constraint workspaces_user_id_unique unique (user_id)`. |
| New signup automatically creates a unique workspace | Complete | Same migration adds `public.ensure_user_workspace()` and `on_auth_user_created_workspace` trigger on `auth.users`, plus backfills existing users. |
| Dashboard never loads global default workspace | Complete | Dashboard storage remains scoped with `portfolioStorageKey(user?.id)` / `cashflowStorageKey(user?.id)` after auth resolves; cloud load now resets empty workspaces to `defaultWealthState()` and never keeps prior account state. |
| Automated two-account isolation tests | Complete | `scripts/security/portfolio-workspace-isolation.test.mjs`; run with `npm run test:security`. |
| Runtime guard logs if `workspace.user_id != auth.uid()` | Complete | `src/services/workspace-supabase.ts` logs `[workspace-security] workspace owner mismatch` and returns `null`, blocking portfolio load/save. It also logs and blocks when a caller passes a user id different from `auth.getUser().data.user.id`. |

## New database controls

`public.workspaces`

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `unique(user_id)`
- RLS enabled
- Policy: `auth.uid() = user_id` for all operations
- Signup trigger: `on_auth_user_created_workspace`

This establishes a single owner record per user and makes the workspace owner explicit in Supabase.

## Runtime control flow

1. `WealthPortfolioCloudSync` calls `loadWealthPortfolioFromSupabase(client, user.id)` / `saveWealthPortfolioToSupabase(client, user.id, state)`.
2. `portfolio-supabase.ts` calls `ensureAuthenticatedWorkspace(client, userId, context)` before touching portfolio tables.
3. `ensureAuthenticatedWorkspace` derives `authUserId` from `client.auth.getUser()`.
4. If `expectedUserId !== authUserId`, it logs a security error and returns `null`.
5. It loads or creates `public.workspaces` for `authUserId`.
6. If the loaded workspace owner is not `authUserId`, it logs `[workspace-security] workspace owner mismatch` and returns `null`.
7. Portfolio table queries then use `workspace.user_id` (`ownerId`) for every read/write/delete.

## Test coverage

`npm run test:security` verifies:

- Portfolio service resolves workspace ownership before portfolio table queries.
- Portfolio service no longer writes or filters by caller-supplied `userId`.
- The workspace migration enforces unique ownership, RLS, and signup creation.
- Runtime guard logging exists for owner mismatches and requested-user mismatches.
- Two-account integration harness: Account A marker never appears in Account B load; Account B attempting to request Account A is blocked and logged.

## Residual notes

The automated integration test uses an in-memory Supabase-like harness because CI/live Supabase credentials are not present in the repo. A live E2E version can be added once test project credentials are available.
