/**
 * Health-Fund Comparison — standalone module ("השוואת קופות חולים מבית בקלות").
 *
 * Deliberately kept separate from the rights database, the price-comparison
 * module and the financial CRM. All tables are prefixed `hf_` and all HTTP
 * routes live under `/api/hf/*`. Storage uses the same local SQLite handle as
 * the rest of the app (auto CREATE TABLE IF NOT EXISTS), and a parallel
 * Supabase migration deliverable (deliverables/supabase_migration_health_funds.sql)
 * defines the same tables for the hosted DB. Nothing here touches fin_*,
 * pc_*, custom_rights or the XLSX rights tables.
 *
 * Numbering: every topic carries a public catalog number starting at 500
 * (HF_TOPIC_NUMBER_BASE) so it slots cleanly after the existing rights
 * database (which lives well below 500) and the n8n automation can route
 * callbacks by number exactly the way the rights DB does.
 *
 * Public exposure mirrors the rights DB: the public site shows ONLY basic
 * info (topic, who it is for, the benefit range between the best and the
 * weakest fund — e.g. "החזר סל לידה בין 1,000 ל-5,000 ₪"). Full per-tier
 * detail and internal fields stay behind admin auth, and the customer asks
 * for the full picture through the "קרא עוד" → form → webhook flow.
 */
import Database from "better-sqlite3";
import {
  initHfSupabaseSync,
  scheduleTopicSync,
  scheduleTopicDelete,
} from "./hf-supabase-sync";

let _db: Database.Database | null = null;

// Public catalog numbering base. The rights DB is numbered far below this, so
// 500+ never collides and is obvious at a glance as "health-fund catalog".
export const HF_TOPIC_NUMBER_BASE = 500;

