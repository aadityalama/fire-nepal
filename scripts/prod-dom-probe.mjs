/**
 * One-off: load production Return to Nepal in an iPhone-sized viewport with
 * prefers-color-scheme: light (reproduces iOS light + in-app dark mismatch)
 * and print DOM theme + computed colors. Requires: npm i playwright (see script runner).
 */
import { chromium, devices } from "playwright";

const url = process.argv[2] ?? "https://firenepal.com/return-to-nepal";
const outPng = process.argv[3] ?? null;

const browser = await chromium.launch();
const context = await browser.newContext({
  ...devices["iPhone 12"],
  colorScheme: "light",
});
const page = await context.newPage();
await page.goto(url, { waitUntil: "networkidle", timeout: 90_000 });
await page.waitForTimeout(2500);

const probe = await page.evaluate(() => {
  const html = document.documentElement;
  const attrs = Object.fromEntries(
    Array.from(html.attributes).map((a) => [a.name, a.value]),
  );

  const h1 =
    document.querySelector("section.wealth-glass h1") ??
    document.querySelector("main h1") ??
    document.querySelector("h1");
  const subtitle =
    h1?.parentElement?.querySelector("p") ??
    document.querySelector("section.wealth-glass p");

  /** First numeric-ish KPI value in planner hero area */
  const glass = document.querySelector("section.wealth-glass");
  const kpiCandidates = glass
    ? Array.from(
        glass.querySelectorAll(
          "span,div,strong,em,p",
        ),
      ).filter((el) => /\d/.test(el.textContent ?? "") && (el.textContent ?? "").length < 40)
    : [];
  const kpiEl = kpiCandidates[0] ?? null;

  const rgb = (el) => (el ? getComputedStyle(el).color : null);

  return {
    url: location.href,
    htmlAttrs: attrs,
    dataFireTheme: html.getAttribute("data-fire-theme"),
    titleText: h1?.textContent?.trim() ?? null,
    titleColor: rgb(h1),
    subtitleText: subtitle?.textContent?.trim()?.slice(0, 120) ?? null,
    subtitleColor: rgb(subtitle),
    kpiSampleText: kpiEl?.textContent?.trim() ?? null,
    kpiColor: rgb(kpiEl),
  };
});

console.log(JSON.stringify(probe, null, 2));

if (outPng) {
  await page.screenshot({ path: outPng, fullPage: false });
  console.error("Wrote screenshot:", outPng);
}

await browser.close();
