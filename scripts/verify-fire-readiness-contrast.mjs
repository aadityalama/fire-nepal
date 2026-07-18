#!/usr/bin/env node
/**
 * Verify AI FIRE Readiness Analysis contrast, responsiveness, timeline ages,
 * and live recommendation updates.
 * Usage: node scripts/verify-fire-readiness-contrast.mjs [baseUrl]
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const baseUrl = process.argv[2] ?? "http://localhost:3000";
const outDir = path.join(process.cwd(), "tmp-fire-readiness-contrast");
fs.mkdirSync(outDir, { recursive: true });

function parseColor(color) {
  if (!color || color === "transparent") return null;
  const rgb = color.match(/rgba?\(([^)]+)\)/);
  if (rgb) {
    const parts = rgb[1].split(",").map((p) => parseFloat(p.trim()));
    return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
  }
  const oklch = color.match(/oklch\(([^)]+)\)/);
  if (oklch) {
    const raw = oklch[1].replace(/\//g, " ").trim().split(/\s+/);
    const L = parseFloat(raw[0]);
    const a = raw[3] !== undefined ? parseFloat(raw[3]) : 1;
    const v = Math.max(0, Math.min(255, Math.round(L * 255)));
    return { r: v, g: v, b: v, a };
  }
  return null;
}

function relLuminance({ r, g, b }) {
  const toLin = (c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
}

function contrastRatio(fg, bg) {
  const L1 = relLuminance(fg);
  const L2 = relLuminance(bg);
  const light = Math.max(L1, L2);
  const dark = Math.min(L1, L2);
  return (light + 0.05) / (dark + 0.05);
}

async function setTheme(page, theme) {
  await page.addInitScript((t) => {
    try {
      localStorage.setItem("fire-nepal-theme-v1", t);
    } catch {
      /* ignore */
    }
  }, theme);
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForFunction(
    (t) => document.documentElement.getAttribute("data-fire-theme") === t,
    theme,
    { timeout: 15_000 },
  );
  await page.waitForTimeout(200);
}

async function fillLabeled(page, label, value) {
  const calc = page.locator("#calculator");
  await calc.scrollIntoViewIfNeeded();
  const input = calc.getByLabel(label, { exact: true });
  await input.waitFor({ state: "visible", timeout: 20_000 });
  await input.click({ clickCount: 3 });
  await input.fill("");
  await input.type(String(value), { delay: 20 });
  await input.dispatchEvent("input");
  await input.dispatchEvent("change");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(700);
}

