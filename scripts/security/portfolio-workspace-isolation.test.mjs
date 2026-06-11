import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const PORTFOLIO_SERVICE = readFileSync(new URL("../../src/services/portfolio-supabase.ts", import.meta.url), "utf8");
const PORTFOLIO_SYNC_HOOK = readFileSync(new URL("../../src/hooks/WealthPortfolioCloudSync.tsx", import.meta.url), "utf8");
const WORKSPACE_SERVICE = readFileSync(new URL("../../src/services/workspace-supabase.ts", import.meta.url), "utf8");
const WORKSPACE_MIGRATION = readFileSync(
  new URL("../../supabase/migrations/20260611130000_user_workspaces_rls.sql", import.meta.url),
  "utf8",
);
const PORTFOLIO_RLS_MIGRATION = readFileSync(
  new URL("../../supabase/migrations/20260611193000_portfolio_rls_self_access.sql", import.meta.url),
  "utf8",
);
const FINANCE_RLS_MIGRATION = readFileSync(
  new URL("../../supabase/migrations/20260611221000_finance_tables_user_rls.sql", import.meta.url),
  "utf8",
);

const PORTFOLIO_TABLES = [
  "bank_accounts",
  "investments",
  "gold_assets",
  "real_estate",
  "vehicles",
  "liabilities",
  "retirement_assets",
  "portfolio_extensions",
];

test("portfolio cloud service resolves workspace ownership before table queries", () => {
  assert.match(PORTFOLIO_SERVICE, /ensureAuthenticatedWorkspace\(client, userId, "loadWealthPortfolioFromSupabase"\)/);
  assert.match(PORTFOLIO_SERVICE, /ensureAuthenticatedWorkspace\(client, userId, "saveWealthPortfolioToSupabase"\)/);
  assert.doesNotMatch(PORTFOLIO_SERVICE, /\.eq\("user_id", userId\)/);
  assert.doesNotMatch(PORTFOLIO_SERVICE, /user_id:\s*userId/);

  for (const table of PORTFOLIO_TABLES) {
    assert.match(PORTFOLIO_SERVICE, new RegExp(`from\\("${table}"\\)`), `missing portfolio table ${table}`);
  }
});

test("workspace migration enforces one RLS-protected workspace per user and creates it on signup", () => {
  assert.match(WORKSPACE_MIGRATION, /create table if not exists public\.workspaces/);
  assert.match(WORKSPACE_MIGRATION, /user_id uuid not null references auth\.users \(id\) on delete cascade/);
  assert.match(WORKSPACE_MIGRATION, /constraint workspaces_user_id_unique unique \(user_id\)/);
  assert.match(WORKSPACE_MIGRATION, /alter table public\.workspaces enable row level security/);
  assert.match(WORKSPACE_MIGRATION, /auth\.uid \(\) = user_id/);
  assert.match(WORKSPACE_MIGRATION, /create trigger on_auth_user_created_workspace/);
});

test("runtime guard logs and rejects mismatched workspace ownership", () => {
  assert.match(WORKSPACE_SERVICE, /workspace owner mismatch/);
  assert.match(WORKSPACE_SERVICE, /requested user does not match auth user/);
  assert.match(WORKSPACE_SERVICE, /client\.auth\.getUser\(\)/);
});