export function bindHealthFundsDb(db: Database.Database) {
  _db = db;
  db.exec(`
  -- One row per comparison topic. kind = 'fund' (קופות חולים / שב"ן, 9 tiers)
  -- or 'gov' (זכויות ממשרדים וגופים מקבילים). Per-tier values live in
  -- hf_tiers for 'fund' rows; 'gov' rows store their narrative fields inline.
  CREATE TABLE IF NOT EXISTS hf_topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    catalog_no INTEGER NOT NULL,         -- public number, 500+
    kind TEXT NOT NULL DEFAULT 'fund',   -- fund | gov
    category TEXT NOT NULL DEFAULT '',
    sub_category TEXT NOT NULL DEFAULT '',
    topic TEXT NOT NULL,                 -- the subject name
    -- Public basic info (visible to everyone) ------------------------------
    audience TEXT NOT NULL DEFAULT '',         -- "למי זה מיועד"
    benefit_summary TEXT NOT NULL DEFAULT '',  -- "מה ההטבה" (one-liner)
    range_text TEXT NOT NULL DEFAULT '',       -- "החזר סל לידה בין 1,000 ל-5,000 ₪"
    range_min REAL,                            -- numeric range (optional)
    range_max REAL,
    best_fund TEXT NOT NULL DEFAULT '',        -- name of the most generous fund
    public_site_text TEXT NOT NULL DEFAULT '', -- short public teaser
    -- Extended / internal detail (admin + sent to client after form) -------
    treating_body TEXT NOT NULL DEFAULT '',
    full_benefit TEXT NOT NULL DEFAULT '',     -- full gov benefit text
    conditions TEXT NOT NULL DEFAULT '',       -- תנאי זכאות ממוספרים
    qualifying_cases TEXT NOT NULL DEFAULT '',
    preparation TEXT NOT NULL DEFAULT '',
    documents TEXT NOT NULL DEFAULT '',
    how_to_apply TEXT NOT NULL DEFAULT '',
    official_links TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    ai_search TEXT NOT NULL DEFAULT '',        -- search synonyms / keywords
    -- Podcast (voice system) -----------------------------------------------
    podcast_script TEXT NOT NULL DEFAULT '',   -- vocalized Hebrew narration script (editable)
    podcast_audio_url TEXT NOT NULL DEFAULT '',-- generated audio file URL (TTS)
    podcast_status TEXT NOT NULL DEFAULT '',   -- '' | draft | ready | error
    podcast_updated_at TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- Per-tier values for 'fund' topics. One row per (topic, plan tier).
  CREATE TABLE IF NOT EXISTS hf_tiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id INTEGER NOT NULL,
    col INTEGER NOT NULL DEFAULT 0,      -- original column index (5..13)
    fund TEXT NOT NULL DEFAULT '',       -- כללית / מכבי / מאוחדת / לאומית
    fund_key TEXT NOT NULL DEFAULT '',   -- clalit | maccabi | meuhedet | leumit
    tier TEXT NOT NULL DEFAULT '',       -- זהב / כסף / שלי ...
    prog TEXT NOT NULL DEFAULT '',       -- PROG09 ...
    value TEXT NOT NULL DEFAULT '',      -- full per-tier detail text
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- Public/automation requests opened from the "קרא עוד" form. Mirrors the
  -- rights service-submission concept but scoped to the health-fund catalog.
  CREATE TABLE IF NOT EXISTS hf_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id INTEGER,
    catalog_no INTEGER,
    topic TEXT,
    request_type TEXT NOT NULL DEFAULT 'info',  -- info | reminder | treatment
    full_name TEXT,
    phone TEXT,
    email TEXT,
    note TEXT,
    channel TEXT NOT NULL DEFAULT 'web',
    webhook_status TEXT,
    webhook_message TEXT,
    created_at TEXT NOT NULL
  );

  -- Fund-switch interest leads ("מתעניין במעבר קופת חולים"). Opened from a
  -- gentle button on each fund benefit. Managed in a dedicated admin board
  -- (edit / delete / status / handling note). Local-only, like hf_requests.
  CREATE TABLE IF NOT EXISTS hf_switch_leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id INTEGER,
    catalog_no INTEGER,
    topic TEXT,
    full_name TEXT NOT NULL,             -- שם פרטי + משפחה (required)
    phone TEXT NOT NULL,                 -- טלפון (required)
    email TEXT NOT NULL DEFAULT '',      -- מייל (optional)
    id_number TEXT NOT NULL DEFAULT '',  -- ת"ז (optional)
    city TEXT NOT NULL DEFAULT '',       -- עיר מגורים (optional)
    current_fund TEXT NOT NULL DEFAULT '',  -- קופה נוכחית (optional)
    current_supplemental TEXT NOT NULL DEFAULT '', -- ביטוח משלים נוכחי (optional)
    target_fund TEXT NOT NULL DEFAULT '',   -- קופה יעד / 'לא יודע' (optional)
    people_count TEXT NOT NULL DEFAULT '',  -- מספר נפשות (optional)
    note TEXT NOT NULL DEFAULT '',          -- הערת המתעניין (optional)
    status TEXT NOT NULL DEFAULT 'new',     -- new | in_progress | done | irrelevant
    handling_note TEXT NOT NULL DEFAULT '', -- הערת טיפול (admin)
    channel TEXT NOT NULL DEFAULT 'web',
    webhook_status TEXT,
    webhook_message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_hf_tiers_topic ON hf_tiers(topic_id);
  CREATE INDEX IF NOT EXISTS idx_hf_topics_catalog ON hf_topics(catalog_no);
  CREATE INDEX IF NOT EXISTS idx_hf_switch_leads_status ON hf_switch_leads(status);
  `);

  // Idempotent column migration for databases created before the podcast
  // feature. Only ADDS columns — never alters or drops existing content.
  ensureColumn(db, "hf_topics", "podcast_script", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "hf_topics", "podcast_audio_url", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "hf_topics", "podcast_status", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "hf_topics", "podcast_updated_at", "TEXT");

  // Wire up automatic two-way Supabase sync (no-op when Supabase env is unset,
  // so SQLite-only deployments are completely unaffected). Bootstrap runs in
  // the background and never blocks server start.
  initHfSupabaseSync(db);
}

// Adds a column only if it does not already exist (safe, additive migration).
function ensureColumn(db: Database.Database, table: string, column: string, def: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
  }
}

