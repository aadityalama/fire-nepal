#!/usr/bin/env node
import { execSync } from "node:child_process";

const base = "https://www.firenepal.com";
const markersNew = [
  "Members must resolve before expenses render",
  "recovering names from device cache",
  "Loading member…",
  "listGroupMembers",
];
const markersOld = ["Unknown member"];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function probeOnce() {
  const page = await fetch(`${base}/group-expenses`, { redirect: "follow" });
  const html = await page.text();
  const scripts = [...html.matchAll(/\/_next\/static\/[^"']+\.js/g)].map((m) => m[0]);
  let newHit = null;
  let oldHit = null;
  for (const path of scripts.slice(0, 120)) {
    const res = await fetch(base + path);
    const body = await res.text();
    for (const marker of markersNew) {
      if (body.includes(marker)) {
        newHit = { path, marker };
        break;
      }
    }
    for (const marker of markersOld) {
      if (body.includes(marker)) oldHit = { path, marker };
    }
    if (newHit) break;
  }
  return { status: page.status, scriptCount: scripts.length, newHit, oldHit };
}

const origin = execSync("git ls-remote origin refs/heads/main", { encoding: "utf8" }).trim();
console.log("origin/main", origin);

for (let i = 1; i <= 12; i += 1) {
  console.log(`poll ${i} ${new Date().toISOString()}`);
  try {
    const result = await probeOnce();
    console.log(JSON.stringify(result));
    if (result.newHit) {
      console.log("STATUS production_has_fix");
      process.exit(0);
    }
  } catch (error) {
    console.log("probe_error", error.message);
  }
  await sleep(20000);
}

console.log("STATUS deploy_not_detected_yet");
process.exit(2);
