/**
 * Community Gabbai Questionnaire — standalone module ("שאלוני גבאי קהילות").
 *
 * Lets admins build questionnaires (questions, answer types, options, logo),
 * generate dedicated public links/slugs, and review submissions. Public
 * respondents open a dedicated link, answer, and the submission is stored
 * locally AND dispatched on the shared webhook bus with payload source
 * `community_gabbai_questionnaire`.
 *
 * Kept fully separate from rights and financial data: tables are prefixed
 * `community_*` and routes live under /api/community/* (admin) and
 * /api/public/community/* (public). Uses the shared SQLite handle for local
 * auto-create; a Supabase migration deliverable mirrors the schema.
 */
import Database from "better-sqlite3";

let _db: Database.Database | null = null;

export function bindCommunityDb(db: Database.Database) {
  _db = db;
  db.exec(`
  CREATE TABLE IF NOT EXISTS community_questionnaires (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    intro_text TEXT,
    success_text TEXT,
    collect_contact INTEGER NOT NULL DEFAULT 1,
    active INTEGER NOT NULL DEFAULT 1,
    created_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS community_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    questionnaire_id INTEGER NOT NULL,
    label TEXT NOT NULL,
    help_text TEXT,
    type TEXT NOT NULL DEFAULT 'text',
    required INTEGER NOT NULL DEFAULT 0,
    options_json TEXT NOT NULL DEFAULT '[]',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS community_questionnaire_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    questionnaire_id INTEGER NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    label TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS community_questionnaire_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    questionnaire_id INTEGER NOT NULL,
    link_id INTEGER,
    slug TEXT,
    answers_json TEXT NOT NULL DEFAULT '{}',
    contact_name TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    community_name TEXT,
    webhook_status TEXT NOT NULL DEFAULT 'pending',
    webhook_log_id INTEGER,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL
  );
  `);
  seedDefault();
}

function db(): Database.Database {
  if (!_db) throw new Error("community-questionnaire: sqlite db not bound");
  return _db;
}

const now = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type QuestionType =
  | "text"
  | "textarea"
  | "number"
  | "yesno"
  | "choice"
  | "multichoice"
  | "date"
  | "phone"
  | "email";

