/**
 * Tests for the three large-chain HTML adapters added to replace the skeletons:
 *   - super-pharm (prices.super-pharm.co.il — paginated HTML table, handler hrefs)
 *   - wolt        (wm-gateway.wolt.com/isr-prices — date index → per-date file list)
 *   - publishprice (generic U-CODE grid, e.g. prices.quik.co.il — קוויק)
 *
 * Run with:  npx tsx --test script/pc/__tests__/big-adapters.test.ts
 *
 * super-pharm sits behind an anti-bot JS wall and publishprice/quik may not
 * resolve outside Israel, so neither can be live-probed from CI — we stub global
 * fetch with captured-shape HTML fixtures and assert: the download URL pattern
 * discovered, chain filtering, newest-per-branch price-first selection, that
 * non-transparency links (a logo) are never selected, and honest no-crash
 * behaviour on HTTP/network failure. Wolt IS reachable from CI; its two-level
 * date→files walk is still fixture-tested for determinism.
 */
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  discoverSuperPharm,
  discoverWolt,
  discoverPublishPrice,
  nameToUrlFromListing,
  type DiscoveryResult,
} from "../adapters.ts";
import type { FeedSourceRow } from "../supabase-repo.ts";

const here = dirname(fileURLToPath(import.meta.url));
const superPharmHtml = readFileSync(join(here, "fixtures", "super-pharm-listing.html"), "utf8");
const woltIndexHtml = readFileSync(join(here, "fixtures", "wolt-index.html"), "utf8");
const woltDateHtml = readFileSync(join(here, "fixtures", "wolt-date.html"), "utf8");
const publishPriceHtml = readFileSync(join(here, "fixtures", "publishprice-listing.html"), "utf8");

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

function stubFetch(body: string, status = 200): void {
  globalThis.fetch = (async () => new Response(body, { status })) as typeof fetch;
}

/** Route the stub by URL so the two-level wolt walk returns the right page. */
function stubFetchByUrl(router: (url: string) => { body: string; status?: number }): void {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    const { body, status = 200 } = router(url);
    return new Response(body, { status });
  }) as typeof fetch;
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

// --- nameToUrlFromListing (pure) ------------------------------------------
test("nameToUrlFromListing resolves the file name from inside a handler href", () => {
  const map = nameToUrlFromListing(superPharmHtml, "http://prices.super-pharm.co.il/");
  // key is the transparency name found inside ?fileName=..., value the full URL.
  assert.ok(map.has("PriceFull7290172900007-152-202607030800.gz"));
  assert.equal(
    map.get("PriceFull7290172900007-152-202607030800.gz"),
    "http://prices.super-pharm.co.il/Download.aspx?fileName=PriceFull7290172900007-152-202607030800.gz",
  );
  // the logo image is not a transparency file → never mapped.
  assert.ok(!Array.from(map.keys()).some((n) => /\.jpg$/i.test(n)));
});

test("nameToUrlFromListing absolutizes relative wolt paths against the date page", () => {
  const base = "https://wm-gateway.wolt.com/isr-prices/public/v1/2026-07-03.html";
  const map = nameToUrlFromListing(woltDateHtml, base);
  assert.equal(
    map.get("Stores7290058249350-000-20260703-000013.gz"),
    "https://wm-gateway.wolt.com/isr-prices/public/v1/download/2026-07-03/Stores7290058249350-000-20260703-000013.gz",
  );
});

// --- super-pharm ----------------------------------------------------------
test("super-pharm: filters to the chain, resolves handler URLs, newest per branch", async () => {
  stubFetch(superPharmHtml);
  const feed = makeFeed({
    chain_name: "סופר פארם", chain_id: "7290172900007", adapter: "super-pharm",
    discovery_url: "http://prices.super-pharm.co.il/",
  });
  const res = await discoverSuperPharm(feed);
  assert.equal(res.skeleton, false);
  assert.ok(res.files.length >= 3, "at least stores + price + promo");
  // Only Super-Pharm's chain id — never the foreign chain on the same page.
  assert.ok(!urls(res).some((u) => u.includes("7290111111119")), "must not pick another chain");
  // Newest snapshot per (kind, branch): 0800 PriceFull wins over 0600.
  assert.ok(urls(res).some((u) => u.includes("PriceFull7290172900007-152-202607030800.gz")));
  assert.ok(!urls(res).some((u) => u.includes("PriceFull7290172900007-152-202607030600.gz")));
  // Download goes through the handler URL the page actually linked.
  assert.ok(urls(res).every((u) => u.includes("/Download.aspx?fileName=")));
  // The logo is never selected.
  assert.ok(!urls(res).some((u) => /\.jpg$/i.test(u)));
});

test("super-pharm: HTTP failure (anti-bot/geo) reported honestly, no crash", async () => {
  stubFetch("", 403);
  const feed = makeFeed({ chain_name: "סופר פארם", chain_id: "7290172900007", adapter: "super-pharm",
    discovery_url: "http://prices.super-pharm.co.il/" });
  const res = await discoverSuperPharm(feed);
  assert.equal(res.files.length, 0);
  assert.equal(res.skeleton, false);
  assert.ok(res.notes.some((n) => n.includes("403")));
});

