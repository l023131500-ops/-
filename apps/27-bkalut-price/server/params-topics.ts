/**
 * Admin-only "מאגר פרמטרים ונושאים" — large extensible knowledge map of
 * parameter / topic entries that admin uses for future matching, searching
 * and content authoring (family, economic, health, employment, housing,
 * elderly, immigrants, etc.).
 *
 * Public endpoints DO NOT expose this — admin-gated only.
 *
 * Stored in the local SQLite (same pattern as potential_scanner): zero extra
 * Supabase migration required to start using it. A migration file is also
 * provided under /deliverables for teams that want to move to Supabase.
 */
import Database from "better-sqlite3";

let _db: Database.Database | null = null;

export function bindParamsTopicsDb(db: Database.Database) {
  _db = db;
  db.exec(`
  CREATE TABLE IF NOT EXISTS params_topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT '',
    sub_category TEXT NOT NULL DEFAULT '',
    profile_conditions_json TEXT NOT NULL DEFAULT '[]',
    description TEXT NOT NULL DEFAULT '',
    tags_json TEXT NOT NULL DEFAULT '[]',
    priority INTEGER NOT NULL DEFAULT 50,
    source TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_params_topics_category ON params_topics(category);
  CREATE INDEX IF NOT EXISTS idx_params_topics_priority ON params_topics(priority);
  `);
  seedIfEmpty();
}

function db(): Database.Database {
  if (!_db) throw new Error("params-topics: sqlite db not bound");
  return _db;
}

