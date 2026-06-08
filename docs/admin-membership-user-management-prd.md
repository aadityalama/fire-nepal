# Admin membership user management (PRD 55481)

This document describes how the app implements suspend, archive, and super-admin-only permanent removal, and how analytics treat each state.

## Policy

| Action | Who | Access | Data |
|--------|-----|--------|------|
| **Suspend** | Admin | Premium/Elite access removed immediately (`profiles.suspended_at`, subscription canceled). | All profile, payment, revenue, reminder, and CRM rows kept. |
| **Archive** | Admin | Hidden from default **active roster**; paid access revoked. | Same as suspend for retention. |
| **Permanent remove** | **Super admin only** | Auth user banned; profile plan cleared and `archived_at` set; display name minimized. | **No** deletion of `revenue_events`, reminder send logs, membership requests, or CRM audit rows. |

Permanent removal requires typing the exact phrase from `src/lib/admin/member-permanent-delete-phrase.ts` after acknowledging:

> This action permanently removes user data and cannot be undone.

There is **no** normal-admin “delete user” API; only the gated `permanent_remove` action on `PATCH /api/admin/members/[userId]`.

## Member status model

- **Plan (tier):** Free, Premium, Elite — from `profiles.plan_type` (see `planTypeLabel()` in `src/lib/membership-profile-status.ts`).
- **Lifecycle bucket:** Free, Active, Expiring Soon, Expired, Suspended, Archived — from `membershipUiBucket()` and `MEMBERSHIP_UI_BUCKET_LABEL`.

Paid feature access uses `GET /api/membership/entitlement`, which forces `effectivePlan` to `free` when suspended, archived, or past expiry.

## Analytics

`fetchAdminSnapshot` (`src/lib/admin/fetch-admin-snapshot.ts`) exposes:

- `activeMembersCount` — paid, in good standing, not suspended/archived (`membershipUiBucket` === `active`).
- `suspendedMembersCount` — not archived, `suspended_at` set.
- `archivedMembersCount` — `archived_at` set.

**Revenue:** `totalRevenueNpr` sums all `revenue_events`; suspending or archiving does not remove rows.

**Churn / long-expiry proxy:** `expiredMembersNotRenewed30dPlus` in `membership-renewal-reminder-snapshot.ts` skips **archived** and **suspended** profiles so counts are not inflated by accounts that are not true voluntary churn.

**Renewal queue:** `buildMembershipRenewalSnapshot` skips archived members entirely.

## Database migrations

Relevant Supabase migrations:

- `supabase/migrations/20260607150000_profiles_membership_expiry_suspend.sql` — `suspended_at`, `profile_membership_ui_bucket` helper.
- `supabase/migrations/20260615120000_profiles_archive_membership_policy.sql` — `archived_at`, RLS/policy updates for archive behavior.

## Admin UI entry points

- **Analytics:** `src/components/admin/AdminDashboardClient.tsx` — “Member roster” stat tiles and links to filtered member lists.
- **Directory:** `src/components/admin/AdminMembersClient.tsx` — default `active_roster` filter hides archived; suspended members remain visible.
- **CRM drawer:** `src/components/admin/MemberCrmDrawer.tsx` — renew, suspend, reactivate, archive, restore, super-admin permanent remove with confirmation modal.
