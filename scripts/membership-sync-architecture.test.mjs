/**
 * Permanent membership sync architecture tests.
 * Ensures user_profiles is the sole plan SOT and mismatches surface as errors.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

/** Mirror of src/lib/membership/canonical.ts deriveCanonicalMembership for node:test. */
function parseMembershipPlan(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "free" || normalized === "premium" || normalized === "elite") return normalized;
  return null;
}

function deriveCanonicalMembership(row, userId, now = new Date()) {
  const plan = parseMembershipPlan(row?.membership_plan) ?? "free";
  const membershipStart = row?.membership_start ?? null;
  const membershipExpiry = row?.membership_expiry ?? null;
  const suspendedAt = row?.membership_suspended_at ?? null;
  const archivedAt = row?.membership_archived_at ?? null;

  const hasExpiry = Boolean(membershipExpiry?.trim?.() || membershipExpiry);
  let expiryStatus = "active";
  let daysRemaining = Number.POSITIVE_INFINITY;
  if (hasExpiry) {
    const exp = new Date(membershipExpiry);
    const ms = exp.getTime() - now.getTime();
    daysRemaining = Math.ceil(ms / (24 * 60 * 60 * 1000));
    if (ms < 0) expiryStatus = "expired";
    else if (daysRemaining <= 14) expiryStatus = "expiring_soon";
    else expiryStatus = "active";
  } else if (plan === "free") {
    expiryStatus = "expired";
    daysRemaining = 0;
  }

  let status;
  if (archivedAt) status = "archived";
  else if (suspendedAt) status = "suspended";
  else if (plan === "free") status = "free";
  else if (hasExpiry && expiryStatus === "expired") status = "expired";
  else if (hasExpiry && expiryStatus === "expiring_soon") status = "expiring_soon";
  else status = "active";

  const accessBlocked =
    Boolean(archivedAt) ||
    Boolean(suspendedAt) ||
    (hasExpiry && expiryStatus === "expired") ||
    plan === "free";

  return {
    userId,
    plan,
    membershipStart,
    membershipExpiry,
    suspendedAt,
    archivedAt,
    accessPlan: accessBlocked ? "free" : plan,
    status,
    expiryStatus,
    daysRemaining: Number.isFinite(daysRemaining) ? daysRemaining : 0,
  };
}

function assertPlanWriteAllowed(previousPlan, nextPlan, opts = {}) {
  if ((previousPlan === "premium" || previousPlan === "elite") && nextPlan === "free") {
    if (!opts.allowDemoteToFree && !opts.reason?.trim()) {
      throw new Error("Refusing to demote paid membership to Free without an explicit admin reason.");
    }
  }
}

function assertDisplayedPlanMatchesCanonical(surface, displayedPlan, canonical) {
  const shown = parseMembershipPlan(displayedPlan) ?? "free";
  if (shown !== canonical.plan) {
    console.error(
      `[membership-sync] MISMATCH on ${surface}: UI shows "${shown}" but user_profiles.membership_plan is "${canonical.plan}" for user ${canonical.userId}`,
    );
    return false;
  }
  return true;
}

const NOW = new Date("2026-07-14T12:00:00.000Z");

test("Existing Elite user must stay Elite", () => {
  const m = deriveCanonicalMembership(
    {
      membership_plan: "elite",
      membership_start: "2026-01-01T00:00:00.000Z",
      membership_expiry: "2027-01-01T00:00:00.000Z",
    },
    "u-elite",
    NOW,
  );
  assert.equal(m.plan, "elite");
  assert.equal(m.accessPlan, "elite");
});

test("Existing Premium user must stay Premium", () => {
  const m = deriveCanonicalMembership(
    {
      membership_plan: "premium",
      membership_start: "2026-01-01T00:00:00.000Z",
      membership_expiry: "2027-01-01T00:00:00.000Z",
    },
    "u-premium",
    NOW,
  );
  assert.equal(m.plan, "premium");
  assert.equal(m.accessPlan, "premium");
});

test("Existing Free user must stay Free", () => {
  const m = deriveCanonicalMembership(
    { membership_plan: "free", membership_start: null, membership_expiry: null },
    "u-free",
    NOW,
  );
  assert.equal(m.plan, "free");
  assert.equal(m.accessPlan, "free");
  assert.equal(m.status, "free");
});

