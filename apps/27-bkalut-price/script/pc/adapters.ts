/**
 * Source adapters for the daily price importer.
 *
 * An adapter's only job is DISCOVERY: given a feed source, return a list of
 * directly-downloadable file URLs (GZ/XML). The orchestrator downloads, hashes,
 * dedupes and imports them. Adapters never fabricate URLs — if a real file
 * cannot be discovered from public information, the adapter returns an empty
 * list together with an actionable error message describing exactly what is
 * missing, and the source is reported as "no files" rather than fake success.
 *
 * Networking uses global fetch (Node 18+). No third-party deps.
 */
import type { FeedSourceRow } from "./supabase-repo.ts";

export interface DiscoveredFile {
  url: string;
  fileName: string | null;
  isGz: boolean;
  /** Optional headers (e.g. an auth cookie) the downloader must send for this file. */
  headers?: Record<string, string>;
}

export interface DiscoveryResult {
  files: DiscoveredFile[];
  /** Non-fatal notes / actionable errors to log. */
  notes: string[];
  /** True when the adapter is a documented skeleton, not yet operational. */
  skeleton: boolean;
}

const UA = "bkalut-pc-import/1.0 (+https://github.com/l023131500-ops/bkalut-app)";

async function fetchText(url: string, timeoutMs = 30000): Promise<{ ok: boolean; status: number; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { "user-agent": UA, accept: "*/*" } });
    const text = res.ok ? await res.text() : "";
    return { ok: res.ok, status: res.status, text };
  } finally {
    clearTimeout(timer);
  }
}