test("super-pharm: network error reported honestly, no crash", async () => {
  globalThis.fetch = (async () => { throw new Error("fetch failed"); }) as typeof fetch;
  const feed = makeFeed({ chain_name: "סופר פארם", chain_id: "7290172900007", adapter: "super-pharm",
    discovery_url: "http://prices.super-pharm.co.il/" });
  const res = await discoverSuperPharm(feed);
  assert.equal(res.files.length, 0);
  assert.equal(res.skeleton, false);
  assert.ok(res.notes.some((n) => /geo-block|fetch failed/i.test(n)));
});

// --- wolt -----------------------------------------------------------------
test("wolt: picks the latest date, builds /download/<date>/ URLs, price-first", async () => {
  stubFetchByUrl((url) =>
    url.includes("index.html") ? { body: woltIndexHtml } : { body: woltDateHtml });
  const feed = makeFeed({
    chain_name: "וולט", chain_id: "7290058249350", adapter: "wolt",
    discovery_url: "https://wm-gateway.wolt.com/isr-prices/public/v1/index.html",
  });
  const res = await discoverWolt(feed);
  assert.equal(res.skeleton, false);
  assert.ok(res.files.length >= 3, "stores + price + promo");
  // Latest date (2026-07-03) resolved into the download sub-path.
  for (const u of urls(res)) {
    assert.ok(
      u.startsWith("https://wm-gateway.wolt.com/isr-prices/public/v1/download/2026-07-03/"),
      `unexpected URL: ${u}`,
    );
  }
  // Newest PriceFull per branch (000900 over 000055) for branch 043.
  assert.ok(urls(res).some((u) => u.endsWith("PriceFull7290058249350-000-043-20260703-000900.gz")));
  assert.ok(!urls(res).some((u) => u.endsWith("PriceFull7290058249350-000-043-20260703-000055.gz")));
  assert.ok(urls(res).some((u) => /Stores7290058249350/.test(u)));
  assert.ok(res.files.every((f) => f.isGz));
});

test("wolt: empty index reported honestly", async () => {
  stubFetch("<html><body><h1>Dates</h1></body></html>");
  const feed = makeFeed({ chain_name: "וולט", chain_id: "7290058249350", adapter: "wolt",
    discovery_url: "https://wm-gateway.wolt.com/isr-prices/public/v1/index.html" });
  const res = await discoverWolt(feed);
  assert.equal(res.files.length, 0);
  assert.equal(res.skeleton, false);
  assert.ok(res.notes.some((n) => n.includes("תאריכים")));
});

test("wolt: index HTTP error reported honestly, no crash", async () => {
  stubFetch("", 503);
  const feed = makeFeed({ chain_name: "וולט", chain_id: "7290058249350", adapter: "wolt",
    discovery_url: "https://wm-gateway.wolt.com/isr-prices/public/v1/index.html" });
  const res = await discoverWolt(feed);
  assert.equal(res.files.length, 0);
  assert.ok(res.notes.some((n) => n.includes("503")));
});

// --- publishprice (generic / קוויק) ---------------------------------------
test("publishprice: generic grid → PublishedFiles URLs, newest per branch, price-first", async () => {
  stubFetch(publishPriceHtml);
  const feed = makeFeed({
    chain_name: "קוויק", chain_id: "7291029710008", adapter: "publishprice",
    discovery_url: "https://prices.quik.co.il/",
  });
  const res = await discoverPublishPrice(feed);
  assert.equal(res.skeleton, false);
  assert.ok(res.files.length >= 3);
  for (const u of urls(res)) {
    assert.ok(u.startsWith("https://prices.quik.co.il/PublishedFiles/"), `unexpected URL: ${u}`);
  }
  // Newest per (kind, branch): 0700 PriceFull for branch 001 beats 0500.
  assert.ok(urls(res).some((u) => u.endsWith("PriceFull7291029710008-001-202607030700.gz")));
  assert.ok(!urls(res).some((u) => u.endsWith("PriceFull7291029710008-001-202607030500.gz")));
  assert.ok(urls(res).some((u) => /Stores7291029710008/.test(u)));
});

test("publishprice: missing discovery_url reported honestly (no crash)", async () => {
  const feed = makeFeed({ chain_name: "קוויק", chain_id: "7291029710008", adapter: "publishprice",
    discovery_url: null, source_url: null });
  const res = await discoverPublishPrice(feed);
  assert.equal(res.files.length, 0);
  assert.ok(res.notes.some((n) => n.includes("discovery_url")));
});

test("publishprice: HTTP error reported honestly, no crash", async () => {
  stubFetch("", 404);
  const feed = makeFeed({ chain_name: "קוויק", chain_id: "7291029710008", adapter: "publishprice",
    discovery_url: "https://prices.quik.co.il/" });
  const res = await discoverPublishPrice(feed);
  assert.equal(res.files.length, 0);
  assert.equal(res.skeleton, false);
  assert.ok(res.notes.some((n) => n.includes("404")));
});