function db(): Database.Database {
  if (!_db) throw new Error("health-funds: sqlite db not bound");
  return _db;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HfTier {
  id: number;
  topicId: number;
  col: number;
  fund: string;
  fundKey: string;
  tier: string;
  prog: string;
  value: string;
}

export interface HfTopic {
  id: number;
  catalogNo: number;
  kind: string;
  category: string;
  subCategory: string;
  topic: string;
  audience: string;
  benefitSummary: string;
  rangeText: string;
  rangeMin: number | null;
  rangeMax: number | null;
  bestFund: string;
  publicSiteText: string;
  treatingBody: string;
  fullBenefit: string;
  conditions: string;
  qualifyingCases: string;
  preparation: string;
  documents: string;
  howToApply: string;
  officialLinks: string;
  notes: string;
  aiSearch: string;
  podcastScript: string;
  podcastAudioUrl: string;
  podcastStatus: string;
  podcastUpdatedAt: string | null;
  sortOrder: number;
  active: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  tiers?: HfTier[];
}

const TOPIC_SELECT = `
  SELECT id, catalog_no AS catalogNo, kind, category, sub_category AS subCategory,
    topic, audience, benefit_summary AS benefitSummary, range_text AS rangeText,
    range_min AS rangeMin, range_max AS rangeMax, best_fund AS bestFund,
    public_site_text AS publicSiteText, treating_body AS treatingBody,
    full_benefit AS fullBenefit, conditions, qualifying_cases AS qualifyingCases,
    preparation, documents, how_to_apply AS howToApply,
    official_links AS officialLinks, notes, ai_search AS aiSearch,
    podcast_script AS podcastScript, podcast_audio_url AS podcastAudioUrl,
    podcast_status AS podcastStatus, podcast_updated_at AS podcastUpdatedAt,
    sort_order AS sortOrder, active, created_by AS createdBy,
    created_at AS createdAt, updated_at AS updatedAt
  FROM hf_topics
`;

const TIER_SELECT = `
  SELECT id, topic_id AS topicId, col, fund, fund_key AS fundKey, tier, prog, value
  FROM hf_tiers
`;

function rowToTopic(r: any): HfTopic {
  return { ...r, active: !!r.active };
}

// ---------------------------------------------------------------------------
// Topic CRUD
// ---------------------------------------------------------------------------

export function listCategories(kind?: string): string[] {
  const rows = kind
    ? (db().prepare(`SELECT DISTINCT category FROM hf_topics WHERE kind = ? AND active = 1 AND category <> '' ORDER BY category`).all(kind) as any[])
    : (db().prepare(`SELECT DISTINCT category FROM hf_topics WHERE active = 1 AND category <> '' ORDER BY category`).all() as any[]);
  return rows.map((r) => r.category);
}

export function listTopics(opts: { kind?: string; includeInactive?: boolean; withTiers?: boolean } = {}): HfTopic[] {
  const where: string[] = [];
  const params: any[] = [];
  if (opts.kind) { where.push("kind = ?"); params.push(opts.kind); }
  if (!opts.includeInactive) where.push("active = 1");
  const sql = `${TOPIC_SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY catalog_no ASC`;
  const rows = (db().prepare(sql).all(...params) as any[]).map(rowToTopic);
  if (opts.withTiers) {
    const tiers = db().prepare(`${TIER_SELECT} ORDER BY col ASC`).all() as HfTier[];
    const byTopic = new Map<number, HfTier[]>();
    for (const t of tiers) {
      if (!byTopic.has(t.topicId)) byTopic.set(t.topicId, []);
      byTopic.get(t.topicId)!.push(t);
    }
    for (const row of rows) row.tiers = byTopic.get(row.id) ?? [];
  }
  return rows;
}

export function getTopic(id: number, withTiers = true): HfTopic | undefined {
  const row = db().prepare(`${TOPIC_SELECT} WHERE id = ?`).get(id) as any;
  if (!row) return undefined;
  const topic = rowToTopic(row);
  if (withTiers) {
    topic.tiers = db().prepare(`${TIER_SELECT} WHERE topic_id = ? ORDER BY col ASC`).all(id) as HfTier[];
  }
  return topic;
}

export function getTopicByCatalogNo(catalogNo: number, withTiers = true): HfTopic | undefined {
  const row = db().prepare(`${TOPIC_SELECT} WHERE catalog_no = ?`).get(catalogNo) as any;
  if (!row) return undefined;
  return getTopic(row.id, withTiers);
}

function nextCatalogNo(): number {
  const row = db().prepare(`SELECT MAX(catalog_no) AS m FROM hf_topics`).get() as any;
  const max = Number(row?.m) || 0;
  return Math.max(max + 1, HF_TOPIC_NUMBER_BASE);
}

export interface HfTopicInput {
  catalogNo?: number;
  kind?: string;
  category?: string;
  subCategory?: string;
  topic: string;
  audience?: string;
  benefitSummary?: string;
  rangeText?: string;
  rangeMin?: number | null;
  rangeMax?: number | null;
  bestFund?: string;
  publicSiteText?: string;
  treatingBody?: string;
  fullBenefit?: string;
  conditions?: string;
  qualifyingCases?: string;
  preparation?: string;
  documents?: string;
  howToApply?: string;
  officialLinks?: string;
  notes?: string;
  aiSearch?: string;
  podcastScript?: string;
  sortOrder?: number;
  active?: boolean;
  createdBy?: string;
  tiers?: Array<Partial<HfTier>>;
}

export function createTopic(input: HfTopicInput): HfTopic {
  const topic = String(input.topic || "").trim();
  if (!topic) throw new Error("topic is required");
  const now = new Date().toISOString();
  const catalogNo = Number.isFinite(input.catalogNo) && Number(input.catalogNo) >= HF_TOPIC_NUMBER_BASE
    ? Number(input.catalogNo)
    : nextCatalogNo();
  const info = db().prepare(`
    INSERT INTO hf_topics (
      catalog_no, kind, category, sub_category, topic, audience, benefit_summary,
      range_text, range_min, range_max, best_fund, public_site_text,
      treating_body, full_benefit, conditions, qualifying_cases, preparation,
      documents, how_to_apply, official_links, notes, ai_search, sort_order,
      active, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    catalogNo,
    String(input.kind ?? "fund"),
    String(input.category ?? ""),
    String(input.subCategory ?? ""),
    topic,
    String(input.audience ?? ""),
    String(input.benefitSummary ?? ""),
    String(input.rangeText ?? ""),
    input.rangeMin ?? null,
    input.rangeMax ?? null,
    String(input.bestFund ?? ""),
    String(input.publicSiteText ?? ""),
    String(input.treatingBody ?? ""),
    String(input.fullBenefit ?? ""),
    String(input.conditions ?? ""),
    String(input.qualifyingCases ?? ""),
    String(input.preparation ?? ""),
    String(input.documents ?? ""),
    String(input.howToApply ?? ""),
    String(input.officialLinks ?? ""),
    String(input.notes ?? ""),
    String(input.aiSearch ?? ""),
    Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : catalogNo,
    input.active === false ? 0 : 1,
    String(input.createdBy ?? ""),
    now, now,
  );
  const topicId = Number(info.lastInsertRowid);
  if (Array.isArray(input.tiers)) {
    for (const t of input.tiers) addTier(topicId, t);
  }
  scheduleTopicSync(topicId);
  return getTopic(topicId)!;
}

export function updateTopic(id: number, patch: Partial<HfTopicInput>): HfTopic | null {
  const current = getTopic(id, false);
  if (!current) return null;
  const now = new Date().toISOString();
  const next = {
    catalogNo: patch.catalogNo !== undefined ? Number(patch.catalogNo) : current.catalogNo,
    kind: patch.kind ?? current.kind,
    category: patch.category ?? current.category,
    subCategory: patch.subCategory ?? current.subCategory,
    topic: patch.topic ?? current.topic,
    audience: patch.audience ?? current.audience,
    benefitSummary: patch.benefitSummary ?? current.benefitSummary,
    rangeText: patch.rangeText ?? current.rangeText,
    rangeMin: patch.rangeMin !== undefined ? patch.rangeMin : current.rangeMin,
    rangeMax: patch.rangeMax !== undefined ? patch.rangeMax : current.rangeMax,
    bestFund: patch.bestFund ?? current.bestFund,
    publicSiteText: patch.publicSiteText ?? current.publicSiteText,
    treatingBody: patch.treatingBody ?? current.treatingBody,
    fullBenefit: patch.fullBenefit ?? current.fullBenefit,
    conditions: patch.conditions ?? current.conditions,
    qualifyingCases: patch.qualifyingCases ?? current.qualifyingCases,
    preparation: patch.preparation ?? current.preparation,
    documents: patch.documents ?? current.documents,
    howToApply: patch.howToApply ?? current.howToApply,
    officialLinks: patch.officialLinks ?? current.officialLinks,
    notes: patch.notes ?? current.notes,
    aiSearch: patch.aiSearch ?? current.aiSearch,
    podcastScript: patch.podcastScript !== undefined ? String(patch.podcastScript) : current.podcastScript,
    sortOrder: patch.sortOrder !== undefined ? Number(patch.sortOrder) : current.sortOrder,
    active: patch.active !== undefined ? (patch.active ? 1 : 0) : (current.active ? 1 : 0),
  };
  db().prepare(`
    UPDATE hf_topics SET
      catalog_no=?, kind=?, category=?, sub_category=?, topic=?, audience=?,
      benefit_summary=?, range_text=?, range_min=?, range_max=?, best_fund=?,
      public_site_text=?, treating_body=?, full_benefit=?, conditions=?,
      qualifying_cases=?, preparation=?, documents=?, how_to_apply=?,
      official_links=?, notes=?, ai_search=?, podcast_script=?, sort_order=?, active=?, updated_at=?
    WHERE id=?
  `).run(
    next.catalogNo, next.kind, next.category, next.subCategory, next.topic,
    next.audience, next.benefitSummary, next.rangeText, next.rangeMin, next.rangeMax,
    next.bestFund, next.publicSiteText, next.treatingBody, next.fullBenefit,
    next.conditions, next.qualifyingCases, next.preparation, next.documents,
    next.howToApply, next.officialLinks, next.notes, next.aiSearch, next.podcastScript,
    next.sortOrder, next.active, now, id,
  );
  scheduleTopicSync(id);
  return getTopic(id) ?? null;
}

// ---------------------------------------------------------------------------
// Podcast helpers — script (text) + audio (TTS file)
// ---------------------------------------------------------------------------

// Save / replace the editable narration script. Status moves to 'draft' until
// audio is (re)generated. Never touches any other topic content.
export function setPodcastScript(id: number, script: string): HfTopic | null {
  const current = getTopic(id, false);
  if (!current) return null;
  const now = new Date().toISOString();
  db().prepare(
    `UPDATE hf_topics SET podcast_script=?, podcast_status='draft', podcast_updated_at=?, updated_at=? WHERE id=?`,
  ).run(String(script ?? ""), now, now, id);
  scheduleTopicSync(id);
  return getTopic(id) ?? null;
}

// Attach a generated audio file URL (status 'ready'), or mark an error.
export function setPodcastAudio(id: number, audioUrl: string, status: "ready" | "error" = "ready"): HfTopic | null {
  const current = getTopic(id, false);
  if (!current) return null;
  const now = new Date().toISOString();
  db().prepare(
    `UPDATE hf_topics SET podcast_audio_url=?, podcast_status=?, podcast_updated_at=?, updated_at=? WHERE id=?`,
  ).run(String(audioUrl ?? ""), status, now, now, id);
  scheduleTopicSync(id);
  return getTopic(id) ?? null;
}

// Remove the generated audio (keeps the script). Status returns to 'draft'
// if a script exists, otherwise ''.
export function clearPodcastAudio(id: number): HfTopic | null {
  const current = getTopic(id, false);
  if (!current) return null;
  const now = new Date().toISOString();
  const status = (current.podcastScript || "").trim() ? "draft" : "";
  db().prepare(
    `UPDATE hf_topics SET podcast_audio_url='', podcast_status=?, podcast_updated_at=?, updated_at=? WHERE id=?`,
  ).run(status, now, now, id);
  scheduleTopicSync(id);
  return getTopic(id) ?? null;
}

export function deleteTopic(id: number): void {
  db().prepare(`DELETE FROM hf_tiers WHERE topic_id = ?`).run(id);
  db().prepare(`DELETE FROM hf_topics WHERE id = ?`).run(id);
  scheduleTopicDelete(id);
}

// ---------------------------------------------------------------------------
// Tier CRUD
// ---------------------------------------------------------------------------

export function addTier(topicId: number, t: Partial<HfTier>): HfTier {
  const now = new Date().toISOString();
  const info = db().prepare(`
    INSERT INTO hf_tiers (topic_id, col, fund, fund_key, tier, prog, value, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    topicId,
    Number(t.col) || 0,
    String(t.fund ?? ""),
    String(t.fundKey ?? ""),
    String(t.tier ?? ""),
    String(t.prog ?? ""),
    String(t.value ?? ""),
    now, now,
  );
  scheduleTopicSync(topicId);
  return db().prepare(`${TIER_SELECT} WHERE id = ?`).get(Number(info.lastInsertRowid)) as HfTier;
}

export function updateTier(id: number, patch: Partial<HfTier>): HfTier | null {
  const cur = db().prepare(`${TIER_SELECT} WHERE id = ?`).get(id) as HfTier | undefined;
  if (!cur) return null;
  const now = new Date().toISOString();
  db().prepare(`
    UPDATE hf_tiers SET col=?, fund=?, fund_key=?, tier=?, prog=?, value=?, updated_at=? WHERE id=?
  `).run(
    patch.col !== undefined ? Number(patch.col) : cur.col,
    patch.fund ?? cur.fund,
    patch.fundKey ?? cur.fundKey,
    patch.tier ?? cur.tier,
    patch.prog ?? cur.prog,
    patch.value ?? cur.value,
    now, id,
  );
  if (cur.topicId) scheduleTopicSync(cur.topicId);
  return db().prepare(`${TIER_SELECT} WHERE id = ?`).get(id) as HfTier;
}

export function deleteTier(id: number): void {
  const cur = db().prepare(`${TIER_SELECT} WHERE id = ?`).get(id) as HfTier | undefined;
  db().prepare(`DELETE FROM hf_tiers WHERE id = ?`).run(id);
  if (cur?.topicId) scheduleTopicSync(cur.topicId);
}

// ---------------------------------------------------------------------------
// Public search (basic info only)
// ---------------------------------------------------------------------------

// Basic, non-detailed per-fund availability shown in the public accordion.
// Deliberately carries ONLY the fund name/key and the plan-tier NAMES
// (זהב / כסף / שלי ...). It never includes the detailed tier `value` text
// (שיעור / סכום / זמן המתנה) — that precise info stays for the "קרא עוד" flow.
export interface HfPublicFund {
  key: string;
  name: string;
  plans: string[];
}

export interface HfPublicTopic {
  id: number;
  catalogNo: number;
  kind: string;
  category: string;
  subCategory: string;
  topic: string;
  audience: string;
  benefitSummary: string;
  rangeText: string;
  bestFund: string;
  publicSiteText: string;
  sourceName: string;
  serviceUrl: string;
  fundsAvailable: HfPublicFund[];
}

// Derive a short, clean source name for the in-card attribution shown in
// parentheses. For government rights we use the responsible/supervising body
// (treatingBody) trimmed to its first clause so it never clutters the card.
// For fund-comparison topics the source is the funds' שב"ן rulebooks/sites.
// Returns "" when no clean short source exists (then no parentheses are shown).
export function deriveSourceName(t: HfTopic): string {
  if (t.kind === "gov" || t.kind === "ngo") {
    const body = (t.treatingBody || "").trim();
    if (!body) return "";
    // Take the leading clause before a separator so it stays compact.
    let s = body.split(/\s[—–-]\s|;|\(/)[0].trim();
    if (s.length > 48) s = s.slice(0, 47).trim() + "…";
    return s;
  }
  // Fund-comparison topics: generic authoritative source, kept short.
  // Plain wording — spell out the abbreviation so everyone understands.
  return 'תקנון הביטוח המשלים ואתרי הקופות';
}

// Collapse a topic's tiers into a per-fund summary of plan names only.
// Groups by fund, preserves fund order, and lists the distinct plan tiers.
// No numeric / detailed values are exposed here.
export function publicFundsFromTiers(tiers: HfTier[] | undefined): HfPublicFund[] {
  if (!tiers || tiers.length === 0) return [];
  const order: string[] = [];
  const byKey = new Map<string, HfPublicFund>();
  for (const t of tiers) {
    const key = t.fundKey || t.fund;
    if (!key) continue;
    if (!byKey.has(key)) {
      byKey.set(key, { key, name: t.fund || key, plans: [] });
      order.push(key);
    }
    const entry = byKey.get(key)!;
    const plan = (t.tier || "").trim();
    if (plan && !entry.plans.includes(plan)) entry.plans.push(plan);
  }
  return order.map((k) => byKey.get(k)!);
}

/** Strip every internal field. Mirrors the rights DB toPublicRight pattern. */
export function toPublicTopic(t: HfTopic): HfPublicTopic {
  return {
    id: t.id,
    catalogNo: t.catalogNo,
    kind: t.kind,
    category: t.category || "",
    subCategory: t.subCategory || "",
    topic: t.topic || "",
    audience: t.audience || "",
    benefitSummary: t.benefitSummary || "",
    rangeText: t.rangeText || "",
    bestFund: t.bestFund || "",
    publicSiteText: t.publicSiteText || "",
    sourceName: deriveSourceName(t),
    serviceUrl: `/#/health-fund-service/${t.id}`,
    fundsAvailable: publicFundsFromTiers(t.tiers),
  };
}

export function publicSearch(opts: { q?: string; kind?: string; category?: string; fund?: string; limit?: number } = {}): HfPublicTopic[] {
  // Always load tiers so the public accordion can show which funds/plans
  // cover each topic (basic names only — see publicFundsFromTiers).
  const all = listTopics({ kind: opts.kind, withTiers: true });
  let rows = all;
  if (opts.category) rows = rows.filter((r) => r.category === opts.category);
  if (opts.fund) {
    rows = rows.filter((r) => (r.tiers ?? []).some((t) => t.fundKey === opts.fund || t.fund === opts.fund));
  }
  const q = String(opts.q || "").trim().toLowerCase();
  if (q) {
    rows = rows.filter((r) =>
      r.topic.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q) ||
      r.subCategory.toLowerCase().includes(q) ||
      r.benefitSummary.toLowerCase().includes(q) ||
      r.audience.toLowerCase().includes(q) ||
      r.aiSearch.toLowerCase().includes(q),
    );
  }
  const limit = Number(opts.limit) || 0;
  const sliced = limit > 0 ? rows.slice(0, limit) : rows;
  return sliced.map(toPublicTopic);
}

export function meta() {
  const fundCount = (db().prepare(`SELECT COUNT(*) AS c FROM hf_topics WHERE kind = 'fund' AND active = 1`).get() as any).c;
  const govCount = (db().prepare(`SELECT COUNT(*) AS c FROM hf_topics WHERE kind = 'gov' AND active = 1`).get() as any).c;
  const ngoCount = (db().prepare(`SELECT COUNT(*) AS c FROM hf_topics WHERE kind = 'ngo' AND active = 1`).get() as any).c;
  return {
    title: 'השוואת קופות חולים מבית בקלות',
    fundCount,
    govCount,
    ngoCount,
    fundCategories: listCategories("fund"),
    govCategories: listCategories("gov"),
    ngoCategories: listCategories("ngo"),
    funds: [
      { key: "clalit", name: "כללית", color: "#00A0AF" },
      { key: "maccabi", name: "מכבי", color: "#005BAB" },
      { key: "meuhedet", name: "מאוחדת", color: "#5BA829" },
      { key: "leumit", name: "לאומית", color: "#F57F20" },
    ],
  };
}

// ---------------------------------------------------------------------------
// Requests ("קרא עוד" form submissions)
// ---------------------------------------------------------------------------

export const HF_REQUEST_TYPES = new Set(["info", "reminder", "treatment"]);

export function requestTypeLabel(value: string): string {
  switch (value) {
    case "reminder": return "קבלת מידע ותזכורת";
    case "treatment": return "ביצוע המשימה ע\"י צוות בקלות";
    default: return "קבלת מידע";
  }
}

export function logRequest(input: {
  topicId: number | null;
  catalogNo: number | null;
  topic: string;
  requestType: string;
  fullName: string;
  phone: string;
  email: string;
  note?: string;
  channel?: string;
}): number {
  const now = new Date().toISOString();
  const info = db().prepare(`
    INSERT INTO hf_requests (
      topic_id, catalog_no, topic, request_type, full_name, phone, email, note,
      channel, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.topicId, input.catalogNo, input.topic, input.requestType,
    input.fullName, input.phone, input.email, String(input.note ?? ""),
    String(input.channel ?? "web"), now,
  );
  return Number(info.lastInsertRowid);
}

export function updateRequestWebhook(id: number, status: string, message: string): void {
  db().prepare(`UPDATE hf_requests SET webhook_status=?, webhook_message=? WHERE id=?`).run(status, message, id);
}

export function listRequests(limit = 100): any[] {
  return db().prepare(`
    SELECT id, topic_id AS topicId, catalog_no AS catalogNo, topic,
      request_type AS requestType, full_name AS fullName, phone, email, note,
      channel, webhook_status AS webhookStatus, webhook_message AS webhookMessage,
      created_at AS createdAt
    FROM hf_requests ORDER BY id DESC LIMIT ?
  `).all(limit);
}

export function countTopics(): number {
  return (db().prepare(`SELECT COUNT(*) AS c FROM hf_topics`).get() as any).c;
}

// ---------------------------------------------------------------------------
// Fund-switch interest leads (מתעניין במעבר קופת חולים)
// ---------------------------------------------------------------------------

export const HF_SWITCH_STATUSES = new Set(["new", "in_progress", "done", "irrelevant"]);

export function switchStatusLabel(value: string): string {
  switch (value) {
    case "in_progress": return "בטיפול";
    case "done": return "טופל";
    case "irrelevant": return "לא רלוונטי";
    default: return "חדש";
  }
}

export function logSwitchLead(input: {
  topicId: number | null;
  catalogNo: number | null;
  topic: string;
  fullName: string;
  phone: string;
  email?: string;
  idNumber?: string;
  city?: string;
  currentFund?: string;
  currentSupplemental?: string;
  targetFund?: string;
  peopleCount?: string;
  note?: string;
  channel?: string;
}): number {
  const now = new Date().toISOString();
  const info = db().prepare(`
    INSERT INTO hf_switch_leads (
      topic_id, catalog_no, topic, full_name, phone, email, id_number, city,
      current_fund, current_supplemental, target_fund, people_count, note,
      status, channel, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?)
  `).run(
    input.topicId, input.catalogNo, input.topic, input.fullName, input.phone,
    String(input.email ?? ""), String(input.idNumber ?? ""), String(input.city ?? ""),
    String(input.currentFund ?? ""), String(input.currentSupplemental ?? ""),
    String(input.targetFund ?? ""), String(input.peopleCount ?? ""),
    String(input.note ?? ""), String(input.channel ?? "web"), now, now,
  );
  return Number(info.lastInsertRowid);
}

export function updateSwitchLeadWebhook(id: number, status: string, message: string): void {
  db().prepare(`UPDATE hf_switch_leads SET webhook_status=?, webhook_message=?, updated_at=? WHERE id=?`)
    .run(status, message, new Date().toISOString(), id);
}

export function listSwitchLeads(limit = 300): any[] {
  return db().prepare(`
    SELECT id, topic_id AS topicId, catalog_no AS catalogNo, topic,
      full_name AS fullName, phone, email, id_number AS idNumber, city,
      current_fund AS currentFund, current_supplemental AS currentSupplemental,
      target_fund AS targetFund, people_count AS peopleCount, note,
      status, handling_note AS handlingNote, channel,
      webhook_status AS webhookStatus, webhook_message AS webhookMessage,
      created_at AS createdAt, updated_at AS updatedAt
    FROM hf_switch_leads ORDER BY id DESC LIMIT ?
  `).all(limit);
}

export function getSwitchLead(id: number): any | null {
  const row = db().prepare(`
    SELECT id, topic_id AS topicId, catalog_no AS catalogNo, topic,
      full_name AS fullName, phone, email, id_number AS idNumber, city,
      current_fund AS currentFund, current_supplemental AS currentSupplemental,
      target_fund AS targetFund, people_count AS peopleCount, note,
      status, handling_note AS handlingNote, channel,
      webhook_status AS webhookStatus, webhook_message AS webhookMessage,
      created_at AS createdAt, updated_at AS updatedAt
    FROM hf_switch_leads WHERE id=?
  `).get(id);
  return row ?? null;
}

// Admin edit — only whitelisted, editable fields. Additive; never touches
// created_at or the original submission identity beyond what admin changes.
export function updateSwitchLead(id: number, patch: {
  fullName?: string;
  phone?: string;
  email?: string;
  idNumber?: string;
  city?: string;
  currentFund?: string;
  currentSupplemental?: string;
  targetFund?: string;
  peopleCount?: string;
  note?: string;
  status?: string;
  handlingNote?: string;
}): boolean {
  const map: Record<string, string> = {
    fullName: "full_name", phone: "phone", email: "email", idNumber: "id_number",
    city: "city", currentFund: "current_fund", currentSupplemental: "current_supplemental",
    targetFund: "target_fund", peopleCount: "people_count", note: "note",
    status: "status", handlingNote: "handling_note",
  };
  const sets: string[] = [];
  const vals: any[] = [];
  for (const [k, col] of Object.entries(map)) {
    const v = (patch as any)[k];
    if (v === undefined) continue;
    if (k === "status" && !HF_SWITCH_STATUSES.has(String(v))) continue;
    sets.push(`${col}=?`);
    vals.push(String(v));
  }
  if (!sets.length) return false;
  sets.push("updated_at=?");
  vals.push(new Date().toISOString());
  vals.push(id);
  const info = db().prepare(`UPDATE hf_switch_leads SET ${sets.join(", ")} WHERE id=?`).run(...vals);
  return info.changes > 0;
}

export function deleteSwitchLead(id: number): boolean {
  const info = db().prepare(`DELETE FROM hf_switch_leads WHERE id=?`).run(id);
  return info.changes > 0;
}
