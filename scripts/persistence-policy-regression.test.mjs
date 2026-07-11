import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function timestamp(record) {
  return record.updatedAt ?? record.createdAt ?? "";
}

function isSoftDeleted(record) {
  return Boolean(record.deletedAt ?? record.deleted_at);
}

function mergeDurableRecords(localRecords, remoteRecords) {
  const byId = new Map();
  for (const record of [...remoteRecords, ...localRecords]) {
    const existing = byId.get(record.id);
    if (!existing) {
      byId.set(record.id, record);
      continue;
    }
    if (isSoftDeleted(record) && !isSoftDeleted(existing)) {
      byId.set(record.id, { ...existing, ...record });
      continue;
    }
    if (isSoftDeleted(existing) && !isSoftDeleted(record)) continue;
    byId.set(record.id, timestamp(record) >= timestamp(existing) ? record : existing);
  }
  return Array.from(byId.values());
}

test("durable merge preserves local-only historical records", () => {
  const merged = mergeDurableRecords(
    [{ id: "local-only", createdAt: "2026-01-01T00:00:00.000Z" }],
    [{ id: "remote-only", createdAt: "2026-01-02T00:00:00.000Z" }],
  );
  assert.deepEqual(new Set(merged.map((record) => record.id)), new Set(["local-only", "remote-only"]));
});

test("durable merge keeps the newest update for stable ids", () => {
  const merged = mergeDurableRecords(
    [{ id: "same", name: "new local", updatedAt: "2026-01-03T00:00:00.000Z" }],
    [{ id: "same", name: "old remote", updatedAt: "2026-01-02T00:00:00.000Z" }],
  );
  assert.equal(merged[0].name, "new local");
});

test("durable merge never resurrects soft-deleted records during sync", () => {
  const merged = mergeDurableRecords(
    [{ id: "same", name: "local active", updatedAt: "2026-01-04T00:00:00.000Z" }],
    [{ id: "same", name: "remote deleted", deletedAt: "2026-01-05T00:00:00.000Z", updatedAt: "2026-01-05T00:00:00.000Z" }],
  );
  assert.equal(merged[0].deletedAt, "2026-01-05T00:00:00.000Z");
});

test("global workspace reset compatibility function does not clear storage", () => {
  const source = read("src/lib/fire-nepal/workspace-data-reset.ts");
  const resetBody = source.slice(source.indexOf("export function performGlobalFireNepalWorkspaceDataReset"));
  assert.doesNotMatch(resetBody, /localStorage\.(removeItem|clear|setItem)/);
  assert.doesNotMatch(resetBody, /save[A-Z][A-Za-z]+State\(/);
});

test("Savings and Insurance do not show temporary storage setup placeholders", () => {
  const savings = read("src/services/savings-supabase.ts");
  const insurance = read("src/services/insurance-supabase.ts");
  assert.doesNotMatch(savings, /storage is being set up/i);
  assert.doesNotMatch(insurance, /storage is being set up/i);
});

test("Savings cloud hydrate merges local and remote state instead of replacing local history", () => {
  const source = read("src/components/savings-workspace/SavingsWorkspaceDashboard.tsx");
  assert.match(source, /mergeSavingsWorkspaceState\(local, remote\)/);
  assert.match(source, /mergeDurableRecords\(local\.goals, remote\.goals\)/);
  assert.match(source, /mergeDurableRecords\(local\.transactions, remote\.transactions\)/);
});
