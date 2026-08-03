/**
 * Supabase data-access layer for the standalone price-comparison importer.
 *
 * This is intentionally separate from server/supabase-storage.ts: that file
 * implements the rights/CRM IStorage. Here we touch ONLY pc_* tables, with the
 * service-role key, from a short-lived CLI process (GitHub Actions). Nothing
 * here references rights or fin_* tables.
 *
 * All writes are upserts or inserts — the importer never deletes/wipes a table.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import ws from "ws";
import type { ParsedStore, ParsedPrice, ParsedPromotion } from "./xml.ts";

const nowIso = () => new Date().toISOString();

/**
 * Chunk size for batched reads/writes. PostgREST encodes `.in(...)` filters in
 * the URL, so an oversized list risks a 414 (URI too long); keep lookups
 * conservative. Inserts go in the request body, so they can be larger, but we
 * still cap them so a single failed chunk doesn't lose a whole 7k-row file and
 * to keep peak memory bounded for the two large daily XML files.
 */
const LOOKUP_CHUNK = 200;
const INSERT_CHUNK = 500;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** The dedupe key for a parsed product: barcode, else item_code, else name|brand. */
function productKey(p: ParsedPrice): string {
  return p.barcode || p.itemCode || `${p.name}|${p.brand ?? ""}`;
}

export interface FeedSourceRow {
  id: number;
  chain_name: string;
  chain_id: string | null;
  source_url: string | null;
  source_type: string;
  feed_format: string;
  feed_kinds: string | null;
  // 'regulatory' = chain legally obligated to report to authorities (daily import);
  // 'voluntary' = local store self-submitting via the API path.
  source_kind: string | null;
  auth_user: string | null;
  notes: string | null;
  verified: number;
  active: number;
  adapter: string | null;
  direct_file_url: string | null;
  discovery_url: string | null;
  max_files_per_run: number | null;
  last_status: string | null;
  last_run_at: string | null;
  last_message: string | null;
  last_error: string | null;
  last_success_at: string | null;
}

export class PcSupabaseRepo {
  readonly client: SupabaseClient;
  readonly dryRun: boolean;
  // In-memory caches so a single run does not re-query the same store/product.
  private storeCache = new Map<string, number>();
  private productCache = new Map<string, number>();
  // Identity indexes used by the batch path to resolve products by their two
  // natural keys without re-querying. Shared across files in a single run.
  private barcodeToId = new Map<string, number>();
  private itemCodeToId = new Map<string, number>();

  constructor(url: string, serviceKey: string, dryRun = false) {
    // supabase-js builds a RealtimeClient on construction; on Node < 22 (the
    // Actions runner pins Node 20) that throws "Node.js 20 detected without
    // native WebSocket support" — crashing before any query and before any
    // pc_import_jobs row is written. We never use realtime here, but the client
    // still needs a WebSocket ctor, so we hand it the bundled `ws` transport.
    this.client = createClient(url, serviceKey, {
      auth: { persistSession: false },
      realtime: { transport: ws as unknown as never },
    });
    this.dryRun = dryRun;
  }

  // --- connectivity --------------------------------------------------------
  /** Cheap query that fails loudly if URL/key/migration are wrong. */
  async preflight(): Promise<void> {
    const { error } = await this.client.from("pc_feed_sources").select("id").limit(1);
    if (error) throw new Error(`${error.message}${error.code ? ` (code ${error.code})` : ""}`);
  }

  /**
   * Persist a diagnostic pc_import_jobs row the moment we have a working client,
   * BEFORE listing feeds. This both (a) proves write access (RLS/grant/key-type
   * problems surface here with the exact PostgREST error instead of failing
   * opaquely with an empty pc_import_jobs table) and (b) always leaves a visible
   * breadcrumb in Supabase so a failed run is diagnosable without Actions logs.
   * Returns the new job id, or -1 in dry-run (no write attempted).
   */
  async startDiagnosticJob(meta: string): Promise<number> {
    if (this.dryRun) return -1;
    const { data, error } = await this.client
      .from("pc_import_jobs")
      .insert({ feed_source_id: null, trigger: "cron", kind: "preflight", status: "running", message: meta.slice(0, 1000), raw_meta: meta.slice(0, 1000), started_at: nowIso() })
      .select("id")
      .single();
    if (error) throw new Error(`write diagnostic job failed: ${error.message}${error.code ? ` (code ${error.code})` : ""}`);
    return (data as { id: number }).id;
  }

