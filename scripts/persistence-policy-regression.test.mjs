import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function timestamp(record) {
  return record.updatedAt ?? record.createdAt ?? "";
}

function isSoftDeleted(record) {
  return Boolean(record.deletedAt ?? record.deleted_at);
}

function mergeDurableRecords(localRecords, remoteRecords) {
  const byId = new Map();
  for (const record of [...remoteRecords, ...localRecords]) {
    const existing = byId.get(record.id);
    if (!existing) {
      byId.set(record.id, record);
      continue;
    }
    if (isSoftDeleted(record) && !isSoftDeleted(existing)) {
      byId.set(record.id, { ...existing, ...record });
      continue;
    }
    if (isSoftDeleted(existing) && !isSoftDeleted(record)) continue;
    byId.set(record.id, timestamp(record) >= timestamp(existing) ? record : existing);
  }
  return Array.from(byId.values());
}

test("durable merge preserves local-only historical records", () => {
  const merged = mergeDurableRecords(
    [{ id: "local-only", createdAt: "2026-01-01T00:00:00.000Z" }],
    [{ id: "remote-only", createdAt: "2026-01-02T00:00:00.000Z" }],
  );
  assert.deepEqual(new Set(merged.map((record) => record.id)), new Set(["local-only", "remote-only"]));
});

test("durable merge keeps the newest update for stable ids", () => {
  const merged = mergeDurableRecords(
    [{ id: "same", name: "new local", updatedAt: "2026-01-03T00:00:00.000Z" }],
    [{ id: "same", name: "old remote", updatedAt: "2026-01-02T00:00:00.000Z" }],
  );
  assert.equal(merged[0].name, "new local");
});

test("durable merge never resurrects soft-deleted records during sync", () => {
  const merged = mergeDurableRecords(
    [{ id: "same", name: "local active", updatedAt: "2026-01-04T00:00:00.000Z" }],
    [{ id: "same", name: "remote deleted", deletedAt: "2026-01-05T00:00:00.000Z", updatedAt: "2026-01-05T00:00:00.000Z" }],
  );
  assert.equal(merged[0].deletedAt, "2026-01-05T00:00:00.000Z");
});