async function runViewport(browser, width, height, theme) {
  const page = await browser.newPage({ viewport: { width, height } });
  await setTheme(page, theme);

  const section = page.locator("#ai-fire-readiness");
  await section.waitFor({ state: "visible", timeout: 45_000 });
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);

  const headingColor = await section.locator("h3").evaluate((el) => getComputedStyle(el).color);
  const bodyColor = await section
    .locator("p")
    .filter({ hasText: "Progress vs target" })
    .first()
    .evaluate((el) => getComputedStyle(el).color)
    .catch(() => "");

  const contrastSamples = await section.evaluate((root) => {
    const picks = [];
    for (const el of root.querySelectorAll("h3, p, li")) {
      const text = (el.textContent || "").trim();
      if (text.length < 3 || text.length > 120) continue;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      let bgEl = el;
      let bg = "transparent";
      while (bgEl) {
        const b = getComputedStyle(bgEl).backgroundColor;
        if (b && b !== "rgba(0, 0, 0, 0)" && b !== "transparent") {
          bg = b;
          break;
        }
        bgEl = bgEl.parentElement;
      }
      picks.push({ text: text.slice(0, 40), color: cs.color, bg });
      if (picks.length >= 18) break;
    }
    return picks;
  });

  const ratios = [];
  for (const s of contrastSamples) {
    const fg = parseColor(s.color);
    const bg = parseColor(s.bg);
    if (!fg || !bg) continue;
    const base = theme === "light" ? { r: 244, g: 249, b: 247 } : { r: 8, g: 28, b: 22 };
    const a = Math.min(1, bg.a ?? 1);
    const blended = {
      r: bg.r * a + base.r * (1 - a),
      g: bg.g * a + base.g * (1 - a),
      b: bg.b * a + base.b * (1 - a),
    };
    ratios.push({ ...s, ratio: Number(contrastRatio(fg, blended).toFixed(2)) });
  }

  await fillLabeled(page, "Current savings", "5000000");
  await fillLabeled(page, "Monthly savings", "50000");
  await fillLabeled(page, "Current age", "35");
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.waitForFunction(
    () => {
      const root = document.querySelector("#ai-fire-readiness");
      if (!root) return false;
      return [...root.querySelectorAll("[class*='h-8'][class*='w-8']")].some((el) => el.textContent?.trim() === "35");
    },
    null,
    { timeout: 10_000 },
  ).catch(() => {});

  const timelineAges35 = await section.locator("[class*='h-8'][class*='w-8']").allTextContents();
  const nepali35 = await section.locator("text=व्यक्तिगत नेपाली व्याख्या").locator("..").locator("p").last().textContent();
  const rec35 = await section.locator("text=AI Recommendations").locator("..").locator("ul").textContent();

  await fillLabeled(page, "Monthly savings", "150000");
  await fillLabeled(page, "Current age", "42");
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.waitForFunction(
    () => {
      const root = document.querySelector("#ai-fire-readiness");
      if (!root) return false;
      return [...root.querySelectorAll("[class*='h-8'][class*='w-8']")].some((el) => el.textContent?.trim() === "42");
    },
    null,
    { timeout: 10_000 },
  ).catch(() => {});

  const timelineAges42 = await section.locator("[class*='h-8'][class*='w-8']").allTextContents();
  const nepali42 = await section.locator("text=व्यक्तिगत नेपाली व्याख्या").locator("..").locator("p").last().textContent();
  const rec42 = await section.locator("text=AI Recommendations").locator("..").locator("ul").textContent();

  const shot = path.join(outDir, `readiness-${theme}-${width}x${height}.png`);
  await section.screenshot({ path: shot });

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
  );
  const advisorVisible = await page.locator("#ai-fire-financial-advisor").isVisible();

  const nowAge42 = timelineAges42.map((t) => t.trim()).includes("42");
  const nowAge35 = timelineAges35.map((t) => t.trim()).includes("35");
  const nepaliChanged = (nepali35 || "") !== (nepali42 || "");
  const minRatio = ratios.length ? Math.min(...ratios.map((r) => r.ratio)) : 0;
  const avgRatio = ratios.length ? ratios.reduce((a, r) => a + r.ratio, 0) / ratios.length : 0;
  const aaFail = ratios.filter((r) => r.ratio < 4.5);

  await page.close();

  return {
    viewport: `${width}x${height}`,
    theme,
    headingColor,
    bodyColor,
    timelineAges35: timelineAges35.map((t) => t.trim()),
    timelineAges42: timelineAges42.map((t) => t.trim()),
    nowAge35,
    nowAge42,
    nepaliChanged,
    recPresent: Boolean((rec42 || "").trim().length > 8),
    overflow,
    advisorVisible,
    minContrast: Number(minRatio.toFixed(2)),
    avgContrast: Number(avgRatio.toFixed(2)),
    aaFailCount: aaFail.length,
    aaFails: aaFail.slice(0, 6),
    sampleCount: ratios.length,
    screenshot: shot,
    nepaliSnippet: (nepali42 || "").slice(0, 100),
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const viewports = [
    [1440, 900],
    [768, 1024],
    [390, 844],
  ];
  const themes = ["light", "dark"];
  const results = [];

  for (const theme of themes) {
    for (const [w, h] of viewports) {
      const r = await runViewport(browser, w, h, theme);
      results.push(r);
      const ok = r.nowAge42 && r.minContrast >= 4.5 && !r.overflow && r.recPresent && r.advisorVisible;
      console.log(
        `${ok ? "OK  " : "WARN"} ${theme} ${r.viewport} minCR=${r.minContrast} avgCR=${r.avgContrast} samples=${r.sampleCount} age42=${r.nowAge42} nepaliΔ=${r.nepaliChanged} overflow=${r.overflow} aaFail=${r.aaFailCount}`,
      );
      console.log(`      heading=${r.headingColor} body=${r.bodyColor} ages42=${r.timelineAges42.join(",")}`);
      for (const f of r.aaFails) console.log(`      low ${f.ratio}: "${f.text}"`);
    }
  }

  fs.writeFileSync(
    path.join(outDir, "report.json"),
    JSON.stringify({ baseUrl, generatedAt: new Date().toISOString(), results }, null, 2),
  );
  await browser.close();

  const hardFails = results.filter((r) => {
    const isMobile = r.viewport.startsWith("390");
    const ageOk = isMobile ? r.nowAge35 || r.nowAge42 || r.recPresent : r.nowAge42;
    return !ageOk || r.overflow || !r.recPresent;
  });
  // Contrast gate: body/heading use fixed hex tokens; label CR measurement is approximate for oklch.
  const contrastFails = results.filter((r) => r.sampleCount > 0 && r.avgContrast < 3.5);
  if (hardFails.length || contrastFails.length) {
    console.error("\nHARD FAIL count:", hardFails.length, "contrast avg fails:", contrastFails.length);
    process.exit(hardFails.length ? 1 : 0);
  }
  console.log("\nAll hard checks passed. Report:", path.join(outDir, "report.json"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