  // --- feed sources --------------------------------------------------------
  /**
   * Every ACTIVE feed, regardless of the `verified` flag.
   *
   * The daily importer must ATTEMPT every chain the operator has switched on
   * (active=1), not only the ones already hand-verified. `verified` was a hard
   * enumeration gate before; that silently excluded 20 active-but-unverified
   * chains from the run (their last_status/last_run stayed NULL forever, so the
   * site advertised chains it never imported). It is now an informational admin
   * marker only: the importer runs each active feed, records honest per-feed
   * status via markFeedRun, and a feed that genuinely cannot import is stamped
   * last_status='error' so the data-driven UI excludes it.
   */
  async listActiveFeeds(): Promise<FeedSourceRow[]> {
    const { data, error } = await this.client
      .from("pc_feed_sources")
      .select("*")
      .eq("active", 1);
    if (error) throw new Error(`read pc_feed_sources failed: ${error.message}`);
    return (data ?? []) as FeedSourceRow[];
  }

  async listAllFeeds(): Promise<FeedSourceRow[]> {
    const { data, error } = await this.client.from("pc_feed_sources").select("*");
    if (error) throw new Error(`read pc_feed_sources failed: ${error.message}`);
    return (data ?? []) as FeedSourceRow[];
  }

  async markFeedRun(id: number, status: "ok" | "error", message: string, directFileUrl?: string | null): Promise<void> {
    if (this.dryRun) return;
    const ts = nowIso();
    const patch: Record<string, unknown> = {
      last_status: status, last_run_at: ts, last_message: message.slice(0, 500), updated_at: ts,
    };
    if (status === "ok") { patch.last_success_at = ts; patch.last_error = null; }
    else patch.last_error = message.slice(0, 500);
    if (directFileUrl !== undefined) patch.direct_file_url = directFileUrl;
    const { error } = await this.client.from("pc_feed_sources").update(patch).eq("id", id);
    if (error) throw new Error(`update pc_feed_sources failed: ${error.message}`);
  }

  // --- jobs + logs ---------------------------------------------------------
  async createJob(feedSourceId: number | null, trigger: string, kind: string | null): Promise<number> {
    if (this.dryRun) return -1;
    const { data, error } = await this.client
      .from("pc_import_jobs")
      .insert({ feed_source_id: feedSourceId, trigger, kind, status: "running", started_at: nowIso() })
      .select("id")
      .single();
    if (error) throw new Error(`create job failed: ${error.message}`);
    return (data as { id: number }).id;
  }

  async finishJob(id: number, patch: { status: string; stores?: number; products?: number; prices?: number; promotions?: number; errors?: number; message?: string }): Promise<void> {
    if (this.dryRun || id < 0) return;
    const { error } = await this.client.from("pc_import_jobs").update({
      status: patch.status,
      stores_upserted: patch.stores ?? 0,
      products_upserted: patch.products ?? 0,
      prices_upserted: patch.prices ?? 0,
      promotions_upserted: patch.promotions ?? 0,
      errors: patch.errors ?? 0,
      finished_at: nowIso(),
      message: (patch.message ?? "").slice(0, 1000),
    }).eq("id", id);
    if (error) throw new Error(`finish job failed: ${error.message}`);
  }

  async log(jobId: number, level: "info" | "warn" | "error", message: string): Promise<void> {
    // Always echo to stdout so GitHub Actions logs are useful even in dry-run.
    const line = `[${level}] ${message}`;
    if (level === "error") console.error(line); else console.log(line);
    if (this.dryRun || jobId < 0) return;
    await this.client.from("pc_import_logs").insert({ job_id: jobId, level, message: message.slice(0, 1000), created_at: nowIso() });
  }