test("global workspace reset compatibility function does not clear storage", () => {
  const source = read("src/lib/fire-nepal/workspace-data-reset.ts");
  const resetBody = source.slice(source.indexOf("export function performGlobalFireNepalWorkspaceDataReset"));
  assert.doesNotMatch(resetBody, /localStorage\.(removeItem|clear|setItem)/);
  assert.doesNotMatch(resetBody, /save[A-Z][A-Za-z]+State\(/);
});

test("Savings and Insurance do not show temporary storage setup placeholders", () => {
  const savings = read("src/services/savings-supabase.ts");
  const insurance = read("src/services/insurance-supabase.ts");
  assert.doesNotMatch(savings, /storage is being set up/i);
  assert.doesNotMatch(insurance, /storage is being set up/i);
});

test("Cashflow falls back to fire_goals when cashflow_snapshots is missing", () => {
  const source = read("src/services/cashflow-supabase.ts");
  assert.match(source, /CASHFLOW_FIRE_GOALS_MARKER/);
  assert.match(source, /cashflow_snapshots_v1/);
  assert.match(source, /isMissingCashflowTableError/);
  assert.match(source, /loadCashflowFromFireGoals/);
  assert.match(source, /saveCashflowToFireGoals/);
  assert.doesNotMatch(source, /ensure-cashflow-schema/);
  assert.doesNotMatch(source, /from ["']pg["']/);
});

test("Savings authenticated hydrate is cloud-only and clears localStorage cache", () => {
  const source = read("src/components/savings-workspace/SavingsWorkspaceDashboard.tsx");
  assert.match(source, /clearSavingsWorkspaceLocalCache\(/);
  assert.match(source, /Authenticated users must use Supabase only/);
  assert.match(source, /Never merge or seed from browser-local data/);
  assert.doesNotMatch(source, /mergeSavingsWorkspaceState\(/);
  assert.match(source, /if \(!hydrated \|\| user\?\.id\) return;/);
});

test("Group expense local backfill is guarded by existing remote rows", () => {
  const source = read("src/services/group-expenses-supabase.ts");
  const syncBody = source.slice(source.indexOf("export async function syncLocalExpensesToGroupExpenses"));
  assert.match(syncBody, /select\("id", \{ count: "exact", head: true \}\)/);
  assert.match(syncBody, /if \(\(count \?\? 0\) > 0\) return;/);
});

test("Group members are loaded from Supabase before expenses hydrate", () => {
  const dashboard = read("src/components/ExpenseDashboard.tsx");
  const service = read("src/services/group-expenses-supabase.ts");
  assert.match(service, /export async function listGroupMembers/);
  assert.match(service, /export async function upsertGroupMember/);
  assert.match(service, /export async function syncGroupMembers/);
  assert.match(dashboard, /listGroupMembers\(/);
  assert.match(dashboard, /Members must resolve before expenses render/);
  assert.match(dashboard, /void persistGroupMember\(/);
  assert.match(dashboard, /deleteGroupMemberCascade\(/);
  assert.match(service, /softDeleteGroupMemberByLocalId\(/);
  assert.doesNotMatch(dashboard, /remoteMembers = Array\.from\(new Set\(remoteExpenses\.map/);
});

test("Group expenses never fall back to Unknown member", () => {
  const members = read("src/lib/expense-members.ts");
  const dashboard = read("src/components/ExpenseDashboard.tsx");
  assert.doesNotMatch(members, /Unknown member/);
  assert.doesNotMatch(dashboard, /Unknown member/);
  assert.match(members, /unresolved member lookup/);
  assert.match(members, /Loading member…/);
});

test("Budget and Insurance delete handlers soft-delete instead of hard-delete", () => {
  for (const file of ["src/services/budget-supabase.ts", "src/services/insurance-supabase.ts"]) {
    const source = read(file);
    const deleteBody = source.slice(source.indexOf("export async function delete"));
    assert.doesNotMatch(deleteBody, /\.delete\(/);
    assert.match(deleteBody, /deleted_at/);
    assert.match(deleteBody, /updated_at/);
  }
});

test("Portfolio authenticated hydrate does not loadWealthPortfolioState as source of truth", () => {
  const portfolio = read("src/contexts/WealthPortfolioContext.tsx");
  const hydrateBlock = portfolio.slice(portfolio.indexOf("useLayoutEffect(() => {"), portfolio.indexOf("}, [loading, user?.id]);") + 20);
  assert.match(hydrateBlock, /if \(user\?\.id\)/);
  assert.match(hydrateBlock, /setState\(defaultWealthState\(\)\)/);
  assert.doesNotMatch(hydrateBlock, /loadWealthPortfolioState\(user/);
});

test("useCloudDocumentState and user_module_snapshots module keys exist", () => {
  const hook = read("src/hooks/useCloudDocumentState.ts");
  const keys = read("src/lib/module-snapshots/keys.ts");
  const migration = read("supabase/migrations/20260807120000_user_module_snapshots.sql");
  assert.match(hook, /export function useCloudDocumentState/);
  assert.match(hook, /fetchModuleSnapshot/);
  assert.match(hook, /saveModuleSnapshotToCloud/);
  assert.match(keys, /user_module_snapshots|"nepal_col"|"smart_loan"|"family_hub"/);
  assert.match(migration, /user_module_snapshots/);
});

test("Insurance authenticated path has no offline Will sync when cloud is ready fork", () => {
  const source = read("src/components/insurance-workspace/InsuranceWorkspaceDashboard.tsx");
  assert.doesNotMatch(source, /Will sync when cloud is ready/i);
  assert.match(source, /useState<InsuranceWorkspaceState>\(\(\) => \(\{ version: 1, policies: \[\] \}\)\)/);
  assert.match(source, /Authenticated: never paint browser-local policies/);
});

test("Historical finance analytics uses cloud SoT and preserves cache on error", () => {
  const hook = read("src/hooks/useHistoricalFinanceData.ts");
  const dashboard = read("src/components/finance-analytics/HistoricalFinanceDashboard.tsx");
  const analytics = read("src/lib/finance/historical-analytics.ts");
  assert.match(hook, /listAllExpenseTransactionsForExport/);
  assert.match(hook, /\/api\/cashflow/);
  assert.match(hook, /cacheRef\.current/);
  assert.match(hook, /Never reuse another account's cached history/);
  assert.match(hook, /Unable to load financial history\. Please try again\./);
  assert.doesNotMatch(hook, /localStorage\.(setItem|removeItem|clear)/);
  assert.doesNotMatch(dashboard, /saveCashflowToSupabase|savePersonalExpenseState|PUT \/api\/cashflow/);
  assert.match(dashboard, /No financial records found for this period\./);
  assert.match(dashboard, /z-\[80\]/);
  assert.match(analytics, /Never fabricates values/);
});
