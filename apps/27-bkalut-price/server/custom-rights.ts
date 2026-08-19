/**
 * Admin-managed append-only catalog of additional rights/topics that are
 * appended to the XLSX-driven rights list at runtime.
 *
 * Why a separate table rather than editing bklot.xlsx directly?
 *  - Editing the XLSX changes IDs (positional) and is risky during automation.
 *  - This table preserves the existing rights database order intact — custom
 *    rows always come after the XLSX rows, with IDs offset by a large constant
 *    so they never collide.
 *  - The shape mirrors RightRow so consumers don't need to special-case it.
 */
import Database from "better-sqlite3";
import type { RightRow } from "@shared/schema";

let _db: Database.Database | null = null;

// Custom rights live in id range starting at this offset, well above any
// realistic XLSX size. The merger ensures uniqueness, but this offset makes
// it obvious at a glance which rows came from where.
export const CUSTOM_RIGHT_ID_OFFSET = 100000;

export function bindCustomRightsDb(db: Database.Database) {
  _db = db;
  db.exec(`
  CREATE TABLE IF NOT EXISTS custom_rights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    priority INTEGER,
    category TEXT NOT NULL DEFAULT '',
    sub_category TEXT NOT NULL DEFAULT '',
    topic TEXT NOT NULL,
    treating_body TEXT NOT NULL DEFAULT '',
    audience TEXT NOT NULL DEFAULT '',
    what_received TEXT NOT NULL DEFAULT '',
    eligibility TEXT NOT NULL DEFAULT '',
    qualifying_cases TEXT NOT NULL DEFAULT '',
    preparation TEXT NOT NULL DEFAULT '',
    documents TEXT NOT NULL DEFAULT '',
    how_to_apply TEXT NOT NULL DEFAULT '',
    official_links TEXT NOT NULL DEFAULT '',
    bkalut_cost TEXT NOT NULL DEFAULT '',
    public_site_text TEXT NOT NULL DEFAULT '',
    faq TEXT NOT NULL DEFAULT '',
    gold_tip TEXT NOT NULL DEFAULT '',
    eligibility_json TEXT NOT NULL DEFAULT '',
    intake_json TEXT NOT NULL DEFAULT '',
    documents_json TEXT NOT NULL DEFAULT '',
    podcast_script TEXT NOT NULL DEFAULT '',
    voice_short TEXT NOT NULL DEFAULT '',
    email_script TEXT NOT NULL DEFAULT '',
    ai_search TEXT NOT NULL DEFAULT '',
    ai_extra TEXT NOT NULL DEFAULT '',
    haredi TEXT NOT NULL DEFAULT '',
    service_url TEXT NOT NULL DEFAULT '',
    created_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  `);
}

function db(): Database.Database {
  if (!_db) throw new Error("custom-rights: sqlite db not bound");
  return _db;
}