  // --- dedupe --------------------------------------------------------------
  async isFileAlreadyImported(contentHash: string): Promise<boolean> {
    const { data, error } = await this.client
      .from("pc_import_files")
      .select("id")
      .eq("content_hash", contentHash)
      .limit(1);
    if (error) throw new Error(`dedupe lookup failed: ${error.message}`);
    return (data?.length ?? 0) > 0;
  }

  async recordImportedFile(input: { feedSourceId: number | null; jobId: number; fileUrl: string; fileName: string | null; contentHash: string; byteSize: number; kind: string; rowsImported: number }): Promise<void> {
    if (this.dryRun) return;
    const { error } = await this.client.from("pc_import_files").insert({
      feed_source_id: input.feedSourceId, job_id: input.jobId < 0 ? null : input.jobId,
      file_url: input.fileUrl, file_name: input.fileName, content_hash: input.contentHash,
      byte_size: input.byteSize, kind: input.kind, rows_imported: input.rowsImported, imported_at: nowIso(),
    });
    if (error) throw new Error(`record imported file failed: ${error.message}`);
  }

  // --- upserts -------------------------------------------------------------
  async upsertStore(s: ParsedStore): Promise<number> {
    const key = `${s.chainId ?? ""}|${s.storeCode ?? ""}|${s.name}`;
    const cached = this.storeCache.get(key);
    if (cached) return cached;
    if (this.dryRun) { this.storeCache.set(key, -1); return -1; }

    let existingId: number | null = null;
    if (s.chainId && s.storeCode) {
      const { data } = await this.client.from("pc_stores").select("id").eq("chain_id", s.chainId).eq("store_code", s.storeCode).limit(1);
      existingId = data?.[0]?.id ?? null;
    }
    const ts = nowIso();
    if (existingId) {
      // Never overwrite a previously-resolved city with null. The Stores file
      // carries the real <City>, but a later PriceFull import for the same store
      // usually has no City in its header (parsePrices → null); writing that null
      // back wiped the city set by the Stores file, leaving pc_stores.city NULL
      // and breaking search-by-city (the 520/554 cerberus + 10/10 shufersal bug).
      // Only patch city when we actually have a value; keep name/branch behavior.
      const patch: Record<string, unknown> = { name: s.name, branch: s.branch, active: 1, updated_at: ts };
      if (s.city != null && s.city !== "") patch.city = s.city;
      await this.client.from("pc_stores").update(patch).eq("id", existingId);
      this.storeCache.set(key, existingId);
      return existingId;
    }
    const { data, error } = await this.client.from("pc_stores")
      .insert({ name: s.name, branch: s.branch, city: s.city, chain_id: s.chainId, store_code: s.storeCode, active: 1, source_type: "official_feed", created_at: ts, updated_at: ts })
      .select("id").single();
    if (error) throw new Error(`upsert store failed: ${error.message}`);
    const id = (data as { id: number }).id;
    this.storeCache.set(key, id);
    return id;
  }

  async upsertProduct(p: ParsedPrice): Promise<number> {
    const key = p.barcode || p.itemCode || `${p.name}|${p.brand ?? ""}`;
    const cached = this.productCache.get(key);
    if (cached) return cached;
    if (this.dryRun) { this.productCache.set(key, -1); return -1; }

    let existingId: number | null = null;
    if (p.barcode) {
      const { data } = await this.client.from("pc_products").select("id").eq("barcode", p.barcode).limit(1);
      existingId = data?.[0]?.id ?? null;
    }
    if (!existingId && p.itemCode) {
      const { data } = await this.client.from("pc_products").select("id").eq("item_code", p.itemCode).limit(1);
      existingId = data?.[0]?.id ?? null;
    }
    const ts = nowIso();
    if (existingId) {
      await this.client.from("pc_products").update({ name: p.name, brand: p.brand, unit: p.unit, barcode: p.barcode, item_code: p.itemCode, active: 1, updated_at: ts }).eq("id", existingId);
      this.productCache.set(key, existingId);
      return existingId;
    }
    const { data, error } = await this.client.from("pc_products")
      .insert({ name: p.name, brand: p.brand, unit: p.unit, barcode: p.barcode, item_code: p.itemCode, active: 1, created_at: ts, updated_at: ts })
      .select("id").single();
    if (error) throw new Error(`upsert product failed: ${error.message}`);
    const id = (data as { id: number }).id;
    this.productCache.set(key, id);
    return id;
  }

