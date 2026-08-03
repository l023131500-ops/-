/**
 * Tests for Shufersal discovery category ordering.
 *
 * Run with:  npx tsx --test script/pc/__tests__/adapters.test.ts
 *
 * These lock in the fix for the bug where feed_id=1 with
 * feed_kinds="Stores,PriceFull,PromoFull" and a small max_files budget spent its
 * whole budget on the Stores category (catID=5) first — which is routinely empty
 * or tiny — and never reached PriceFull (catID=2), so the daily run imported 0
 * prices and reported status=error. Discovery must try PriceFull FIRST,
 * regardless of how feed_kinds is ordered in the DB row.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { shufersalCategoriesFor } from "../adapters.ts";

const MULTI = "Stores,PriceFull,PromoFull"; // exactly what feed_id=1 (Shufersal) declares

test("PriceFull categories come before PromoFull and Stores regardless of feed_kinds order", () => {
  // catID map: 1=Prices 2=PricesFull 3=Promos 4=PromosFull 5=Stores.
  // Price-first priority → [2,1, 4,3, 5].
  assert.deepEqual(shufersalCategoriesFor(MULTI), [2, 1, 4, 3, 5]);
});

test("a small max_files budget hits PriceFull (cat 2) before Stores (cat 5)", () => {
  const cats = shufersalCategoriesFor(MULTI);
  assert.equal(cats[0], 2, "the very first category queried must be PricesFull");
  assert.ok(cats.indexOf(2) < cats.indexOf(5), "PriceFull must be tried before Stores");
});

test("declaration order in feed_kinds does not change the price-first order", () => {
  assert.deepEqual(shufersalCategoriesFor("PromoFull,Stores,PriceFull"), [2, 1, 4, 3, 5]);
  assert.deepEqual(shufersalCategoriesFor("Stores"), [5]);
  assert.deepEqual(shufersalCategoriesFor("PriceFull"), [2, 1]);
});

test("unknown / empty feed_kinds defaults to price data (PricesFull, then Prices)", () => {
  assert.deepEqual(shufersalCategoriesFor(null), [2, 1]);
  assert.deepEqual(shufersalCategoriesFor(""), [2, 1]);
  assert.deepEqual(shufersalCategoriesFor("Bogus,Stuff"), [2, 1]);
});