export interface QuestionOption {
  value: string;
  label: string;
}
export interface CommunityQuestion {
  id: number;
  questionnaireId: number;
  label: string;
  helpText: string | null;
  type: QuestionType;
  required: boolean;
  options: QuestionOption[];
  sortOrder: number;
}
export interface CommunityQuestionnaire {
  id: number;
  title: string;
  description: string | null;
  logoUrl: string | null;
  introText: string | null;
  successText: string | null;
  collectContact: boolean;
  active: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface CommunityLink {
  id: number;
  questionnaireId: number;
  slug: string;
  label: string | null;
  active: boolean;
  createdAt: string;
}
export interface CommunitySubmission {
  id: number;
  questionnaireId: number;
  linkId: number | null;
  slug: string | null;
  answers: Record<string, unknown>;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  communityName: string | null;
  webhookStatus: string;
  webhookLogId: number | null;
  createdAt: string;
}

const toBool = (v: unknown) => Number(v) === 1;
const num = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

function parseOptions(raw: unknown): QuestionOption[] {
  try {
    const arr = JSON.parse(String(raw || "[]"));
    if (!Array.isArray(arr)) return [];
    return arr
      .map((o: any) => ({ value: String(o?.value ?? "").trim(), label: String(o?.label ?? o?.value ?? "").trim() }))
      .filter((o) => o.value || o.label);
  } catch {
    return [];
  }
}

function mapQuestionnaire(r: any): CommunityQuestionnaire {
  return {
    id: r.id, title: r.title, description: r.description ?? null, logoUrl: r.logo_url ?? null,
    introText: r.intro_text ?? null, successText: r.success_text ?? null,
    collectContact: toBool(r.collect_contact), active: toBool(r.active),
    createdBy: r.created_by ?? null, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}
function mapQuestion(r: any): CommunityQuestion {
  return {
    id: r.id, questionnaireId: r.questionnaire_id, label: r.label, helpText: r.help_text ?? null,
    type: (r.type || "text") as QuestionType, required: toBool(r.required),
    options: parseOptions(r.options_json), sortOrder: num(r.sort_order),
  };
}
function mapLink(r: any): CommunityLink {
  return { id: r.id, questionnaireId: r.questionnaire_id, slug: r.slug, label: r.label ?? null, active: toBool(r.active), createdAt: r.created_at };
}
function mapSubmission(r: any): CommunitySubmission {
  let answers: Record<string, unknown> = {};
  try { answers = JSON.parse(r.answers_json || "{}"); } catch { answers = {}; }
  return {
    id: r.id, questionnaireId: r.questionnaire_id, linkId: r.link_id ?? null, slug: r.slug ?? null,
    answers, contactName: r.contact_name ?? null, contactPhone: r.contact_phone ?? null,
    contactEmail: r.contact_email ?? null, communityName: r.community_name ?? null,
    webhookStatus: r.webhook_status, webhookLogId: r.webhook_log_id ?? null, createdAt: r.created_at,
  };
}

// ---------------------------------------------------------------------------
// Questionnaires
// ---------------------------------------------------------------------------
export function listQuestionnaires(): CommunityQuestionnaire[] {
  return db().prepare(`SELECT * FROM community_questionnaires ORDER BY id DESC`).all().map(mapQuestionnaire);
}
export function getQuestionnaire(id: number): CommunityQuestionnaire | undefined {
  const r = db().prepare(`SELECT * FROM community_questionnaires WHERE id = ?`).get(id);
  return r ? mapQuestionnaire(r) : undefined;
}
export function createQuestionnaire(input: {
  title: string; description?: string; logoUrl?: string; introText?: string; successText?: string;
  collectContact?: boolean; active?: boolean; createdBy?: string;
}): CommunityQuestionnaire {
  const ts = now();
  const info = db().prepare(
    `INSERT INTO community_questionnaires (title, description, logo_url, intro_text, success_text, collect_contact, active, created_by, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
  ).run(
    input.title.trim(), input.description?.trim() || null, input.logoUrl?.trim() || null,
    input.introText?.trim() || null, input.successText?.trim() || null,
    input.collectContact === false ? 0 : 1, input.active === false ? 0 : 1,
    input.createdBy || null, ts, ts,
  );
  return getQuestionnaire(Number(info.lastInsertRowid))!;
}
export function updateQuestionnaire(id: number, patch: {
  title?: string; description?: string; logoUrl?: string; introText?: string; successText?: string;
  collectContact?: boolean; active?: boolean;
}): CommunityQuestionnaire | undefined {
  const cur = getQuestionnaire(id);
  if (!cur) return undefined;
  db().prepare(
    `UPDATE community_questionnaires SET title=?, description=?, logo_url=?, intro_text=?, success_text=?, collect_contact=?, active=?, updated_at=? WHERE id=?`,
  ).run(
    patch.title?.trim() ?? cur.title,
    patch.description !== undefined ? (patch.description.trim() || null) : cur.description,
    patch.logoUrl !== undefined ? (patch.logoUrl.trim() || null) : cur.logoUrl,
    patch.introText !== undefined ? (patch.introText.trim() || null) : cur.introText,
    patch.successText !== undefined ? (patch.successText.trim() || null) : cur.successText,
    patch.collectContact !== undefined ? (patch.collectContact ? 1 : 0) : (cur.collectContact ? 1 : 0),
    patch.active !== undefined ? (patch.active ? 1 : 0) : (cur.active ? 1 : 0),
    now(), id,
  );
  return getQuestionnaire(id);
}
export function deleteQuestionnaire(id: number): void {
  db().prepare(`DELETE FROM community_questionnaires WHERE id = ?`).run(id);
  db().prepare(`DELETE FROM community_questions WHERE questionnaire_id = ?`).run(id);
  db().prepare(`DELETE FROM community_questionnaire_links WHERE questionnaire_id = ?`).run(id);
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------
export function listQuestions(questionnaireId: number): CommunityQuestion[] {
  return db()
    .prepare(`SELECT * FROM community_questions WHERE questionnaire_id = ? ORDER BY sort_order, id`)
    .all(questionnaireId)
    .map(mapQuestion);
}
export function createQuestion(input: {
  questionnaireId: number; label: string; helpText?: string; type?: QuestionType;
  required?: boolean; options?: QuestionOption[]; sortOrder?: number;
}): CommunityQuestion {
  const ts = now();
  const info = db().prepare(
    `INSERT INTO community_questions (questionnaire_id, label, help_text, type, required, options_json, sort_order, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
  ).run(
    input.questionnaireId, input.label.trim(), input.helpText?.trim() || null,
    input.type || "text", input.required ? 1 : 0,
    JSON.stringify(input.options ?? []), num(input.sortOrder), ts, ts,
  );
  const r = db().prepare(`SELECT * FROM community_questions WHERE id = ?`).get(Number(info.lastInsertRowid));
  return mapQuestion(r);
}
export function updateQuestion(id: number, patch: {
  label?: string; helpText?: string; type?: QuestionType; required?: boolean;
  options?: QuestionOption[]; sortOrder?: number;
}): CommunityQuestion | undefined {
  const r = db().prepare(`SELECT * FROM community_questions WHERE id = ?`).get(id) as any;
  if (!r) return undefined;
  const cur = mapQuestion(r);
  db().prepare(
    `UPDATE community_questions SET label=?, help_text=?, type=?, required=?, options_json=?, sort_order=?, updated_at=? WHERE id=?`,
  ).run(
    patch.label?.trim() ?? cur.label,
    patch.helpText !== undefined ? (patch.helpText.trim() || null) : cur.helpText,
    patch.type ?? cur.type,
    patch.required !== undefined ? (patch.required ? 1 : 0) : (cur.required ? 1 : 0),
    patch.options !== undefined ? JSON.stringify(patch.options) : JSON.stringify(cur.options),
    patch.sortOrder !== undefined ? num(patch.sortOrder) : cur.sortOrder,
    now(), id,
  );
  return mapQuestion(db().prepare(`SELECT * FROM community_questions WHERE id = ?`).get(id));
}
export function deleteQuestion(id: number): void {
  db().prepare(`DELETE FROM community_questions WHERE id = ?`).run(id);
}

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------
function slugify(input: string): string {
  const base = (input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9֐-׿]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `q-${Date.now().toString(36)}`;
}

export function listLinks(questionnaireId?: number): CommunityLink[] {
  const rows = questionnaireId
    ? db().prepare(`SELECT * FROM community_questionnaire_links WHERE questionnaire_id = ? ORDER BY id DESC`).all(questionnaireId)
    : db().prepare(`SELECT * FROM community_questionnaire_links ORDER BY id DESC`).all();
  return rows.map(mapLink);
}
export function getLinkBySlug(slug: string): CommunityLink | undefined {
  const r = db().prepare(`SELECT * FROM community_questionnaire_links WHERE slug = ?`).get(slug);
  return r ? mapLink(r) : undefined;
}
export function createLink(input: { questionnaireId: number; slug?: string; label?: string; createdBy?: string }): { ok: true; link: CommunityLink } | { ok: false; error: string } {
  let slug = slugify(input.slug || input.label || `q${input.questionnaireId}`);
  // ensure unique
  let attempt = slug;
  let i = 1;
  while (db().prepare(`SELECT 1 FROM community_questionnaire_links WHERE slug = ?`).get(attempt)) {
    attempt = `${slug}-${i++}`;
  }
  slug = attempt;
  const ts = now();
  try {
    const info = db().prepare(
      `INSERT INTO community_questionnaire_links (questionnaire_id, slug, label, active, created_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?)`,
    ).run(input.questionnaireId, slug, input.label?.trim() || null, 1, input.createdBy || null, ts, ts);
    return { ok: true, link: mapLink(db().prepare(`SELECT * FROM community_questionnaire_links WHERE id = ?`).get(Number(info.lastInsertRowid))) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "failed to create link" };
  }
}
export function updateLink(id: number, patch: { label?: string; active?: boolean }): CommunityLink | undefined {
  const r = db().prepare(`SELECT * FROM community_questionnaire_links WHERE id = ?`).get(id) as any;
  if (!r) return undefined;
  const cur = mapLink(r);
  db().prepare(`UPDATE community_questionnaire_links SET label=?, active=?, updated_at=? WHERE id=?`).run(
    patch.label !== undefined ? (patch.label.trim() || null) : cur.label,
    patch.active !== undefined ? (patch.active ? 1 : 0) : (cur.active ? 1 : 0),
    now(), id,
  );
  return mapLink(db().prepare(`SELECT * FROM community_questionnaire_links WHERE id = ?`).get(id));
}
export function deleteLink(id: number): void {
  db().prepare(`DELETE FROM community_questionnaire_links WHERE id = ?`).run(id);
}

// ---------------------------------------------------------------------------
// Submissions
// ---------------------------------------------------------------------------
export function insertSubmission(input: {
  questionnaireId: number; linkId?: number | null; slug?: string | null;
  answers: Record<string, unknown>; contactName?: string; contactPhone?: string;
  contactEmail?: string; communityName?: string; ipAddress?: string; userAgent?: string;
}): CommunitySubmission {
  const ts = now();
  const info = db().prepare(
    `INSERT INTO community_questionnaire_submissions
      (questionnaire_id, link_id, slug, answers_json, contact_name, contact_phone, contact_email, community_name, webhook_status, webhook_log_id, ip_address, user_agent, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).run(
    input.questionnaireId, input.linkId ?? null, input.slug ?? null,
    JSON.stringify(input.answers ?? {}),
    input.contactName?.trim() || null, input.contactPhone?.trim() || null,
    input.contactEmail?.trim() || null, input.communityName?.trim() || null,
    "pending", null, input.ipAddress || null, input.userAgent || null, ts,
  );
  return mapSubmission(db().prepare(`SELECT * FROM community_questionnaire_submissions WHERE id = ?`).get(Number(info.lastInsertRowid)));
}
export function listSubmissions(questionnaireId?: number, limit = 200): CommunitySubmission[] {
  const rows = questionnaireId
    ? db().prepare(`SELECT * FROM community_questionnaire_submissions WHERE questionnaire_id = ? ORDER BY id DESC LIMIT ?`).all(questionnaireId, limit)
    : db().prepare(`SELECT * FROM community_questionnaire_submissions ORDER BY id DESC LIMIT ?`).all(limit);
  return rows.map(mapSubmission);
}
export function updateSubmissionWebhook(id: number, status: string, logId: number | null): void {
  db().prepare(`UPDATE community_questionnaire_submissions SET webhook_status=?, webhook_log_id=? WHERE id=?`).run(status, logId, id);
}

// ---------------------------------------------------------------------------
// Default seed — "צרכי קהילה" with ~30 diverse questions + a public link.
// ---------------------------------------------------------------------------
const DEFAULT_QUESTIONS: { label: string; type: QuestionType; required?: boolean; help?: string; options?: string[] }[] = [
  { label: "שם הקהילה / בית הכנסת", type: "text", required: true },
  { label: "שם הגבאי / איש הקשר", type: "text", required: true },
  { label: "טלפון ליצירת קשר", type: "phone", required: true },
  { label: "כמה משפחות משתייכות לקהילה?", type: "number", help: "מספר משוער" },
  { label: "התפלגות גילאים עיקרית בקהילה", type: "multichoice", options: ["צעירים/אברכים", "משפחות עם ילדים", "גיל הביניים", "מבוגרים/קשישים"] },
  { label: "האם יש בקהילה משפחות הזקוקות לסיוע במימוש זכויות?", type: "yesno" },
  { label: "כמה משפחות זקוקות לליווי במימוש זכויות?", type: "number" },
  { label: "האם הקהילה מעוניינת במכירות מסובסדות (מזון, ביגוד)?", type: "yesno" },
  { label: "אילו תחומי מכירות מסובסדות רלוונטיים?", type: "multichoice", options: ["מזון", "ביגוד והנעלה", "ציוד לתינוקות", "ספרי קודש", "מוצרי חשמל"] },
  { label: "האם יש צורך בסיוע במזון לקראת חגים?", type: "yesno" },
  { label: "כמה משפחות זקוקות לסיוע מזון לחגים?", type: "number" },
  { label: "האם יש בקהילה בעלי צרכים מיוחדים / נכויות?", type: "yesno" },
  { label: "פירוט קצר על צרכי בריאות וצרכים מיוחדים", type: "textarea" },
  { label: "האם יש קשישים הזקוקים לתמיכה?", type: "yesno" },
  { label: "אילו סוגי תמיכה לקשישים נדרשים?", type: "multichoice", options: ["ביקורי בית", "סיוע רפואי", "ארוחות", "הסעות", "חברתי/בדידות"] },
  { label: "כמה משפחות עם ילדים מרובות צרכים?", type: "number" },
  { label: "האם יש צורך בסיוע בדיור / שכר דירה?", type: "yesno" },
  { label: "פירוט מצב הדיור והשכירות בקהילה", type: "textarea" },
  { label: "האם יש מובטלים או משפחות ללא הכנסה יציבה?", type: "yesno" },
  { label: "אילו תחומי תעסוקה / הכשרה היו מסייעים?", type: "textarea" },
  { label: "האם יש צורך בסיוע בהסעות / תחבורה?", type: "yesno" },
  { label: "האם יש צרכים בתחום החינוך (גנים, תלמודי תורה, חוגים)?", type: "yesno" },
  { label: "פירוט צרכים חינוכיים", type: "textarea" },
  { label: "האם נדרש סיוע בגישה דיגיטלית / טלפונים / אינטרנט מסונן?", type: "yesno" },
  { label: "האם הקהילה זקוקה לקרן חירום למצבי משבר?", type: "yesno" },
  { label: "כמה מתנדבים פעילים יש בקהילה?", type: "number" },
  { label: "האם יש עניין בהדרכות / הרצאות בנושא זכויות?", type: "yesno" },
  { label: "אילו צרכים חוזרים על עצמם מדי חודש?", type: "textarea" },
  { label: "ערוץ התקשורת המועדף מולכם", type: "choice", options: ["טלפון", "וואטסאפ", "מייל", "מסרון/SMS"] },
  { label: "הערות נוספות וצרכים שלא צוינו", type: "textarea" },
  { label: "אני מאשר/ת פנייה חוזרת מטעם בקלות בנוגע לצרכי הקהילה", type: "yesno", required: true, help: "הסכמה ליצירת קשר לצורך מתן מענה" },
];

function seedDefault() {
  const count = (db().prepare(`SELECT COUNT(*) AS c FROM community_questionnaires`).get() as any).c as number;
  if (count > 0) return;

  const q = createQuestionnaire({
    title: "צרכי קהילה",
    description: "שאלון מיפוי צרכים לגבאי קהילות ובתי כנסת — לזיהוי מענים אפשריים בתחומי הזכויות, הסיוע והרווחה.",
    introText: "שלום וברכה. מילוי השאלון יסייע לנו להבין את צרכי הקהילה ולהציע מענים מתאימים. אין חובה למלא את כל השדות.",
    successText: "תודה רבה! הפרטים התקבלו ונחזור אליכם בהקדם בנוגע לצרכי הקהילה.",
    collectContact: true,
    active: true,
    createdBy: "seed",
  });

  DEFAULT_QUESTIONS.forEach((item, idx) => {
    createQuestion({
      questionnaireId: q.id,
      label: item.label,
      type: item.type,
      required: item.required ?? false,
      helpText: item.help,
      options: (item.options ?? []).map((o) => ({ value: o, label: o })),
      sortOrder: idx,
    });
  });

  createLink({ questionnaireId: q.id, slug: "kehila", label: "קישור ראשי — צרכי קהילה", createdBy: "seed" });
}
