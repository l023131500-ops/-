/**
 * Price Comparison — standalone DAILY import script.
 *
 * Runs OUTSIDE the web server (GitHub Actions, cron, or `npm run pc:import`).
 * Reads pc_feed_sources from Supabase and imports active + verified feeds into
 * the pc_* tables using the service-role key. Never touches rights/fin_* tables.
 *
 * Hard requirements honoured:
 *  - Fails clearly when SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are missing.
 *  - No demo data: imports only what real adapters discover + download.
 *  - File-hash dedupe (pc_import_files), per-job logs, import counts.
 *  - Retry/backoff on download, configurable max files per run, no table wipes.
 *  - Honest failure: a source that cannot import is reported with an actionable
 *    error — never as fake success.
 *
 * Usage:
 *   tsx script/pc-daily-import.ts                # import every ACTIVE feed
 *   tsx script/pc-daily-import.ts --dry-run      # discover + parse, write nothing
 *   tsx script/pc-daily-import.ts --feed=12      # only feed source id 12
 *   tsx script/pc-daily-import.ts --max-files=5  # cap files per feed this run
 *   tsx script/pc-daily-import.ts --include-unverified   # also try INACTIVE feeds (testing a new source)
 *   tsx script/pc-daily-import.ts --adapters=matrix,web  # only feeds using these adapters (geo-blocked chains on the VPS)
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (required unless --dry-run with
 * --offline). PC_MAX_FILES_PER_RUN optionally overrides the per-feed default.
 */
// --- TLS bootstrap (must run before any HTTPS/fetch) ----------------------
// The Cerberus transparency portal (url.publishedprices.co.il) serves only its
// leaf certificate and omits the Sectigo intermediate CA, so Node's global
// fetch fails the chain with UNABLE_TO_VERIFY_LEAF_SIGNATURE ("fetch failed").
// We ship the missing intermediate in script/pc/certs and add it to Node's
// trust store via NODE_EXTRA_CA_CERTS. That variable is only read at process
// startup, so if it is not already pointing at our bundle we re-exec the
// process once with it set. This keeps full TLS verification intact (we add a
// real CA, we do NOT disable verification) and works identically on GitHub
// Actions, the production server and local runs — no fetch-code changes needed.
import { fileURLToPath } from "node:url";
import { dirname, resolve as resolvePath } from "node:path";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const PC_CA_PATH = resolvePath(dirname(fileURLToPath(import.meta.url)), "pc/certs/sectigo-server-auth-dv-r36.pem");
if (existsSync(PC_CA_PATH) && process.env.NODE_EXTRA_CA_CERTS !== PC_CA_PATH && process.env.PC_CA_BOOTSTRAPPED !== "1") {
  // Preserve execArgv so the tsx loader (registered via --require/--import) is
  // carried into the child; otherwise the re-exec'd process cannot run TS.
  const r = spawnSync(process.execPath, [...process.execArgv, ...process.argv.slice(1)], {
    stdio: "inherit",
    env: { ...process.env, NODE_EXTRA_CA_CERTS: PC_CA_PATH, PC_CA_BOOTSTRAPPED: "1" },
  });
  process.exit(r.status ?? 1);
}
// --------------------------------------------------------------------------

import crypto from "node:crypto";
import { PcSupabaseRepo, type FeedSourceRow } from "./pc/supabase-repo.ts";
import { discover, type DiscoveredFile } from "./pc/adapters.ts";
import {
  maybeGunzip, resolveKind, parseStores, parsePrices, parsePromotions, type FeedKind,
} from "./pc/xml.ts";
import { parseArgs, filterFeedsByAdapter, type Args } from "./pc/cli-args.ts";

