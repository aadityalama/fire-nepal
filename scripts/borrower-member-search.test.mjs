/**
 * Verifies mutual borrower search: User A can find User B and User B can find User A,
 * while each search excludes the searching account.
 */
import assert from "node:assert/strict";
import test from "node:test";

/** Mirrors src/lib/fire-lending/borrower-member.ts filterMembersExcludingSelf */
function filterMembersExcludingSelf(rows, query, excludeUserId) {
  const q = String(query).trim().toLowerCase();
  if (q.length < 2) return [];
  return rows.filter((row) => {
    if (row.id === excludeUserId) return false;
    const id = (row.fire_nepal_id ?? "").toLowerCase();
    const name = (row.full_name ?? "").toLowerCase();
    return id.includes(q) || name.includes(q);
  });
}

test("User A can search User B and User B can search User A by FIRE Nepal ID", () => {
  const userA = {
    id: "aaa-aaa-aaa",
    fire_nepal_id: "FN-2024-000001",
    full_name: "Asha Lama",
  };
  const userB = {
    id: "bbb-bbb-bbb",
    fire_nepal_id: "FN-2024-000002",
    full_name: "Bikash Thapa",
  };
  const rows = [userA, userB];

  const aFindsB = filterMembersExcludingSelf(rows, "FN-2024-000002", userA.id);
  assert.equal(aFindsB.length, 1);
  assert.equal(aFindsB[0].id, userB.id);
  assert.ok(!aFindsB.some((r) => r.id === userA.id));

  const bFindsA = filterMembersExcludingSelf(rows, "FN-2024-000001", userB.id);
  assert.equal(bFindsA.length, 1);
  assert.equal(bFindsA[0].id, userA.id);
  assert.ok(!bFindsA.some((r) => r.id === userB.id));
});

test("partial name and FIRE ID search works both directions", () => {
  const rows = [
    { id: "u1", fire_nepal_id: "FN-2025-100001", full_name: "Priya Sharma" },
    { id: "u2", fire_nepal_id: "FN-2025-100002", full_name: "Prabin Karki" },
  ];

  assert.deepEqual(
    filterMembersExcludingSelf(rows, "pra", "u1").map((r) => r.id),
    ["u2"],
  );
  assert.deepEqual(
    filterMembersExcludingSelf(rows, "priya", "u2").map((r) => r.id),
    ["u1"],
  );
  assert.deepEqual(
    filterMembersExcludingSelf(rows, "FN-2025-10000", "u1").map((r) => r.id),
    ["u2"],
  );
});