test("Expired user must stay Expired with plan preserved", () => {
  const m = deriveCanonicalMembership(
    {
      membership_plan: "premium",
      membership_start: "2025-01-01T00:00:00.000Z",
      membership_expiry: "2026-01-01T00:00:00.000Z",
    },
    "u-expired",
    NOW,
  );
  assert.equal(m.plan, "premium");
  assert.equal(m.status, "expired");
  assert.equal(m.accessPlan, "free");
});

test("Paid plan with null expiry stays active (open-ended — TEJESH case)", () => {
  const m = deriveCanonicalMembership(
    {
      membership_plan: "premium",
      membership_start: "2026-06-06T14:15:55.973794+00:00",
      membership_expiry: null,
    },
    "u-tejesh",
    NOW,
  );
  assert.equal(m.plan, "premium");
  assert.equal(m.status, "active");
  assert.equal(m.accessPlan, "premium");
});

test("One user's update must NEVER change another user's membership", () => {
  const a = deriveCanonicalMembership(
    {
      membership_plan: "elite",
      membership_start: "2026-01-01T00:00:00.000Z",
      membership_expiry: "2027-01-01T00:00:00.000Z",
    },
    "user-a",
    NOW,
  );
  const b = deriveCanonicalMembership(
    {
      membership_plan: "premium",
      membership_start: "2026-01-01T00:00:00.000Z",
      membership_expiry: "2027-01-01T00:00:00.000Z",
    },
    "user-b",
    NOW,
  );
  assert.equal(a.userId, "user-a");
  assert.equal(b.userId, "user-b");
  assert.notEqual(a.plan, b.plan);
  assert.equal(a.plan, "elite");
  assert.equal(b.plan, "premium");
});

test("Demotion to Free requires explicit reason", () => {
  assert.throws(() => assertPlanWriteAllowed("elite", "free", {}));
  assert.doesNotThrow(() =>
    assertPlanWriteAllowed("elite", "free", { reason: "admin-set-plan-free:x" }),
  );
  assert.doesNotThrow(() => assertPlanWriteAllowed("premium", "elite", {}));
});

test("parseMembershipPlan never invents Free for invalid tokens", () => {
  assert.equal(parseMembershipPlan("elite"), "elite");
  assert.equal(parseMembershipPlan(null), null);
  assert.equal(parseMembershipPlan("gold"), null);
});

test("Free member: plan free, access free", () => {
  const m = deriveCanonicalMembership(
    { membership_plan: "free", membership_start: null, membership_expiry: null },
    "u-free",
    NOW,
  );
  assert.equal(m.plan, "free");
  assert.equal(m.accessPlan, "free");
  assert.equal(m.status, "free");
  assert.equal(assertDisplayedPlanMatchesCanonical("test", "free", m), true);
});

test("Premium member: display premium, access premium", () => {
  const m = deriveCanonicalMembership(
    {
      membership_plan: "premium",
      membership_start: "2026-01-01T00:00:00.000Z",
      membership_expiry: "2027-01-01T00:00:00.000Z",
    },
    "u-premium",
    NOW,
  );
  assert.equal(m.plan, "premium");
  assert.equal(m.accessPlan, "premium");
  assert.equal(m.status, "active");
});

test("Elite member: display elite, access elite", () => {
  const m = deriveCanonicalMembership(
    {
      membership_plan: "elite",
      membership_start: "2026-01-01T00:00:00.000Z",
      membership_expiry: "2027-01-01T00:00:00.000Z",
    },
    "u-elite",
    NOW,
  );
  assert.equal(m.plan, "elite");
  assert.equal(m.accessPlan, "elite");
  assert.equal(m.status, "active");
});

test("Expired paid member: Admin/Profile still show stored plan; gates are free", () => {
  const m = deriveCanonicalMembership(
    {
      membership_plan: "premium",
      membership_start: "2025-01-01T00:00:00.000Z",
      membership_expiry: "2026-01-01T00:00:00.000Z",
    },
    "u-expired",
    NOW,
  );
  assert.equal(m.plan, "premium");
  assert.equal(m.accessPlan, "free");
  assert.equal(m.status, "expired");
  // TEJESH-class bug: UI must not display Free when SOT is Premium
  assert.equal(assertDisplayedPlanMatchesCanonical("Admin", "free", m), false);
  assert.equal(assertDisplayedPlanMatchesCanonical("Profile", "premium", m), true);
});

