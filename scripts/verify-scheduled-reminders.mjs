#!/usr/bin/env node
/** @deprecated Use `npm run reminders:verify-insert` (wraps reminders-system-status). */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const r = spawnSync("node", ["scripts/reminders-system-status.mjs", "--verify-insert"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
process.exit(r.status ?? 1);