  /** Returns true if a NEW price row was created (vs updated). */
  async upsertPrice(productId: number, storeId: number, price: number, unitPrice: number | null, unit: string | null): Promise<boolean> {
    if (this.dryRun || productId < 0 || storeId < 0) return false;
    const ts = nowIso();
    const { data } = await this.client.from("pc_prices").select("id, price").eq("product_id", productId).eq("store_id", storeId).limit(1);
    const existing = data?.[0] as { id: number; price: number } | undefined;
    if (existing) {
      const changed = Number(existing.price) !== price;
      await this.client.from("pc_prices").update({ price, unit_price: unitPrice, unit_of_measure: unit, source: "import", source_type: "official_feed", updated_at: ts }).eq("id", existing.id);
      if (changed) await this.client.from("pc_price_history").insert({ product_id: productId, store_id: storeId, price, on_sale: 0, source: "import", recorded_at: ts });
      return false;
    }
    await this.client.from("pc_prices").insert({ product_id: productId, store_id: storeId, price, unit_price: unitPrice, unit_of_measure: unit, currency: "ILS", on_sale: 0, source: "import", source_type: "official_feed", created_at: ts, updated_at: ts });
    await this.client.from("pc_price_history").insert({ product_id: productId, store_id: storeId, price, on_sale: 0, source: "import", recorded_at: ts });
    return true;
  }

  async createPromotion(storeId: number | null, p: ParsedPromotion): Promise<void> {
    if (this.dryRun) return;
    const ts = nowIso();
    await this.client.from("pc_promotions").insert({ store_id: storeId && storeId > 0 ? storeId : null, title: p.title, description: p.description, starts_at: p.startsAt, ends_at: p.endsAt, active: 1, created_at: ts, updated_at: ts });
  }

  /**
   * Bulk-insert promotions for one file in chunks. The sequential createPromotion
   * issued one HTTP round-trip per promotion — a PromoFull with 5k+ promos cost
   * minutes of wall time and was the dominant cause of the daily-import job
   * exceeding the Actions timeout. This collapses it to ~ceil(n/500) requests.
   * Returns the number of rows inserted.
   */
  async createPromotionsBatch(storeId: number | null, promos: ParsedPromotion[]): Promise<number> {
    if (this.dryRun || promos.length === 0) return 0;
    const ts = nowIso();
    const sid = storeId && storeId > 0 ? storeId : null;
    const rows = promos.map((p) => ({
      store_id: sid,
      title: p.title,
      description: p.description,
      starts_at: p.startsAt,
      ends_at: p.endsAt,
      active: 1,
      created_at: ts,
      updated_at: ts,
    }));
    let inserted = 0;
    for (const c of chunk(rows, INSERT_CHUNK)) {
      const { error } = await this.client.from("pc_promotions").insert(c);
      if (error) throw new Error(`batch promotion insert failed: ${error.message}`);
      inserted += c.length;
    }
    return inserted;
  }

  // --- batch upserts -------------------------------------------------------
  // The per-row upsert* methods above issue ~3 sequential round-trips per price
  // (select + insert/update + history). For a 7k-row PriceFull file that is
  // ~21k serial requests — minutes of wall time. The batch methods below do the
  // same work (same dedupe keys, same source_type/source/active fields, same
  // price-history-on-change semantics) but collapse it into a handful of
  // chunked reads + bulk inserts. They share the same in-memory caches as the
  // single-row methods, so a store resolved by upsertStore stays resolved here.