test("Suspended member: stored plan unchanged; access free", () => {
  const m = deriveCanonicalMembership(
    {
      membership_plan: "elite",
      membership_start: "2026-01-01T00:00:00.000Z",
      membership_expiry: "2027-01-01T00:00:00.000Z",
      membership_suspended_at: "2026-07-01T00:00:00.000Z",
    },
    "u-suspended",
    NOW,
  );
  assert.equal(m.plan, "elite");
  assert.equal(m.accessPlan, "free");
  assert.equal(m.status, "suspended");
  assert.equal(assertDisplayedPlanMatchesCanonical("Membership", "elite", m), true);
  assert.equal(assertDisplayedPlanMatchesCanonical("Membership", "free", m), false);
});

test("architecture: MembershipService is the shared SOT reader/writer", () => {
  const service = read("src/services/membership-service.ts");
  assert.match(service, /from\("user_profiles"\)/);
  assert.match(service, /export async function getMembershipByUserId/);
  assert.match(service, /export async function writeMembership/);
  assert.doesNotMatch(service, /\.from\("profiles"\)/);
  assert.doesNotMatch(service, /\.from\("subscriptions"\)/);
  assert.doesNotMatch(service, /localStorage\.(getItem|setItem|removeItem)/);
});

test("architecture: entitlement API reads only MembershipService", () => {
  const route = read("app/api/membership/entitlement/route.ts");
  assert.match(route, /getMembershipByUserId/);
  assert.match(route, /sourceOfTruth:\s*"public\.user_profiles"/);
  assert.doesNotMatch(route, /from\("profiles"\)/);
  assert.doesNotMatch(route, /from\("subscriptions"\)/);
});

test("architecture: admin roster + CRM + export use MembershipService", () => {
  assert.match(read("src/lib/admin/fetch-admin-members.ts"), /getMembershipMapByUserIds/);
  assert.match(read("src/lib/admin/fetch-admin-member-detail.ts"), /getMembershipByUserId/);
  assert.match(read("src/lib/admin/fetch-member-crm.ts"), /getMembershipByUserId/);
  assert.match(read("src/lib/admin/fetch-admin-snapshot.ts"), /getMembershipMapByUserIds/);
  assert.match(read("app/api/admin/export/users/route.ts"), /getMembershipMapByUserIds/);
});

test("architecture: localStorage membership plan cache is purged, never written", () => {
  const fire = read("src/lib/fire-membership.ts");
  assert.match(fire, /localStorage\.removeItem\(MEMBERSHIP_STORAGE_KEY\)/);
  assert.doesNotMatch(fire, /localStorage\.setItem\(MEMBERSHIP_STORAGE_KEY/);
  const ctx = read("src/contexts/FireMembershipContext.tsx");
  assert.match(ctx, /removeItem\("fire-nepal-membership-v1"\)/);
});

test("architecture: mismatch validation is wired on Profile + Membership pages", () => {
  assert.match(read("src/components/dashboard/FireMyProfilePage.tsx"), /assertDisplayedPlanMatchesCanonical/);
  assert.match(read("src/components/dashboard/FirePremiumProfilePage.tsx"), /assertDisplayedPlanMatchesCanonical/);
  assert.match(read("src/components/dashboard/FireMembershipPage.tsx"), /assertDisplayedPlanMatchesCanonical/);
  assert.match(read("src/lib/membership/canonical.ts"), /\[membership-sync\] MISMATCH/);
});

test("architecture: load failure must not invent Free in entitlement/context", () => {
  const route = read("app/api/membership/entitlement/route.ts");
  const ctx = read("src/contexts/FireMembershipContext.tsx");
  const service = read("src/services/membership-service.ts");
  assert.match(route, /loaded: false/);
  assert.match(route, /status: 503/);
  assert.match(ctx, /if \(!r\.ok\) return null/);
  assert.match(service, /membership load failed/);
  assert.match(service, /Refusing to demote|assertPlanWriteAllowed/);
});

test("architecture: profiles trigger must not demote paid plans to Free", () => {
  const migration = read("supabase/migrations/20260714220000_user_profiles_membership_never_demote.sql");
  assert.match(migration, /NEVER demote/i);
  assert.match(migration, /plan_type = 'free'/);
  assert.doesNotMatch(migration, /membership_plan = coalesce\(nullif\(new\.plan_type/);
});
