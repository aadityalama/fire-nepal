#!/usr/bin/env node
/**
 * Verify homepage SEO meta tags in generated HTML.
 * Usage: node scripts/verify-homepage-seo.mjs [url]
 */
const url = process.argv[2] ?? "http://127.0.0.1:3000/";

const EXPECTED_TITLE = "FIRE Nepal | Financial Independence for Nepalis Abroad";
const EXPECTED_DESCRIPTION =
  "A premium financial platform for Nepalis worldwide — multi-currency FIRE planning, savings tracking, investment education, remittance tools, and Nepal return readiness.";
const FORBIDDEN = [
  "Financial Independence for Korean Workers",
  "wealth building between Korea and Nepal",
  "between Korea and Nepal",
];

function extractMeta(html, { name, property }) {
  const attr = name ? "name" : "property";
  const key = name ?? property;
  const re = new RegExp(`<meta[^>]+${attr}=["']${key}["'][^>]+content=["']([^"']+)["']`, "i");
  const alt = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${key}["']`, "i");
  return re.exec(html)?.[1] ?? alt.exec(html)?.[1] ?? null;
}

function extractTitle(html) {
  return /<title[^>]*>([^<]+)<\/title>/i.exec(html)?.[1] ?? null;
}

const html = await fetch(url, { redirect: "follow" }).then((r) => {
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return r.text();
});

const title = extractTitle(html);
const description = extractMeta(html, { name: "description" });
const ogTitle = extractMeta(html, { property: "og:title" });
const ogDescription = extractMeta(html, { property: "og:description" });
const twitterTitle = extractMeta(html, { name: "twitter:title" });
const twitterDescription = extractMeta(html, { name: "twitter:description" });

const checks = [
  ["<title>", title, EXPECTED_TITLE],
  ['meta name="description"', description, EXPECTED_DESCRIPTION],
  ['meta property="og:title"', ogTitle, EXPECTED_TITLE],
  ['meta property="og:description"', ogDescription, EXPECTED_DESCRIPTION],
  ['meta name="twitter:title"', twitterTitle, EXPECTED_TITLE],
  ['meta name="twitter:description"', twitterDescription, EXPECTED_DESCRIPTION],
];

let failed = false;

for (const [label, actual, expected] of checks) {
  if (actual !== expected) {
    failed = true;
    console.error(`FAIL ${label}`);
    console.error(`  expected: ${expected}`);
    console.error(`  actual:   ${actual}`);
  } else {
    console.log(`OK   ${label}`);
  }
}

for (const phrase of FORBIDDEN) {
  if (html.includes(phrase)) {
    failed = true;
    console.error(`FAIL forbidden phrase found: ${phrase}`);
  }
}

if (failed) {
  process.exit(1);
}

console.log(`\nHomepage SEO verified at ${url}`);