// A realistic desktop browser UA. The binaprojects/laibcatalog portals are
// ASP.NET / REST endpoints that reject or stall on non-browser agents, so the
// JSON adapters below send this instead of the crawler UA used elsewhere.
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchJsonText(url: string, timeoutMs = 30000): Promise<{ ok: boolean; status: number; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": BROWSER_UA, accept: "application/json, text/plain, */*" },
    });
    const text = await res.text().catch(() => "");
    return { ok: res.ok, status: res.status, text };
  } finally {
    clearTimeout(timer);
  }
}

// HTML fetch with a real browser UA. The ASP.NET listing portals (matrixcatalog,
// the bare-IP transparency sites) stall or 403 on a crawler UA, so the HTML
// adapters below send BROWSER_UA and follow redirects (a bare host often 302s
// http→https before serving the grid).
async function fetchBrowserText(url: string, timeoutMs = 30000): Promise<{ ok: boolean; status: number; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": BROWSER_UA, accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
    });
    const text = await res.text().catch(() => "");
    return { ok: res.ok, status: res.status, text };
  } finally {
    clearTimeout(timer);
  }
}

function absolutize(href: string, base: string): string {
  try { return new URL(href, base).toString(); } catch { return href; }
}

/**
 * Decode the handful of HTML entities that appear inside hrefs. This matters a
 * lot for listing pages whose download links carry a query string: an Azure
 * blob SAS URL is rendered as `...?sv=...&amp;sig=...&amp;se=...` and the
 * `&amp;` MUST become `&`, otherwise the signature is malformed and the blob
 * returns HTTP 404. (This was the original Shufersal 404 bug.)
 */
function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

/** The bare file name (no query string, no path) for a download URL. */
function fileNameFromUrl(url: string): string | null {
  const noQuery = url.split(/[?#]/)[0];
  const last = noQuery.split("/").pop();
  return last && /\.(gz|xml)$/i.test(last) ? last : (last || null);
}

// --- minimal cookie jar -----------------------------------------------------
// We track cookies manually (global fetch does not persist them) so the Cerberus
// login → file-list → download sequence shares one authenticated session.
function mergeSetCookies(jar: Map<string, string>, res: Response): void {
  // Node's fetch exposes multiple Set-Cookie via getSetCookie() (undici).
  const anyHeaders = res.headers as Headers & { getSetCookie?: () => string[] };
  const raw: string[] = typeof anyHeaders.getSetCookie === "function"
    ? anyHeaders.getSetCookie()
    : (res.headers.get("set-cookie") ? [res.headers.get("set-cookie") as string] : []);
  for (const line of raw) {
    const pair = line.split(";")[0];
    const eq = pair.indexOf("=");
    if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}

function cookieHeader(jar: Map<string, string>): string {
  return Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
}

async function fetchWithJar(
  url: string,
  jar: Map<string, string>,
  init: RequestInit = {},
  timeoutMs = 30000,
): Promise<{ ok: boolean; status: number; text: string; res: Response }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = {
      "user-agent": UA, accept: "*/*",
      ...(jar.size ? { cookie: cookieHeader(jar) } : {}),
      ...((init.headers as Record<string, string>) || {}),
    };
    const res = await fetch(url, { ...init, headers, signal: controller.signal, redirect: "manual" });
    mergeSetCookies(jar, res);
    const text = await res.text().catch(() => "");
    return { ok: res.ok, status: res.status, text, res };
  } finally {
    clearTimeout(timer);
  }
}

/** Extract a csrf token from an HTML page or a JSON blob (Cerberus uses both). */
function extractCsrf(text: string): string | null {
  // Cerberus/publishedprices puts the token in a <meta> tag using `content=`,
  // e.g. <meta name="csrftoken" content="..."/>. Older/other portals use a
  // hidden <input ... value="...">. Match the token regardless of which
  // attribute carries it and regardless of attribute order.
  const metaContent =
    /<meta[^>]*name=["'](?:csrftoken|_token)["'][^>]*content=["']([^"']+)["']/i.exec(text)
    || /<meta[^>]*content=["']([^"']+)["'][^>]*name=["'](?:csrftoken|_token)["']/i.exec(text);
  if (metaContent) return metaContent[1];
  const inputValue =
    /name=["'](?:csrftoken|_token)["']\s+value=["']([^"']+)["']/i.exec(text)
    || /value=["']([^"']+)["']\s+name=["'](?:csrftoken|_token)["']/i.exec(text);
  if (inputValue) return inputValue[1];
  const loose = /csrf[_-]?token["']?\s*[:=]\s*["']([^"']+)["']/i.exec(text);
  return loose ? loose[1] : null;
}

/**
 * Extract downloadable file links from an HTML listing.
 *
 * Critically, we capture the WHOLE href — path AND query string — because the
 * real download URL is an Azure blob URL whose mandatory SAS token lives in the
 * query string (`?sv=...&sig=...&se=...&sp=r`). Dropping the query yields a
 * tokenless URL that the blob store answers with 404. We then HTML-decode the
 * value so `&amp;` becomes `&` and the signature stays valid.
 *
 * Returns the discovered files plus a count of raw anchors seen, so callers can
 * log "found N hrefs, kept M files" and make 404 triage obvious.
 */
function extractFileLinks(html: string, baseUrl: string): { files: DiscoveredFile[]; anchorCount: number } {
  const out = new Map<string, DiscoveredFile>();
  let anchorCount = 0;
  // 1) anchor/src links whose path component ends in .gz/.xml, keeping any query
  //    string (the SAS token). The path is matched up to the extension, then the
  //    optional `?...`/`&amp;...` query is captured greedily up to the quote.
  const attrRe = /(?:href|src)\s*=\s*["']([^"']*?\.(?:gz|xml)(?:(?:\?|&(?:amp;)?)[^"']*)?)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(html)) !== null) {
    anchorCount++;
    const raw = decodeHtmlEntities(m[1]);
    const url = absolutize(raw, baseUrl);
    out.set(url, { url, fileName: fileNameFromUrl(url), isGz: /\.gz(\?|$)/i.test(url) });
  }
  // 2) bare filenames that look like transparency files (Price/Promo/Stores...).
  //    ONLY when no full hrefs were found: a bare name absolutizes to a
  //    relative, tokenless URL that 404s against a SAS-protected blob, so it
  //    must never pollute a list that already has real hrefs. This branch is a
  //    last-resort guess for listings that print names without anchors.
  if (out.size === 0) {
    const bareRe = /\b((?:PriceFull|Price|PromoFull|Promo|StoresFull|Stores)[\w.\-]*\.(?:gz|xml))\b/gi;
    while ((m = bareRe.exec(html)) !== null) {
      const url = absolutize(m[1], baseUrl);
      if (!out.has(url)) out.set(url, { url, fileName: m[1], isGz: /\.gz$/i.test(m[1]) });
    }
  }
  return { files: Array.from(out.values()), anchorCount };
}

// A transparency file name (kind prefix + digits + .gz/.xml) as it appears
// anywhere inside an href — the file NAME, not necessarily the URL basename.
// The bare-IP/ASP portals below often link the file through a download handler
// (e.g. `Download.aspx?FileNm=PriceFull7290...gz`) where the real name lives in
// the query string, so we key discovery off the name we find inside the href.
const TRANSPARENCY_NAME_RE =
  /(?:PriceFull|Price|PromoFull|Promo|StoresFull|Stores)[A-Za-z0-9._\-]*\.(?:gz|xml)/i;

/**
 * Build a { transparencyFileName → downloadUrl } map from an HTML listing.
 *
 * For each href/src we look for a transparency file name INSIDE the (HTML-
 * decoded) href and, if present, absolutize the whole href to the download URL.
 * This handles both shapes seen in the wild:
 *   - a direct path:      href="download/2026-07-03/PriceFull7290...gz"
 *   - a handler+query:    href="/Download.aspx?FileNm=PriceFull7290...gz&..."
 * Keeping the whole href (query included) preserves any token the handler needs.
 * The name is the map key so the shared price-first selection can pick names and
 * we map back to the exact URL the page linked.
 */
export function nameToUrlFromListing(html: string, baseUrl: string): Map<string, string> {
  const map = new Map<string, string>();
  const hrefRe = /(?:href|src)\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(html)) !== null) {
    const raw = decodeHtmlEntities(m[1]);
    const nameMatch = TRANSPARENCY_NAME_RE.exec(raw);
    if (!nameMatch) continue;
    const name = nameMatch[0];
    if (!map.has(name)) map.set(name, absolutize(raw, baseUrl));
  }
  // Fallback: some listings print the name as text and link it via an opaque
  // handler with no name in the href. If we found nothing above, take the direct
  // .gz/.xml anchors extractFileLinks captures (URL basename == name there).
  if (map.size === 0) {
    for (const f of extractFileLinks(html, baseUrl).files) {
      const n = f.fileName || fileNameFromUrl(f.url);
      if (n && TRANSPARENCY_NAME_RE.test(n) && !map.has(n)) map.set(n, f.url);
    }
  }
  return map;
}

/** Append a `page` query param, respecting an existing query string. */
function withPageParam(url: string, page: number): string {
  return `${url}${url.includes("?") ? "&" : "?"}page=${page}`;
}

/**
 * Crawl a paginated HTML listing (page 1, 2, …) accumulating a name→URL map.
 * Stops when a page errors, returns no NEW names, or the page cap is hit — so a
 * single-page portal costs one request and a paginated one is bounded. Newest
 * files sit on the first pages, so the price-first selection still gets them.
 */
async function crawlListingPages(
  startUrl: string,
  maxPages: number,
  label: string,
  notes: string[],
): Promise<{ nameToUrl: Map<string, string>; pagesTried: number }> {
  const nameToUrl = new Map<string, string>();
  let pagesTried = 0;
  for (let page = 1; page <= maxPages; page++) {
    const url = page === 1 ? startUrl : withPageParam(startUrl, page);
    pagesTried++;
    const r = await fetchBrowserText(url);
    if (!r.ok) {
      notes.push(`${label} ${url} → HTTP ${r.status}.`);
      break;
    }
    const before = nameToUrl.size;
    for (const [n, u] of nameToUrlFromListing(r.text, url)) if (!nameToUrl.has(n)) nameToUrl.set(n, u);
    if (nameToUrl.size === before) break; // no new files on this page → done
  }
  return { nameToUrl, pagesTried };
}

// ---------------------------------------------------------------------------
// Shufersal — public listing at https://prices.shufersal.co.il.
//
// The page is plain server-rendered HTML (no JS needed): every row carries an
// anchor whose href is the FULL Azure blob download URL, query string and all.
// The query string holds a mandatory SAS token (`?sv=...&sig=...&se=...&sp=r`);
// the blob container is private, so a tokenless URL 404s. Our job is therefore
// pure DISCOVERY — copy each href verbatim (after HTML-decoding `&amp;`) and let
// the downloader use it as-is. We never reconstruct or guess blob paths.
//
// The category dropdown is backed by an AJAX endpoint discovered from the page's
// Main.js: GET /FileObject/UpdateCategory?catID=<N>&storeId=0 returns the same
// grid markup filtered by file type, where catID maps:
//   1=Prices 2=PricesFull 3=Promos 4=PromosFull 5=Stores  (0=All).
// We query the categories implied by feed.feed_kinds, newest first, paginate
// with &page=N, and fall back to the bare index page if the endpoint is down.
// ---------------------------------------------------------------------------
const SHUFERSAL_CAT_IDS: Record<string, number[]> = {
  Stores: [5],
  PriceFull: [2, 1], // PricesFull preferred, plain Prices as fallback
  PromoFull: [4, 3],
};

// Kind priority for discovery, INDEPENDENT of how feed_kinds happens to be
// ordered in the DB. A feed declares "Stores,PriceFull,PromoFull" but the daily
// run's whole point is to import *prices*: with a small max_files budget (e.g.
// 2) we must spend it on PriceFull first, then PromoFull, and only crawl the
// tiny Stores category last. Ordering by declaration order put Stores (cat 5)
// first and let it crowd out PriceFull → 0 prices imported. We therefore sort
// the requested kinds by this fixed priority before mapping them to cat IDs.
const SHUFERSAL_KIND_PRIORITY: Record<string, number> = { PriceFull: 0, PromoFull: 1, Stores: 2 };

export function shufersalCategoriesFor(feedKinds: string | null): number[] {
  const kinds = (feedKinds || "")
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k in SHUFERSAL_CAT_IDS);
  // Prefer price data first regardless of declaration order in feed_kinds.
  kinds.sort((a, b) => (SHUFERSAL_KIND_PRIORITY[a] ?? 99) - (SHUFERSAL_KIND_PRIORITY[b] ?? 99));
  const ids: number[] = [];
  for (const k of kinds) for (const id of SHUFERSAL_CAT_IDS[k] || []) if (!ids.includes(id)) ids.push(id);
  // Default: prefer real price data (PricesFull, then Prices) when unspecified.
  return ids.length ? ids : [2, 1];
}

async function discoverShufersal(feed: FeedSourceRow): Promise<DiscoveryResult> {
  const notes: string[] = [];
  const base = (feed.discovery_url || feed.source_url || "https://prices.shufersal.co.il").replace(/\/$/, "");
  const max = feed.max_files_per_run ?? 10;
  const files: DiscoveredFile[] = [];
  const seen = new Set<string>();
  const push = (fs: DiscoveredFile[]) => { for (const f of fs) if (!seen.has(f.url)) { seen.add(f.url); files.push(f); } };

  const cats = shufersalCategoriesFor(feed.feed_kinds);
  const maxPagesPerCat = 3; // newest files are on the first pages; cap the crawl
  let totalAnchors = 0;
  const attempted: string[] = [];
  // Per-category breakdown so a zero-files run can report exactly which typed
  // endpoint was empty vs. errored (Stores is routinely empty/stubbed).
  const catStats = new Map<number, { status: number | "err"; anchors: number; kept: number }>();
  const noteCat = (id: number, status: number | "err", anchors: number, kept: number) => {
    const s = catStats.get(id) ?? { status, anchors: 0, kept: 0 };
    s.status = status; s.anchors += anchors; s.kept += kept;
    catStats.set(id, s);
  };

  // 1) Preferred path: the typed AJAX listing endpoint, per category + page.
  //    Categories are tried in price-first priority order, so a small max_files
  //    budget is spent on PriceFull before the (often empty) Stores category.
  for (const catID of cats) {
    if (files.length >= max) break;
    for (let page = 1; page <= maxPagesPerCat && files.length < max; page++) {
      const url = `${base}/FileObject/UpdateCategory?catID=${catID}&storeId=0&page=${page}`;
      attempted.push(url);
      try {
        const r = await fetchText(url);
        if (!r.ok) { noteCat(catID, r.status, 0, 0); notes.push(`Shufersal UpdateCategory catID=${catID} page=${page} → HTTP ${r.status}.`); break; }
        const { files: found, anchorCount } = extractFileLinks(r.text, url);
        totalAnchors += anchorCount;
        const before = files.length;
        push(found);
        noteCat(catID, r.status, anchorCount, files.length - before);
        // No new links on this page → no more pages for this category.
        if (files.length === before) break;
      } catch (e) {
        noteCat(catID, "err", 0, 0);
        notes.push(`Shufersal UpdateCategory catID=${catID} page=${page} fetch error: ${(e as Error).message}`);
        break;
      }
    }
  }

  // 2) Fallback: the bare index page (covers endpoint outages / markup changes).
  if (files.length === 0) {
    for (const pageUrl of [base, `${base}/?page=1`]) {
      attempted.push(pageUrl);
      try {
        const r = await fetchText(pageUrl);
        if (!r.ok) { notes.push(`Shufersal listing ${pageUrl} → HTTP ${r.status}.`); continue; }
        const { files: found, anchorCount } = extractFileLinks(r.text, pageUrl);
        totalAnchors += anchorCount;
        push(found);
        if (files.length) break;
      } catch (e) {
        notes.push(`Shufersal listing ${pageUrl} fetch error: ${(e as Error).message}`);
      }
    }
  }

  const perCat = cats
    .map((id) => {
      const s = catStats.get(id);
      return s ? `cat${id}:HTTP${s.status}/anchors${s.anchors}/kept${s.kept}` : `cat${id}:not-reached`;
    })
    .join(" ");
  notes.push(
    `Shufersal discovery: ${files.length} download links from ${totalAnchors} anchors ` +
    `(categories=[${cats.join(",")}] price-first, pages tried=${attempted.length}; ${perCat}).`,
  );

  if (files.length === 0) {
    notes.push(
      "לא נמצאו קישורי הורדה בעמוד שופרסל. פירוט לפי קטגוריה: " + perCat + ". " +
      "כתובות שניבדקו: " + attempted.join(" , ") + ". " +
      "המתאם מחפש קישורי href המסתיימים ב-.gz/.xml כולל מחרוזת השאילתה (טוקן ה-SAS). " +
      "אם נמצאו עוגנים (anchors) אך לא נשמרו קבצים — ייתכן שתבנית הקישור השתנתה. " +
      "כפתרון עוקף ניתן להזין כתובת הורדה ישירה (כולל ?sv=...&sig=...) בשדה direct_file_url.",
    );
  }
  return { files: files.slice(0, max), notes, skeleton: false };
}

// ---------------------------------------------------------------------------
// Cerberus / publishedprices.co.il — the public price-transparency portal used
// by most Israeli chains (Rami Levy, Osher Ad, Yohananof, Tiv Taam, Hazi Hinam,
// Carrefour, ...). Access is a documented public flow that the law requires
// chains to provide: GET /login for a CSRF token + session cookie, POST
// /login/user with the chain username and (usually empty) password, then POST
// /file/json/dir for the JSON file list. Files download from /file/d/<name>.
//
// Credentials come ONLY from env/GitHub secrets, never code:
//   - username: pc_feed_sources.auth_user (public, set by admin)
//   - password: env PC_CERBERUS_PASSWORD_<USERNAME> (uppercased) or
//                PC_CERBERUS_PASSWORD; defaults to "" — empty is correct for
//                most public chains. No secret pasted in chat is ever hardcoded.
//
// On any failure (portal down, auth rejected) we return an empty file list with
// an actionable note — the orchestrator reports honest "no files", never fake
// success.
// ---------------------------------------------------------------------------
function cerberusPassword(authUser: string | null): string {
  if (authUser) {
    const key = `PC_CERBERUS_PASSWORD_${authUser.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
    if (process.env[key] != null) return String(process.env[key]);
  }
  if (process.env.PC_CERBERUS_PASSWORD != null) return String(process.env.PC_CERBERUS_PASSWORD);
  return ""; // most public chains use an empty password
}

function isTransparencyFile(name: string): boolean {
  return /(price|promo|stores?)[\w.\-]*\.(gz|xml)$/i.test(name);
}

async function discoverCerberus(feed: FeedSourceRow): Promise<DiscoveryResult> {
  const notes: string[] = [];
  const base = (feed.discovery_url || "https://url.publishedprices.co.il").replace(/\/$/, "");
  const username = feed.auth_user;
  if (!username) {
    notes.push(`מתאם Cerberus עבור "${feed.chain_name}": חסר auth_user (שם המשתמש של הרשת בפורטל). הזינו אותו באדמין.`);
    return { files: [], notes, skeleton: false };
  }
  const jar = new Map<string, string>();
  try {
    // 1) GET /login for CSRF token + initial session cookie.
    const login = await fetchWithJar(`${base}/login`, jar);
    if (login.status >= 500) {
      notes.push(`Cerberus ${base}/login → HTTP ${login.status} (הפורטל אינו זמין כעת).`);
      return { files: [], notes, skeleton: false };
    }
    const csrf = extractCsrf(login.text);
    if (!csrf) notes.push("Cerberus: לא נמצא csrftoken בעמוד ההתחברות — ממשיכים ללא טוקן (ייתכן שייכשל).");

    // 2) POST /login/user with username + (usually empty) password.
    const form = new URLSearchParams();
    form.set("username", username);
    form.set("password", cerberusPassword(username));
    if (csrf) form.set("csrftoken", csrf);
    const auth = await fetchWithJar(`${base}/login/user`, jar, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", ...(csrf ? { "x-csrf-token": csrf } : {}) },
      body: form.toString(),
    });
    // The portal answers 302 → /file on success; an authenticated cookie is the
    // real signal. A failed login redirects back to /login.
    const loginLoc = auth.res.headers.get("location") || "";
    const authed = jar.size > 0 && !/\/login(\b|$)/.test(loginLoc);
    if (!authed && auth.status >= 400) {
      notes.push(
        `Cerberus: ההתחברות עבור "${username}" נכשלה (HTTP ${auth.status}). ` +
        "אם הרשת דורשת סיסמה, הגדירו את הסוד PC_CERBERUS_PASSWORD_" +
        `${username.toUpperCase().replace(/[^A-Z0-9]/g, "_")} ב-GitHub Actions.`,
      );
      return { files: [], notes, skeleton: false };
    }

    // 3) GET /file to obtain a FRESH csrf token bound to the authenticated
    //    session. The portal rotates the token after login, so reusing the
    //    pre-login token makes /file/json/dir answer "CSRF security check failed".
    const filePage = await fetchWithJar(`${base}/file`, jar, {}, 30000);
    const csrf2 = extractCsrf(filePage.text) || csrf;

    // 4) POST /file/json/dir for the file list (JSON). This is a DataTables
    //    server-side endpoint: it REQUIRES the full sEcho/iColumns/mDataProp_*
    //    parameter set, otherwise it returns an EMPTY aaData with no error
    //    (this was the "0 files" bug). `cd=/` lists the chain root; a large
    //    iDisplayLength fetches everything in one page (we filter + cap after).
    const dirForm = new URLSearchParams();
    dirForm.set("sEcho", "1");
    dirForm.set("iColumns", "5");
    dirForm.set("sColumns", ",,,,");
    dirForm.set("iDisplayStart", "0");
    dirForm.set("iDisplayLength", "100000");
    dirForm.set("mDataProp_0", "fname");
    dirForm.set("mDataProp_1", "typeLabel");
    dirForm.set("mDataProp_2", "size");
    dirForm.set("mDataProp_3", "ftime");
    dirForm.set("mDataProp_4", "");
    dirForm.set("sSearch", "");
    dirForm.set("bRegex", "false");
    dirForm.set("iSortingCols", "0");
    dirForm.set("cd", "/");
    if (csrf2) dirForm.set("csrftoken", csrf2);
    const dir = await fetchWithJar(`${base}/file/json/dir`, jar, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
        "x-requested-with": "XMLHttpRequest",
        ...(csrf2 ? { "x-csrf-token": csrf2 } : {}),
      },
      body: dirForm.toString(),
    });
    if (!dir.text) {
      notes.push(`Cerberus: רשימת הקבצים ריקה עבור "${username}" (HTTP ${dir.status}).`);
      return { files: [], notes, skeleton: false };
    }

    // Parse the JSON listing. Cerberus DataTables returns
    // { aaData: [{ fname, ftime, ... }] }; older shapes use name/FileNm or a
    // plain array of names. Be liberal.
    const names = new Set<string>();
    try {
      const json = JSON.parse(dir.text);
      if (json && typeof json === "object" && json.error) {
        notes.push(`Cerberus: הפורטל החזיר שגיאה עבור "${username}": ${json.error}.`);
      }
      const rows: any[] = Array.isArray(json) ? json : (json.aaData || json.data || json.files || []);
      for (const r of rows) {
        const n = typeof r === "string" ? r : (r?.fname || r?.name || r?.FileNm || r?.DT_RowId || r?.[0]);
        if (typeof n === "string" && isTransparencyFile(n)) names.add(n.trim());
      }
    } catch {
      // Fallback: scrape file names directly from the response text.
      const m = dir.text.match(/\b((?:Price|PriceFull|Promo|PromoFull|Stores|StoresFull)[\w.\-]*\.(?:gz|xml))\b/gi);
      for (const n of m || []) names.add(n);
    }

    if (names.size === 0) {
      notes.push(
        `Cerberus: לא נמצאו קובצי מחירים/מבצעים/חנויות עבור "${username}". ` +
        "ייתכן שהפורטל החזיר דף ביניים או שצריך סיסמה. אפשר לחלופין להעלות קובץ ידנית באדמין.",
      );
      return { files: [], notes, skeleton: false };
    }

    // A chain root holds thousands of hourly snapshots. We do NOT want all of
    // them — we want the NEWEST file of each wanted kind per store branch. The
    // file name encodes kind + chain + store + timestamp, e.g.
    //   PriceFull7290058140886-001-044-20260625-080016.gz
    //   Stores7290058140886-000-20260625-090002.xml
    // We group by (kind, storeSegment) and keep the lexicographically-latest
    // name in each group (timestamps sort correctly as YYYYMMDD-HHMMSS).
    const wantedKinds = (feed.feed_kinds || "PriceFull,PromoFull,Stores")
      .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    const kindOf = (name: string): string | null => {
      const m = /^(PriceFull|Price|PromoFull|Promo|StoresFull|Stores)/i.exec(name);
      return m ? m[1].toLowerCase() : null;
    };
    const storeKeyOf = (name: string): string => {
      // everything up to the trailing -YYYYMMDD-HHMMSS timestamp
      return name.replace(/-?\d{8}-?\d{0,6}\.(gz|xml)$/i, "").toLowerCase();
    };
    const wanted = (k: string | null): boolean => {
      if (!k) return false;
      if (wantedKinds.includes(k)) return true;
      // "pricefull" satisfies a "price" request and vice-versa for full coverage
      if (wantedKinds.includes("pricefull") && k === "price") return false;
      if (wantedKinds.includes("price") && k === "pricefull") return true;
      if (wantedKinds.includes("promofull") && k === "promo") return false;
      if (wantedKinds.includes("promo") && k === "promofull") return true;
      if (wantedKinds.includes("stores") && k === "storesfull") return true;
      return false;
    };
    const latestByGroup = new Map<string, string>();
    for (const name of names) {
      const k = kindOf(name);
      if (!wanted(k)) continue;
      const group = `${k}|${storeKeyOf(name)}`;
      const prev = latestByGroup.get(group);
      if (!prev || name > prev) latestByGroup.set(group, name);
    }
    // Fallback: if kind filtering produced nothing (unexpected naming), keep the
    // newest handful of whatever transparency files exist.
    let chosen = Array.from(latestByGroup.values());
    if (chosen.length === 0) chosen = Array.from(names).sort().reverse();

    // Allocate the per-run file budget BY KIND so prices are never starved.
    // The previous logic sorted names lexicographically and sliced, which let
    // "PromoFull..." (sorts before "PriceFull...") consume the entire budget and
    // import 0 prices — contradicting the project priority "קודם להזרים נתונים"
    // (prices first). We bucket by kind, sort each newest-first, then fill the
    // budget in priority order: Stores (cheap, needed to resolve branches) →
    // PriceFull (the core data) → PromoFull (secondary).
    const max = feed.max_files_per_run ?? 10;
    const bucket = (pred: (k: string) => boolean) =>
      chosen.filter((n) => { const k = kindOf(n); return !!k && pred(k); }).sort().reverse();
    const storesFiles = bucket((k) => k === "stores" || k === "storesfull");
    const priceFiles = bucket((k) => k === "price" || k === "pricefull");
    const promoFiles = bucket((k) => k === "promo" || k === "promofull");
    const picked: string[] = [];
    const take = (arr: string[], n: number) => { for (const x of arr) { if (picked.length >= max || n <= 0) break; picked.push(x); n--; } };
    // At most 1 Stores file (it lists every branch in one document).
    take(storesFiles, Math.min(1, storesFiles.length));
    // Give prices the lion's share of the remaining budget (at least 60%).
    const remainingAfterStores = max - picked.length;
    const priceBudget = Math.max(1, Math.ceil(remainingAfterStores * 0.7));
    take(priceFiles, priceBudget);
    // Promotions fill whatever is left.
    take(promoFiles, max - picked.length);
    // If still under budget (e.g. one kind absent), top up from any remaining.
    if (picked.length < max) {
      const rest = chosen.filter((n) => !picked.includes(n)).sort().reverse();
      take(rest, max - picked.length);
    }

    // Carry the authenticated cookie to each download URL.
    const cookie = cookieHeader(jar);
    const files: DiscoveredFile[] = picked.map((name) => ({
      url: `${base}/file/d/${encodeURIComponent(name)}`,
      fileName: name,
      isGz: /\.gz$/i.test(name),
      headers: cookie ? { cookie } : undefined,
    }));
    notes.push(`Cerberus: התחברות הצליחה עבור "${username}", סה"כ ${names.size} קבצים בספרייה, נבחרו ${files.length} (Stores=${storesFiles.length ? Math.min(1, storesFiles.length) : 0}, PriceFull=${picked.filter((n)=>{const k=kindOf(n);return k==="price"||k==="pricefull";}).length}, PromoFull=${picked.filter((n)=>{const k=kindOf(n);return k==="promo"||k==="promofull";}).length}).`);
    return { files, notes, skeleton: false };
  } catch (e) {
    // Surface the underlying cause (undici wraps everything as "fetch failed").
    // This makes the difference between a TLS-chain failure
    // (UNABLE_TO_VERIFY_LEAF_SIGNATURE / ERR_TLS_*) and a real network/geo block
    // (ENOTFOUND / ECONNREFUSED / ETIMEDOUT / UND_ERR_CONNECT_TIMEOUT) visible
    // in the Actions log instead of an opaque "fetch failed".
    const err = e as Error & { cause?: { code?: string; message?: string } };
    const cause = err.cause?.code || err.cause?.message || "";
    notes.push(
      `Cerberus: שגיאת רשת עבור "${feed.chain_name}": ${err.message}` +
      (cause ? ` (cause: ${cause})` : "") +
      ` [host=${base}, NODE_EXTRA_CA_CERTS=${process.env.NODE_EXTRA_CA_CERTS ? "set" : "unset"}].`,
    );
    return { files: [], notes, skeleton: false };
  }
}

// ---------------------------------------------------------------------------
// Matrix / Nibit — the open ASP.NET listing at
// http://matrixcatalog.co.il/NBCompetitionRegulations.aspx.
//
// The page renders one <tr>/anchor per file for ALL chains at once (Victory,
// Machsanei HaShuk, H.Cohen, ...); the anchor's basename is a standard
// transparency file name that embeds the chain id, e.g.
//   PriceFull7290696200003-001-202607020800.gz
//   StoresFull7290696200003-000-202607020800.gz
// The file itself downloads from a fixed folder:
//   <origin>/CompetitionRegulationsFiles/latest/<fileName>
// (confirmed against the reference Nibit scrapers). So discovery is: GET the
// page, collect every transparency file name, keep only this chain's (name
// contains chain_id), select price-first, and build the /latest/ download URLs.
//
// chain_id comes from feed.chain_id, falling back to a ?code=/?edi= query param
// on discovery_url. The portal geo-blocks non-Israeli source IPs (TLS reset),
// so it cannot be live-probed from CI/dev outside Israel — it runs from the
// Israeli production VPS. Parsing/selection is covered by unit tests against a
// captured-shape fixture.
// ---------------------------------------------------------------------------
const MATRIX_DEFAULT_PAGE = "http://matrixcatalog.co.il/NBCompetitionRegulations.aspx";
const MATRIX_DOWNLOAD_PATH = "/CompetitionRegulationsFiles/latest";

function matrixChainId(feed: FeedSourceRow): string | null {
  if (feed.chain_id) return feed.chain_id;
  const m = /[?&](?:code|edi)=([^&]+)/i.exec(feed.discovery_url || "");
  return m ? decodeURIComponent(m[1]).replace(/[^0-9]/g, "") || null : null;
}

/**
 * Pull bare transparency file names out of a listing page's HTML. Anchored on
 * the kind prefix (PriceFull/Price/PromoFull/Promo/StoresFull/Stores) so it
 * captures the file name regardless of whether the anchor href is a bare name,
 * a relative /latest/ path, or a Download.aspx?file=... query — in every case
 * the name we want is the substring starting at the kind word.
 */
export function transparencyFileNames(html: string): string[] {
  const out = new Set<string>();
  const re = /(PriceFull|PricesFull|Price|Prices|PromoFull|PromosFull|Promo|Promos|StoresFull|Stores)([A-Za-z0-9._\-]*)\.(gz|xml)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.add(`${m[1]}${m[2]}.${m[3]}`);
  return Array.from(out);
}

export async function discoverMatrixCatalog(feed: FeedSourceRow): Promise<DiscoveryResult> {
  const notes: string[] = [];
  const page = feed.discovery_url || feed.source_url || MATRIX_DEFAULT_PAGE;
  let origin: string;
  try { origin = new URL(page).origin; } catch { origin = "http://matrixcatalog.co.il"; }
  const chainId = matrixChainId(feed);
  const max = feed.max_files_per_run ?? 10;
  try {
    const r = await fetchBrowserText(page);
    if (!r.ok) {
      notes.push(`Matrix/Nibit ${page} → HTTP ${r.status} (הפורטל אינו זמין כעת).`);
      return { files: [], notes, skeleton: false };
    }
    const allNames = transparencyFileNames(r.text);
    if (allNames.length === 0) {
      notes.push(
        `מתאם Matrix/Nibit עבור "${feed.chain_name}": לא נמצאו שמות קובצי שקיפות בעמוד ${page}. ` +
        "ייתכן שהרשימה נטענת ב-JavaScript או שהמבנה השתנה. אפשר להזין כתובת הורדה ישירה ב-direct_file_url.",
      );
      return { files: [], notes, skeleton: false };
    }
    const names = chainId ? allNames.filter((n) => n.includes(chainId)) : allNames;
    if (names.length === 0) {
      notes.push(
        `Matrix/Nibit עבור "${feed.chain_name}": נמצאו ${allNames.length} קבצים בעמוד אך אף אחד אינו תואם chain_id=${chainId}. ` +
        "ודאו ש-chain_id של הרשת נכון (מופיע בשם הקובץ).",
      );
      return { files: [], notes, skeleton: false };
    }
    const sel = selectTransparencyFiles(names, feed.feed_kinds, max);
    if (sel.picked.length === 0) {
      notes.push(`Matrix/Nibit עבור "${feed.chain_name}": לא נמצאו קובצי מחירים/מבצעים/חנויות מבין ${names.length} קבצים.`);
      return { files: [], notes, skeleton: false };
    }
    const dlBase = `${origin}${MATRIX_DOWNLOAD_PATH}`;
    const files: DiscoveredFile[] = sel.picked.map((name) => ({
      url: `${dlBase}/${encodeURIComponent(name)}`,
      fileName: name,
      isGz: /\.gz$/i.test(name),
    }));
    notes.push(`Matrix/Nibit עבור "${feed.chain_name}": ${allNames.length} קבצים בעמוד, ${names.length} של הרשת (chain_id=${chainId ?? "כל הרשתות"}), נבחרו ${files.length} (Stores=${sel.counts.stores}, PriceFull=${sel.counts.price}, PromoFull=${sel.counts.promo}).`);
    return { files, notes, skeleton: false };
  } catch (e) {
    const err = e as Error & { cause?: { code?: string; message?: string } };
    const cause = err.cause?.code || err.cause?.message || "";
    notes.push(
      `Matrix/Nibit: שגיאת רשת עבור "${feed.chain_name}": ${err.message}${cause ? ` (cause: ${cause})` : ""} [host=${origin}]. ` +
      "ייתכן שהפורטל חוסם גישה מחוץ לישראל (geo-block) — המתאם יפעל מה-VPS הישראלי.",
    );
    return { files: [], notes, skeleton: false };
  }
}

// ---------------------------------------------------------------------------
// Generic web listing — a chain that publishes its transparency files on its
// own bare HTML page (no JSON API, no per-type category endpoint). Netiv
// HaChesed (incl. ברכל) is the live example: a bare-IP host that serves an
// index of anchors, each href a transparency file downloaded from
// <base>/<href>. We GET the page, extract the .gz/.xml anchors (absolutized to
// full URLs), optionally keep only this chain's files (name contains chain_id),
// and select price-first. URLs are per-file (timestamped), never cached.
// ---------------------------------------------------------------------------
export async function discoverGenericWeb(feed: FeedSourceRow): Promise<DiscoveryResult> {
  const notes: string[] = [];
  const base = feed.discovery_url || feed.source_url;
  if (!base) {
    notes.push(`מתאם web עבור "${feed.chain_name}": חסרה כתובת discovery_url/source_url. הוסיפו את עמוד הרשימה הציבורי באדמין.`);
    return { files: [], notes, skeleton: false };
  }
  const max = feed.max_files_per_run ?? 10;
  try {
    const r = await fetchBrowserText(base);
    if (!r.ok) {
      notes.push(`web listing ${base} → HTTP ${r.status} (האתר אינו זמין כעת — ייתכן שמושבת בשבת/חג).`);
      return { files: [], notes, skeleton: false };
    }
    const { files: found, anchorCount } = extractFileLinks(r.text, base);
    // Map each discovered file NAME → its full download URL, so the shared
    // price-first selection (which works on names) can pick names and we map
    // back to the real URL the page linked to.
    const nameToUrl = new Map<string, string>();
    for (const f of found) {
      const n = f.fileName || fileNameFromUrl(f.url);
      if (n && !nameToUrl.has(n)) nameToUrl.set(n, f.url);
    }
    let names = Array.from(nameToUrl.keys());
    // If some names carry this chain's id, narrow to them; otherwise keep all
    // (a chain's own site typically lists only its files).
    if (feed.chain_id && names.some((n) => n.includes(feed.chain_id!))) {
      names = names.filter((n) => n.includes(feed.chain_id!));
    }
    const sel = selectTransparencyFiles(names, feed.feed_kinds, max);
    const picked = sel.picked.length ? sel.picked : names.slice(0, max);
    const files: DiscoveredFile[] = picked
      .map((n) => ({ url: nameToUrl.get(n)!, fileName: n, isGz: /\.gz$/i.test(n) }))
      .filter((f) => !!f.url);
    notes.push(`web discovery עבור "${feed.chain_name}": ${anchorCount} עוגנים, ${nameToUrl.size} קבצים בעמוד, נבחרו ${files.length} (Stores=${sel.counts.stores}, PriceFull=${sel.counts.price}, PromoFull=${sel.counts.promo}).`);
    if (files.length === 0) {
      notes.push(
        `מתאם web עבור "${feed.chain_name}": לא נמצאו קישורי GZ/XML בעמוד ${base}. ` +
        "ייתכן שהרשימה נטענת ב-JavaScript. אפשר להזין כתובת הורדה ישירה ב-direct_file_url.",
      );
    }
    return { files, notes, skeleton: false };
  } catch (e) {
    const err = e as Error & { cause?: { code?: string; message?: string } };
    const cause = err.cause?.code || err.cause?.message || "";
    notes.push(`web: שגיאת רשת עבור "${feed.chain_name}": ${err.message}${cause ? ` (cause: ${cause})` : ""} [host=${base}].`);
    return { files: [], notes, skeleton: false };
  }
}

// ---------------------------------------------------------------------------
// Generic direct-URL adapter: use direct_file_url (preferred) or source_url
// as-is. This is the path an admin uses after pasting a verified GZ/XML URL.
// ---------------------------------------------------------------------------
function discoverDirectUrl(feed: FeedSourceRow): DiscoveryResult {
  const url = feed.direct_file_url || feed.source_url;
  if (!url) {
    return {
      files: [],
      notes: [`מקור "${feed.chain_name}" מסוג URL ללא direct_file_url/source_url — הזינו כתובת קובץ ישירה (.gz/.xml) באדמין.`],
      skeleton: false,
    };
  }
  return {
    files: [{ url, fileName: url.split("/").pop() || null, isGz: /\.gz(\?|$)/i.test(url) || feed.feed_format === "gz" }],
    notes: [],
    skeleton: false,
  };
}

// ---------------------------------------------------------------------------
// OpenIsraeliSupermarkets external-provider mode (optional). If an admin sets
// adapter="openisrael" and provides a direct file/API URL in source_url, we
// treat it as a generic direct download. The project itself is a Python tool;
// we do not bundle or invoke it here. Documented in the live-import guide.
// ---------------------------------------------------------------------------
function discoverOpenIsrael(feed: FeedSourceRow): DiscoveryResult {
  if (feed.source_url || feed.direct_file_url) return discoverDirectUrl(feed);
  return {
    files: [],
    notes: [
      `מתאם openisrael עבור "${feed.chain_name}": לא הוגדרה כתובת. ` +
      "השתמשו בכלי OpenIsraeliSupermarkets החיצוני כדי לייצא קובץ/להעמיד API, " +
      "ואז הזינו את הכתובת הישירה ב-source_url. ראו docs/price-comparison-live-import.md.",
    ],
    skeleton: true,
  };
}

// ---------------------------------------------------------------------------
// Shared transparency-file selection, factored out for the JSON-portal adapters
// below (binaprojects, laibcatalog). Given a flat list of file NAMES it applies
// the same price-first budgeting Cerberus uses: group by (kind, store branch),
// keep the newest name per group, then fill feed.max_files_per_run preferring
// one Stores file → PriceFull (≥70% of the remaining budget) → PromoFull. The
// chain transparency naming is identical across these portals, e.g.
//   PriceFull7290058148776-319-202606301003.gz
//   StoresFull7290058148776-000-202606301003.xml
// so the lexicographically-latest name in a group is the freshest snapshot.
// ---------------------------------------------------------------------------
function kindOfFile(name: string): string | null {
  const m = /^(PriceFull|Price|PromoFull|Promo|StoresFull|Stores)/i.exec(name);
  return m ? m[1].toLowerCase() : null;
}

function storeKeyOf(name: string): string {
  // strip the trailing timestamp (cerberus: -YYYYMMDD-HHMMSS, bina: -YYYYMMDDHHMM)
  return name.replace(/-?\d{8}-?\d{0,6}\.(gz|xml)$/i, "").toLowerCase();
}

export interface KindSelection {
  picked: string[];
  total: number;
  counts: { stores: number; price: number; promo: number };
}

export function selectTransparencyFiles(
  allNames: Iterable<string>,
  feedKinds: string | null,
  max: number,
): KindSelection {
  const names = new Set<string>();
  for (const n of allNames) if (typeof n === "string" && isTransparencyFile(n)) names.add(n.trim());

  const wantedKinds = (feedKinds || "PriceFull,PromoFull,Stores")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const wanted = (k: string | null): boolean => {
    if (!k) return false;
    if (wantedKinds.includes(k)) return true;
    if (wantedKinds.includes("price") && k === "pricefull") return true;
    if (wantedKinds.includes("promo") && k === "promofull") return true;
    if (wantedKinds.includes("stores") && k === "storesfull") return true;
    return false;
  };

  const latestByGroup = new Map<string, string>();
  for (const name of names) {
    const k = kindOfFile(name);
    if (!wanted(k)) continue;
    const group = `${k}|${storeKeyOf(name)}`;
    const prev = latestByGroup.get(group);
    if (!prev || name > prev) latestByGroup.set(group, name);
  }
  let chosen = Array.from(latestByGroup.values());
  if (chosen.length === 0) chosen = Array.from(names).sort().reverse();

  const bucket = (pred: (k: string) => boolean) =>
    chosen.filter((n) => { const k = kindOfFile(n); return !!k && pred(k); }).sort().reverse();
  const storesFiles = bucket((k) => k === "stores" || k === "storesfull");
  const priceFiles = bucket((k) => k === "price" || k === "pricefull");
  const promoFiles = bucket((k) => k === "promo" || k === "promofull");

  const picked: string[] = [];
  const take = (arr: string[], n: number) => { for (const x of arr) { if (picked.length >= max || n <= 0) break; picked.push(x); n--; } };
  take(storesFiles, Math.min(1, storesFiles.length));
  const remainingAfterStores = max - picked.length;
  const priceBudget = Math.max(1, Math.ceil(remainingAfterStores * 0.7));
  take(priceFiles, priceBudget);
  take(promoFiles, max - picked.length);
  if (picked.length < max) {
    const rest = chosen.filter((n) => !picked.includes(n)).sort().reverse();
    take(rest, max - picked.length);
  }

  const isStores = (n: string) => { const k = kindOfFile(n); return k === "stores" || k === "storesfull"; };
  const isPrice = (n: string) => { const k = kindOfFile(n); return k === "price" || k === "pricefull"; };
  const isPromo = (n: string) => { const k = kindOfFile(n); return k === "promo" || k === "promofull"; };
  return {
    picked,
    total: names.size,
    counts: { stores: picked.filter(isStores).length, price: picked.filter(isPrice).length, promo: picked.filter(isPromo).length },
  };
}

/** Pull the file-name field out of a JSON file record (portals vary the key). */
export function fileNameField(row: unknown): string | null {
  if (typeof row === "string") return row.trim() || null;
  if (row && typeof row === "object") {
    const r = row as Record<string, unknown>;
    for (const key of ["FileNm", "fname", "name", "FileName", "fileName"]) {
      const v = r[key];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
  }
  return null;
}

/** Parse a portal JSON body into the array of file records, tolerating shapes. */
export function parseFileRows(text: string): unknown[] | null {
  try {
    const json = JSON.parse(text);
    if (Array.isArray(json)) return json;
    if (json && typeof json === "object") {
      const j = json as Record<string, unknown>;
      for (const key of ["aaData", "data", "files", "Files", "result", "rows"]) {
        if (Array.isArray(j[key])) return j[key] as unknown[];
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// binaprojects — each chain has its own subdomain whose MainIO_Hok.aspx returns
// a JSON array of file objects ({ FileNm, Store, TypeFile, DateFile, ... }).
// discovery_url holds the full MainIO_Hok.aspx URL.
//
// The file itself is served from `${origin}/Download/<name>` (verified live:
// 200 application/x-gzip). The portal's own `Download.aspx?FileNm=<name>` link
// is NOT the file — it returns a JSON pointer `[{"SPath":".../Download/<name>"}]`
// — so we build the direct `/Download/` URL the SPath resolves to. URLs are
// stable (no SAS/token), so the list is fetched live and selected with the
// shared price-first logic.
// ---------------------------------------------------------------------------
async function discoverBinaprojects(feed: FeedSourceRow): Promise<DiscoveryResult> {
  const notes: string[] = [];
  const disc = feed.discovery_url || feed.source_url;
  if (!disc) {
    notes.push(`מתאם binaprojects עבור "${feed.chain_name}": חסרה discovery_url (כתובת MainIO_Hok.aspx). הוסיפו אותה באדמין.`);
    return { files: [], notes, skeleton: true };
  }
  let base: string;
  try { base = new URL(disc).origin; } catch {
    notes.push(`מתאם binaprojects עבור "${feed.chain_name}": discovery_url אינה כתובת תקינה: ${disc}.`);
    return { files: [], notes, skeleton: true };
  }
  const max = feed.max_files_per_run ?? 10;
  try {
    const r = await fetchJsonText(disc);
    if (!r.ok) {
      notes.push(`binaprojects ${disc} → HTTP ${r.status} (פורטל binaprojects אינו זמין כעת).`);
      return { files: [], notes, skeleton: true };
    }
    const rows = parseFileRows(r.text);
    if (!rows) {
      notes.push(`binaprojects עבור "${feed.chain_name}": תגובת ה-JSON לא נפענחה (HTTP ${r.status}). ייתכן שהפורטל החזיר דף ביניים.`);
      return { files: [], notes, skeleton: true };
    }
    const names = rows.map(fileNameField).filter((n): n is string => !!n);
    if (names.length === 0) {
      notes.push(`binaprojects עבור "${feed.chain_name}": רשימת הקבצים ריקה (${rows.length} רשומות, 0 שמות קבצים). ייתכן ששדה שם הקובץ שונה.`);
      return { files: [], notes, skeleton: true };
    }
    const sel = selectTransparencyFiles(names, feed.feed_kinds, max);
    if (sel.picked.length === 0) {
      notes.push(`binaprojects עבור "${feed.chain_name}": לא נמצאו קובצי מחירים/מבצעים/חנויות מבין ${names.length} קבצים.`);
      return { files: [], notes, skeleton: false };
    }
    const files: DiscoveredFile[] = sel.picked.map((name) => ({
      url: `${base}/Download/${encodeURIComponent(name)}`,
      fileName: name,
      isGz: /\.gz$/i.test(name),
    }));
    notes.push(`binaprojects עבור "${feed.chain_name}": ${sel.total} קבצי שקיפות בפורטל, נבחרו ${files.length} (Stores=${sel.counts.stores}, PriceFull=${sel.counts.price}, PromoFull=${sel.counts.promo}).`);
    return { files, notes, skeleton: false };
  } catch (e) {
    const err = e as Error & { cause?: { code?: string; message?: string } };
    const cause = err.cause?.code || err.cause?.message || "";
    notes.push(`binaprojects: שגיאת רשת עבור "${feed.chain_name}": ${err.message}${cause ? ` (cause: ${cause})` : ""} [host=${base}].`);
    return { files: [], notes, skeleton: true };
  }
}

// ---------------------------------------------------------------------------
// laibcatalog — REST portal. discovery_url is
// `https://laibcatalog.co.il/webapi/api/getfiles?edi=<chain_id>` and returns a
// JSON array of file records. Files download from
// `https://laibcatalog.co.il/webapi/<chain_id>/<filename>`. chain_id comes from
// feed.chain_id, falling back to the `edi=` query param of discovery_url.
//
// NOTE: this portal (82.80.16.207) resets the TLS connection for non-Israeli
// source IPs (geo-block), so it cannot be live-probed from CI/dev outside
// Israel — it works from the Israeli production VPS. The parsing/selection is
// fully exercised by unit tests against a captured-shape fixture.
// ---------------------------------------------------------------------------
const LAIBCATALOG_BASE = "https://laibcatalog.co.il/webapi";

function laibChainId(feed: FeedSourceRow): string | null {
  if (feed.chain_id) return feed.chain_id;
  const m = /[?&]edi=([^&]+)/i.exec(feed.discovery_url || "");
  return m ? decodeURIComponent(m[1]) : null;
}

async function discoverLaibcatalog(feed: FeedSourceRow): Promise<DiscoveryResult> {
  const notes: string[] = [];
  const disc = feed.discovery_url || feed.source_url;
  if (!disc) {
    notes.push(`מתאם laibcatalog עבור "${feed.chain_name}": חסרה discovery_url (כתובת getfiles?edi=...). הוסיפו אותה באדמין.`);
    return { files: [], notes, skeleton: true };
  }
  const chainId = laibChainId(feed);
  if (!chainId) {
    notes.push(`מתאם laibcatalog עבור "${feed.chain_name}": לא ניתן לקבוע chain_id (לא ב-feed.chain_id ולא בפרמטר edi=).`);
    return { files: [], notes, skeleton: true };
  }
  const max = feed.max_files_per_run ?? 10;
  try {
    const r = await fetchJsonText(disc);
    if (!r.ok) {
      notes.push(`laibcatalog ${disc} → HTTP ${r.status} (פורטל laibcatalog אינו זמין כעת).`);
      return { files: [], notes, skeleton: true };
    }
    const rows = parseFileRows(r.text);
    if (!rows) {
      notes.push(`laibcatalog עבור "${feed.chain_name}": תגובת ה-JSON לא נפענחה (HTTP ${r.status}).`);
      return { files: [], notes, skeleton: true };
    }
    const names = rows.map(fileNameField).filter((n): n is string => !!n);
    if (names.length === 0) {
      notes.push(`laibcatalog עבור "${feed.chain_name}": רשימת הקבצים ריקה (${rows.length} רשומות).`);
      return { files: [], notes, skeleton: true };
    }
    const sel = selectTransparencyFiles(names, feed.feed_kinds, max);
    if (sel.picked.length === 0) {
      notes.push(`laibcatalog עבור "${feed.chain_name}": לא נמצאו קובצי שקיפות מבין ${names.length} קבצים.`);
      return { files: [], notes, skeleton: false };
    }
    const files: DiscoveredFile[] = sel.picked.map((name) => ({
      url: `${LAIBCATALOG_BASE}/${encodeURIComponent(chainId)}/${encodeURIComponent(name)}`,
      fileName: name,
      isGz: /\.gz$/i.test(name),
    }));
    notes.push(`laibcatalog עבור "${feed.chain_name}": ${sel.total} קבצי שקיפות בפורטל, נבחרו ${files.length} (Stores=${sel.counts.stores}, PriceFull=${sel.counts.price}, PromoFull=${sel.counts.promo}).`);
    return { files, notes, skeleton: false };
  } catch (e) {
    const err = e as Error & { cause?: { code?: string; message?: string } };
    const cause = err.cause?.code || err.cause?.message || "";
    notes.push(
      `laibcatalog: שגיאת רשת עבור "${feed.chain_name}": ${err.message}${cause ? ` (cause: ${cause})` : ""}. ` +
      "ייתכן שהפורטל חוסם גישה מחוץ לישראל (geo-block) — המתאם יפעל מה-VPS הישראלי.",
    );
    return { files: [], notes, skeleton: true };
  }
}

// ---------------------------------------------------------------------------
// super-pharm — the public transparency portal at prices.super-pharm.co.il.
//
// A plain (server-rendered) HTML table listing this chain's transparency files:
// columns מס' / שם / תאריך / קטגוריה / סניף / הורדה, where the הורדה cell links
// the .gz file. The link may be a direct path OR a download handler carrying the
// name in a query string, so we resolve the file name from INSIDE each href
// (nameToUrlFromListing) rather than assuming filename == URL. The listing may
// paginate, so we crawl a bounded number of pages and stop when no new files
// appear. Files are the standard transparency naming
// (PriceFull/PromoFull/Stores + chain id) so the shared price-first selection
// applies. The portal serves an anti-bot JS challenge to non-browser clients and
// may geo-restrict, so it runs from the Israeli VPS; parsing/selection is
// covered by unit tests against a captured-shape fixture.
// ---------------------------------------------------------------------------
export async function discoverSuperPharm(feed: FeedSourceRow): Promise<DiscoveryResult> {
  const notes: string[] = [];
  const base = (feed.discovery_url || feed.source_url || "https://prices.super-pharm.co.il").replace(/\/$/, "") + "/";
  const max = feed.max_files_per_run ?? 10;
  try {
    const { nameToUrl, pagesTried } = await crawlListingPages(base, 5, "super-pharm listing", notes);
    if (nameToUrl.size === 0) {
      notes.push(
        `מתאם super-pharm עבור "${feed.chain_name}": לא נמצאו קישורי הורדה בעמוד ${base} (נבדקו ${pagesTried} עמודים). ` +
        "ייתכן שהאתר מחזיר אתגר anti-bot/JS או חוסם גישה מחוץ לישראל — המתאם יפעל מה-VPS הישראלי. " +
        "אפשר לחלופין להזין כתובת הורדה ישירה ב-direct_file_url.",
      );
      return { files: [], notes, skeleton: false };
    }
    let names = Array.from(nameToUrl.keys());
    if (feed.chain_id && names.some((n) => n.includes(feed.chain_id!))) {
      names = names.filter((n) => n.includes(feed.chain_id!));
    }
    const sel = selectTransparencyFiles(names, feed.feed_kinds, max);
    const picked = sel.picked.length ? sel.picked : names.slice(0, max);
    const files: DiscoveredFile[] = picked
      .map((n) => ({ url: nameToUrl.get(n)!, fileName: n, isGz: /\.gz$/i.test(n) }))
      .filter((f) => !!f.url);
    notes.push(`super-pharm עבור "${feed.chain_name}": ${nameToUrl.size} קבצים בעמוד (${pagesTried} עמודים), נבחרו ${files.length} (Stores=${sel.counts.stores}, PriceFull=${sel.counts.price}, PromoFull=${sel.counts.promo}).`);
    return { files, notes, skeleton: false };
  } catch (e) {
    const err = e as Error & { cause?: { code?: string; message?: string } };
    const cause = err.cause?.code || err.cause?.message || "";
    notes.push(
      `super-pharm: שגיאת רשת עבור "${feed.chain_name}": ${err.message}${cause ? ` (cause: ${cause})` : ""} [host=${base}]. ` +
      "ייתכן שהפורטל חוסם גישה מחוץ לישראל (geo-block) — המתאם יפעל מה-VPS הישראלי.",
    );
    return { files: [], notes, skeleton: false };
  }
}

// ---------------------------------------------------------------------------
// wolt — the Wolt Market gateway at wm-gateway.wolt.com/isr-prices/public/v1.
//
// Two-level static index (verified live):
//   1) index.html          → a DATE list, one anchor per day: href="2026-07-03.html"
//   2) <date>.html          → that day's file list, each anchor a RELATIVE path:
//                             href="download/2026-07-03/PriceFull7290058249350-…gz"
// So the download URL is `<v1>/download/<date>/<file>.gz` — we get it for free
// by absolutizing the anchor against the date page's URL. We pick the LATEST
// date, then apply the shared price-first selection to that day's files.
// chain_id = 7290058249350. This host is reachable from CI (no geo-block), so it
// is live-verified; parsing is also covered by a fixture test.
// ---------------------------------------------------------------------------
const WOLT_DEFAULT_INDEX = "https://wm-gateway.wolt.com/isr-prices/public/v1/index.html";
const WOLT_DATE_HREF_RE = /(?:href|src)\s*=\s*["'](?:[^"']*\/)?(\d{4}-\d{2}-\d{2})\.html["']/gi;

export async function discoverWolt(feed: FeedSourceRow): Promise<DiscoveryResult> {
  const notes: string[] = [];
  const indexUrl = feed.discovery_url || feed.source_url || WOLT_DEFAULT_INDEX;
  const max = feed.max_files_per_run ?? 10;
  try {
    const idx = await fetchBrowserText(indexUrl);
    if (!idx.ok) {
      notes.push(`wolt index ${indexUrl} → HTTP ${idx.status} (השער אינו זמין כעת).`);
      return { files: [], notes, skeleton: false };
    }
    const dates = new Set<string>();
    let m: RegExpExecArray | null;
    WOLT_DATE_HREF_RE.lastIndex = 0;
    while ((m = WOLT_DATE_HREF_RE.exec(idx.text)) !== null) dates.add(m[1]);
    if (dates.size === 0) {
      notes.push(
        `מתאם wolt עבור "${feed.chain_name}": לא נמצאו תאריכים בעמוד האינדקס ${indexUrl}. ` +
        "ייתכן שמבנה העמוד השתנה.",
      );
      return { files: [], notes, skeleton: false };
    }
    const latest = Array.from(dates).sort().pop()!;
    const dateUrl = absolutize(`${latest}.html`, indexUrl);
    const page = await fetchBrowserText(dateUrl);
    if (!page.ok) {
      notes.push(`wolt date page ${dateUrl} → HTTP ${page.status}.`);
      return { files: [], notes, skeleton: false };
    }
    const nameToUrl = nameToUrlFromListing(page.text, dateUrl);
    if (nameToUrl.size === 0) {
      notes.push(`מתאם wolt עבור "${feed.chain_name}": עמוד התאריך ${dateUrl} לא הכיל קבצי שקיפות.`);
      return { files: [], notes, skeleton: false };
    }
    let names = Array.from(nameToUrl.keys());
    if (feed.chain_id && names.some((n) => n.includes(feed.chain_id!))) {
      names = names.filter((n) => n.includes(feed.chain_id!));
    }
    const sel = selectTransparencyFiles(names, feed.feed_kinds, max);
    const picked = sel.picked.length ? sel.picked : names.slice(0, max);
    const files: DiscoveredFile[] = picked
      .map((n) => ({ url: nameToUrl.get(n)!, fileName: n, isGz: /\.gz$/i.test(n) }))
      .filter((f) => !!f.url);
    notes.push(`wolt עבור "${feed.chain_name}": תאריך אחרון ${latest}, ${nameToUrl.size} קבצים, נבחרו ${files.length} (Stores=${sel.counts.stores}, PriceFull=${sel.counts.price}, PromoFull=${sel.counts.promo}).`);
    return { files, notes, skeleton: false };
  } catch (e) {
    const err = e as Error & { cause?: { code?: string; message?: string } };
    const cause = err.cause?.code || err.cause?.message || "";
    notes.push(`wolt: שגיאת רשת עבור "${feed.chain_name}": ${err.message}${cause ? ` (cause: ${cause})` : ""} [host=${indexUrl}].`);
    return { files: [], notes, skeleton: false };
  }
}

// ---------------------------------------------------------------------------
// publishprice — the generic U-CODE "אתר שקיפות מחירים" template used by קוויק
// (prices.quik.co.il) and other chains sharing the same portal software. It is
// a paginated HTML grid (columns קטגוריה / Price / PriceFull / Promo / PromoFull
// / Stores / סניף / שם קובץ / נערך / גודל / הורדה) with page links 1,2,3…; NO
// login. Because the template is shared across chains, this adapter is GENERIC:
// it keys off discovery_url only and never hardcodes quik. Each download link
// may be a direct path or a handler URL, so we resolve the file name from inside
// the href (nameToUrlFromListing), crawl the pages, filter to this chain_id when
// the names carry it, and apply the shared price-first selection. The host may
// geo-restrict / not resolve outside Israel, so it runs from the VPS; parsing is
// covered by a fixture test.
// ---------------------------------------------------------------------------
export async function discoverPublishPrice(feed: FeedSourceRow): Promise<DiscoveryResult> {
  const notes: string[] = [];
  const disc = feed.discovery_url || feed.source_url;
  if (!disc) {
    notes.push(`מתאם publishprice עבור "${feed.chain_name}": חסרה discovery_url (כתובת פורטל השקיפות). הוסיפו אותה באדמין.`);
    return { files: [], notes, skeleton: false };
  }
  const base = disc.endsWith("/") || /\.\w+$/.test(new URL(disc).pathname) ? disc : `${disc}/`;
  const max = feed.max_files_per_run ?? 10;
  try {
    const { nameToUrl, pagesTried } = await crawlListingPages(base, 5, "publishprice listing", notes);
    if (nameToUrl.size === 0) {
      notes.push(
        `מתאם publishprice עבור "${feed.chain_name}": לא נמצאו קישורי הורדה בעמוד ${base} (נבדקו ${pagesTried} עמודים). ` +
        "ייתכן שהרשימה נטענת ב-JavaScript או שהאתר חוסם גישה מחוץ לישראל — המתאם יפעל מה-VPS הישראלי. " +
        "אפשר לחלופין להזין כתובת הורדה ישירה ב-direct_file_url.",
      );
      return { files: [], notes, skeleton: false };
    }
    let names = Array.from(nameToUrl.keys());
    if (feed.chain_id && names.some((n) => n.includes(feed.chain_id!))) {
      names = names.filter((n) => n.includes(feed.chain_id!));
    }
    const sel = selectTransparencyFiles(names, feed.feed_kinds, max);
    const picked = sel.picked.length ? sel.picked : names.slice(0, max);
    const files: DiscoveredFile[] = picked
      .map((n) => ({ url: nameToUrl.get(n)!, fileName: n, isGz: /\.gz$/i.test(n) }))
      .filter((f) => !!f.url);
    notes.push(`publishprice עבור "${feed.chain_name}": ${nameToUrl.size} קבצים בעמוד (${pagesTried} עמודים), נבחרו ${files.length} (Stores=${sel.counts.stores}, PriceFull=${sel.counts.price}, PromoFull=${sel.counts.promo}).`);
    return { files, notes, skeleton: false };
  } catch (e) {
    const err = e as Error & { cause?: { code?: string; message?: string } };
    const cause = err.cause?.code || err.cause?.message || "";
    notes.push(
      `publishprice: שגיאת רשת עבור "${feed.chain_name}": ${err.message}${cause ? ` (cause: ${cause})` : ""} [host=${base}]. ` +
      "ייתכן שהפורטל חוסם גישה מחוץ לישראל (geo-block) — המתאם יפעל מה-VPS הישראלי.",
    );
    return { files: [], notes, skeleton: false };
  }
}

// Adapters that hand out short-lived SIGNED URLs (Azure SAS, session cookies,
// portal tokens). For these, a cached direct_file_url must NEVER short-circuit
// live discovery: the token expires within hours, so reusing it 403s forever.
// This guards against legacy/stale direct_file_url rows that froze a feed.
const TOKEN_ADAPTERS = new Set(["shufersal", "cerberus", "nibit", "matrix"]);

export async function discover(feed: FeedSourceRow): Promise<DiscoveryResult> {
  const adapter = (feed.adapter || feed.source_type || "url").toLowerCase();
  // direct_file_url is the admin-verified escape hatch — but only honour it for
  // adapters whose URLs are stable. For token/crawler adapters we always re-crawl
  // the live listing so a stale signed URL can never freeze the feed (the root
  // cause of the daily Shufersal 403: a June-2 SAS link cached as direct_file_url).
  if (feed.direct_file_url && !TOKEN_ADAPTERS.has(adapter)) return discoverDirectUrl(feed);
  switch (adapter) {
    case "shufersal": return discoverShufersal(feed);
    case "cerberus": return discoverCerberus(feed);
    case "nibit": return discoverMatrixCatalog(feed);
    case "matrix": return discoverMatrixCatalog(feed);
    case "web": return discoverGenericWeb(feed);
    case "binaprojects": return discoverBinaprojects(feed);
    case "laibcatalog": return discoverLaibcatalog(feed);
    case "super-pharm": return discoverSuperPharm(feed);
    case "superpharm": return discoverSuperPharm(feed);
    case "wolt": return discoverWolt(feed);
    case "publishprice": return discoverPublishPrice(feed);
    case "openisrael": return discoverOpenIsrael(feed);
    case "url":
    default: return discoverDirectUrl(feed);
  }
}
