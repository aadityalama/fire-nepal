import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Repo root (parent of `scripts/`). */
export function getRepoRoot() {
  return join(dirname(fileURLToPath(import.meta.url)), "..");
}

/**
 * Parse `.env.local` at repo root into process.env.
 * Fills missing keys; also replaces keys that are set but empty (common when placeholders exist in the shell).
 */
export function loadDotEnvLocal() {
  const envLocal = join(getRepoRoot(), ".env.local");
  if (!existsSync(envLocal)) return { path: envLocal, loaded: false };
  const text = readFileSync(envLocal, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    const cur = process.env[key];
    const curEmpty = cur === undefined || cur === null || String(cur).trim() === "";
    if (!(key in process.env) || curEmpty) process.env[key] = val;
  }
  return { path: envLocal, loaded: true };
}
