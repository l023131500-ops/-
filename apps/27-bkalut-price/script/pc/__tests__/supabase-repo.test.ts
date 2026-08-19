/**
 * Tests for the BATCHED Supabase upsert path used by the daily importer.
 *
 * Run with:  npx tsx --test script/pc/__tests__/supabase-repo.test.ts
 *
 * These lock in the optimization that replaced ~3 sequential round-trips per
 * price row with a handful of chunked bulk reads/inserts. The per-row path was
 * importing only a few hundred rows in several minutes (job id=10). The tests
 * assert that the batch path:
 *   - resolves products by barcode → item_code → name|brand (same precedence);
 *   - inserts only genuinely-new products/prices;
 *   - writes pc_price_history for new rows AND for changed prices, but NOT for
 *     unchanged re-imports;
 *   - tags new rows with source="import", source_type="official_feed", active=1;
 *   - dramatically reduces the number of DB round-trips vs. the row count.
 *
 * We inject a fake PostgREST-shaped client that records every call, so no
 * network or real Supabase is needed.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { PcSupabaseRepo } from "../supabase-repo.ts";
import type { ParsedPrice } from "../xml.ts";

/** A row store keyed by table name. */
type Tables = Record<string, Record<string, unknown>[]>;

interface CallLog {
  table: string;
  op: "select" | "insert" | "update";
}

/**
 * Minimal fake of the supabase-js query builder. Supports the exact chain the
 * repo uses: from().select().in() / .eq() and from().insert().select() and
 * from().update().eq(). Auto-assigns incrementing ids on insert.
 */
function makeFakeClient(initial: Tables) {
  const tables: Tables = JSON.parse(JSON.stringify(initial));
  const calls: CallLog[] = [];
  let nextId = 1000;

  function from(table: string) {
    tables[table] ??= [];
    const rows = tables[table];

    const builder: any = {
      _filters: [] as { col: string; vals: unknown[] | null; eq?: unknown; lt?: unknown }[],
      _selectCols: null as string | null,
      _pendingInsert: null as Record<string, unknown>[] | null,
      _pendingUpdate: null as Record<string, unknown> | null,
      _op: null as CallLog["op"] | null,

      select(cols: string) {
        this._selectCols = cols;
        if (!this._op) this._op = "select";
        return this;
      },
      insert(payload: Record<string, unknown> | Record<string, unknown>[]) {
        this._op = "insert";
        this._pendingInsert = Array.isArray(payload) ? payload : [payload];
        return this;
      },
      update(patch: Record<string, unknown>) {
        this._op = "update";
        this._pendingUpdate = patch;
        return this;
      },
      in(col: string, vals: unknown[]) {
        this._filters.push({ col, vals });
        return this;
      },
      eq(col: string, val: unknown) {
        this._filters.push({ col, vals: null, eq: val });
        return this;
      },
      lt(col: string, val: unknown) {
        this._filters.push({ col, vals: null, lt: val });
        return this;
      },
      limit() { return this; },
      single() { this._single = true; return this; },

      _match(row: Record<string, unknown>): boolean {
        return this._filters.every((f: any) => {
          if (f.vals) return f.vals.includes(row[f.col]);
          if ("eq" in f) return row[f.col] === f.eq;
          if ("lt" in f) return String(row[f.col]) < String(f.lt);
          return true;
        });
      },

      then(resolve: (r: { data: unknown; error: null }) => void) {
        let result: unknown;
        if (this._op === "insert" && this._pendingInsert) {
          const inserted = this._pendingInsert.map((r) => {
            const withId = { id: nextId++, ...r };
            rows.push(withId);
            return withId;
          });
          calls.push({ table, op: "insert" });
          result = this._selectCols ? inserted : null;
        } else if (this._op === "update" && this._pendingUpdate) {
          const matched = rows.filter((r) => this._match(r));
          for (const r of matched) Object.assign(r, this._pendingUpdate);
          calls.push({ table, op: "update" });
          result = this._selectCols ? matched : null;
        } else {
          calls.push({ table, op: "select" });
          result = rows.filter((r) => this._match(r));
        }
        resolve({ data: result, error: null });
      },
    };
    return builder;
  }

  return { client: { from } as any, tables, calls };
}

function makeRepo(initial: Tables) {
  const fake = makeFakeClient(initial);
  const repo = new PcSupabaseRepo("https://example.supabase.co", "service-key", false);
  // Replace the real (network) client with the fake recorder.
  (repo as unknown as { client: unknown }).client = fake.client;
  return { repo, ...fake };
}

const price = (over: Partial<ParsedPrice>): ParsedPrice => ({
  barcode: null, itemCode: null, name: "מוצר", brand: null, unit: null, price: 9.9, unitPrice: null, ...over,
});

