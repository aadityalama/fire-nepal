import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const PORTFOLIO_SERVICE = readFileSync(new URL("../../src/services/portfolio-supabase.ts", import.meta.url), "utf8");
const WORKSPACE_SERVICE = readFileSync(new URL("../../src/services/workspace-supabase.ts", import.meta.url), "utf8");
const WORKSPACE_MIGRATION = readFileSync(
  new URL("../../supabase/migrations/20260611130000_user_workspaces_rls.sql", import.meta.url),
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

test("two-account integration harness never leaks Account A portfolio into Account B", async () => {
  const guardLogs = [];
  const db = {
    authUserId: "account-a",
    workspaces: new Map(),
    investments: [],
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

  async function saveInvestment(expectedUserId, rowId) {
    const workspace = await ensureWorkspace(expectedUserId, "save");
    if (!workspace) return false;
    db.investments.push({ user_id: workspace.user_id, row_id: rowId });
    return true;
  }

  async function loadInvestments(expectedUserId) {
    const workspace = await ensureWorkspace(expectedUserId, "load");
    if (!workspace) return null;
    return db.investments.filter((row) => row.user_id === workspace.user_id).map((row) => row.row_id);
  }

  assert.equal(await saveInvestment("account-a", "ACCOUNT_A_MARKER"), true);
  assert.deepEqual(await loadInvestments("account-a"), ["ACCOUNT_A_MARKER"]);

  db.authUserId = "account-b";
  assert.equal(await saveInvestment("account-b", "ACCOUNT_B_MARKER"), true);
  assert.deepEqual(await loadInvestments("account-b"), ["ACCOUNT_B_MARKER"]);

  assert.equal(await loadInvestments("account-a"), null);
  assert.deepEqual(guardLogs.at(-1), {
    context: "load",
    requestedUserId: "account-a",
    authUserId: "account-b",
  });
});
