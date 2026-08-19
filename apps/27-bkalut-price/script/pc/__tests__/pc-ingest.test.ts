/**
 * Tests for the Step-3 ingestion parser + idempotent upsert orchestrator
 * (server/pc-ingest.ts):
 *   - parseDocument across the three input shapes the ingest API accepts:
 *     Israeli price-transparency XML (<Item> with ItemCode/ItemName/ItemPrice),
 *     JSON (array of items), and tabular CSV (barcode/product_name/.../price).
 *   - ingestBuffer wiring into the pc_* tables, against an in-memory DB.
 *   - idempotency: re-ingesting the same file creates no new prices (the second
 *     pass is all updates), and the barcode stays carried by exactly one chain.
 *   - voluntary tagging: a voluntary-kind ingest lands on the voluntary track.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import zlib from "node:zlib";
import {
  bindPriceComparisonDb,
  comparisonByBarcode,
} from "../../../server/price-comparison";
import {
  parseDocument,
  sniffFormat,
  ingestBuffer,
} from "../../../server/pc-ingest";

const BARCODE = "7290000099991";

const PRICE_XML = `<?xml version="1.0" encoding="utf-8"?>
<Root>
  <ChainId>7290058140886</ChainId>
  <StoreId>001</StoreId>
  <StoreName>רמי לוי ירושלים</StoreName>
  <Items>
    <Item>
      <ItemCode>${BARCODE}</ItemCode>
      <ItemName>חלב 3% תנובה</ItemName>
      <ManufacturerName>תנובה</ManufacturerName>
      <UnitQty>1 ליטר</UnitQty>
      <ItemPrice>6.50</ItemPrice>
    </Item>
    <Item>
      <ItemCode>7290000099992</ItemCode>
      <ItemName>לחם אחיד</ItemName>
      <ManufacturerName>אנגל</ManufacturerName>
      <UnitQty>750 גרם</UnitQty>
      <ItemPrice>5.90</ItemPrice>
    </Item>
  </Items>
</Root>`;

const PRICE_JSON = JSON.stringify({
  ChainId: "7290027600007",
  StoreId: "044",
  StoreName: "שופרסל בני ברק",
  Items: [
    { ItemCode: BARCODE, ItemName: "חלב 3% תנובה", ManufacturerName: "תנובה", UnitQty: "1 ליטר", ItemPrice: 7.2 },
  ],
});

const PRICE_CSV = `barcode,product_name,brand,unit,price
${BARCODE},חלב 3% תנובה,תנובה,1 ליטר,8.00
7290000099993,ביצים L,משק,12 יח',14.90
`;

// --- format sniffing ---------------------------------------------------------

test("sniffFormat detects xml, json and csv", () => {
  assert.equal(sniffFormat(Buffer.from(PRICE_XML, "utf8")), "xml");
  assert.equal(sniffFormat(Buffer.from(PRICE_JSON, "utf8")), "json");
  assert.equal(sniffFormat(Buffer.from(PRICE_CSV, "utf8")), "csv");
});

test("sniffFormat sees through gzip to the inner XML", () => {
  const gz = zlib.gzipSync(Buffer.from(PRICE_XML, "utf8"));
  // After decompression parseDocument should treat it as XML.
  const doc = parseDocument(gz);
  assert.equal(doc.format, "xml");
  assert.equal(doc.items.length, 2);
});

// --- parsing each shape ------------------------------------------------------

test("parseDocument maps the transparency XML schema (ItemCode→barcode)", () => {
  const doc = parseDocument(Buffer.from(PRICE_XML, "utf8"));
  assert.equal(doc.format, "xml");
  assert.equal(doc.header.chainId, "7290058140886");
  const milk = doc.items.find((i) => i.barcode === BARCODE);
  assert.ok(milk, "milk item parsed by barcode");
  assert.equal(milk!.name, "חלב 3% תנובה");
  assert.equal(milk!.brand, "תנובה");
  assert.equal(milk!.price, 6.5);
});

test("parseDocument maps a JSON items array", () => {
  const doc = parseDocument(Buffer.from(PRICE_JSON, "utf8"));
  assert.equal(doc.format, "json");
  assert.equal(doc.items.length, 1);
  assert.equal(doc.items[0].barcode, BARCODE);
  assert.equal(doc.items[0].price, 7.2);
});

test("parseDocument maps CSV columns to items", () => {
  const doc = parseDocument(Buffer.from(PRICE_CSV, "utf8"));
  assert.equal(doc.format, "csv");
  assert.equal(doc.items.length, 2);
  const milk = doc.items.find((i) => i.barcode === BARCODE);
  assert.ok(milk);
  assert.equal(milk!.name, "חלב 3% תנובה");
  assert.equal(milk!.price, 8.0);
});

// --- ingest into the tables --------------------------------------------------

test("ingestBuffer upserts products + prices into pc_*", () => {
  const db = new Database(":memory:");
  bindPriceComparisonDb(db);

  const r = ingestBuffer(Buffer.from(PRICE_XML, "utf8"), { sourceKind: "regulatory", chainId: "7290058140886", chainName: "רמי לוי" });
  assert.equal(r.errors, 0);
  assert.equal(r.productsUpserted, 2);
  assert.equal(r.pricesCreated, 2);

  const cmp = comparisonByBarcode(BARCODE);
  assert.ok(cmp, "comparison row exists for the barcode");
  assert.equal(cmp!.offers.length, 1);
  assert.equal(cmp!.offers[0].price, 6.5);
  db.close();
});

test("re-ingesting the same file is idempotent (no duplicate prices/chains)", () => {
  const db = new Database(":memory:");
  bindPriceComparisonDb(db);

  const first = ingestBuffer(Buffer.from(PRICE_XML, "utf8"), { sourceKind: "regulatory", chainId: "7290058140886", chainName: "רמי לוי" });
  assert.equal(first.pricesCreated, 2);

  const second = ingestBuffer(Buffer.from(PRICE_XML, "utf8"), { sourceKind: "regulatory", chainId: "7290058140886", chainName: "רמי לוי" });
  assert.equal(second.pricesCreated, 0, "no new prices on re-ingest");
  assert.equal(second.pricesUpdated, 2, "existing prices updated in place");

  const cmp = comparisonByBarcode(BARCODE);
  assert.equal(cmp!.offers.length, 1, "still a single offer for the barcode");
  db.close();
});

test("voluntary ingest lands on the voluntary track", () => {
  const db = new Database(":memory:");
  bindPriceComparisonDb(db);

  ingestBuffer(Buffer.from(PRICE_CSV, "utf8"), { sourceKind: "voluntary", chainId: "vol-test-chain", chainName: "מכולת הניסוי" });
  const cmp = comparisonByBarcode(BARCODE);
  assert.ok(cmp, "barcode present");
  assert.equal(cmp!.offers.length, 1);
  assert.equal(cmp!.offers[0].chainKind, "voluntary", "tagged voluntary");
  assert.equal(cmp!.voluntary.length, 1, "appears on the voluntary list");
  db.close();
});