test("first import: all products + prices are inserted, each with a history row", async () => {
  const { repo, tables } = makeRepo({ pc_products: [], pc_prices: [], pc_price_history: [] });
  const items = [
    price({ barcode: "7290000000001", name: "חלב", price: 5.9 }),
    price({ barcode: "7290000000002", name: "לחם", price: 7.5 }),
    price({ itemCode: "INT-3", name: "ירק", price: 3.2 }),
  ];
  const { ids, created: productsCreated } = await repo.upsertProductsBatch(items);
  assert.equal(productsCreated, 3);
  const rows = items.map((p) => ({ productId: ids.get(p.barcode || p.itemCode || `${p.name}|`)!, price: p.price, unitPrice: null, unit: null }));
  const created = await repo.upsertPricesBatch(42, rows);
  assert.equal(created, 3, "all three prices are new");
  assert.equal(tables.pc_products.length, 3);
  assert.equal(tables.pc_prices.length, 3);
  assert.equal(tables.pc_price_history.length, 3, "one history row per new price");
  // Correctness of tagging fields.
  for (const r of tables.pc_prices) {
    assert.equal(r.source, "import");
    assert.equal(r.source_type, "official_feed");
    assert.equal(r.on_sale, 0);
    assert.equal(r.currency, "ILS");
  }
  for (const r of tables.pc_products) assert.equal(r.active, 1);
});

test("re-import with no price changes: no new products, no new history rows", async () => {
  const { repo, tables } = makeRepo({
    pc_products: [{ id: 1, barcode: "7290000000001", item_code: null, name: "חלב" }],
    pc_prices: [{ id: 9, product_id: 1, store_id: 42, price: 5.9 }],
    pc_price_history: [],
  });
  const items = [price({ barcode: "7290000000001", name: "חלב", price: 5.9 })];
  const { ids, created } = await repo.upsertProductsBatch(items);
  assert.equal(created, 0, "existing product reused — nothing inserted");
  assert.equal(ids.get("7290000000001"), 1);
  const newPrices = await repo.upsertPricesBatch(42, [{ productId: 1, price: 5.9, unitPrice: null, unit: null }]);
  assert.equal(newPrices, 0, "price already existed → not counted as new");
  assert.equal(tables.pc_products.length, 1, "no duplicate product");
  assert.equal(tables.pc_prices.length, 1, "no duplicate price");
  assert.equal(tables.pc_price_history.length, 0, "unchanged price writes NO history");
});

test("re-import with a changed price: updates row + writes one history entry, no new price row", async () => {
  const { repo, tables } = makeRepo({
    pc_products: [{ id: 1, barcode: "7290000000001", item_code: null, name: "חלב" }],
    pc_prices: [{ id: 9, product_id: 1, store_id: 42, price: 5.9 }],
    pc_price_history: [],
  });
  await repo.upsertProductsBatch([price({ barcode: "7290000000001", name: "חלב", price: 6.5 })]);
  const created = await repo.upsertPricesBatch(42, [{ productId: 1, price: 6.5, unitPrice: null, unit: null }]);
  assert.equal(created, 0, "still the same price ROW, just updated");
  assert.equal(tables.pc_prices.length, 1);
  assert.equal(tables.pc_prices[0].price, 6.5, "price was updated in place");
  assert.equal(tables.pc_price_history.length, 1, "a changed price writes exactly one history row");
});

test("dedupe precedence: barcode wins, then item_code; duplicate keys collapse to one product", async () => {
  const { repo, tables } = makeRepo({
    pc_products: [{ id: 1, barcode: "7290000000001", item_code: "OLD", name: "חלב" }],
    pc_prices: [], pc_price_history: [],
  });
  const items = [
    price({ barcode: "7290000000001", name: "חלב גרסה א" }),     // matches existing by barcode
    price({ barcode: "7290000000001", name: "חלב גרסה ב" }),     // same key → collapses
    price({ itemCode: "OLD", name: "כפילות לפי item_code" }),     // matches existing by item_code
    price({ barcode: "7290000000099", name: "מוצר חדש" }),        // genuinely new
  ];
  const { ids, created } = await repo.upsertProductsBatch(items);
  assert.equal(created, 1, "only the genuinely-new barcode is inserted");
  assert.equal(ids.get("7290000000001"), 1, "existing product matched by barcode");
  assert.equal(ids.get("OLD"), 1, "existing product matched by item_code");
  assert.equal(tables.pc_products.length, 2, "started with 1, added exactly 1");
});

