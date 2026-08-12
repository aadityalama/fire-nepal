/**
 * Runtime unit test for module-snapshot client inflight dedupe + TTL cache.
 */
import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

describe("fetchModuleSnapshot client cache", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("dedupes concurrent loads and serves TTL cache on remount", async () => {
    // Fresh module instance per test
    const apiPath = new URL("../src/lib/module-snapshots/api.ts", import.meta.url).href + `?t=${Date.now()}`;
    const { fetchModuleSnapshot, invalidateModuleSnapshotCache, saveModuleSnapshotToCloud } = await import(apiPath);

    let fetchCount = 0;
    mock.method(globalThis, "fetch", async () => {
      fetchCount += 1;
      return new Response(JSON.stringify({ ok: true, snapshot: { state: { v: fetchCount } } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const [a, b] = await Promise.all([
      fetchModuleSnapshot("payslip_history"),
      fetchModuleSnapshot("payslip_history"),
    ]);
    assert.equal(fetchCount, 1);
    assert.deepEqual(a, { v: 1 });
    assert.deepEqual(b, { v: 1 });

    const c = await fetchModuleSnapshot("payslip_history");
    assert.equal(fetchCount, 1);
    assert.deepEqual(c, { v: 1 });

    const forced = await fetchModuleSnapshot("payslip_history", { force: true });
    assert.equal(fetchCount, 2);
    assert.deepEqual(forced, { v: 2 });

    await saveModuleSnapshotToCloud("payslip_history", { v: 99 });
    assert.equal(fetchCount, 3); // PUT
    const afterSave = await fetchModuleSnapshot("payslip_history");
    assert.equal(fetchCount, 3); // cache hit from writeCache on PUT
    assert.deepEqual(afterSave, { v: 99 });

    invalidateModuleSnapshotCache("payslip_history");
    const afterInvalidate = await fetchModuleSnapshot("payslip_history");
    assert.equal(fetchCount, 4);
    assert.deepEqual(afterInvalidate, { v: 4 });
  });
});