const UA = "bkalut-pc-import/1.0 (+https://github.com/l023131500-ops/bkalut-app)";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Adapters whose discovered file URLs are STABLE and safe to cache in
// pc_feed_sources.direct_file_url for reuse. Everything else (shufersal,
// cerberus, nibit, matrix, and the daily HTML crawlers super-pharm/wolt/
// publishprice) discovers signed/short-lived OR daily-rotating listing URLs that
// must be re-crawled every run — caching them freezes the feed on a stale link.
const STABLE_URL_ADAPTERS = new Set(["url", "openisrael"]);
function URL_IS_STABLE_ADAPTER(feed: { adapter: string | null; source_type?: string | null }): boolean {
  const a = (feed.adapter || feed.source_type || "url").toLowerCase();
  return STABLE_URL_ADAPTERS.has(a);
}

/**
 * Render a download URL as a diagnosable, NON-secret pattern: host + path with
 * its trailing token replaced by `<digits>`, plus the query *key names* only
 * (values — including any SAS `sig` — are stripped). A blob URL that arrives
 * here with no query string is the signature of a dropped SAS token (the bug
 * that caused the original 404s), so we call that out explicitly.
 */
function describeUrlPattern(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    const path = u.pathname.replace(/\d{6,}/g, "<digits>");
    const keys = Array.from(u.searchParams.keys());
    const isBlob = /blob\.core\.windows\.net$/i.test(u.hostname);
    const queryNote = keys.length
      ? `query=[${keys.join(",")}]`
      : (isBlob ? "query=NONE ⚠ (blob URL missing SAS token → expected 404)" : "query=none");
    return `${u.protocol}//${u.hostname}${path} (${queryNote})`;
  } catch {
    return rawUrl.split("?")[0];
  }
}

/** Download a file with up to 3 attempts and exponential backoff. */
async function downloadWithRetry(url: string, headers?: Record<string, string>, attempts = 3): Promise<Buffer> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 60000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "user-agent": UA, accept: "*/*", ...(headers || {}) },
      }).finally(() => clearTimeout(timer));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length === 0) throw new Error("empty body");
      return buf;
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) await sleep(1000 * 2 ** i); // 1s, 2s
    }
  }
  throw new Error(`download failed after ${attempts} attempts: ${(lastErr as Error)?.message ?? lastErr}`);
}