test("round-trip count stays small relative to row count (the whole point of batching)", async () => {
  const { repo, calls } = makeRepo({ pc_products: [], pc_prices: [], pc_price_history: [] });
  const N = 1000;
  const items: ParsedPrice[] = Array.from({ length: N }, (_, i) =>
    price({ barcode: `729000000${String(i).padStart(4, "0")}`, name: `מוצר ${i}`, price: i / 10 }));
  const { ids } = await repo.upsertProductsBatch(items);
  const rows = items.map((p) => ({ productId: ids.get(p.barcode!)!, price: p.price, unitPrice: null, unit: null }));
  await repo.upsertPricesBatch(42, rows);
  // The per-row path would have been ~3*N = 3000 calls. Batched: a few lookups
  // + inserts bounded by chunk sizes. Assert we are well under one call per row.
  assert.ok(calls.length < N / 5, `expected far fewer than ${N / 5} DB calls for ${N} rows, got ${calls.length}`);
});

test("listActiveFeeds returns every active feed regardless of verified, and excludes inactive", async () => {
  const { repo } = makeRepo({
    pc_feed_sources: [
      { id: 1, chain_name: "שופרסל", active: 1, verified: 1 },   // active + verified
      { id: 14, chain_name: "חצי חינם", active: 1, verified: 0 }, // active, NOT verified (the bug)
      { id: 30, chain_name: "ויקטורי", active: 1, verified: 0 },  // active, NOT verified
      { id: 99, chain_name: "ישן", active: 0, verified: 1 },      // verified but switched OFF
    ],
  });
  const feeds = await repo.listActiveFeeds();
  const ids = feeds.map((f) => f.id).sort((a, b) => a - b);
  assert.deepEqual(ids, [1, 14, 30], "all three ACTIVE feeds are enumerated, the inactive one is not");
  assert.ok(feeds.some((f) => f.id === 14 && !f.verified), "an active-but-unverified feed is included");
});

test("listAllFeeds returns the whole table including inactive feeds", async () => {
  const { repo } = makeRepo({
    pc_feed_sources: [
      { id: 1, chain_name: "שופרסל", active: 1, verified: 1 },
      { id: 99, chain_name: "ישן", active: 0, verified: 0 },
    ],
  });
  const feeds = await repo.listAllFeeds();
  assert.equal(feeds.length, 2, "include-unverified path sees inactive feeds too");
});

test("upsertStore inserts city from a Stores record (search-by-city source)", async () => {
  const { repo, tables } = makeRepo({ pc_stores: [] });
  await repo.upsertStore({ chainId: "7290058140886", storeCode: "1", name: "רמי לוי באקה", branch: "דרך חברון 101", city: "ירושלים" });
  assert.equal(tables.pc_stores.length, 1, "a new store row is inserted");
  assert.equal(tables.pc_stores[0].city, "ירושלים", "the parsed <City> is persisted to pc_stores.city");
});

test("upsertStore does NOT clobber an existing city with a null PriceFull update", async () => {
  // Reproduces the production bug: a Stores file sets the real city, then a
  // PriceFull import for the SAME store (different derived name → cache miss,
  // no City in its header → city=null) updated the row and nulled the city.
  const { repo, tables } = makeRepo({
    pc_stores: [{ id: 5, chain_id: "7290058140886", store_code: "1", name: "רמי לוי באקה", branch: "דרך חברון 101", city: "ירושלים", active: 1 }],
  });
  const id = await repo.upsertStore({ chainId: "7290058140886", storeCode: "1", name: "סניף 1", branch: null, city: null });
  assert.equal(id, 5, "matched the existing store by chain_id + store_code");
  assert.equal(tables.pc_stores[0].city, "ירושלים", "city is preserved, not wiped by the null PriceFull update");
  assert.equal(tables.pc_stores[0].name, "סניף 1", "name/branch still follow the latest file (unchanged behavior)");
});

test("upsertStore still updates city when a newer non-null value is provided", async () => {
  const { repo, tables } = makeRepo({
    pc_stores: [{ id: 7, chain_id: "7290027600007", store_code: "2", name: "שלי רמת אביב", branch: null, city: null, active: 1 }],
  });
  await repo.upsertStore({ chainId: "7290027600007", storeCode: "2", name: "שלי רמת אביב", branch: "אבן גבירול 30", city: "תל אביב" });
  assert.equal(tables.pc_stores[0].city, "תל אביב", "a real city from a Stores file fills a previously-null city");
});

test("dry-run never touches the DB", async () => {
  const fake = makeFakeClient({ pc_products: [], pc_prices: [], pc_price_history: [] });
  const repo = new PcSupabaseRepo("https://example.supabase.co", "service-key", true);
  (repo as unknown as { client: unknown }).client = fake.client;
  const { created } = await repo.upsertProductsBatch([price({ barcode: "7290000000001", name: "x" })]);
  assert.equal(created, 0);
  const newPrices = await repo.upsertPricesBatch(42, [{ productId: -1, price: 1, unitPrice: null, unit: null }]);
  assert.equal(newPrices, 0);
  assert.equal(fake.calls.length, 0, "dry-run issues zero DB calls");
});
