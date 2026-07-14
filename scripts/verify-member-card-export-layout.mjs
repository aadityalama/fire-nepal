import { chromium, webkit, devices } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.MEMBER_CARD_HARNESS_URL ?? "http://127.0.0.1:3000/member-card-export-harness";
const OUT = "/opt/cursor/artifacts/member-card-export";

async function waitForQr(page) {
  await page.waitForFunction(() => {
    const root = document.querySelector("[data-member-card-export='true']");
    return root?.getAttribute("data-export-ready") === "true";
  }, null, { timeout: 15_000 });
}

async function runProfile(browserType, label, contextOptions = {}) {
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  page.setDefaultTimeout(60_000);

  await page.goto(BASE, { waitUntil: "networkidle" });
  await waitForQr(page);

  await page.click("[data-testid='measure-layout']");
  const measureText = await page.locator("[data-testid='harness-message']").innerText();
  const measure = JSON.parse(measureText);

  await page.click("[data-testid='capture-png']");
  await page.waitForFunction(() => {
    const msg = document.querySelector("[data-testid='harness-message']")?.textContent;
    return msg === "png-ok";
  }, null, { timeout: 60_000 });

  const pngSize = await page.locator("[data-testid='png-size']").innerText();
  const preview = page.locator("[data-testid='png-preview']");
  await preview.waitFor({ state: "visible" });
  await page.waitForFunction(() => {
    const img = document.querySelector("#png-preview");
    return img instanceof HTMLImageElement && img.naturalWidth > 0;
  });

  const natural = await preview.evaluate((img) => ({
    width: img.naturalWidth,
    height: img.naturalHeight,
  }));

  // Persist the real PNG bytes (not a viewport screenshot of a scaled <img>).
  const dataUrl = await preview.evaluate((img) => img.src);
  if (dataUrl.startsWith("blob:")) {
    const buffer = await page.evaluate(async (url) => {
      const res = await fetch(url);
      const ab = await res.arrayBuffer();
      return Array.from(new Uint8Array(ab));
    }, dataUrl);
    await writeFile(path.join(OUT, `${label}-export.png`), Buffer.from(buffer));
  }

  // Sample left/right columns to detect half-painted Safari captures.
  const sample = await preview.evaluate(async (img) => {
    const bitmap = await createImageBitmap(img);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { leftNonBlack: 0, rightNonBlack: 0 };
    ctx.drawImage(bitmap, 0, 0);
    const probe = (x, y) => {
      const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
      return r + g + b > 24;
    };
    let leftNonBlack = 0;
    let rightNonBlack = 0;
    for (let i = 0; i < 40; i++) {
      const y = Math.floor((bitmap.height * (i + 1)) / 42);
      if (probe(Math.floor(bitmap.width * 0.2), y)) leftNonBlack += 1;
      if (probe(Math.floor(bitmap.width * 0.8), y)) rightNonBlack += 1;
    }
    return { leftNonBlack, rightNonBlack, width: bitmap.width, height: bitmap.height };
  });

  await page.locator("[data-member-card-export='true']").screenshot({
    path: path.join(OUT, `${label}-card.png`),
  });

  const report = {
    label,
    measure,
    pngSize: Number(pngSize),
    capturedNatural: natural,
    sample,
    ok:
      measure.width === 1400 &&
      measure.height === 900 &&
      measure.nameHeight >= 40 &&
      measure.nameHeight <= 64 &&
      Number(pngSize) > 50_000 &&
      natural.width >= 1400 &&
      natural.height >= 900 &&
      sample.leftNonBlack >= 10 &&
      sample.rightNonBlack >= 10,
  };

  await writeFile(path.join(OUT, `${label}-report.json`), JSON.stringify(report, null, 2));
  await browser.close();
  return report;
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const chrome = await runProfile(chromium, "desktop-chrome", {
    viewport: { width: 1600, height: 1100 },
  });

  const iphone = devices["iPhone 13"];
  const safari = await runProfile(webkit, "iphone-safari", {
    ...iphone,
    // Keep enough space so the fixed 1400×900 card is fully painted (document can scroll).
    viewport: { width: 390, height: 1200 },
  });

  const summary = { chrome, safari, allOk: chrome.ok && safari.ok };
  await writeFile(path.join(OUT, "summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.allOk) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