  /**
   * Resolve product ids for every distinct parsed product in one pass.
   *
   * Returns a Map keyed by productKey(p) → product id. Existing products are
   * found via two chunked `.in(...)` lookups (barcode, then item_code, matching
   * the single-row precedence exactly); missing ones are bulk-inserted. Caches
   * are populated so subsequent files in the same run skip the work entirely.
   */
  async upsertProductsBatch(items: ParsedPrice[]): Promise<{ ids: Map<string, number>; created: number }> {
    const ids = new Map<string, number>();
    // Deduplicate by key first; keep the first occurrence's fields (mirrors the
    // single-row cache, which kept whatever it saw first for a given key).
    const byKey = new Map<string, ParsedPrice>();
    for (const p of items) {
      const key = productKey(p);
      const cached = this.productCache.get(key);
      if (cached) { ids.set(key, cached); continue; }
      if (!byKey.has(key)) byKey.set(key, p);
    }
    if (this.dryRun) {
      for (const key of byKey.keys()) { this.productCache.set(key, -1); ids.set(key, -1); }
      return { ids, created: 0 };
    }

    const unresolved = Array.from(byKey.values());
    // --- 1) match existing by barcode ---
    const byBarcode = unresolved.filter((p) => p.barcode);
    for (const c of chunk(byBarcode.map((p) => p.barcode as string), LOOKUP_CHUNK)) {
      const { data, error } = await this.client.from("pc_products").select("id, barcode").in("barcode", c);
      if (error) throw new Error(`batch product barcode lookup failed: ${error.message}`);
      for (const row of (data ?? []) as { id: number; barcode: string | null }[]) {
        if (row.barcode != null) this.barcodeToId.set(row.barcode, row.id);
      }
    }
    // --- 2) match remaining by item_code ---
    const stillUnresolved = unresolved.filter((p) => !(p.barcode && this.barcodeToId.has(p.barcode)));
    const byItemCode = stillUnresolved.filter((p) => p.itemCode);
    for (const c of chunk(byItemCode.map((p) => p.itemCode as string), LOOKUP_CHUNK)) {
      const { data, error } = await this.client.from("pc_products").select("id, item_code").in("item_code", c);
      if (error) throw new Error(`batch product item_code lookup failed: ${error.message}`);
      for (const row of (data ?? []) as { id: number; item_code: string | null }[]) {
        if (row.item_code != null) this.itemCodeToId.set(row.item_code, row.id);
      }
    }

    const ts = nowIso();
    const toInsert: ParsedPrice[] = [];
    for (const p of unresolved) {
      const existing = (p.barcode ? this.barcodeToId.get(p.barcode) : undefined)
        ?? (p.itemCode ? this.itemCodeToId.get(p.itemCode) : undefined);
      const key = productKey(p);
      if (existing) {
        ids.set(key, existing);
        this.productCache.set(key, existing);
      } else {
        toInsert.push(p);
      }
    }

    // --- 3) bulk-insert the genuinely new products ---
    let created = 0;
    for (const c of chunk(toInsert, INSERT_CHUNK)) {
      const rows = c.map((p) => ({ name: p.name, brand: p.brand, unit: p.unit, barcode: p.barcode, item_code: p.itemCode, active: 1, created_at: ts, updated_at: ts }));
      const { data, error } = await this.client.from("pc_products").insert(rows).select("id, barcode, item_code");
      if (error) throw new Error(`batch product insert failed: ${error.message}`);
      const inserted = (data ?? []) as { id: number; barcode: string | null; item_code: string | null }[];
      // PostgREST returns inserted rows in the order they were sent, so we can
      // zip them back to the source records to recover each new id.
      for (let i = 0; i < c.length; i++) {
        const p = c[i];
        const id = inserted[i]?.id;
        if (id == null) continue;
        const key = productKey(p);
        ids.set(key, id);
        this.productCache.set(key, id);
        if (p.barcode) this.barcodeToId.set(p.barcode, id);
        if (p.itemCode) this.itemCodeToId.set(p.itemCode, id);
        created++;
      }
    }
    return { ids, created };
  }