function sha256(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

interface FeedOutcome {
  feed: string;
  status: "ok" | "error" | "no-files" | "skeleton" | "uptodate";
  files: number;
  stores: number;
  products: number;
  prices: number;
  promotions: number;
  errors: number;
  message: string;
}

async function importFile(
  repo: PcSupabaseRepo,
  jobId: number,
  feed: FeedSourceRow,
  file: DiscoveredFile,
  buf: Buffer,
): Promise<{ kind: FeedKind; stores: number; products: number; prices: number; promotions: number; errors: number }> {
  const xml = maybeGunzip(buf, file.isGz);
  const out = { kind: "unknown" as FeedKind, stores: 0, products: 0, prices: 0, promotions: 0, errors: 0 };
  if (!xml || xml.length < 20) {
    await repo.log(jobId, "error", `הקובץ ${file.fileName ?? file.url} ריק או לא ניתן לפענוח.`);
    out.errors++;
    return out;
  }
  // Detect per file. feed_kinds is the SET of kinds the feed offers, not the
  // kind of this file — forcing feed_kinds[0] (e.g. "Stores") onto a PriceFull
  // download was the bug that produced "0 rows, 0 errors".
  const kind = resolveKind(file.fileName ?? file.url, xml, feed.feed_kinds);
  out.kind = kind;
  await repo.log(jobId, "info", `קובץ ${file.fileName ?? file.url}: סוג=${kind}, ${xml.length} תווים.`);

  if (kind === "Stores") {
    const { stores, skipped } = parseStores(xml);
    for (const s of stores) {
      try { await repo.upsertStore(s); out.stores++; } catch (e) { out.errors++; await repo.log(jobId, "warn", `store: ${(e as Error).message}`); }
    }
    if (skipped) await repo.log(jobId, "warn", `Stores: דולגו ${skipped} רשומות חסרות.`);
    if (stores.length === 0) {
      out.errors++;
      await repo.log(jobId, "error", `Stores: לא נמצאו רשומות חנות ב-${file.fileName ?? file.url} (סכמה לא נתמכת?). תגיות שנבדקו: StoreInfo/Store/Branch.`);
    }
  } else if (kind === "PriceFull") {
    const { storeName, storeCity, header, prices, skipped } = parsePrices(xml);
    // Upsert the store from the file header (StoreID/ChainID) so a PriceFull
    // file with no Stores companion still gets a store row to attach prices to.
    let storeId = -1;
    try {
      storeId = await repo.upsertStore({ chainId: header.chainId, storeCode: header.storeCode, name: storeName, branch: null, city: storeCity });
      out.stores++;
    } catch (e) { await repo.log(jobId, "error", `store for price file: ${(e as Error).message}`); out.errors++; }
    // Batch path: resolve all products in a few chunked queries, then bulk
    // upsert prices for this store. This replaces ~3 sequential round-trips per
    // row (the cause of the multi-minute imports) with a handful of chunked
    // requests, while preserving the exact dedupe keys, source_type/source/
    // active fields, and price-history-on-change behaviour of the per-row path.
    if (storeId >= 0) {
      try {
        const { ids } = await repo.upsertProductsBatch(prices);
        const priceRows = prices
          .map((p) => {
            const pid = ids.get(p.barcode || p.itemCode || `${p.name}|${p.brand ?? ""}`);
            return pid != null && pid >= 0 ? { productId: pid, price: p.price, unitPrice: p.unitPrice, unit: p.unit } : null;
          })
          .filter((r): r is { productId: number; price: number; unitPrice: number | null; unit: string | null } => r != null);
        out.products += new Set(priceRows.map((r) => r.productId)).size;
        out.prices += await repo.upsertPricesBatch(storeId, priceRows);
      } catch (e) {
        out.errors++;
        await repo.log(jobId, "warn", `batch price import: ${(e as Error).message}`);
      }
    } else if (prices.length > 0) {
      out.errors++;
      await repo.log(jobId, "error", `PriceFull: אין מזהה חנות תקין — דילוג על ${prices.length} מחירים.`);
    }
    if (skipped) await repo.log(jobId, "warn", `PriceFull: דולגו ${skipped} רשומות חסרות.`);
    if (prices.length === 0) {
      out.errors++;
      await repo.log(jobId, "error", `PriceFull: לא נמצאו רשומות מוצר/מחיר ב-${file.fileName ?? file.url} (סכמה לא נתמכת?). תגיות שנבדקו: Item/Product/Line עם ItemName+ItemPrice.`);
    }
  } else if (kind === "PromoFull") {
    const { header, promotions, skipped } = parsePromotions(xml);
    let storeId: number | null = null;
    if (header.storeCode) {
      try { storeId = await repo.upsertStore({ chainId: header.chainId, storeCode: header.storeCode, name: `סניף ${header.storeCode}`, branch: null, city: null }); } catch { /* non-fatal */ }
    }
    // Batch path: a single PromoFull can carry 5k+ promotions; inserting them
    // one HTTP request at a time blew the Actions job past its timeout. Bulk
    // insert in chunks instead, falling back to per-row only on batch failure.
    try {
      out.promotions += await repo.createPromotionsBatch(storeId, promotions);
    } catch (e) {
      await repo.log(jobId, "warn", `promo batch failed, falling back to per-row: ${(e as Error).message}`);
      for (const pr of promotions) {
        try { await repo.createPromotion(storeId, pr); out.promotions++; } catch (e2) { out.errors++; await repo.log(jobId, "warn", `promo: ${(e2 as Error).message}`); }
      }
    }
    if (skipped) await repo.log(jobId, "warn", `PromoFull: דולגו ${skipped} רשומות חסרות.`);
    if (promotions.length === 0) {
      out.errors++;
      await repo.log(jobId, "error", `PromoFull: לא נמצאו רשומות מבצע ב-${file.fileName ?? file.url} (סכמה לא נתמכת?). תגיות שנבדקו: Promotion/Promo/Sale.`);
    }
  } else {
    // Honest failure: never report "errors 0" for a file we could not classify.
    out.errors++;
    await repo.log(jobId, "error", `סוג קובץ לא מזוהה עבור ${file.fileName ?? file.url}: לא Stores/PriceFull/PromoFull לפי שם הקובץ או תוכן ה-XML. הקובץ לא יובא.`);
  }
  return out;
}

async function runFeed(repo: PcSupabaseRepo, feed: FeedSourceRow, args: Args): Promise<FeedOutcome> {
  const oc: FeedOutcome = { feed: feed.chain_name, status: "ok", files: 0, stores: 0, products: 0, prices: 0, promotions: 0, errors: 0, message: "" };
  const jobId = await repo.createJob(feed.id, "cron", feed.feed_kinds);
  await repo.log(jobId, "info", `מתחיל ייבוא עבור "${feed.chain_name}" (adapter=${feed.adapter ?? feed.source_type}).`);

  let discoveredUrl: string | null | undefined = undefined;
  try {
    const { files, notes, skeleton } = await discover(feed);
    for (const n of notes) await repo.log(jobId, skeleton && files.length === 0 ? "warn" : "info", n);

    if (files.length === 0) {
      oc.status = skeleton ? "skeleton" : "no-files";
      oc.message = skeleton
        ? `מתאם שלד — אין ייבוא פעיל עדיין עבור "${feed.chain_name}". ראו את ההערות בלוג.`
        : `לא נמצאו קבצים ישירים להורדה עבור "${feed.chain_name}". ראו את ההערות בלוג.`;
      await repo.log(jobId, "warn", oc.message);
      await repo.finishJob(jobId, { status: "error", message: oc.message, errors: 1 });
      await repo.markFeedRun(feed.id, "error", oc.message);
      return oc;
    }

    const max = args.maxFiles ?? feed.max_files_per_run ?? 10;
    const limited = files.slice(0, max);
    await repo.log(jobId, "info", `התגלו ${files.length} קבצים, מייבא עד ${limited.length} (max=${max}).`);

    let skippedDup = 0; // files skipped because their bytes were already imported
    for (const file of limited) {
      try {
        const buf = await downloadWithRetry(file.url, file.headers);
        const hash = sha256(buf);
        if (!args.dryRun && !args.forceReimport && (await repo.isFileAlreadyImported(hash))) {
          skippedDup++;
          await repo.log(jobId, "info", `דילוג: הקובץ ${file.fileName ?? file.url} כבר יובא (hash זהה).`);
          continue;
        }
        if (args.forceReimport && !args.dryRun && (await repo.isFileAlreadyImported(hash))) {
          await repo.log(jobId, "info", `force-reimport: הקובץ ${file.fileName ?? file.url} כבר יובא (hash זהה) אך מעובד מחדש לבקשה מפורשת.`);
        }
        const r = await importFile(repo, jobId, feed, file, buf);
        oc.files++; oc.stores += r.stores; oc.products += r.products; oc.prices += r.prices; oc.promotions += r.promotions; oc.errors += r.errors;
        const rows = r.stores + r.products + r.prices + r.promotions;
        // Only mark a file as "imported" for dedup once it actually produced
        // rows. Recording a 0-row file (parse failure, unknown kind, wrong-kind
        // detection) poisons the hash cache: the same daily file then gets
        // skipped forever as a duplicate while having imported nothing — exactly
        // the "all duplicates → 0 prices" trap. A failed file should be retried
        // on the next run, not permanently suppressed.
        if (rows > 0) {
          await repo.recordImportedFile({ feedSourceId: feed.id, jobId, fileUrl: file.url, fileName: file.fileName, contentHash: hash, byteSize: buf.length, kind: r.kind, rowsImported: rows });
          // Remember a working URL ONLY for adapters whose URLs are STABLE
          // (plain direct .gz/.xml links). Crawler/portal adapters
          // (shufersal/cerberus/nibit/matrix) hand out short-lived,
          // signed URLs — a Shufersal Azure-blob link carries a SAS token
          // (?sv=...&sig=...&se=...) that expires within hours. Persisting
          // such a URL as direct_file_url froze the feed on a stale token:
          // the next day discover() short-circuits to that one expired URL
          // (adapters.ts: `if (feed.direct_file_url) return discoverDirectUrl`)
          // and every download 403s forever. So we only cache stable URLs;
          // token adapters must re-crawl the live listing each run.
          if (discoveredUrl === undefined && URL_IS_STABLE_ADAPTER(feed)) discoveredUrl = file.url;
        } else {
          await repo.log(jobId, "warn", `הקובץ ${file.fileName ?? file.url} עובד אך הניב 0 שורות — לא נרשם כ-imported כדי לאפשר ניסיון חוזר.`);
        }
      } catch (e) {
        oc.errors++;
        // Log a sanitized URL pattern (host + path, query reduced to its key
        // names) so a future 404 shows exactly what was attempted without
        // leaking the SAS signature. A missing query string on a blob host is
        // the classic "token was dropped" symptom worth flagging.
        await repo.log(jobId, "error", `כשל בקובץ ${describeUrlPattern(file.url)}: ${(e as Error).message}`);
      }
    }

    const importedAnything = oc.stores + oc.products + oc.prices + oc.promotions > 0;
    // A run that discovered files but imported nothing must say WHY, never a bare
    // "קבצים 0 … שגיאות 0" line (which reads as a mysterious no-op). Spell out the
    // dominant reason: every file was a byte-for-byte duplicate, or every file
    // failed to download/parse.
    if (!importedAnything) {
      if (skippedDup > 0 && oc.errors === 0 && oc.files === 0) {
        // Healthy "nothing new": discovery + download worked, every file was a
        // byte-for-byte duplicate already imported. This is a SUCCESSFUL outcome
        // (not a failure) — the feed is up to date. Marking it "error" was the
        // bug that turned same-day re-runs red and skipped the mirror step.
        oc.status = "uptodate";
        oc.message =
          `uptodate: כל ${skippedDup} הקבצים שהתגלו כבר יובאו (hash זהה) — אין נתונים חדשים להוסיף. ` +
          `(התגלו ${files.length}, נבדקו ${limited.length}, כפילויות ${skippedDup}).`;
      } else {
        oc.status = "error";
        oc.message =
          `error: התגלו ${files.length} קבצים אך לא יובאו נתונים. ` +
          `קבצים שעובדו ${oc.files}, כפילויות ${skippedDup}, שגיאות ${oc.errors}. ` +
          `ראו את הערות הגילוי לעיל (פירוט קטגוריות/עוגנים) ואת שגיאות ההורדה/הפענוח בלוג.`;
      }
    } else {
      oc.status = "ok";
      oc.message = `${oc.status}: קבצים ${oc.files}, חנויות+${oc.stores}, מוצרים+${oc.products}, מחירים+${oc.prices}, מבצעים+${oc.promotions}, שגיאות ${oc.errors}.`;
    }
    // Map the per-feed outcome to the two DB statuses the repo understands. Both
    // "ok" (imported new rows) and "uptodate" (already current) are successes.
    const dbStatus = oc.status === "ok" || oc.status === "uptodate" ? "ok" : "error";
    await repo.finishJob(jobId, { status: dbStatus, stores: oc.stores, products: oc.products, prices: oc.prices, promotions: oc.promotions, errors: oc.errors, message: oc.message });
    await repo.markFeedRun(feed.id, dbStatus, oc.message, dbStatus === "ok" ? discoveredUrl ?? undefined : undefined);
    await repo.log(jobId, dbStatus === "ok" ? "info" : "error", oc.message);
  } catch (e) {
    oc.status = "error";
    oc.message = `קריסת ייבוא: ${(e as Error).message}`;
    oc.errors++;
    await repo.log(jobId, "error", oc.message);
    await repo.finishJob(jobId, { status: "error", message: oc.message, errors: 1 });
    await repo.markFeedRun(feed.id, "error", oc.message);
  }
  return oc;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log(`pc-daily-import starting — dryRun=${args.dryRun} feedId=${args.feedId ?? "all"} includeUnverified=${args.includeUnverified} adapters=${args.adapters?.join(",") ?? "all"}`);

  // Trim secrets: a trailing newline/space pasted into a GitHub secret is the
  // single most common cause of a silent connect failure before any job row.
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error(
      "\nשגיאה: חסרים סודות Supabase.\n" +
      "  נדרשים משתני הסביבה SUPABASE_URL ו-SUPABASE_SERVICE_ROLE_KEY.\n" +
      "  ב-GitHub: Settings → Secrets and variables → Actions → New repository secret.\n" +
      "  ראו docs/price-comparison-live-import.md לפרטים מלאים.\n",
    );
    process.exit(2);
  }
  if (!/^https?:\/\/.+/i.test(url)) {
    console.error(
      `\nשגיאה: SUPABASE_URL אינו כתובת תקינה (חייבת להתחיל ב-https://). התקבל: "${url.slice(0, 40)}…".\n` +
      "  ודאו שהסוד SUPABASE_URL הוא כתובת הפרויקט המלאה, למשל https://<ref>.supabase.co\n",
    );
    process.exit(2);
  }

  const repo = new PcSupabaseRepo(url, key, args.dryRun);

  // Preflight READ: one lightweight query so a bad URL/key/migration is reported
  // here with the exact PostgREST error, instead of failing opaquely before any
  // job row is ever written (which is what hid the earlier failure).
  try {
    await repo.preflight();
    console.log("Supabase preflight (read) OK — חיבור ל-pc_feed_sources תקין.");
  } catch (e) {
    console.error(
      `\nשגיאה: כשל בחיבור ל-Supabase (preflight read): ${(e as Error).message}\n` +
      "  בדקו: (1) SUPABASE_URL נכון, (2) SUPABASE_SERVICE_ROLE_KEY הוא service_role (לא anon),\n" +
      "  (3) הרצתם את deliverables/supabase_migration_price_comparison.sql כך שטבלת pc_feed_sources קיימת.\n",
    );
    process.exit(3);
  }

  // Preflight WRITE: persist a diagnostic pc_import_jobs row NOW, before listing
  // feeds. This proves the service key can actually write (RLS / grant / anon-vs-
  // service-role problems surface here with the exact error) and guarantees a
  // visible breadcrumb in Supabase even when the run later fails or matches zero
  // feeds — so the failure is diagnosable from Supabase alone, no Actions logs.
  const startedAt = new Date().toISOString();
  const diagMeta = `preflight ${startedAt} | dryRun=${args.dryRun} feedId=${args.feedId ?? "all"} maxFiles=${args.maxFiles ?? "default"} includeUnverified=${args.includeUnverified} node=${process.version}`;
  let diagJobId = -1;
  try {
    diagJobId = await repo.startDiagnosticJob(diagMeta);
    if (diagJobId >= 0) {
      console.log(`Supabase preflight (write) OK — נכתבה שורת אבחון ב-pc_import_jobs (id=${diagJobId}).`);
      await repo.log(diagJobId, "info", `preflight write OK. ${diagMeta}`);
    } else {
      console.log("Supabase preflight (write) דולג (dry-run — לא נכתב דבר).");
    }
  } catch (e) {
    console.error(
      `\nשגיאה: כשל בכתיבה ל-Supabase (preflight write): ${(e as Error).message}\n` +
      "  קריאה הצליחה אך כתיבה נכשלה — סימן מובהק למפתח anon במקום service_role,\n" +
      "  או למדיניות RLS/הרשאות שחוסמת INSERT אל pc_import_jobs.\n" +
      "  ודאו שהסוד SUPABASE_SERVICE_ROLE_KEY הוא ה-service_role key (Settings → API).\n",
    );
    process.exit(4);
  }

  // Sweep stuck jobs: a previous run that was killed mid-flight (Action timeout,
  // OOM, runner eviction) leaves its pc_import_jobs row stuck at "running"
  // forever. Mark any "running" job older than the cutoff as errored so the jobs
  // table reflects reality. This NEVER deletes data — only flips a status and
  // stamps finished_at on jobs that cannot still be live. The current run's own
  // diagnostic job (just created above) is younger than the cutoff and untouched.
  const STUCK_AFTER_MIN = Number(process.env.PC_STUCK_JOB_MINUTES || "60");
  try {
    const cutoff = new Date(Date.now() - STUCK_AFTER_MIN * 60_000).toISOString();
    const swept = await repo.markStuckJobs(cutoff, `סומן כשגיאה אוטומטית: המשימה נותרה "running" מעל ${STUCK_AFTER_MIN} דקות (ככל הנראה הריצה הקודמת נקטעה).`);
    if (swept > 0) {
      console.log(`Swept ${swept} stuck "running" job(s) older than ${STUCK_AFTER_MIN}m → error.`);
      await repo.log(diagJobId, "info", `נוקו ${swept} משימות תקועות (running > ${STUCK_AFTER_MIN} דקות).`);
    }
  } catch (e) {
    // Non-fatal: a failed sweep must not block the import itself.
    console.error(`(warn) stuck-job sweep failed: ${(e as Error).message}`);
  }

  // Helper: close the diagnostic job with a final status so the breadcrumb in
  // Supabase reflects the outcome (running → ok/error) instead of staying stuck.
  const finishDiag = async (status: "ok" | "error", message: string) => {
    if (diagJobId < 0) return;
    try {
      await repo.log(diagJobId, status === "ok" ? "info" : "error", message);
      await repo.finishJob(diagJobId, { status, message, errors: status === "error" ? 1 : 0 });
    } catch (e) {
      console.error(`(warn) could not finish diagnostic job ${diagJobId}: ${(e as Error).message}`);
    }
  };

  let feeds: FeedSourceRow[];
  try {
    // Default daily run: every ACTIVE feed (verified or not) — the importer must
    // attempt every chain the operator has switched on, then record honest
    // per-feed status. --include-unverified widens to the WHOLE table (including
    // inactive feeds) for verifying a brand-new source before activating it.
    const all = args.includeUnverified ? await repo.listAllFeeds() : await repo.listActiveFeeds();
    let filtered = args.feedId ? all.filter((f) => f.id === args.feedId) : all;
    // Regulatory-only: the daily automated import covers ONLY chains legally
    // obligated to report prices to the authorities (source_kind='regulatory').
    // Voluntary local-store submissions flow through the API path instead.
    if (args.regulatoryOnly) {
      filtered = filtered.filter((f) => (f.source_kind ?? "regulatory") === "regulatory");
    }
    // Adapter allow-list: restrict to the geo-blocked chains when running the
    // VPS import step (--adapters=matrix,web,laibcatalog). No filter by default.
    filtered = filterFeedsByAdapter(filtered, args.adapters);
    feeds = filtered;
    await repo.log(diagJobId, "info", `feed list read OK: ${all.length} ${args.includeUnverified ? "total (incl. inactive)" : "active"} feeds, ${feeds.length} after filters (feedId=${args.feedId ?? "none"}, regulatoryOnly=${args.regulatoryOnly}, adapters=${args.adapters?.join(",") ?? "all"}).`);
  } catch (e) {
    const msg = `קריאת pc_feed_sources נכשלה: ${(e as Error).message}`;
    console.error(`\nשגיאה ב${msg}\n` +
      "ודאו שהרצתם את deliverables/supabase_migration_price_comparison.sql ושמפתח השירות תקין.\n");
    await finishDiag("error", msg);
    process.exit(3);
  }

  if (feeds.length === 0) {
    // Distinguish "no active feeds at all" from "feedId matched nothing"
    // so dry_run --feed=1 surfaces the exact reason in the persisted diagnostic.
    const reason = args.adapters
      ? `אף מקור פעיל לא תואם למתאמים שנתבקשו (adapters=${args.adapters.join(",")}). ודאו שהמתאם קיים ושהמקור פעיל.`
      : args.feedId
        ? `מקור feed_id=${args.feedId} אינו קיים או אינו פעיל (השתמשו ב---include-unverified כדי לכלול גם מקורות לא פעילים).`
        : "אין מקורות פעילים לייבוא. הריצו pc-seed-feeds.ts וסמנו מקור כ'פעיל' (active=1).";
    console.log(`\n${reason}\n`);
    await finishDiag("error", reason);
    if (!args.dryRun) process.exitCode = 1;
    return;
  }

  // Bounded parallelism: process up to args.concurrency feeds at once. With 8
  // chains the previous serial loop overran the 30-min Actions timeout; running
  // a few feeds concurrently keeps total wall-clock well under the limit while
  // not hammering any single chain's portal (each feed is a different host).
  const concurrency = Math.max(1, Math.min(args.concurrency, feeds.length));
  console.log(`נמצאו ${feeds.length} מקורות לעיבוד (מקבילות=${concurrency}).`);
  const outcomes: FeedOutcome[] = new Array(feeds.length);
  let nextIndex = 0;
  const worker = async () => {
    for (;;) {
      const i = nextIndex++;
      if (i >= feeds.length) return;
      outcomes[i] = await runFeed(repo, feeds[i], args);
    }
  };
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  // Summary table for the Actions log.
  console.log("\n===== סיכום ריצה =====");
  for (const o of outcomes) {
    console.log(`- ${o.feed}: ${o.status} | קבצים=${o.files} מחירים+${o.prices} מוצרים+${o.products} חנויות+${o.stores} מבצעים+${o.promotions} שגיאות=${o.errors}`);
  }
  const okCount = outcomes.filter((o) => o.status === "ok").length;
  const upToDateCount = outcomes.filter((o) => o.status === "uptodate").length;
  // Both freshly-imported feeds and already-current ("uptodate") feeds are
  // successes: discovery + download + parse worked, there was simply nothing new
  // for the up-to-date ones. Only genuine failures (download/parse/auth/crash)
  // count against the run.
  const successCount = okCount + upToDateCount;
  const totalPrices = outcomes.reduce((s, o) => s + o.prices, 0);
  const totalErrors = outcomes.reduce((s, o) => s + o.errors, 0);
  console.log(`\nהושלם: ${okCount}/${outcomes.length} מקורות ייבאו נתונים חדשים, ${upToDateCount} כבר מעודכנים, סה"כ מחירים חדשים+${totalPrices}.`);
  if (args.dryRun) console.log("(dry-run — לא נכתב דבר ל-Supabase.)");

  const diagSummary = `סיום: ${okCount} מקורות עם נתונים חדשים, ${upToDateCount} מעודכנים, מתוך ${outcomes.length}, מחירים+${totalPrices}, שגיאות=${totalErrors}.`;
  await finishDiag(successCount > 0 ? "ok" : "error", diagSummary);

  // Exit non-zero only when NO feed succeeded — i.e. every feed hit a real
  // failure (download/parse/auth/crash). "Nothing new to import" (every file a
  // hash-duplicate) is a successful daily run and must stay green, otherwise a
  // same-day re-run turns red and the downstream mirror step is skipped.
  if (successCount === 0 && outcomes.length > 0 && !args.dryRun) process.exitCode = 1;
}

main().catch((e) => {
  console.error("pc-daily-import crashed:", e);
  process.exit(1);
});
