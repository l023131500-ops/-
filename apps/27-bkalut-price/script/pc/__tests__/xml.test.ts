/**
 * Tests for the price-import XML parser + per-file kind resolution.
 *
 * Run with:  npx tsx --test script/pc/__tests__/xml.test.ts
 *
 * Fixtures are small, trimmed copies of the REAL Shufersal transparency schema
 * (captured from prices.shufersal.co.il): PriceFull uses <Root><Items><Item>
 * with <ChainID>/<StoreID> in the header; Stores uses the nested
 * <SubChains><SubChain><Stores><Store> shape; PromoFull uses <Promotions>.
 *
 * These lock in the fix for the bug where a multi-kind feed
 * (feed_kinds="Stores,PriceFull,PromoFull") forced kind=Stores onto every
 * downloaded file, so real PriceFull files parsed to 0 rows and the job
 * reported "0 rows, 0 errors".
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import { resolveKind, detectKind, parsePrices, parseStores, parsePromotions, maybeGunzip } from "../xml.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => fs.readFileSync(path.join(here, "fixtures", name), "utf8");

const MULTI = "Stores,PriceFull,PromoFull"; // exactly what feed_id=1 (Shufersal) declares

// --- maybeGunzip: real-world Cerberus container/encoding dialects ------------
// Build a minimal single-entry ZIP (PK\x03\x04 + DEFLATE) around an XML payload,
// matching the Cerberus “.gz that is really a zip” case.
function makeZip(name: string, payload: Buffer): Buffer {
  const body = zlib.deflateRawSync(payload);
  const nameBuf = Buffer.from(name, "utf8");
  const crc = zlib.crc32 ? zlib.crc32(payload) : 0; // crc value is not validated by our reader
  const lfh = Buffer.alloc(30);
  lfh.writeUInt32LE(0x04034b50, 0);
  lfh.writeUInt16LE(20, 4);          // version
  lfh.writeUInt16LE(0, 6);           // flags
  lfh.writeUInt16LE(8, 8);           // method = deflate
  lfh.writeUInt32LE(crc >>> 0, 14);  // crc32
  lfh.writeUInt32LE(body.length, 18);// compressed size
  lfh.writeUInt32LE(payload.length, 22); // uncompressed size
  lfh.writeUInt16LE(nameBuf.length, 26);
  lfh.writeUInt16LE(0, 28);
  return Buffer.concat([lfh, nameBuf, body]);
}

test("maybeGunzip unwraps a ZIP archive served with a .gz name (Cerberus dialect)", () => {
  const xml = "<Root><ChainId>7290058140886</ChainId><Items><Item><ItemCode>1</ItemCode></Item></Items></Root>";
  const zip = makeZip("PriceFull.xml", Buffer.from(xml, "utf8"));
  assert.equal(zip[0], 0x50); // PK magic
  const out = maybeGunzip(zip, true);
  assert.equal(out, xml);
});

test("maybeGunzip decodes a UTF-16LE (BOM) Stores file to readable UTF-8", () => {
  const xml = "<Root><ChainID>7290058140886</ChainID><ChainName>\u05e8\u05de\u05d9 \u05dc\u05d5\u05d9</ChainName></Root>";
  const u16 = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(xml, "utf16le")]);
  const out = maybeGunzip(u16, false);
  assert.equal(out, xml);
  assert.ok(out.includes("\u05e8\u05de\u05d9 \u05dc\u05d5\u05d9")); // Hebrew survives
  assert.ok(!out.includes("\u0000")); // no interleaved NULs
});

test("maybeGunzip handles a gzip-wrapped UTF-16LE payload", () => {
  const xml = "<Root><X>\u05d0</X></Root>";
  const u16 = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(xml, "utf16le")]);
  const gz = zlib.gzipSync(u16);
  const out = maybeGunzip(gz, true);
  assert.equal(out, xml);
});

test("resolveKind picks PriceFull for a real Shufersal PriceFull file even when the feed is multi-kind", () => {
  const xml = fixture("shufersal-pricefull.xml");
  assert.equal(resolveKind("PriceFull7290027600007-001-001-20260602-030000.gz", xml, MULTI), "PriceFull");
});

test("resolveKind picks Stores / PromoFull from their respective files", () => {
  assert.equal(resolveKind("StoresFull7290027600007-000.xml", fixture("shufersal-stores.xml"), MULTI), "Stores");
  assert.equal(resolveKind("PromoFull7290027600007-001.gz", fixture("shufersal-promofull.xml"), MULTI), "PromoFull");
});

test("regression: a multi-kind feed never forces the first declared kind onto a file", () => {
  // The old code did feed_kinds.split(",")[0] === "Stores" and forced it.
  // parseStores on a PriceFull file yields zero rows — the silent-no-op bug.
  const xml = fixture("shufersal-pricefull.xml");
  assert.equal(parseStores(xml).stores.length, 0, "PriceFull file has no <Store> records");
  // The fix routes it to PriceFull instead.
  assert.equal(resolveKind("PriceFull-x.gz", xml, MULTI), "PriceFull");
});

test("resolveKind falls back to feed_kinds only when detection is inconclusive AND the feed is single-kind", () => {
  const ambiguous = "<Root><Foo>1</Foo></Root>";
  assert.equal(detectKind("data.xml", ambiguous), "unknown");
  assert.equal(resolveKind("data.xml", ambiguous, "PriceFull"), "PriceFull");
  // A multi-kind feed has no unambiguous fallback → stays unknown (honest).
  assert.equal(resolveKind("data.xml", ambiguous, MULTI), "unknown");
  assert.equal(resolveKind("data.xml", ambiguous, null), "unknown");
});

test("parsePrices extracts product + price rows and the store header from a real Shufersal PriceFull file", () => {
  const { prices, header, storeName } = parsePrices(fixture("shufersal-pricefull.xml"));
  assert.equal(header.chainId, "7290027600007");
  assert.equal(header.storeCode, "001");
  assert.equal(storeName, "סניף 001");
  assert.equal(prices.length, 2);
  const first = prices[0];
  assert.equal(first.barcode, "11182700954");
  assert.equal(first.name, "שעועית שחורה 439 גרם");
  assert.equal(first.brand, "האנאובר פודס קורפורשיין");
  assert.equal(first.price, 11.5);
  assert.equal(first.unitPrice, 2.62);
});

test("parseStores reads the nested SubChain/Stores/Store shape", () => {
  const { stores } = parseStores(fixture("shufersal-stores.xml"));
  assert.equal(stores.length, 2);
  assert.equal(stores[0].chainId, "7290027600007");
  assert.equal(stores[0].storeCode, "1");
  assert.equal(stores[0].name, "שלי TLV יגאל אלון");
  assert.equal(stores[0].city, "תל אביב");
});

test("parseStores maps a real <City> and nulls numeric/zip placeholders (Cerberus)", () => {
  // Cerberus Stores feeds often put a numeric placeholder in <City> (e.g.
  // <City>0</City>) while a separate <ZipCode> holds the real postal code.
  // The Hebrew city must win; the numeric placeholder must become null — never
  // the zip code or the "0".
  const { stores } = parseStores(fixture("cerberus-stores.xml"));
  assert.equal(stores.length, 2);
  assert.equal(stores[0].storeCode, "1");
  assert.equal(stores[0].city, "ירושלים", "real Hebrew city, not the 5000 zip");
  assert.equal(stores[1].storeCode, "2");
  assert.equal(stores[1].city, null, "numeric <City>0</City> must be nulled, not stored");
});

test("parsePromotions reads PromotionDescription + dates", () => {
  const { promotions } = parsePromotions(fixture("shufersal-promofull.xml"));
  assert.equal(promotions.length, 2);
  assert.equal(promotions[0].title, '2 ב-10 ש"ח');
  assert.equal(promotions[0].startsAt, "2026-06-01");
  assert.equal(promotions[0].endsAt, "2026-06-30");
});
