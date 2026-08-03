/**
 * Tests for the JSON-portal adapters (binaprojects, laibcatalog): the file-name
 * extraction, the tolerant JSON-shape parsing, and the shared price-first
 * selection that honours feed_kinds + max_files_per_run.
 *
 * Run with:  npx tsx --test script/pc/__tests__/json-adapters.test.ts
 *
 * The portals expose a flat JSON list of file records using the same chain
 * transparency naming as Cerberus, e.g.
 *   PriceFull7290058148776-319-202606301003.gz
 *   StoresFull7290058148776-000-202606301003.gz
 * Selection must spend a small budget on prices first (Stores → PriceFull →
 * PromoFull), keep only the newest snapshot per (kind, store branch), and never
 * pick non-transparency files (e.g. CompanyLogo.jpg).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { selectTransparencyFiles, parseFileRows, fileNameField } from "../adapters.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = readFileSync(join(here, "fixtures", "binaprojects-mainio.json"), "utf8");

test("parseFileRows accepts a bare JSON array and common wrapper keys", () => {
  assert.equal(parseFileRows("[1,2,3]")?.length, 3);
  assert.equal(parseFileRows('{"aaData":[{"FileNm":"x"}]}')?.length, 1);
  assert.equal(parseFileRows('{"data":[{}]}')?.length, 1);
  assert.equal(parseFileRows('{"files":[{},{}]}')?.length, 2);
  assert.equal(parseFileRows("not json"), null);
  assert.equal(parseFileRows('{"nope":1}'), null);
});

test("fileNameField reads FileNm / fname / name and trims", () => {
  assert.equal(fileNameField({ FileNm: "PriceFull1.gz" }), "PriceFull1.gz");
  assert.equal(fileNameField({ fname: "  Promo2.xml " }), "Promo2.xml");
  assert.equal(fileNameField({ name: "Stores3.gz" }), "Stores3.gz");
  assert.equal(fileNameField("PriceFull4.gz"), "PriceFull4.gz");
  assert.equal(fileNameField({ irrelevant: 1 }), null);
  assert.equal(fileNameField(null), null);
});

test("selection from the binaprojects fixture: price-first, newest per branch, no junk", () => {
  const rows = parseFileRows(fixture)!;
  const names = rows.map(fileNameField).filter((n): n is string => !!n);
  // CompanyLogo.jpg is present in the list but must never be selected.
  assert.ok(names.includes("CompanyLogo.jpg"));

  const sel = selectTransparencyFiles(names, "pricefull,promofull,stores", 5);
  // total counts only transparency files (7), not the .jpg.
  assert.equal(sel.total, 7);
  assert.ok(!sel.picked.some((n) => /\.jpg$/i.test(n)), "must not pick non-transparency files");

  // exactly one Stores file, prices favoured over promos.
  assert.equal(sel.counts.stores, 1);
  assert.ok(sel.counts.price >= 1);

  // newest snapshot per (kind, branch): the 0800 PriceFull for branch 319 is
  // superseded by the 1003 one, so only the latter is kept.
  assert.ok(sel.picked.includes("PriceFull7290058148776-319-202606301003.gz"));
  assert.ok(!sel.picked.includes("PriceFull7290058148776-319-202606300800.gz"));
});

test("Stores takes at most one slot even with a large budget", () => {
  const names = [
    "StoresFull7290058148776-000-202606301003.gz",
    "StoresFull7290058148776-000-202606300800.gz",
    "PriceFull7290058148776-319-202606301003.gz",
  ];
  const sel = selectTransparencyFiles(names, "pricefull,promofull,stores", 10);
  assert.equal(sel.counts.stores, 1, "only the newest single Stores file is kept");
});

test("a tiny max_files budget still reaches PriceFull (prices not starved)", () => {
  const rows = parseFileRows(fixture)!;
  const names = rows.map(fileNameField).filter((n): n is string => !!n);
  const sel = selectTransparencyFiles(names, "pricefull,promofull,stores", 2);
  assert.equal(sel.picked.length, 2);
  assert.ok(sel.counts.price >= 1, "at least one price file within a budget of 2");
});

test("selection is chain_id-agnostic: a feed's wrong chain_id does not drop files", () => {
  // Regression for the binaprojects "0 stores" bug (feed rows 28 & 29): the
  // per-chain subdomain lists files whose embedded chain_id is the REAL one,
  // which differed from the (mislabeled) pc_feed_sources.chain_id. The adapter
  // never filters discovery by feed.chain_id, so these files must still be
  // selected regardless of what the feed row claims. The importer then tags
  // rows with the chain_id from the file header, so correcting the DB row
  // (see deliverables/supabase_migration_pc_fix_binaprojects_chainid_*) is all
  // that is needed — no adapter code change.
  const realChainId = "7290058289400"; // KT Market, from the filenames
  const names = [
    `StoresFull${realChainId}-000-202607031003.gz`,
    `PriceFull${realChainId}-001-202607031003.gz`,
    `PromoFull${realChainId}-001-202607031006.gz`,
  ];
  // feed_kinds is the ONLY selection input besides names — chain_id is never
  // passed in, proving discovery/selection cannot be gated on a wrong chain_id.
  const sel = selectTransparencyFiles(names, "pricefull,promofull,stores", 5);
  assert.equal(sel.total, 3);
  assert.equal(sel.counts.stores, 1);
  assert.ok(sel.counts.price >= 1);
  assert.ok(sel.picked.includes(`PriceFull${realChainId}-001-202607031003.gz`));
});

test("feed_kinds filtering: stores-only request yields only Stores", () => {
  const rows = parseFileRows(fixture)!;
  const names = rows.map(fileNameField).filter((n): n is string => !!n);
  const sel = selectTransparencyFiles(names, "stores", 5);
  assert.equal(sel.counts.price, 0);
  assert.equal(sel.counts.promo, 0);
  assert.equal(sel.counts.stores, 1);
});
