/**
 * Tests for the Matrix/Nibit (matrixcatalog.co.il) and generic web (נתיב החסד)
 * discovery adapters added for the large missing chains.
 *
 * Run with:  npx tsx --test script/pc/__tests__/matrix-web-adapters.test.ts
 *
 * Both portals geo-block non-Israeli IPs, so they cannot be live-probed from
 * CI — we stub global fetch with a captured-shape HTML fixture and assert the
 * discovery result: chain filtering by chain_id, newest-per-branch selection,
 * the correct download URL pattern, and that non-transparency links (a logo,
 * an index link) are never selected.
 */
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  discoverMatrixCatalog,
  discoverGenericWeb,
  transparencyFileNames,
  type DiscoveryResult,
} from "../adapters.ts";
import type { FeedSourceRow } from "../supabase-repo.ts";

const here = dirname(fileURLToPath(import.meta.url));
const matrixHtml = readFileSync(join(here, "fixtures", "matrixcatalog-listing.html"), "utf8");
const netivHtml = readFileSync(join(here, "fixtures", "netiv-web-listing.html"), "utf8");

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

function stubFetch(body: string, status = 200): void {
  globalThis.fetch = (async () => new Response(body, { status })) as typeof fetch;
}

function makeFeed(partial: Partial<FeedSourceRow>): FeedSourceRow {
  return {
    id: 1, chain_name: "test", chain_id: null, source_url: null, source_type: "adapter",
    feed_format: "gz", feed_kinds: "pricefull,promofull,stores", source_kind: "regulatory",
    auth_user: null, notes: null, verified: 0, active: 1, adapter: null, direct_file_url: null,
    discovery_url: null, max_files_per_run: 10, last_status: null, last_run_at: null,
    last_message: null, last_error: null, last_success_at: null, ...partial,
  };
}

const urls = (r: DiscoveryResult) => r.files.map((f) => f.url);

// --- transparencyFileNames (pure) -----------------------------------------
test("transparencyFileNames pulls only transparency file names from the listing", () => {
  const names = transparencyFileNames(matrixHtml);
  assert.equal(names.length, 5, "5 transparency files, the .jpg excluded");
  assert.ok(!names.some((n) => /\.jpg$/i.test(n)));
  assert.ok(names.includes("PriceFull7290696200003-001-202607020800.gz"));
  assert.ok(names.includes("PriceFull7290661400001-014-202607020800.gz"));
});

// --- Matrix / Nibit adapter -----------------------------------------------
test("matrix adapter: filters to the chain, builds /latest/ URLs, newest per branch", async () => {
  stubFetch(matrixHtml);
  const feed = makeFeed({
    chain_name: "ויקטורי", chain_id: "7290696200003", adapter: "matrix",
    discovery_url: "http://matrixcatalog.co.il/NBCompetitionRegulations.aspx",
  });
  const res = await discoverMatrixCatalog(feed);
  assert.equal(res.skeleton, false);
  assert.ok(res.files.length >= 3, "at least stores + price + promo");
  // Every URL is the fixed /latest/ download path on the portal origin.
  for (const u of urls(res)) {
    assert.ok(
      u.startsWith("http://matrixcatalog.co.il/CompetitionRegulationsFiles/latest/"),
      `unexpected download URL: ${u}`,
    );
  }
  // Only Victory's files — never the Machsanei HaShuk row in the same page.
  assert.ok(!urls(res).some((u) => u.includes("7290661400001")), "must not pick another chain");
  // Newest snapshot per (kind, branch): the 0800 PriceFull wins over 0600.
  assert.ok(urls(res).some((u) => u.endsWith("PriceFull7290696200003-001-202607020800.gz")));
  assert.ok(!urls(res).some((u) => u.endsWith("PriceFull7290696200003-001-202607020600.gz")));
  // gz flag set from the extension; no non-transparency file selected.
  assert.ok(res.files.every((f) => (f.fileName!.endsWith(".gz") ? f.isGz : true)));
  assert.ok(!urls(res).some((u) => /\.jpg$/i.test(u)));
});

test("matrix adapter: unknown chain_id yields no files (honest, not skeleton)", async () => {
  stubFetch(matrixHtml);
  const feed = makeFeed({ chain_name: "לא קיים", chain_id: "9999999999999", adapter: "matrix",
    discovery_url: "http://matrixcatalog.co.il/NBCompetitionRegulations.aspx" });
  const res = await discoverMatrixCatalog(feed);
  assert.equal(res.files.length, 0);
  assert.equal(res.skeleton, false);
  assert.ok(res.notes.some((n) => n.includes("9999999999999")));
});

test("matrix adapter: derives chain_id from a ?code= query param", async () => {
  stubFetch(matrixHtml);
  const feed = makeFeed({ chain_name: "ויקטורי", chain_id: null, adapter: "matrix",
    discovery_url: "http://matrixcatalog.co.il/NBCompetitionRegulations.aspx?code=7290696200003" });
  const res = await discoverMatrixCatalog(feed);
  assert.ok(res.files.length >= 3);
  assert.ok(urls(res).every((u) => u.includes("7290696200003")));
});

test("matrix adapter: reports geo-block/network errors honestly (no crash)", async () => {
  globalThis.fetch = (async () => { throw new Error("fetch failed"); }) as typeof fetch;
  const feed = makeFeed({ chain_name: "ויקטורי", chain_id: "7290696200003", adapter: "matrix",
    discovery_url: "http://matrixcatalog.co.il/NBCompetitionRegulations.aspx" });
  const res = await discoverMatrixCatalog(feed);
  assert.equal(res.files.length, 0);
  assert.equal(res.skeleton, false);
  assert.ok(res.notes.some((n) => /geo-block|fetch failed/i.test(n)));
});

// --- Generic web adapter (נתיב החסד) --------------------------------------
test("web adapter: absolutizes hrefs to <base>/<file> and selects price-first", async () => {
  stubFetch(netivHtml);
  const feed = makeFeed({
    chain_name: "נתיב החסד", chain_id: "7290058160839", adapter: "web",
    discovery_url: "http://141.226.203.152/",
  });
  const res = await discoverGenericWeb(feed);
  assert.equal(res.skeleton, false);
  assert.ok(res.files.length >= 3);
  for (const u of urls(res)) {
    assert.ok(u.startsWith("http://141.226.203.152/"), `unexpected URL: ${u}`);
  }
  // newest PriceFull per branch (0900 over 0700), one Stores, includes promo.
  assert.ok(urls(res).some((u) => u.endsWith("PriceFull7290058160839-051-202607020900.gz")));
  assert.ok(!urls(res).some((u) => u.endsWith("PriceFull7290058160839-051-202607020700.gz")));
  assert.ok(urls(res).some((u) => /Stores7290058160839/.test(u)));
  // the non-transparency index.html link is never selected.
  assert.ok(!urls(res).some((u) => /index\.html$/i.test(u)));
});

test("web adapter: offline host reported honestly", async () => {
  stubFetch("", 503);
  const feed = makeFeed({ chain_name: "נתיב החסד", chain_id: "7290058160839", adapter: "web",
    discovery_url: "http://141.226.203.152/" });
  const res = await discoverGenericWeb(feed);
  assert.equal(res.files.length, 0);
  assert.equal(res.skeleton, false);
  assert.ok(res.notes.some((n) => n.includes("503")));
});