interface CustomRow {
  id: number;
  priority: number | null;
  category: string;
  subCategory: string;
  topic: string;
  treatingBody: string;
  audience: string;
  whatReceived: string;
  eligibility: string;
  qualifyingCases: string;
  preparation: string;
  documents: string;
  howToApply: string;
  officialLinks: string;
  bkalutCost: string;
  publicSiteText: string;
  faq: string;
  goldTip: string;
  eligibilityJson: string;
  intakeJson: string;
  documentsJson: string;
  podcastScript: string;
  voiceShort: string;
  emailScript: string;
  aiSearch: string;
  aiExtra: string;
  haredi: string;
  serviceUrl: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

function selectSql(): string {
  return `
    SELECT id, priority, category, sub_category AS subCategory, topic,
      treating_body AS treatingBody, audience, what_received AS whatReceived,
      eligibility, qualifying_cases AS qualifyingCases, preparation, documents,
      how_to_apply AS howToApply, official_links AS officialLinks,
      bkalut_cost AS bkalutCost, public_site_text AS publicSiteText, faq,
      gold_tip AS goldTip, eligibility_json AS eligibilityJson,
      intake_json AS intakeJson, documents_json AS documentsJson,
      podcast_script AS podcastScript, voice_short AS voiceShort,
      email_script AS emailScript, ai_search AS aiSearch, ai_extra AS aiExtra,
      haredi, service_url AS serviceUrl, created_by AS createdBy,
      created_at AS createdAt, updated_at AS updatedAt
    FROM custom_rights
  `;
}

function toRightRow(row: CustomRow): RightRow {
  const id = CUSTOM_RIGHT_ID_OFFSET + row.id;
  return {
    id,
    priority: row.priority,
    category: row.category,
    subCategory: row.subCategory,
    topic: row.topic,
    treatingBody: row.treatingBody,
    audience: row.audience,
    whatReceived: row.whatReceived,
    eligibility: row.eligibility,
    qualifyingCases: row.qualifyingCases,
    preparation: row.preparation,
    documents: row.documents,
    howToApply: row.howToApply,
    officialLinks: row.officialLinks,
    bkalutCost: row.bkalutCost,
    publicSiteText: row.publicSiteText,
    faq: row.faq,
    goldTip: row.goldTip,
    eligibilityJson: row.eligibilityJson,
    intakeJson: row.intakeJson,
    documentsJson: row.documentsJson,
    podcastScript: row.podcastScript,
    voiceShort: row.voiceShort,
    emailScript: row.emailScript,
    aiSearch: row.aiSearch,
    aiExtra: row.aiExtra,
    haredi: row.haredi,
    serviceUrl: row.serviceUrl || `/#/service/${id}`,
  };
}

export function listAll(): RightRow[] {
  try {
    const rows = db().prepare(`${selectSql()} ORDER BY id ASC`).all() as CustomRow[];
    return rows.map(toRightRow);
  } catch {
    return [];
  }
}

export interface CustomRightInput {
  topic: string;
  category?: string;
  subCategory?: string;
  audience?: string;
  whatReceived?: string;
  publicSiteText?: string;
  treatingBody?: string;
  haredi?: string;
  priority?: number;
  // Extended fields — optional. Admin can add later via edit endpoint.
  eligibility?: string;
  qualifyingCases?: string;
  preparation?: string;
  documents?: string;
  howToApply?: string;
  officialLinks?: string;
  bkalutCost?: string;
  faq?: string;
  goldTip?: string;
  eligibilityJson?: string;
  intakeJson?: string;
  documentsJson?: string;
  podcastScript?: string;
  voiceShort?: string;
  emailScript?: string;
  aiSearch?: string;
  aiExtra?: string;
  serviceUrl?: string;
  createdBy?: string;
}

export function create(input: CustomRightInput): RightRow {
  const topic = String(input.topic || "").trim();
  if (!topic) throw new Error("topic is required");
  const now = new Date().toISOString();
  const info = db().prepare(`
    INSERT INTO custom_rights (
      priority, category, sub_category, topic, treating_body, audience,
      what_received, eligibility, qualifying_cases, preparation, documents,
      how_to_apply, official_links, bkalut_cost, public_site_text, faq,
      gold_tip, eligibility_json, intake_json, documents_json, podcast_script,
      voice_short, email_script, ai_search, ai_extra, haredi, service_url,
      created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    Number.isFinite(input.priority) ? Number(input.priority) : null,
    String(input.category ?? ""),
    String(input.subCategory ?? ""),
    topic,
    String(input.treatingBody ?? ""),
    String(input.audience ?? ""),
    String(input.whatReceived ?? ""),
    String(input.eligibility ?? ""),
    String(input.qualifyingCases ?? ""),
    String(input.preparation ?? ""),
    String(input.documents ?? ""),
    String(input.howToApply ?? ""),
    String(input.officialLinks ?? ""),
    String(input.bkalutCost ?? ""),
    String(input.publicSiteText ?? ""),
    String(input.faq ?? ""),
    String(input.goldTip ?? ""),
    String(input.eligibilityJson ?? ""),
    String(input.intakeJson ?? ""),
    String(input.documentsJson ?? ""),
    String(input.podcastScript ?? ""),
    String(input.voiceShort ?? ""),
    String(input.emailScript ?? ""),
    String(input.aiSearch ?? ""),
    String(input.aiExtra ?? ""),
    String(input.haredi ?? ""),
    String(input.serviceUrl ?? ""),
    String(input.createdBy ?? ""),
    now,
    now,
  );
  const row = db().prepare(`${selectSql()} WHERE id = ?`).get(Number(info.lastInsertRowid)) as CustomRow;
  return toRightRow(row);
}

export function update(id: number, patch: Partial<CustomRightInput>): RightRow | null {
  const realId = id > CUSTOM_RIGHT_ID_OFFSET ? id - CUSTOM_RIGHT_ID_OFFSET : id;
  const current = db().prepare(`${selectSql()} WHERE id = ?`).get(realId) as CustomRow | undefined;
  if (!current) return null;
  const now = new Date().toISOString();
  const next = {
    priority: patch.priority !== undefined ? Number(patch.priority) : current.priority,
    category: patch.category ?? current.category,
    subCategory: patch.subCategory ?? current.subCategory,
    topic: patch.topic ?? current.topic,
    treatingBody: patch.treatingBody ?? current.treatingBody,
    audience: patch.audience ?? current.audience,
    whatReceived: patch.whatReceived ?? current.whatReceived,
    eligibility: patch.eligibility ?? current.eligibility,
    qualifyingCases: patch.qualifyingCases ?? current.qualifyingCases,
    preparation: patch.preparation ?? current.preparation,
    documents: patch.documents ?? current.documents,
    howToApply: patch.howToApply ?? current.howToApply,
    officialLinks: patch.officialLinks ?? current.officialLinks,
    bkalutCost: patch.bkalutCost ?? current.bkalutCost,
    publicSiteText: patch.publicSiteText ?? current.publicSiteText,
    faq: patch.faq ?? current.faq,
    goldTip: patch.goldTip ?? current.goldTip,
    eligibilityJson: patch.eligibilityJson ?? current.eligibilityJson,
    intakeJson: patch.intakeJson ?? current.intakeJson,
    documentsJson: patch.documentsJson ?? current.documentsJson,
    podcastScript: patch.podcastScript ?? current.podcastScript,
    voiceShort: patch.voiceShort ?? current.voiceShort,
    emailScript: patch.emailScript ?? current.emailScript,
    aiSearch: patch.aiSearch ?? current.aiSearch,
    aiExtra: patch.aiExtra ?? current.aiExtra,
    haredi: patch.haredi ?? current.haredi,
    serviceUrl: patch.serviceUrl ?? current.serviceUrl,
  };
  db().prepare(`
    UPDATE custom_rights SET
      priority=?, category=?, sub_category=?, topic=?, treating_body=?,
      audience=?, what_received=?, eligibility=?, qualifying_cases=?,
      preparation=?, documents=?, how_to_apply=?, official_links=?,
      bkalut_cost=?, public_site_text=?, faq=?, gold_tip=?, eligibility_json=?,
      intake_json=?, documents_json=?, podcast_script=?, voice_short=?,
      email_script=?, ai_search=?, ai_extra=?, haredi=?, service_url=?,
      updated_at=?
    WHERE id=?
  `).run(
    next.priority, next.category, next.subCategory, next.topic, next.treatingBody,
    next.audience, next.whatReceived, next.eligibility, next.qualifyingCases,
    next.preparation, next.documents, next.howToApply, next.officialLinks,
    next.bkalutCost, next.publicSiteText, next.faq, next.goldTip, next.eligibilityJson,
    next.intakeJson, next.documentsJson, next.podcastScript, next.voiceShort,
    next.emailScript, next.aiSearch, next.aiExtra, next.haredi, next.serviceUrl,
    now, realId,
  );
  const updated = db().prepare(`${selectSql()} WHERE id = ?`).get(realId) as CustomRow;
  return toRightRow(updated);
}

export function remove(id: number): void {
  const realId = id > CUSTOM_RIGHT_ID_OFFSET ? id - CUSTOM_RIGHT_ID_OFFSET : id;
  db().prepare(`DELETE FROM custom_rights WHERE id = ?`).run(realId);
}
