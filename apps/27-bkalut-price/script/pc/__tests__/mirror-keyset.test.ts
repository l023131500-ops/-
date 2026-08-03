/**
 * Validates the timeout-safe keyset pager used by pc-mirror-to-sqlite.
 * Uses an injected fetchPage backed by an in-memory table, so no live Supabase
 * is needed. Confirms:
 *  - keyset walk (WHERE id > lastId) returns every row exactly once, in order
 *  - a 57014 statement timeout halves the page size and retries the SAME window
 *    (no rows skipped or duplicated) instead of truncating the table
 *  - a persistent timeout at the minimum page size fails loudly
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchAllKeyset, TimeoutError } from "../../pc-mirror-to-sqlite";

// Build N rows with sequential (and intentionally non-contiguous) ids to prove
// the pager keys off the actual id value, not off a running count.
function makeRows(n: number): Array<{ id: number; v: string }> {
  return Array.from({ length: n }, (_, i) => ({ id: (i + 1) * 3, v: `row-${i}` }));
}

// A PostgREST-like page reader over an in-memory table: returns up to pageSize
// rows with id > afterId, ordered by id.
function makeReader(rows: Array<{ id: number }>) {
  const sorted = [...rows].sort((a, b) => a.id - b.id);
  return (afterId: number, pageSize: number) =>
    Promise.resolve(sorted.filter((r) => r.id > afterId).slice(0, pageSize));
}

test("keyset pager returns all rows exactly once, in id order", async () => {
  const rows = makeRows(12_345);
  const got = await fetchAllKeyset(makeReader(rows), { pageSize: 1000, minPageSize: 100 });

  assert.equal(got.length, rows.length, "all rows fetched");
  const ids = got.map((r) => (r as { id: number }).id);
  assert.deepEqual(ids, rows.map((r) => r.id), "ids in ascending order, no gaps");
  assert.equal(new Set(ids).size, ids.length, "no duplicate rows");
});

test("timeout halves page size and retries the same window without losing rows", async () => {
  const rows = makeRows(5_000);
  const reader = makeReader(rows);
  let failuresLeft = 3; // fail the first few large-page requests
  let smallestPageSeen = Infinity;

  const flaky = async (afterId: number, pageSize: number) => {
    smallestPageSeen = Math.min(smallestPageSeen, pageSize);
    if (pageSize > 500 && failuresLeft > 0) {
      failuresLeft--;
      throw new TimeoutError("500 57014 canceling statement due to statement timeout");
    }
    return reader(afterId, pageSize);
  };

  const got = await fetchAllKeyset(flaky, { pageSize: 4000, minPageSize: 500 });
  assert.equal(got.length, rows.length, "no rows dropped despite repeated timeouts");
  assert.ok(smallestPageSeen < 4000, "page size was reduced after timeouts");
  assert.equal(new Set(got.map((r) => (r as { id: number }).id)).size, rows.length, "no duplicates");
});

test("a timeout that persists at the minimum page size is thrown, not swallowed", async () => {
  const alwaysTimeout = async () => {
    throw new TimeoutError("500 57014 canceling statement due to statement timeout");
  };
  await assert.rejects(
    fetchAllKeyset(alwaysTimeout, { pageSize: 1000, minPageSize: 500 }),
    (e: Error) => e instanceof TimeoutError,
  );
});
