import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("market summary uses private cache for personalized/lite responses", () => {
  const src = readFileSync(join(root, "app/api/market/summary/route.ts"), "utf8");
  assert.match(src, /CACHE_HEADERS_PRIVATE/);
  assert.match(src, /private, max-age=20/);
  assert.match(src, /canUseSharedPublicFull/);
  assert.match(src, /projectMarketSnapshot/);
});

test("lending send/respond still return store for API contract", () => {
  for (const file of [
    "app/api/fire-lending/requests/send/route.ts",
    "app/api/fire-lending/requests/respond/route.ts",
  ]) {
    const src = readFileSync(join(root, file), "utf8");
    assert.match(src, /store:\s*result\.store/);
  }
});

test("notify-email requires credentials include on client", () => {
  const src = readFileSync(join(root, "src/contexts/FireLendingContext.tsx"), "utf8");
  assert.match(src, /credentials:\s*["']include["']/);
  assert.match(src, /notify-email/);
});

test("schema e2e routes require cron secret when configured", () => {
  for (const file of [
    "app/api/schema/e2e-sot-session/route.ts",
    "app/api/schema/e2e-reminder-email/route.ts",
    "app/api/schema/ensure-finance/route.ts",
    "app/api/schema/ensure-scheduled-reminders/route.ts",
  ]) {
    const src = readFileSync(join(root, file), "utf8");
    assert.match(src, /requireCronSecretIfConfigured/);
  }
});

test("InsightsSidebar does not open a second market summary poll", () => {
  const src = readFileSync(join(root, "src/components/portfolio/premium/InsightsSidebar.tsx"), "utf8");
  assert.doesNotMatch(src, /useMarketData/);
  assert.match(src, /useRealtimeMarket/);
});
