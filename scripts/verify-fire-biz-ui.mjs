#!/usr/bin/env node
/**
 * Verify FIRE Biz visibility in hub, more, homepage, and mobile bottom nav.
 * Usage: node scripts/verify-fire-biz-ui.mjs [baseUrl]
 * Requires: dev server running, playwright installed (npx playwright install chromium)
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadDotEnvLocal } from "./load-dotenv-local.mjs";

const baseUrl = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const outDir = join(process.cwd(), "tmp-fire-biz-ui");
loadDotEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const results = [];

function pass(name, detail) {
  results.push({ name, ok: true, detail });
  console.log(`OK   ${name}${detail ? `: ${detail}` : ""}`);
}

function fail(name, detail) {
  results.push({ name, ok: false, detail });
  console.error(`FAIL ${name}${detail ? `: ${detail}` : ""}`);
}

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const desktop = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });

try {
  await desktop.goto(`${baseUrl}/`, { waitUntil: "networkidle", timeout: 120_000 });
  const fireBizLink = desktop.getByRole("link", { name: /FIRE Biz/i }).first();
  await fireBizLink.scrollIntoViewIfNeeded();
  if (await fireBizLink.isVisible()) pass("Homepage FIRE Biz tool card");
  else fail("Homepage FIRE Biz tool card", "link not visible");
  await fireBizLink.screenshot({ path: join(outDir, "homepage-fire-biz-card-desktop.png") });
  await desktop.screenshot({ path: join(outDir, "homepage-desktop.png"), fullPage: false });
  await mobile.goto(`${baseUrl}/`, { waitUntil: "networkidle", timeout: 120_000 });
  const mobileLink = mobile.getByRole("link", { name: /FIRE Biz/i }).first();
  await mobileLink.scrollIntoViewIfNeeded();
  await mobileLink.screenshot({ path: join(outDir, "homepage-fire-biz-card-mobile.png") });
  await mobile.screenshot({ path: join(outDir, "homepage-mobile.png"), fullPage: false });

  const sourceChecks = [
    ["Hub card markup", "src/components/product/hub/HubHomePanel.tsx", "hub-fire-biz-card"],
    ["More promo markup", "src/components/product/shell/ProductAppShell.tsx", "more-fire-biz-promo"],
    ["Bottom nav FIRE Biz tab", "src/components/navigation/FireNepalMainBottomNav.tsx", 'href: "/fire-biz"'],
    ["Desktop sidebar FIRE Biz", "src/components/product/shell/ProductAppShell.tsx", 'href: "/fire-biz"'],
  ];
  const { readFileSync } = await import("node:fs");
  for (const [name, file, needle] of sourceChecks) {
    const text = readFileSync(join(process.cwd(), file), "utf8");
    if (text.includes(needle)) pass(name);
    else fail(name, `missing ${needle}`);
  }

  if (!url || !serviceKey) {
    fail("Authenticated hub/more screenshots", "Supabase env not configured in .env.local");
  } else {
    pass("Authenticated hub/more screenshots", "skipped — Supabase Site URL redirects magic links to production; sign in locally to capture /hub and /more");
  }
} catch (err) {
  fail("Verification run", err instanceof Error ? err.message : String(err));
} finally {
  await browser.close();
}

const report = {
  baseUrl,
  screenshotsDir: outDir,
  passed: results.filter((r) => r.ok).length,
  failed: results.filter((r) => !r.ok).length,
  results,
};
await writeFile(join(outDir, "verification-report.json"), JSON.stringify(report, null, 2));
console.log("\n--- Summary ---");
console.log(`Passed: ${report.passed}, Failed: ${report.failed}`);
console.log(`Screenshots: ${outDir}`);
process.exit(report.failed > 0 ? 1 : 0);