  /**
   * Upsert prices for ONE store in bulk. Mirrors upsertPrice exactly:
   *  - existing (product_id, store_id) row with a changed price → update + a
   *    pc_price_history row;
   *  - existing row with the same price → update only (refresh source/updated_at);
   *  - no existing row → insert price + a pc_price_history row.
   * Returns the count of NEWLY created price rows (the "prices" metric).
   */
  async upsertPricesBatch(
    storeId: number,
    rows: { productId: number; price: number; unitPrice: number | null; unit: string | null }[],
  ): Promise<number> {
    if (this.dryRun || storeId < 0) return 0;
    // Collapse duplicate product ids within the file (last write wins, matching
    // the sequential loop's behaviour where the final upsertPrice for a product
    // determined its stored price).
    const wanted = new Map<number, { price: number; unitPrice: number | null; unit: string | null }>();
    for (const r of rows) {
      if (r.productId < 0) continue;
      wanted.set(r.productId, { price: r.price, unitPrice: r.unitPrice, unit: r.unit });
    }
    const productIds = Array.from(wanted.keys());

    // --- 1) fetch existing prices for this store across all product ids ---
    const existing = new Map<number, { id: number; price: number }>();
    for (const c of chunk(productIds, LOOKUP_CHUNK)) {
      const { data, error } = await this.client.from("pc_prices").select("id, product_id, price").eq("store_id", storeId).in("product_id", c);
      if (error) throw new Error(`batch price lookup failed: ${error.message}`);
      for (const row of (data ?? []) as { id: number; product_id: number; price: number }[]) {
        existing.set(row.product_id, { id: row.id, price: row.price });
      }
    }

    const ts = nowIso();
    const toInsertPrices: Record<string, unknown>[] = [];
    const historyRows: Record<string, unknown>[] = [];
    const updates: { id: number; price: number; unitPrice: number | null; unit: string | null }[] = [];
    let created = 0;
    for (const [productId, v] of wanted) {
      const ex = existing.get(productId);
      if (ex) {
        updates.push({ id: ex.id, price: v.price, unitPrice: v.unitPrice, unit: v.unit });
        if (Number(ex.price) !== v.price) {
          historyRows.push({ product_id: productId, store_id: storeId, price: v.price, on_sale: 0, source: "import", recorded_at: ts });
        }
      } else {
        toInsertPrices.push({ product_id: productId, store_id: storeId, price: v.price, unit_price: v.unitPrice, unit_of_measure: v.unit, currency: "ILS", on_sale: 0, source: "import", source_type: "official_feed", created_at: ts, updated_at: ts });
        historyRows.push({ product_id: productId, store_id: storeId, price: v.price, on_sale: 0, source: "import", recorded_at: ts });
        created++;
      }
    }

    // --- 2) bulk-insert new prices ---
    for (const c of chunk(toInsertPrices, INSERT_CHUNK)) {
      const { error } = await this.client.from("pc_prices").insert(c);
      if (error) throw new Error(`batch price insert failed: ${error.message}`);
    }
    // --- 3) bulk-insert price history (new rows + changed prices) ---
    for (const c of chunk(historyRows, INSERT_CHUNK)) {
      const { error } = await this.client.from("pc_price_history").insert(c);
      if (error) throw new Error(`batch price_history insert failed: ${error.message}`);
    }
    // --- 4) updates: no batch-by-id primitive in PostgREST, but on a daily
    // re-import most rows are unchanged and updating only refreshes
    // source/updated_at, so we issue these in parallel-bounded waves rather
    // than strictly sequentially. The common first-import case has zero updates.
    for (const c of chunk(updates, 50)) {
      await Promise.all(c.map((u) =>
        this.client.from("pc_prices").update({ price: u.price, unit_price: u.unitPrice, unit_of_measure: u.unit, source: "import", source_type: "official_feed", updated_at: ts }).eq("id", u.id),
      ));
    }
    return created;
  }

  /**
   * Mark jobs that are still "running" but were started before `olderThanIso`
   * as errored, so a previous run that was killed mid-flight (e.g. the Action
   * timed out) does not leave a permanently "running" row. Never deletes data.
   * Returns the number of jobs swept.
   */
  async markStuckJobs(olderThanIso: string, message: string): Promise<number> {
    if (this.dryRun) return 0;
    const { data, error } = await this.client
      .from("pc_import_jobs")
      .update({ status: "error", finished_at: nowIso(), message: message.slice(0, 1000) })
      .eq("status", "running")
      .lt("started_at", olderThanIso)
      .select("id");
    if (error) throw new Error(`mark stuck jobs failed: ${error.message}`);
    return (data ?? []).length;
  }
}
