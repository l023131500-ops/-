/**
 * Price Comparison — Supabase (Postgres) read path.
 *
 * Async, read-only replicas of the PUBLIC read functions in
 * `./price-comparison.ts`. When SUPABASE_URL + an anon/publishable key are set,
 * the public `/api/pc/public/*` endpoints read LIVE from Supabase through here
 * instead of the synchronous local SQLite mirror. Response shapes are byte-for-
 * byte identical to the SQLite versions (same mappers, same best/cheapest/
 * chain-count/spread/kind logic, same is_sample + track gating) so the client
 * (client/src/pages/public-price-comparison.tsx) needs no changes.
 *
 * Only SELECTs happen here. `logSearchRequest` is a best-effort no-op because the
 * anon role cannot write pc_search_requests.
 *
 * PostgREST caps each response at 1000 rows; every multi-row read paginates with
 * `.range()`, and price reads are always scoped to a pre-filtered set of product
 * ids (batched `.in('product_id', …)`) — we never pull all ~1.23M prices.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import WebSocketImpl from "ws";
import type {
  PcCategory, PcStore, PcProduct, PcPrice, PcPromotion,
  PcSearchFilters, PcSearchRow, PcSearchOffer,
  PcCatalogFilters, PcCatalogRow, PcCatalogOffer, PcComparison, PcCompareOffer,
  PcChainKind, PcSourceType, PcRecommendation,
} from "./price-comparison";

const OFFICIAL: PcSourceType = "official_feed";
const SUPPLIER: PcSourceType = "supplier_submitted";
const REGULATORY: PcChainKind = "regulatory";
const VOLUNTARY: PcChainKind = "voluntary";

// ---------------------------------------------------------------------------
// Client (lazy singleton). The `ws` transport is injected so the realtime
// client can construct on Node 20 (no native global WebSocket); we never open a
// channel, this only enables the PostgREST reads to run.
// ---------------------------------------------------------------------------
let _client: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("pc-supabase-read: SUPABASE_URL + anon/publishable key required");
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: WebSocketImpl as unknown as typeof WebSocket },
  });
  return _client;
}

export function isSupabasePcEnabled(): boolean {
  return !!(process.env.SUPABASE_URL && (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY));
}

// ---------------------------------------------------------------------------
// Mappers — identical to price-comparison.ts.
// ---------------------------------------------------------------------------
const toBool = (v: unknown) => Number(v) === 1 || v === true;
const num = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
function normSourceType(v: unknown): PcSourceType { return v === SUPPLIER ? SUPPLIER : OFFICIAL; }
function normChainKind(v: unknown): PcChainKind { return v === VOLUNTARY ? VOLUNTARY : REGULATORY; }

function mapCategory(r: any): PcCategory {
  return { id: r.id, name: r.name, slug: r.slug ?? null, sortOrder: num(r.sort_order), active: toBool(r.active) };
}
function mapStore(r: any): PcStore {
  return {
    id: r.id, name: r.name, branch: r.branch ?? null, city: r.city ?? null,
    neighborhood: r.neighborhood ?? null, chainId: r.chain_id ?? null, storeCode: r.store_code ?? null,
    logoUrl: r.logo_url ?? null, active: toBool(r.active), isSample: toBool(r.is_sample),
    sourceType: normSourceType(r.source_type),
  };
}
function mapProduct(r: any): PcProduct {
  return {
    id: r.id, categoryId: r.category_id ?? null, name: r.name, brand: r.brand ?? null,
    unit: r.unit ?? null, barcode: r.barcode ?? null, itemCode: r.item_code ?? null,
    imageUrl: r.image_url ?? null, active: toBool(r.active), isSample: toBool(r.is_sample),
  };
}
function mapPrice(r: any): PcPrice {
  return {
    id: r.id, productId: r.product_id, storeId: r.store_id, price: num(r.price),
    unitPrice: r.unit_price != null ? num(r.unit_price) : null, unitOfMeasure: r.unit_of_measure ?? null,
    currency: r.currency ?? "ILS", onSale: toBool(r.on_sale), saleNote: r.sale_note ?? null,
    validUntil: r.valid_until ?? null, sourceType: normSourceType(r.source_type), updatedAt: r.updated_at ?? null,
  };
}
function mapPromotion(r: any): PcPromotion {
  return {
    id: r.id, storeId: r.store_id ?? null, title: r.title, description: r.description ?? null,
    startsAt: r.starts_at ?? null, endsAt: r.ends_at ?? null, active: toBool(r.active),
  };
}

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------
const NOT_SAMPLE = "is_sample.is.null,is_sample.eq.0";
const PRICE_COLS = "id,product_id,store_id,price,unit_price,unit_of_measure,currency,on_sale,sale_note,valid_until,source_type,updated_at";

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Escape a value used inside a PostgREST ilike pattern embedded in an `.or()`
// filter string. Commas/parens would break the filter grammar; strip them.
function likeSafe(v: string): string {
  return v.replace(/[(),]/g, " ");
}

// Page past the 1000-row cap. `make()` must return a fresh query builder each
// call (range mutates a builder, so we rebuild per page).
async function paged<T>(make: () => any, pageSize = 1000, hardCap = Infinity): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await make().range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    out.push(...(data as T[]));
    if (data.length < pageSize || out.length >= hardCap) break;
    from += pageSize;
  }
  return out;
}

// `mode` defaults to "exact". Use "estimated" for the very large tables
// (pc_prices ~1.23M, pc_price_history ~1.25M, pc_promotions ~420k): an exact
// COUNT there exceeds Postgres' statement_timeout (57014) and 500s. Estimated
// reads the planner statistics and is instant; the small, accuracy-critical
// counts (products/stores/categories) stay exact.
async function countRows(table: string, apply?: (q: any) => any, mode: "exact" | "estimated" = "exact"): Promise<number> {
  let q = sb().from(table).select("*", { count: mode, head: true });
  if (apply) q = apply(q);
  const { count, error } = await q;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

// Fetch only the prices for the given product ids (batched + paged). Never pulls
// the full pc_prices table.
async function pricesForProducts(productIds: number[]): Promise<Map<number, PcPrice[]>> {
  const byProduct = new Map<number, PcPrice[]>();
  for (const ids of chunk(productIds, 300)) {
    const rows = await paged<any>(() =>
      sb().from("pc_prices").select(PRICE_COLS).in("product_id", ids));
    for (const r of rows) {
      const pr = mapPrice(r);
      const list = byProduct.get(pr.productId);
      if (list) list.push(pr); else byProduct.set(pr.productId, [pr]);
    }
  }
  return byProduct;
}

// ---------------------------------------------------------------------------
// Categories / Stores / Promotions
// ---------------------------------------------------------------------------
export async function listCategories(includeInactive = false): Promise<PcCategory[]> {
  let q = sb().from("pc_categories").select("*");
  if (!includeInactive) q = q.eq("active", 1);
  const { data, error } = await q.order("sort_order").order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapCategory);
}

export async function listStores(includeInactive = false): Promise<PcStore[]> {
  const rows = await paged<any>(() => {
    let q = sb().from("pc_stores").select("*");
    if (!includeInactive) q = q.eq("active", 1);
    return q.order("name").order("id");
  });
  return rows.map(mapStore);
}

export async function listPromotions(includeInactive = false): Promise<PcPromotion[]> {
  // Bound the payload: pc_promotions is very large; the public listing only ever
  // renders a handful. Mirror the id-DESC ordering of the SQLite version.
  const rows = await paged<any>(() => {
    let q = sb().from("pc_promotions").select("*");
    if (!includeInactive) q = q.eq("active", 1);
    return q.order("id", { ascending: false });
  }, 1000, 1000);
  return rows.map(mapPromotion);
}

export async function getDistinctCities(includeSample = false): Promise<string[]> {
  const rows = await paged<any>(() => {
    let q = sb().from("pc_stores").select("city").eq("active", 1).not("city", "is", null).neq("city", "");
    if (!includeSample) q = q.or(NOT_SAMPLE);
    return q.order("city");
  });
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of rows) {
    const c = r.city as string;
    if (c && !seen.has(c)) { seen.add(c); out.push(c); }
  }
  return out;
}

export async function getDistinctBrands(includeSample = false): Promise<string[]> {
  // SQLite: DISTINCT brand … ORDER BY brand LIMIT 200. Read brand-ordered pages
  // and collect the first 200 distinct brands.
  const seen = new Set<string>();
  const out: string[] = [];
  let from = 0;
  const pageSize = 1000;
  for (let page = 0; page < 30 && out.length < 200; page++) {
    let q = sb().from("pc_products").select("brand").eq("active", 1).not("brand", "is", null).neq("brand", "");
    if (!includeSample) q = q.or(NOT_SAMPLE);
    const { data, error } = await q.order("brand").range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    for (const r of data) {
      const b = r.brand as string;
      if (b && !seen.has(b)) { seen.add(b); out.push(b); if (out.length >= 200) break; }
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

async function getProduct(id: number): Promise<PcProduct | undefined> {
  const { data, error } = await sb().from("pc_products").select("*").eq("id", id).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapProduct(data) : undefined;
}

// ---------------------------------------------------------------------------
// Product filtering (mirrors listProductsAdvanced: text/category/barcode/brand
// server-side, cap 1000, ORDER BY name; location/store filters narrow to
// products that actually carry a matching offer BEFORE the cap).
// ---------------------------------------------------------------------------
function applyProductFilters(q: any, opts: PcSearchFilters): any {
  q = q.eq("active", 1);
  if (!opts.includeSample) q = q.or(NOT_SAMPLE);
  if (opts.categoryId) q = q.eq("category_id", opts.categoryId);
  if (opts.barcode && opts.barcode.trim()) q = q.eq("barcode", opts.barcode.trim());
  if (opts.brand && opts.brand.trim()) q = q.ilike("brand", `%${opts.brand.trim()}%`);
  if (opts.search && opts.search.trim()) {
    const t = likeSafe(opts.search.trim());
    q = q.or(`name.ilike.%${t}%,brand.ilike.%${t}%,barcode.ilike.%${t}%,item_code.ilike.%${t}%`);
  }
  return q;
}

// Product ids that have a matching offer given location/store filters, mirroring
// the EXISTS subquery in the SQLite listProductsAdvanced.
async function productIdsWithMatchingOffer(opts: PcSearchFilters): Promise<number[] | null> {
  const city = opts.city?.trim();
  const hood = opts.neighborhood?.trim();
  const storeName = opts.storeName?.trim();
  if (!(city || hood || opts.storeId || storeName)) return null; // no location/store filter

  const storeRows = await paged<any>(() => {
    let q = sb().from("pc_stores").select("id").eq("active", 1);
    if (!opts.includeSample) q = q.or(NOT_SAMPLE);
    if (city) q = q.ilike("city", `%${city}%`);
    if (hood) q = q.ilike("neighborhood", `%${hood}%`);
    if (opts.storeId) q = q.eq("id", opts.storeId);
    if (storeName) q = q.or(`name.ilike.%${likeSafe(storeName)}%,branch.ilike.%${likeSafe(storeName)}%`);
    return q.order("id");
  });
  const storeIds = storeRows.map((r) => r.id as number);
  if (storeIds.length === 0) return [];

  const prodIds = new Set<number>();
  for (const ids of chunk(storeIds, 300)) {
    const rows = await paged<any>(() =>
      sb().from("pc_prices").select("product_id").in("store_id", ids));
    for (const r of rows) prodIds.add(r.product_id as number);
  }
  return Array.from(prodIds);
}

async function listProductsAdvanced(opts: PcSearchFilters): Promise<PcProduct[]> {
  const offerIds = await productIdsWithMatchingOffer(opts);
  if (offerIds && offerIds.length === 0) return [];

  if (offerIds && offerIds.length > 0 && offerIds.length <= 5000) {
    // Narrow, location-scoped path: apply text filters AND id membership, then
    // sort by name and cap at 1000 (matches EXISTS + ORDER BY name LIMIT 1000).
    const collected: any[] = [];
    for (const ids of chunk(offerIds, 300)) {
      const rows = await paged<any>(() =>
        applyProductFilters(sb().from("pc_products").select("*"), opts).in("id", ids));
      collected.push(...rows);
    }
    collected.sort((a, b) => String(a.name).localeCompare(String(b.name), "he"));
    return collected.slice(0, 1000).map(mapProduct);
  }

  const rows = await paged<any>(() =>
    applyProductFilters(sb().from("pc_products").select("*"), opts).order("name").order("id"), 1000, 1000);
  const mapped = rows.slice(0, 1000).map(mapProduct);
  if (offerIds) {
    const set = new Set(offerIds);
    return mapped.filter((p) => set.has(p.id));
  }
  return mapped;
}

// ---------------------------------------------------------------------------
// Public search — products with the best (lowest) price across stores.
// ---------------------------------------------------------------------------
function matchesStore(s: PcStore | undefined, needle: string): boolean {
  if (!s) return false;
  return (s.name || "").toLowerCase().includes(needle) || (s.branch || "").toLowerCase().includes(needle);
}
function storeChainKey(s: PcStore): string {
  const cid = (s.chainId || "").trim();
  return cid ? cid : `store:${s.id}`;
}
function spreadPct(min: number, max: number): number | null {
  if (min <= 0) return null;
  return Math.round(((max - min) / min) * 1000) / 10;
}

export async function chainKindMap(): Promise<Map<string, PcChainKind>> {
  const { data, error } = await sb().from("pc_feed_sources").select("chain_id,source_kind")
    .not("chain_id", "is", null).neq("chain_id", "");
  if (error) throw new Error(error.message);
  const m = new Map<string, PcChainKind>();
  for (const r of data ?? []) m.set(String(r.chain_id), normChainKind(r.source_kind));
  return m;
}

async function loadContext(opts: { includeSample?: boolean }) {
  const [cats, storeList, kinds] = await Promise.all([
    listCategories(true),
    listStores(true),
    chainKindMap(),
  ]);
  const catMap = new Map(cats.map((c) => [c.id, c.name]));
  const stores = new Map(storeList.filter((s) => s.active && (opts.includeSample || !s.isSample)).map((s) => [s.id, s]));
  return { catMap, stores, kinds };
}

export async function publicSearch(opts: PcSearchFilters = {}): Promise<PcSearchRow[]> {
  const products = await listProductsAdvanced(opts);
  const { catMap, stores } = await loadContext(opts);
  const pricesByProduct = await pricesForProducts(products.map((p) => p.id));

  const cityF = opts.city?.trim().toLowerCase() || "";
  const hoodF = opts.neighborhood?.trim().toLowerCase() || "";
  const storeF = opts.storeName?.trim().toLowerCase() || "";
  const track = opts.track || "official";

  const rows: PcSearchRow[] = products.map((p) => {
    let prices = (pricesByProduct.get(p.id) ?? []).filter((pr) => stores.has(pr.storeId));
    if (track === "official") prices = prices.filter((pr) => pr.sourceType === OFFICIAL);
    else if (track === "supplier") prices = prices.filter((pr) => pr.sourceType === SUPPLIER);
    if (opts.storeId) prices = prices.filter((pr) => pr.storeId === opts.storeId);
    if (storeF) prices = prices.filter((pr) => matchesStore(stores.get(pr.storeId), storeF));
    if (opts.promoOnly) prices = prices.filter((pr) => pr.onSale);
    if (opts.minPrice != null) prices = prices.filter((pr) => pr.price >= opts.minPrice!);
    if (opts.maxPrice != null) prices = prices.filter((pr) => pr.price <= opts.maxPrice!);
    if (opts.updatedSince) prices = prices.filter((pr) => (pr.updatedAt || "") >= opts.updatedSince!);

    const offers: PcSearchOffer[] = prices
      .map((pr) => {
        const s = stores.get(pr.storeId)!;
        return {
          storeId: pr.storeId, storeName: s.name, city: s.city, neighborhood: s.neighborhood,
          price: pr.price, unitPrice: pr.unitPrice, onSale: pr.onSale, saleNote: pr.saleNote,
          updatedAt: pr.updatedAt ?? null, sourceType: pr.sourceType,
        };
      })
      .filter((o) => (cityF ? (o.city || "").toLowerCase().includes(cityF) : true))
      .filter((o) => (hoodF ? (o.neighborhood || "").toLowerCase().includes(hoodF) : true))
      .sort((a, b) => a.price - b.price);

    const best = offers[0] ?? null;
    return {
      product: p,
      categoryName: p.categoryId ? catMap.get(p.categoryId) ?? null : null,
      bestPrice: best ? best.price : null,
      bestStore: best ? best.storeName : null,
      bestUnitPrice: best ? best.unitPrice : null,
      offers,
    };
  });

  const offerFiltered = !!(opts.storeId || opts.promoOnly || opts.minPrice != null || opts.maxPrice != null || cityF || hoodF || storeF || opts.updatedSince);
  const filtered = offerFiltered ? rows.filter((r) => r.offers.length > 0) : rows;

  const sort = opts.sort || "price";
  filtered.sort((a, b) => {
    if (sort === "name") return a.product.name.localeCompare(b.product.name, "he");
    if (sort === "unitPrice") return (a.bestUnitPrice ?? Infinity) - (b.bestUnitPrice ?? Infinity);
    if (sort === "updated") return (b.offers[0]?.updatedAt || "").localeCompare(a.offers[0]?.updatedAt || "");
    return (a.bestPrice ?? Infinity) - (b.bestPrice ?? Infinity);
  });
  return filtered;
}

// ---------------------------------------------------------------------------
// Catalog + comparison (barcode-keyed, chain count + spread + reg/vol kinds).
// ---------------------------------------------------------------------------
function buildCatalogOffers(prices: PcPrice[], stores: Map<number, PcStore>, kinds: Map<string, PcChainKind>, opts: PcCatalogFilters): PcCatalogOffer[] {
  let list = prices.filter((pr) => stores.has(pr.storeId));
  const track = opts.track || "official";
  if (track === "official") list = list.filter((pr) => pr.sourceType === OFFICIAL);
  else if (track === "supplier") list = list.filter((pr) => pr.sourceType === SUPPLIER);
  if (opts.promoOnly) list = list.filter((pr) => pr.onSale);
  if (opts.minPrice != null) list = list.filter((pr) => pr.price >= opts.minPrice!);
  if (opts.maxPrice != null) list = list.filter((pr) => pr.price <= opts.maxPrice!);

  const cityF = opts.city?.trim().toLowerCase() || "";
  const hoodF = opts.neighborhood?.trim().toLowerCase() || "";
  const storeF = opts.storeName?.trim().toLowerCase() || "";
  if (opts.storeId) list = list.filter((pr) => pr.storeId === opts.storeId);
  if (storeF) list = list.filter((pr) => matchesStore(stores.get(pr.storeId), storeF));
  return list
    .map((pr) => {
      const s = stores.get(pr.storeId)!;
      const chainKey = storeChainKey(s);
      const chainKind = kinds.get((s.chainId || "").trim()) ?? REGULATORY;
      return {
        storeId: pr.storeId, storeName: s.name, chainId: s.chainId, chainKey, chainKind,
        city: s.city, neighborhood: s.neighborhood, price: pr.price, unitPrice: pr.unitPrice,
        onSale: pr.onSale, saleNote: pr.saleNote, updatedAt: pr.updatedAt ?? null,
      } as PcCatalogOffer;
    })
    .filter((o) => (cityF ? (o.city || "").toLowerCase().includes(cityF) : true))
    .filter((o) => (hoodF ? (o.neighborhood || "").toLowerCase().includes(hoodF) : true))
    .filter((o) => (opts.kind ? o.chainKind === opts.kind : true))
    .sort((a, b) => a.price - b.price);
}

function summarizeOffers(offers: PcCatalogOffer[]) {
  const chainKeys = new Set(offers.map((o) => o.chainKey));
  const kindSet = new Set(offers.map((o) => o.chainKind));
  const cheapest = offers[0] ?? null;
  const dearest = offers.length ? offers[offers.length - 1] : null;
  return {
    chainCount: chainKeys.size,
    kinds: Array.from(kindSet) as PcChainKind[],
    cheapestPrice: cheapest ? cheapest.price : null,
    cheapestStore: cheapest ? cheapest.storeName : null,
    cheapestChainKind: cheapest ? cheapest.chainKind : null,
    dearestPrice: dearest ? dearest.price : null,
    spreadPct: cheapest && dearest ? spreadPct(cheapest.price, dearest.price) : null,
  };
}

export async function catalogSearch(opts: PcCatalogFilters = {}): Promise<PcCatalogRow[]> {
  let products = await listProductsAdvanced(opts);
  // Default browse (no search term / no narrowing filter) would otherwise fetch
  // prices for up to 1000 products across 1,200+ stores — hundreds of thousands
  // of rows — which times out on a cold sandbox. Cap the default listing so the
  // homepage loads fast; any real search/filter uses the full result set.
  const hasNarrowing = !!(
    (opts.search && opts.search.trim()) || opts.categoryId || (opts.barcode && opts.barcode.trim()) ||
    (opts.brand && opts.brand.trim()) || opts.city || opts.neighborhood || opts.storeId || opts.storeName ||
    opts.minPrice != null || opts.maxPrice != null || opts.promoOnly || opts.kind ||
    (opts.minChains != null && opts.minChains > 0)
  );
  if (!hasNarrowing && products.length > 80) products = products.slice(0, 80);
  // Even a narrowed search can match up to 1000 products; fetching prices for all
  // of them across 1,200+ stores is too slow for a live request. Bound every
  // catalog query so responses stay well under the sandbox timeout.
  else if (hasNarrowing && products.length > 150) products = products.slice(0, 150);
  const { catMap, stores, kinds } = await loadContext(opts);
  const pricesByProduct = await pricesForProducts(products.map((p) => p.id));
  const minChains = opts.minChains != null && opts.minChains > 0 ? opts.minChains : 0;

  const rows: PcCatalogRow[] = products.map((p) => {
    const offers = buildCatalogOffers(pricesByProduct.get(p.id) ?? [], stores, kinds, opts);
    const sum = summarizeOffers(offers);
    return {
      product: p,
      categoryName: p.categoryId ? catMap.get(p.categoryId) ?? null : null,
      offers,
      ...sum,
    };
  });

  const offerFiltered = !!(opts.promoOnly || opts.minPrice != null || opts.maxPrice != null || opts.city || opts.neighborhood || opts.storeId || opts.storeName || opts.kind);
  let filtered = offerFiltered ? rows.filter((r) => r.offers.length > 0) : rows;
  if (minChains > 0) filtered = filtered.filter((r) => r.chainCount >= minChains);

  const sort = opts.sort || "price";
  filtered.sort((a, b) => {
    if (sort === "name") return a.product.name.localeCompare(b.product.name, "he");
    if (sort === "updated") return (b.offers[0]?.updatedAt || "").localeCompare(a.offers[0]?.updatedAt || "");
    return (a.cheapestPrice ?? Infinity) - (b.cheapestPrice ?? Infinity);
  });
  return filtered;
}

export async function comparisonByBarcode(barcode: string, opts: { includeSample?: boolean; track?: "official" | "supplier" | "all" } = {}): Promise<PcComparison | undefined> {
  const code = String(barcode || "").trim();
  if (!code) return undefined;
  const includeSample = !!opts.includeSample;
  let q = sb().from("pc_products").select("*").eq("barcode", code).eq("active", 1);
  if (!includeSample) q = q.or(NOT_SAMPLE);
  const { data, error } = await q.order("id").limit(1);
  if (error) throw new Error(error.message);
  const row = (data ?? [])[0];
  if (!row) return undefined;
  const p = mapProduct(row);
  const { catMap, stores, kinds } = await loadContext({ includeSample });
  const pricesByProduct = await pricesForProducts([p.id]);
  const base = buildCatalogOffers(pricesByProduct.get(p.id) ?? [], stores, kinds, { track: opts.track || "official", includeSample });
  const offers: PcCompareOffer[] = base.map((o, i) => ({ ...o, isCheapest: i === 0 }));
  const sum = summarizeOffers(base);
  const history = await listPriceHistory(p.id);
  return {
    product: p,
    categoryName: p.categoryId ? catMap.get(p.categoryId) ?? null : null,
    barcode: code,
    chainCount: sum.chainCount,
    cheapestPrice: sum.cheapestPrice,
    dearestPrice: sum.dearestPrice,
    spreadPct: sum.spreadPct,
    offers,
    regulatory: offers.filter((o) => o.chainKind === REGULATORY),
    voluntary: offers.filter((o) => o.chainKind === VOLUNTARY),
    history,
  };
}

export async function productDetail(id: number, includeSample = false, track: "official" | "supplier" | "all" = "official"): Promise<(PcSearchRow & { history: Awaited<ReturnType<typeof listPriceHistory>> }) | undefined> {
  const p = await getProduct(id);
  if (!p) return undefined;
  if (!includeSample && p.isSample) return undefined;
  const { catMap, stores } = await loadContext({ includeSample });
  const pricesByProduct = await pricesForProducts([p.id]);
  const offers: PcSearchOffer[] = (pricesByProduct.get(p.id) ?? [])
    .filter((pr) => stores.has(pr.storeId))
    .filter((pr) => (track === "official" ? pr.sourceType === OFFICIAL : track === "supplier" ? pr.sourceType === SUPPLIER : true))
    .map((pr) => {
      const s = stores.get(pr.storeId)!;
      return { storeId: pr.storeId, storeName: s.name, city: s.city, neighborhood: s.neighborhood, price: pr.price, unitPrice: pr.unitPrice, onSale: pr.onSale, saleNote: pr.saleNote, updatedAt: pr.updatedAt ?? null, sourceType: pr.sourceType };
    })
    .sort((a, b) => a.price - b.price);
  const best = offers[0] ?? null;
  const history = await listPriceHistory(p.id);
  return {
    product: p,
    categoryName: p.categoryId ? catMap.get(p.categoryId) ?? null : null,
    bestPrice: best ? best.price : null,
    bestStore: best ? best.storeName : null,
    bestUnitPrice: best ? best.unitPrice : null,
    offers,
    history,
  };
}

export async function listPriceHistory(productId: number, limit = 50): Promise<Array<{ storeId: number; price: number; onSale: boolean; source: string | null; recordedAt: string }>> {
  const { data, error } = await sb().from("pc_price_history").select("store_id,price,on_sale,source,recorded_at")
    .eq("product_id", productId).order("recorded_at", { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({ storeId: r.store_id, price: num(r.price), onSale: toBool(r.on_sale), source: r.source ?? null, recordedAt: r.recorded_at }));
}

export async function recommend(opts: PcSearchFilters = {}): Promise<PcRecommendation> {
  const rows = (await publicSearch(opts)).filter((r) => r.bestPrice != null && r.offers.length > 0);
  if (rows.length === 0) {
    return {
      hasData: false,
      message: "אין עדיין נתוני מחירים מאומתים עבור החיפוש הזה. ברגע שיתווספו מקורות נתונים פעילים, נוכל להציג המלצת חיסכון מבוססת נתונים בלבד.",
    };
  }
  let bestRow = rows[0];
  let bestSpread = -1;
  for (const r of rows) {
    if (r.offers.length < 2) continue;
    const spread = r.offers[r.offers.length - 1].price - r.offers[0].price;
    if (spread > bestSpread) { bestSpread = spread; bestRow = r; }
  }
  const offers = bestRow.offers;
  const best = offers[0];
  const worst = offers[offers.length - 1];
  const savings = worst ? Math.round((worst.price - best.price) * 100) / 100 : 0;
  const savingsPct = worst && worst.price > 0 ? Math.round((savings / worst.price) * 1000) / 10 : 0;
  const message = savings > 0
    ? `על ${bestRow.product.name} ניתן לחסוך עד ₪${savings.toFixed(2)} (${savingsPct}%) בקנייה ב${best.storeName} במקום ב${worst.storeName}. הנתונים מבוססים על המאגר בלבד.`
    : `המחיר הזול ביותר עבור ${bestRow.product.name} הוא ₪${best.price.toFixed(2)} ב${best.storeName}, על בסיס הנתונים שבמאגר.`;
  return {
    hasData: true,
    message,
    product: { id: bestRow.product.id, name: bestRow.product.name, brand: bestRow.product.brand, unit: bestRow.product.unit },
    bestPrice: best.price,
    bestStore: best.storeName,
    worstPrice: worst?.price,
    savings,
    savingsPct,
    offers,
    alternatives: rows.slice(0, 5).map((r) => ({ name: r.product.name, bestPrice: r.bestPrice, bestStore: r.bestStore })),
  };
}

// Best-effort no-op: anon cannot write pc_search_requests.
export async function logSearchRequest(_input: unknown): Promise<number> {
  return 0;
}

// Counts for the /meta endpoint (and admin stats parity).
export async function getStats() {
  const [
    categories, stores, realStores, products, realProducts, prices, officialPrices, supplierPrices,
    promotions, feedSources, activeFeedSources, priceHistory, lastSuccessRow,
  ] = await Promise.all([
    countRows("pc_categories"),
    countRows("pc_stores"),
    countRows("pc_stores", (q) => q.or(NOT_SAMPLE)),
    countRows("pc_products"),
    countRows("pc_products", (q) => q.or(NOT_SAMPLE)),
    countRows("pc_prices", undefined, "estimated"),
    countRows("pc_prices", (q) => q.or("source_type.is.null,source_type.eq.official_feed"), "estimated"),
    countRows("pc_prices", (q) => q.eq("source_type", "supplier_submitted"), "estimated"),
    countRows("pc_promotions", undefined, "estimated"),
    countRows("pc_feed_sources"),
    countRows("pc_feed_sources", (q) => q.eq("active", 1)),
    countRows("pc_price_history", undefined, "estimated"),
    sb().from("pc_feed_sources").select("last_success_at").not("last_success_at", "is", null)
      .order("last_success_at", { ascending: false }).limit(1),
  ]);
  const lastSuccessAt = (lastSuccessRow.data?.[0]?.last_success_at) ?? null;
  return {
    categories, stores, realStores, products, realProducts, prices, officialPrices, supplierPrices,
    // Submission + import tables are not readable by the anon role.
    pendingSubmissions: 0,
    approvedSubmissions: 0,
    promotions,
    feedSources,
    activeFeedSources,
    importJobs: 0,
    priceHistory,
    lastImportAt: null,
    lastSuccessAt,
  };
}
