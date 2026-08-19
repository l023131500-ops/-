/**
 * Exercises the barcode-keyed read layer added for the live price-comparison
 * site, against an in-memory copy of the real module schema:
 *   - catalogSearch: chain count, cheapest price, spread %, regulatory/voluntary
 *     kinds, the minChains filter and the kind filter
 *   - comparisonByBarcode: offers sorted cheapest→dearest, cheapest flagged,
 *     regulatory vs voluntary split
 *   - dataHealth: catalog coverage + cross-chain depth (2+/3+/4+ chains)
 *
 * Seed data is sample-flagged, so the default (non-sample) reads only see the
 * rows created here.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import {
  bindPriceComparisonDb,
  createFeedSource,
  createStore,
  createProduct,
  createPrice,
  catalogSearch,
  comparisonByBarcode,
  dataHealth,
} from "../../../server/price-comparison";

const BARCODE = "7290000099991";

function seedThreeChains(db: Database.Database) {
  bindPriceComparisonDb(db);
  // Two regulatory chains + one voluntary chain, each with a matching chain_id.
  createFeedSource({ chainName: "רמי לוי", chainId: "7290058140886", sourceKind: "regulatory" });
  createFeedSource({ chainName: "שופרסל", chainId: "7290027600007", sourceKind: "regulatory" });
  createFeedSource({ chainName: "יוחננוף", chainId: "7290103152017", sourceKind: "voluntary" });

  const s1 = createStore({ name: "רמי לוי ירושלים", city: "ירושלים", chainId: "7290058140886" });
  const s2 = createStore({ name: "שופרסל בני ברק", city: "בני ברק", chainId: "7290027600007" });
  const s3 = createStore({ name: "יוחננוף מודיעין", city: "מודיעין", chainId: "7290103152017" });

  const p = createProduct({ name: "חלב 3% תנובה", brand: "תנובה", unit: "1 ליטר", barcode: BARCODE });
  createPrice({ productId: p.id, storeId: s1.id, price: 6.5 }); // cheapest
  createPrice({ productId: p.id, storeId: s2.id, price: 7.2 });
  createPrice({ productId: p.id, storeId: s3.id, price: 8.0 }); // dearest (voluntary)
  return { productId: p.id, s1, s2, s3 };
}

test("catalogSearch reports chain count, cheapest, spread % and kinds", () => {
  const db = new Database(":memory:");
  seedThreeChains(db);

  const rows = catalogSearch({ search: "חלב" });
  const row = rows.find((r) => r.product.barcode === BARCODE);
  assert.ok(row, "product found by name");
  assert.equal(row!.chainCount, 3, "carried by 3 distinct chains");
  assert.equal(row!.cheapestPrice, 6.5);
  assert.equal(row!.cheapestStore, "רמי לוי ירושלים");
  assert.equal(row!.dearestPrice, 8.0);
  // spread % = (8.0 - 6.5) / 6.5 * 100 ≈ 23.1
  assert.equal(row!.spreadPct, 23.1);
  assert.deepEqual([...row!.kinds].sort(), ["regulatory", "voluntary"]);

  db.close();
});

test("catalogSearch minChains filter drops shallow products", () => {
  const db = new Database(":memory:");
  seedThreeChains(db);

  assert.equal(catalogSearch({ minChains: 3 }).some((r) => r.product.barcode === BARCODE), true);
  assert.equal(catalogSearch({ minChains: 4 }).some((r) => r.product.barcode === BARCODE), false);

  db.close();
});

test("catalogSearch kind filter keeps regulatory and voluntary as distinct paths", () => {
  const db = new Database(":memory:");
  seedThreeChains(db);

  const reg = catalogSearch({ kind: "regulatory" }).find((r) => r.product.barcode === BARCODE)!;
  assert.equal(reg.offers.length, 2, "two regulatory offers");
  assert.ok(reg.offers.every((o) => o.chainKind === "regulatory"));

  const vol = catalogSearch({ kind: "voluntary" }).find((r) => r.product.barcode === BARCODE)!;
  assert.equal(vol.offers.length, 1, "one voluntary offer");
  assert.equal(vol.offers[0].price, 8.0);

  db.close();
});

test("comparisonByBarcode sorts cheapest→dearest, flags cheapest, splits by kind", () => {
  const db = new Database(":memory:");
  seedThreeChains(db);

  const cmp = comparisonByBarcode(BARCODE);
  assert.ok(cmp, "comparison found");
  assert.equal(cmp!.chainCount, 3);
  assert.equal(cmp!.offers[0].price, 6.5);
  assert.equal(cmp!.offers[0].isCheapest, true);
  assert.equal(cmp!.offers[cmp!.offers.length - 1].price, 8.0);
  assert.ok(cmp!.offers.slice(1).every((o) => o.isCheapest === false), "only one cheapest");
  assert.equal(cmp!.regulatory.length, 2);
  assert.equal(cmp!.voluntary.length, 1);

  assert.equal(comparisonByBarcode("0000000000000"), undefined, "unknown barcode → undefined");

  db.close();
});

test("dataHealth counts coverage and cross-chain depth", () => {
  const db = new Database(":memory:");
  seedThreeChains(db);
  // A second product carried by only one chain — should NOT count toward 2+.
  const lonely = createProduct({ name: "מוצר בודד", barcode: "7290000088882" });
  const onlyStore = createStore({ name: "חנות בודדה", chainId: "9999999999999" });
  createPrice({ productId: lonely.id, storeId: onlyStore.id, price: 10 });

  const h = dataHealth();
  assert.equal(h.products, 2);
  assert.equal(h.withBarcode, 2);
  assert.equal(h.uniqueBarcodes, 2);
  assert.equal(h.inChains2Plus, 1, "only the 3-chain product reaches 2+");
  assert.equal(h.inChains3Plus, 1);
  assert.equal(h.inChains4Plus, 0);
  // The module seeds a registry of known (regulatory) chains, so assert our
  // two regulatory feeds are counted on top of whatever was seeded, while the
  // single voluntary feed we added is the only one of its kind.
  assert.ok(h.regulatoryChains >= 2, "at least our two regulatory feeds counted");
  assert.equal(h.voluntaryChains, 1);

  db.close();
});
