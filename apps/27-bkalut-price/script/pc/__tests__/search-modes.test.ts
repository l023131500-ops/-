/**
 * Regression tests for the four public search modes the live site must support:
 * product NAME, BARCODE, CITY (pc_stores.city) and STORE (name/branch), plus a
 * multi-chain comparison. The key invariant guarded here is that location/store
 * filters narrow the candidate products BEFORE the product LIMIT — so a matching
 * offer is never hidden just because unrelated products sort ahead of it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import {
  bindPriceComparisonDb, createFeedSource, createStore, createProduct, createPrice,
  publicSearch, catalogSearch, comparisonByBarcode,
} from "../../../server/price-comparison";

const MILK = "7290000000001";
const COKE = "7290000000002";

function seed(db: Database.Database) {
  bindPriceComparisonDb(db);
  const chains: Array<[string, string]> = [
    ["רמי לוי", "111"], ["שופרסל", "222"], ["יוחננוף", "333"], ["ויקטורי", "444"],
  ];
  for (const [n, id] of chains) createFeedSource({ chainName: n, chainId: id, sourceKind: "regulatory" });
  const cities = ["חיפה", "תל אביב", "ירושלים", "באר שבע"];
  const stores = chains.map(([n, id], i) =>
    createStore({ name: `${n} ${cities[i]}`, branch: `סניף ${cities[i]}`, city: cities[i], chainId: id }));

  const milk = createProduct({ name: "חלב 3% תנובה", brand: "תנובה", unit: "1 ליטר", barcode: MILK });
  [6.5, 7.2, 6.9, 7.5].forEach((p, i) => createPrice({ productId: milk.id, storeId: stores[i].id, price: p }));
  const coke = createProduct({ name: "קוקה קולה 1.5 ליטר", brand: "קוקה קולה", barcode: COKE });
  createPrice({ productId: coke.id, storeId: stores[0].id, price: 8 });   // חיפה
  createPrice({ productId: coke.id, storeId: stores[1].id, price: 8.5 }); // תל אביב

  // Bury the real matches: 1200 filler products that sort BEFORE (Hebrew "אאא"),
  // all with an offer only in תל אביב — none in חיפה.
  for (let i = 0; i < 1200; i++) {
    const pr = createProduct({ name: `אאא מוצר ${String(i).padStart(4, "0")}`, barcode: `999${String(i).padStart(7, "0")}` });
    createPrice({ productId: pr.id, storeId: stores[1].id, price: 5 });
  }
  return { stores };
}

test("NAME search matches a Hebrew substring", () => {
  const db = new Database(":memory:"); seed(db);
  const rows = catalogSearch({ search: "חלב" });
  assert.ok(rows.some((r) => r.product.barcode === MILK), "milk found by name substring");
  db.close();
});

test("BARCODE search matches exactly and via substring", () => {
  const db = new Database(":memory:"); seed(db);
  assert.equal(catalogSearch({ barcode: COKE })[0]?.product.barcode, COKE, "exact barcode");
  assert.ok(catalogSearch({ search: MILK }).some((r) => r.product.barcode === MILK), "barcode via q substring");
  db.close();
});

test("CITY search is not truncated by products that sort ahead but don't match", () => {
  const db = new Database(":memory:"); seed(db);
  // חיפה has exactly milk + coke; 1200 filler products (all תל אביב) sort first.
  // Before the fix this returned 0 because the LIMIT stopped at the filler.
  const rows = catalogSearch({ city: "חיפה" });
  assert.equal(rows.length, 2, "only the two products carried in חיפה");
  assert.ok(rows.some((r) => r.product.barcode === MILK));
  assert.ok(rows.every((r) => r.offers.every((o) => o.city === "חיפה")), "offers restricted to city");
  // publicSearch (the /search/advanced + automation path) must agree.
  assert.ok(publicSearch({ city: "חיפה" }).some((r) => r.product.barcode === MILK));
  db.close();
});

test("STORE search by id restricts offers to that store", () => {
  const db = new Database(":memory:"); const { stores } = seed(db);
  const rows = catalogSearch({ storeId: stores[0].id }); // רמי לוי חיפה: milk + coke
  assert.equal(rows.length, 2);
  assert.ok(rows.every((r) => r.offers.every((o) => o.storeId === stores[0].id)));
  db.close();
});

test("STORE search by name/branch substring works", () => {
  const db = new Database(":memory:"); seed(db);
  const rows = catalogSearch({ storeName: "ויקטורי" }); // only carries milk
  assert.equal(rows.length, 1);
  assert.equal(rows[0].product.barcode, MILK);
  assert.ok(rows[0].offers.every((o) => o.storeName.includes("ויקטורי")));
  // branch substring also matches
  assert.ok(catalogSearch({ storeName: "סניף חיפה" }).length >= 1, "branch substring matches");
  db.close();
});

test("multi-chain comparison joins all chains on the barcode master key", () => {
  const db = new Database(":memory:"); seed(db);
  const cmp = comparisonByBarcode(MILK);
  assert.ok(cmp, "comparison found");
  assert.equal(cmp!.chainCount, 4, "milk carried by all four chains");
  assert.equal(cmp!.cheapestPrice, 6.5);
  assert.equal(cmp!.offers[0].isCheapest, true);
  assert.deepEqual(cmp!.offers.map((o) => o.price), [6.5, 6.9, 7.2, 7.5], "cheapest→dearest");
  db.close();
});