export interface ParamTopicRow {
  id: number;
  title: string;
  category: string;
  subCategory: string;
  profileConditionsJson: string;
  description: string;
  tagsJson: string;
  priority: number;
  source: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParamTopicOut {
  id: number;
  title: string;
  category: string;
  subCategory: string;
  profileConditions: string[];
  description: string;
  tags: string[];
  priority: number;
  source: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParamTopicInput {
  title: string;
  category?: string;
  subCategory?: string;
  profileConditions?: string[];
  description?: string;
  tags?: string[];
  priority?: number;
  source?: string;
  notes?: string;
}

function parseArr(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}

export function toOut(row: ParamTopicRow): ParamTopicOut {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    subCategory: row.subCategory,
    profileConditions: parseArr(row.profileConditionsJson),
    description: row.description,
    tags: parseArr(row.tagsJson),
    priority: row.priority,
    source: row.source,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function selectAllSql(): string {
  return `
    SELECT id, title, category, sub_category AS subCategory,
      profile_conditions_json AS profileConditionsJson, description,
      tags_json AS tagsJson, priority, source, notes,
      created_at AS createdAt, updated_at AS updatedAt
    FROM params_topics
  `;
}

export function listAll(): ParamTopicOut[] {
  const rows = db()
    .prepare(`${selectAllSql()} ORDER BY priority DESC, category ASC, title ASC`)
    .all() as ParamTopicRow[];
  return rows.map(toOut);
}

export function getById(id: number): ParamTopicOut | null {
  const row = db()
    .prepare(`${selectAllSql()} WHERE id = ?`)
    .get(id) as ParamTopicRow | undefined;
  return row ? toOut(row) : null;
}

export function create(input: ParamTopicInput): ParamTopicOut {
  const now = new Date().toISOString();
  const info = db()
    .prepare(`
    INSERT INTO params_topics (
      title, category, sub_category, profile_conditions_json, description,
      tags_json, priority, source, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      String(input.title || "").trim() || "ללא כותרת",
      String(input.category || "").trim(),
      String(input.subCategory || "").trim(),
      JSON.stringify(input.profileConditions ?? []),
      String(input.description || ""),
      JSON.stringify(input.tags ?? []),
      Number.isFinite(input.priority) ? Math.max(0, Math.min(100, Number(input.priority))) : 50,
      String(input.source || ""),
      String(input.notes || ""),
      now,
      now,
    );
  return getById(Number(info.lastInsertRowid))!;
}

export function update(id: number, patch: Partial<ParamTopicInput>): ParamTopicOut | null {
  const current = getById(id);
  if (!current) return null;
  const next = {
    title: patch.title !== undefined ? String(patch.title) : current.title,
    category: patch.category !== undefined ? String(patch.category) : current.category,
    subCategory: patch.subCategory !== undefined ? String(patch.subCategory) : current.subCategory,
    profileConditions: patch.profileConditions !== undefined ? patch.profileConditions.map(String) : current.profileConditions,
    description: patch.description !== undefined ? String(patch.description) : current.description,
    tags: patch.tags !== undefined ? patch.tags.map(String) : current.tags,
    priority: patch.priority !== undefined ? Math.max(0, Math.min(100, Number(patch.priority))) : current.priority,
    source: patch.source !== undefined ? String(patch.source) : current.source,
    notes: patch.notes !== undefined ? String(patch.notes) : current.notes,
  };
  db().prepare(`
    UPDATE params_topics
    SET title = ?, category = ?, sub_category = ?, profile_conditions_json = ?,
      description = ?, tags_json = ?, priority = ?, source = ?, notes = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    next.title,
    next.category,
    next.subCategory,
    JSON.stringify(next.profileConditions),
    next.description,
    JSON.stringify(next.tags),
    next.priority,
    next.source,
    next.notes,
    new Date().toISOString(),
    id,
  );
  return getById(id);
}

export function remove(id: number): void {
  db().prepare(`DELETE FROM params_topics WHERE id = ?`).run(id);
}

// ---------------------------------------------------------------------------
// Seed: meaningful initial list across families/economic/health/housing/etc.
// ---------------------------------------------------------------------------

const SEED: ParamTopicInput[] = [
  // family
  { title: "משפחה חד הורית", category: "מצב משפחתי", profileConditions: ["single_parent"], description: "זכויות לאם/אב יחיד: מענקים, נקודות זיכוי, סיוע בשכר דירה, הקצאות במעונות יום.", tags: ["family", "single_parent"], priority: 90, source: "ביטוח לאומי / רשות המסים" },
  { title: "משפחה ברוכת ילדים", category: "מצב משפחתי", profileConditions: ["large_family"], description: "הנחות ארנונה, הטבות מים, הקצאות במוסדות חינוך והנחות בתחבורה.", tags: ["family", "large_family"], priority: 80 },
  { title: "אלמן/ה", category: "מצב משפחתי", profileConditions: ["widowed"], description: "קצבת שאירים, הטבות מס, סיוע נפשי וכלכלי לאחר שכול.", tags: ["family", "widowed"], priority: 85, source: "ביטוח לאומי" },
  { title: "גרושים/פרודים", category: "מצב משפחתי", profileConditions: ["divorced", "separated"], description: "מזונות, סדרי דין במשפחה, סיוע משפטי.", tags: ["family", "divorced"], priority: 70 },
  // economic
  { title: "הכנסה נמוכה / מתחת לקו העוני", category: "מצב כלכלי", profileConditions: ["low_income"], description: "הבטחת הכנסה, מענק עבודה, הנחות בארנונה, סלי מזון.", tags: ["income", "low_income"], priority: 95, source: "ביטוח לאומי / רשות המסים" },
  { title: "מובטלים / מחפשי עבודה", category: "מצב כלכלי", profileConditions: ["unemployed"], description: "דמי אבטלה, השמה תעסוקתית, הכשרות מקצועיות.", tags: ["employment", "unemployed"], priority: 90 },
  { title: "עצמאים", category: "מצב כלכלי", profileConditions: ["self_employed"], description: "החזרי מס, הקלות לעצמאים, שירותי דיגיטל לעסקים קטנים.", tags: ["self_employed", "tax"], priority: 60 },
  { title: "אברך / לומד כולל", category: "מצב כלכלי", profileConditions: ["avrech"], description: "מלגות לימוד, הטבות לאוכלוסיית הכוללים, סבסוד מעונות.", tags: ["avrech", "scholarships"], priority: 80 },
  // children
  { title: "ילד עם נכות / ליקוי", category: "ילדים", profileConditions: ["child_disability"], description: "קצבת ילד נכה, הכרה בילד מיוחד, החזרי טיפולים פארא-רפואיים.", tags: ["children", "disability"], priority: 95, source: "ביטוח לאומי / קופ\"ח" },
  { title: "ילד עם צורך התפתחותי", category: "ילדים", profileConditions: ["child_developmental"], description: "הכרה התפתחותית, ועדות השמה, פסיכולוג חינוכי, ריפוי בעיסוק/דיבור.", tags: ["children", "developmental"], priority: 80 },
  { title: "ילד חולה כרוני", category: "ילדים", profileConditions: ["child_chronic_illness"], description: "סיוע רפואי, החזרי תרופות, ליווי חברתי-רפואי.", tags: ["children", "chronic_illness"], priority: 85 },
  // health
  { title: "מבוגר עם נכות / מוגבלות", category: "בריאות", profileConditions: ["adult_disability"], description: "קצבת נכות, הטבות במס, חניית נכה, סיעוד.", tags: ["disability"], priority: 95, source: "ביטוח לאומי" },
  { title: "חולה כרוני", category: "בריאות", profileConditions: ["chronic_illness"], description: "ועדה רפואית, סל תרופות, ביטוח משלים, החזרי הוצאות.", tags: ["chronic_illness"], priority: 80 },
  { title: "טיפולים פסיכולוגיים / נפשיים", category: "בריאות", profileConditions: ["mental_health"], description: "הכרה ביטוחית, סבסוד טיפולים, ליווי משפחתי.", tags: ["mental_health"], priority: 75 },
  // employment
  { title: "אבטחת תעסוקה / השמה", category: "תעסוקה", profileConditions: ["job_seeking"], description: "מרכזי תעסוקה, הכשרות, מענקי השמה.", tags: ["employment"], priority: 65 },
  { title: "פנסיה ואיזון פיננסי לעובדים", category: "תעסוקה", profileConditions: ["no_pension"], description: "ייעוץ פנסיוני, הסדרת חוסר הפרשות, החזרי מס לפנסיונרים.", tags: ["pension"], priority: 85 },
  // housing
  { title: "סיוע בשכר דירה", category: "דיור", profileConditions: ["renting", "low_income"], description: "סיוע ממשרד הבינוי, סיוע עירוני, סבסוד שכר דירה.", tags: ["rent", "housing"], priority: 90 },
  { title: "משכנתא והלוואות זכאות", category: "דיור", profileConditions: ["has_mortgage"], description: "מיחזור משכנתא, הלוואות זכאות, ביטוחי משכנתא.", tags: ["mortgage"], priority: 75 },
  { title: "דירה בהנחה (הגרלות מחיר מטרה / מחיר למשתכן)", category: "דיור", profileConditions: ["wants_home_purchase"], description: "הרשמה להגרלות דירה בהנחה, מחיר מטרה ודיור בר-השגה.", tags: ["housing", "lottery", "discount_home"], priority: 88, source: "משרד הבינוי והשיכון" },
  { title: "דיור ציבורי", category: "דיור", profileConditions: ["public_housing_eligible"], description: "ועדות דיור, התאמת דירה, סיוע למשפחות במצבי מצוקה.", tags: ["public_housing"], priority: 80 },
  // utilities and recurring discounts
  { title: "ארנונה — הנחה", category: "תשלומים שוטפים", profileConditions: ["arnona_discount_eligible"], description: "הנחות הכנסה, נכות, גיל, סטודנט.", tags: ["arnona"], priority: 80 },
  { title: "מים — הקצאת נפשות / חולה", category: "תשלומים שוטפים", profileConditions: ["water_extra_household"], description: "הקצאת מים מוגדלת לחולים ולמשפחות גדולות.", tags: ["water"], priority: 70 },
  { title: "תחבורה ציבורית — פרופיל הנחה", category: "תשלומים שוטפים", profileConditions: ["transport_discount"], description: "רב-קו לסטודנט, ותיק, נכה, חיילים ועוד.", tags: ["transport"], priority: 60 },
  { title: "חשמל — מעבר ספק / הנחות", category: "תשלומים שוטפים", profileConditions: ["electricity_switch"], description: "מעבר ספק חשמל, הנחות לזכאים, חשמל חברתי.", tags: ["electricity"], priority: 55 },
  // health insurance
  { title: "קופת חולים — ביטוח משלים", category: "ביטוח", profileConditions: ["supplementary_insurance"], description: "בחירת תוכנית, החזרים, התאמה אישית.", tags: ["health_insurance"], priority: 60 },
  { title: "פנסיה — ייעוץ פנסיוני אובייקטיבי", category: "ביטוח", profileConditions: ["pension_unknown"], description: "מסלולים, איזון אקטוארי, חיסכון לטווח ארוך.", tags: ["pension"], priority: 75 },
  // elderly / population groups
  { title: "אזרח ותיק / קצבת זקנה", category: "אוכלוסיות", profileConditions: ["elderly"], description: "קצבת אזרח ותיק, סיעוד, הנחות שירותים ותרבות.", tags: ["elderly"], priority: 90, source: "ביטוח לאומי" },
  { title: "ניצול שואה", category: "אוכלוסיות", profileConditions: ["holocaust_survivor"], description: "קצבה ייעודית, הטבות רפואיות וסיוע נפשי.", tags: ["holocaust"], priority: 95, source: "משרד האוצר / הרשות לזכויות ניצולי שואה" },
  { title: "עולה חדש", category: "אוכלוסיות", profileConditions: ["new_immigrant"], description: "סל קליטה, הטבות מס, סיוע בלימוד עברית, סבסוד דיור.", tags: ["immigration"], priority: 85, source: "משרד הקליטה" },
  { title: "חייל משוחרר", category: "אוכלוסיות", profileConditions: ["recently_discharged"], description: "פיקדון, מענק, סבסוד לימודים, סיוע נפשי.", tags: ["army"], priority: 80 },
  // charities
  { title: "פנייה לעמותות לפי תחום", category: "סיוע התנדבותי", profileConditions: ["need_charity_help"], description: "מאגר עמותות לסיוע במזון, ציוד, בריאות, חופשות נופש ועוד. שונה מזכות לפי חוק.", tags: ["charity", "non_legal"], priority: 50 },

  // ---- additional "נושאים נוספים" — broad condition→rights mapping ----
  // health condition groups (generic — no disease-specific claims)
  { title: "מצב בריאותי כללי — בדיקת התאמה לנכות כללית", category: "נושאים נוספים", subCategory: "בריאות", profileConditions: ["health_impairment_general"], description: "לבדוק זכאות לקצבת נכות כללית, התאמה לקופ\"ח, השלמת הכנסה, פטור/הנחות מס.", tags: ["disability", "nbi"], priority: 80, source: "ביטוח לאומי / קופ\"ח" },
  { title: "תפקוד יומיומי מוגבל — שירותים מיוחדים / שר\"מ", category: "נושאים נוספים", subCategory: "בריאות", profileConditions: ["functional_limitation"], description: "קצבת שירותים מיוחדים (שר\"מ), עזרה בבית, מימון ציוד עזר.", tags: ["nbi", "sherut_meyuhad"], priority: 80, source: "ביטוח לאומי" },
  { title: "צורך בסיעוד או בליווי בבית", category: "נושאים נוספים", subCategory: "בריאות", profileConditions: ["needs_care"], description: "חוק סיעוד, שירותי תומך טיפול, מימון מטפל/ת בית.", tags: ["care", "elderly"], priority: 80, source: "ביטוח לאומי" },
  { title: "פנייה לרווחה — סיוע סוציאלי", category: "נושאים נוספים", subCategory: "רווחה", profileConditions: ["family_at_risk", "needs_welfare"], description: "פתיחת תיק ברווחה, סיוע במצוקה, ועדות החלטה.", tags: ["welfare"], priority: 75, source: "משרד הרווחה / רשות מקומית" },
  { title: "בריאות הנפש בקופ\"ח / שב\"ן", category: "נושאים נוספים", subCategory: "בריאות", profileConditions: ["mental_health_need"], description: "הכרה בקופ\"ח, התחלת טיפול, החזרי שב\"ן, הסדרת אבחון.", tags: ["mental_health"], priority: 70 },
  { title: "החזרי טיפולים פארא-רפואיים", category: "נושאים נוספים", subCategory: "בריאות", profileConditions: ["paramedical_treatments"], description: "ריפוי בעיסוק, קלינאית תקשורת, פיזיותרפיה — החזרים דרך קופ\"ח/ביטוח משלים.", tags: ["paramedical"], priority: 65 },

  // family / economic
  { title: "משפחת בני זוג עובדים — מענק עבודה (מס הכנסה שלילי)", category: "נושאים נוספים", subCategory: "מצב כלכלי", profileConditions: ["working_family"], description: "מענק לעבודה לעובדים שכירים/עצמאים עם הכנסה נמוכה-בינונית.", tags: ["work_grant"], priority: 85, source: "רשות המסים" },
  { title: "אם/אב לפעוט-תינוק — קצבאות לידה ודמי לידה", category: "נושאים נוספים", subCategory: "ילדים", profileConditions: ["new_parent"], description: "מענק לידה, דמי לידה, הארכת לידה, אשפוז יולדת ופג.", tags: ["maternity", "newborn"], priority: 85, source: "ביטוח לאומי" },
  { title: "ילד עם צרכים מיוחדים — חינוך מיוחד / שילוב", category: "נושאים נוספים", subCategory: "ילדים", profileConditions: ["child_special_needs"], description: "ועדת השמה, סייעת אישית, החזרי טיפולים, התאמות בלימודים.", tags: ["education", "special_needs"], priority: 85, source: "משרד החינוך" },
  { title: "ילד מאומץ / אומנה", category: "נושאים נוספים", subCategory: "ילדים", profileConditions: ["foster_or_adopt"], description: "תמיכות לאומנה, סיוע משפטי באימוץ, ליווי רגשי.", tags: ["foster"], priority: 70 },

  // housing extended
  { title: "פינוי בינוי / תמ\"א 38", category: "נושאים נוספים", subCategory: "דיור", profileConditions: ["urban_renewal_owner"], description: "זכויות דייר בפינוי-בינוי / תמ\"א, ליווי משפטי, פטור ממס שבח/רכישה.", tags: ["housing", "renewal"], priority: 60 },
  { title: "דיור לזכאים — הגרלות מחיר מטרה / מחיר למשתכן", category: "נושאים נוספים", subCategory: "דיור", profileConditions: ["wants_home_purchase", "no_property"], description: "הרשמה להגרלות, דירה בהנחה משמעותית, בדיקת זכאות במשרד הבינוי.", tags: ["lottery", "discount_home"], priority: 88, source: "משרד הבינוי" },
  { title: "דיור לקשיש / סיוע בדיור מוגן", category: "נושאים נוספים", subCategory: "דיור", profileConditions: ["elderly", "needs_housing_help"], description: "הקצאת דיור מוגן ציבורי, סיוע חודשי, התאמת בית.", tags: ["elderly", "housing"], priority: 75 },

  // employment / pensions extended
  { title: "פיטורים / אבטלה — דמי אבטלה והשלמה", category: "נושאים נוספים", subCategory: "תעסוקה", profileConditions: ["recently_fired"], description: "דמי אבטלה בביטוח לאומי, הכשרות, השמה במרכזי תעסוקה.", tags: ["unemployment"], priority: 90, source: "ביטוח לאומי" },
  { title: "בעלי עסק במשבר — הקפאת חובות והסדרים", category: "נושאים נוספים", subCategory: "תעסוקה", profileConditions: ["business_distress"], description: "סיוע משפטי לעוסקים, הסדרי מע\"מ, פריסת חובות, הקלות מס הכנסה.", tags: ["business", "tax"], priority: 70 },
  { title: "פנסיה לא פעילה / קופות אבודות", category: "נושאים נוספים", subCategory: "פנסיה וביטוחים", profileConditions: ["lost_pension"], description: "איתור חשבונות אבודים, ייעוץ פנסיוני, הסדרת הפרשות.", tags: ["pension"], priority: 80 },
  { title: "ביטוח חיים ואובדן כושר עבודה — בדיקת כפילויות", category: "נושאים נוספים", subCategory: "פנסיה וביטוחים", profileConditions: ["multiple_insurances"], description: "בדיקת פוליסות, הסרת כפילויות, חיסכון בעלות.", tags: ["insurance"], priority: 60 },

  // transport / utilities
  { title: "רכב מותאם נכות / חניית נכה", category: "נושאים נוספים", subCategory: "תחבורה", profileConditions: ["disability_transport"], description: "פטור מס רכישה, ליסינג מותאם, תו חנייה לנכה.", tags: ["disability", "car"], priority: 70 },
  { title: "תחבורה ציבורית — רב-קו מוטב לנכים / ותיקים", category: "נושאים נוספים", subCategory: "תחבורה", profileConditions: ["transport_discount", "disability", "elderly"], description: "פרופיל הנחה ברב-קו, פטור מתשלום בקווים מסוימים.", tags: ["transport"], priority: 60 },
  { title: "מים — הנחות לחולה / משפחה גדולה / נכות", category: "נושאים נוספים", subCategory: "תשלומים שוטפים", profileConditions: ["water_extra_household", "chronic_illness"], description: "הקצאת מים נוספת לחולה כרוני, נפשות במשק הבית, תיקוני חשבון.", tags: ["water"], priority: 70 },
  { title: "חשמל — תעריף מופחת / חשמל חברתי", category: "נושאים נוספים", subCategory: "תשלומים שוטפים", profileConditions: ["electricity_switch"], description: "מעבר ספק, תעריפים סוציאליים, הנחה למוגבלי תנועה.", tags: ["electricity"], priority: 60 },
  { title: "ארנונה — הנחה חברתית / לנכים", category: "נושאים נוספים", subCategory: "תשלומים שוטפים", profileConditions: ["arnona_discount_eligible"], description: "הנחת ארנונה לפי קריטריונים מגוונים: הכנסה, נכות, גיל, סטודנט.", tags: ["arnona"], priority: 80 },

  // education
  { title: "השכלה אקדמית / סטודנט — מלגות והנחות", category: "נושאים נוספים", subCategory: "חינוך", profileConditions: ["student"], description: "מלגות מל\"ג, מלגות עירוניות, הנחת ארנונה לסטודנט, רב-קו סטודנט.", tags: ["education", "student"], priority: 65 },
  { title: "תלמיד חינוך מיוחד — סייעות ושירותי תמיכה", category: "נושאים נוספים", subCategory: "חינוך", profileConditions: ["child_special_needs"], description: "ליווי חינוכי, סייעת רפואית, התאמות בלימודים ובבחינות.", tags: ["education"], priority: 75 },
  { title: "פטור ממס לסטודנט / אברך לומד", category: "נושאים נוספים", subCategory: "חינוך", profileConditions: ["student", "avrech"], description: "פטור ממס בשל לימודים, נקודות זיכוי לסטודנט/אברך.", tags: ["tax", "study"], priority: 60 },

  // populations
  { title: "אזרח ותיק — קצבת זקנה והשלמת הכנסה", category: "נושאים נוספים", subCategory: "אוכלוסיות", profileConditions: ["elderly"], description: "קצבת אזרח ותיק, השלמת הכנסה לקשיש, הנחות שירותי תרבות.", tags: ["elderly", "nbi"], priority: 90, source: "ביטוח לאומי" },
  { title: "ניצול שואה — קצבה ייעודית והטבות", category: "נושאים נוספים", subCategory: "אוכלוסיות", profileConditions: ["holocaust_survivor"], description: "קצבה ייעודית, הטבות רפואיות, מענקים מהקרן לנכי השואה.", tags: ["holocaust"], priority: 95, source: "הרשות לזכויות ניצולי שואה" },
  { title: "אלמנת / יתום צה\"ל ופעולות איבה", category: "נושאים נוספים", subCategory: "אוכלוסיות", profileConditions: ["bereavement_idf"], description: "קצבה למשפחות שכולות, ליווי משרד הביטחון, מענקים.", tags: ["idf"], priority: 90 },
  { title: "עולה חדש — סל קליטה והטבות", category: "נושאים נוספים", subCategory: "אוכלוסיות", profileConditions: ["new_immigrant"], description: "סל קליטה, פטור ממס, סבסוד אולפן, הטבות מס לעולה.", tags: ["immigration"], priority: 85 },
  { title: "חייל משוחרר — פיקדון, מענק לימודים", category: "נושאים נוספים", subCategory: "אוכלוסיות", profileConditions: ["recently_discharged"], description: "פיקדון אישי, מענק שנה ראשונה, מימון לימודים, סיוע נפשי.", tags: ["army"], priority: 80 },

  // legal / debt
  { title: "הסדר חובות / חדלות פירעון", category: "נושאים נוספים", subCategory: "כלכלי", profileConditions: ["in_debt_process"], description: "ליווי משפטי בהליך חדלות פירעון, הסדר חובות, הפטר.", tags: ["debt", "legal"], priority: 75 },
  { title: "סיוע משפטי — לשכת הסיוע המשפטי", category: "נושאים נוספים", subCategory: "משפט", profileConditions: ["legal_help"], description: "ייצוג חינם בענייני שכ\"ד, רווחה, פש\"ר ועוד עבור זכאים.", tags: ["legal"], priority: 70, source: "משרד המשפטים" },
  { title: "התעמרות / זכויות עובד", category: "נושאים נוספים", subCategory: "עבודה ומשפט", profileConditions: ["work_rights_violation"], description: "תלונה לרגולטור, ליווי משפטי, החזר שכר ופיצויים.", tags: ["labor"], priority: 65 },

  // NGO / charity
  { title: "סיוע במזון — סלי מזון ותמיכה", category: "נושאים נוספים", subCategory: "סיוע התנדבותי", profileConditions: ["needs_food_aid"], description: "פנייה לעמותות מזון, תווי קנייה, תלושים לחגים.", tags: ["food", "charity"], priority: 60 },
  { title: "סיוע בציוד — מקררים, ריהוט, מחשבים", category: "נושאים נוספים", subCategory: "סיוע התנדבותי", profileConditions: ["needs_equipment"], description: "עמותות לציוד יד-שנייה ותרומות, סיוע במכשירי חשמל.", tags: ["equipment"], priority: 55 },
  { title: "תמיכה רגשית / קווי סיוע", category: "נושאים נוספים", subCategory: "סיוע התנדבותי", profileConditions: ["emotional_support"], description: "ער\"ן, קווי תמיכה, ייעוץ זוגי ומשפחתי לעמותות.", tags: ["support"], priority: 60 },
  { title: "חופשות נופש / ימי כיף לילדים בסיכון", category: "נושאים נוספים", subCategory: "סיוע התנדבותי", profileConditions: ["needs_respite"], description: "תוכניות נופש שמופעלות ע\"י עמותות לילדים ולמשפחות במצוקה.", tags: ["respite"], priority: 55 },
];

function seedIfEmpty() {
  try {
    const now = new Date().toISOString();
    const insert = db().prepare(`
      INSERT INTO params_topics (
        title, category, sub_category, profile_conditions_json, description,
        tags_json, priority, source, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const existing = db()
      .prepare(`SELECT title FROM params_topics`)
      .all() as Array<{ title: string }>;
    const existingTitles = new Set(existing.map((r) => r.title.trim()));
    const tx = db().transaction((rows: ParamTopicInput[]) => {
      for (const r of rows) {
        const title = (r.title || "").trim();
        if (!title) continue;
        if (existingTitles.has(title)) continue;
        insert.run(
          title,
          r.category ?? "",
          r.subCategory ?? "",
          JSON.stringify(r.profileConditions ?? []),
          r.description ?? "",
          JSON.stringify(r.tags ?? []),
          r.priority ?? 50,
          r.source ?? "",
          r.notes ?? "",
          now,
          now,
        );
        existingTitles.add(title);
      }
    });
    tx(SEED);
  } catch (err) {
    console.warn("params-topics: seed skipped", (err as Error).message);
  }
}