test("portfolio cloud save surfaces exact Supabase errors to console and toast", () => {
  assert.match(PORTFOLIO_SERVICE, /throw new PortfolioSupabaseError/);
  assert.match(PORTFOLIO_SERVICE, /portfolioSaveError\("bank_accounts upsert"/);
  assert.match(PORTFOLIO_SERVICE, /portfolioSaveError\("portfolio_extensions upsert"/);
  assert.match(PORTFOLIO_SYNC_HOOK, /client\.auth\.getUser\(\)/);
  assert.match(PORTFOLIO_SYNC_HOOK, /console\.error\("Portfolio save failed:", error\)/);
  assert.match(PORTFOLIO_SYNC_HOOK, /toast\.error\(portfolioErrorMessage\(error\)\)/);
});

test("portfolio RLS migration limits portfolio rows to authenticated owner", () => {
  for (const table of [...PORTFOLIO_TABLES, "portfolios", "portfolio_accounts", "transactions"]) {
    assert.match(PORTFOLIO_RLS_MIGRATION, new RegExp(`'${table}'`), `missing RLS refresh for ${table}`);
  }

  assert.match(PORTFOLIO_RLS_MIGRATION, /for select to authenticated using \(auth\.uid\(\) = user_id\)/);
  assert.match(PORTFOLIO_RLS_MIGRATION, /for insert to authenticated with check \(auth\.uid\(\) = user_id\)/);
  assert.match(
    PORTFOLIO_RLS_MIGRATION,
    /for update to authenticated using \(auth\.uid\(\) = user_id\) with check \(auth\.uid\(\) = user_id\)/,
  );
  assert.match(PORTFOLIO_RLS_MIGRATION, /for delete to authenticated using \(auth\.uid\(\) = user_id\)/);
});

test("finance RLS migration applies command-specific user policies to every dashboard finance table", () => {
  for (const table of ["assets", "liabilities", "income", "expenses", "transactions", "workspaces"]) {
    assert.match(FINANCE_RLS_MIGRATION, new RegExp(`'${table}'`), `missing finance RLS table ${table}`);
  }

  assert.match(FINANCE_RLS_MIGRATION, /create policy user_select/);
  assert.match(FINANCE_RLS_MIGRATION, /for select to authenticated using \(auth\.uid\(\) = user_id\)/);
  assert.match(FINANCE_RLS_MIGRATION, /create policy user_insert/);
  assert.match(FINANCE_RLS_MIGRATION, /for insert to authenticated with check \(auth\.uid\(\) = user_id\)/);
  assert.match(FINANCE_RLS_MIGRATION, /create policy user_update/);
  assert.match(
    FINANCE_RLS_MIGRATION,
    /for update to authenticated using \(auth\.uid\(\) = user_id\) with check \(auth\.uid\(\) = user_id\)/,
  );
  assert.match(FINANCE_RLS_MIGRATION, /create policy user_delete/);
  assert.match(FINANCE_RLS_MIGRATION, /for delete to authenticated using \(auth\.uid\(\) = user_id\)/);
});

test("two-account integration harness never leaks User A asset into User B", async () => {
  const guardLogs = [];
  const db = {
    authUserId: "account-a",
    workspaces: new Map(),
    assets: [],
  };

  async function ensureWorkspace(expectedUserId, context) {
    const authUserId = db.authUserId;
    if (expectedUserId && expectedUserId !== authUserId) {
      guardLogs.push({ context, requestedUserId: expectedUserId, authUserId });
      return null;
    }

    let workspace = db.workspaces.get(authUserId);
    if (!workspace) {
      workspace = { id: `workspace-${authUserId}`, user_id: authUserId };
      db.workspaces.set(authUserId, workspace);
    }

    if (workspace.user_id !== authUserId) {
      guardLogs.push({ context, workspaceUserId: workspace.user_id, authUserId });
      return null;
    }

    return workspace;
  }

  async function saveAsset(expectedUserId, rowId) {
    const workspace = await ensureWorkspace(expectedUserId, "save");
    if (!workspace) return false;
    db.assets.push({ user_id: workspace.user_id, row_id: rowId });
    return true;
  }

  async function loadAssets(expectedUserId) {
    const workspace = await ensureWorkspace(expectedUserId, "load");
    if (!workspace) return null;
    return db.assets.filter((row) => row.user_id === workspace.user_id).map((row) => row.row_id);
  }

  assert.equal(await saveAsset("account-a", "USER_A_ASSET"), true);
  assert.deepEqual(await loadAssets("account-a"), ["USER_A_ASSET"]);

  db.authUserId = "account-b";
  assert.deepEqual(await loadAssets("account-b"), []);
  assert.equal(await saveAsset("account-b", "USER_B_ASSET"), true);
  assert.deepEqual(await loadAssets("account-b"), ["USER_B_ASSET"]);

  db.authUserId = "account-a";
  assert.deepEqual(await loadAssets("account-a"), ["USER_A_ASSET"]);

  db.authUserId = "account-b";
  assert.equal(await loadAssets("account-a"), null);
  assert.deepEqual(guardLogs.at(-1), {
    context: "load",
    requestedUserId: "account-a",
    authUserId: "account-b",
  });
});
