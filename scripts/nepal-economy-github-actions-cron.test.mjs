/**
 * Nepal Economy GitHub Actions–only scheduler contract checks.
 * Ensures we never schedule this refresh via Vercel Cron and that the
 * workflow + endpoint auth shape stay production-safe.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

const root = process.cwd();

async function read(rel) {
  return readFile(path.join(root, rel), "utf8");
}

test("vercel.json does not schedule nepal-economy-refresh (no Vercel Cron usage)", async () => {
  const vercel = JSON.parse(await read("vercel.json"));
  const paths = (vercel.crons ?? []).map((c) => c.path);
  assert.ok(!paths.includes("/api/cron/nepal-economy-refresh"));
  assert.ok(!JSON.stringify(vercel).includes("nepal-economy"));
});

test("GitHub Actions workflow is the scheduled refresh mechanism", async () => {
  const yml = await read(".github/workflows/nepal-economy-refresh-cron.yml");

  assert.match(yml, /^name:\s*Nepal economy refresh cron/m);
  assert.match(yml, /schedule:/);
  assert.match(yml, /cron:\s*"15 \*\/6 \* \* \*"/);
  assert.match(yml, /workflow_dispatch:/);
  assert.match(yml, /secrets\.ECONOMY_CRON_TARGET_URL/);
  assert.match(yml, /secrets\.CRON_SECRET/);
  assert.match(yml, /Authorization.*Bearer/);
  assert.match(yml, /\/api\/cron\/nepal-economy-refresh/);

  // Fail clearly on non-2xx
  assert.match(yml, /code < 200 or code >= 300|non-2xx/);

  // No checkout / install / deploy — HTTP ping only
  assert.doesNotMatch(yml, /^\s+uses:\s*actions\/checkout/m);
  assert.doesNotMatch(yml, /npm (ci|install)|pnpm install|yarn install/);
  assert.doesNotMatch(yml, /vercel\s+(deploy|pull|build)/i);

  // Explicitly documents GitHub Actions–only (not Vercel Cron)
  assert.match(yml, /GitHub Actions ONLY|Do NOT add .*vercel\.json/i);
  assert.doesNotMatch(yml, /vercel\.json.*nepal-economy-refresh/);
});

test("refresh endpoint authenticates with CRON_SECRET Bearer and is not Vercel-scheduled", async () => {
  const route = await read("app/api/cron/nepal-economy-refresh/route.ts");
  assert.match(route, /process\.env\.CRON_SECRET/);
  assert.match(route, /Authorization/);
  assert.match(route, /Bearer \$\{secret\}|`Bearer \$\{secret\}`/);
  assert.match(route, /status:\s*401/);
  assert.match(route, /Do NOT register this in vercel\.json/);
  assert.match(route, /GitHub Actions/);
  assert.doesNotMatch(route, /154\.92|311,?100|1\.68%|177\.41/);
});
