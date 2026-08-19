/**
 * Potential Rights Scanner — profile-based rights-eligibility hinting.
 *
 * The public flow: visitor fills a non-identifying profile questionnaire,
 * then sees a list of public rights/benefits worth checking. Contact info is
 * only requested at the end, with explicit consent.
 *
 * Storage is kept independent of the main IStorage abstraction so we don't
 * have to extend the Supabase adapter for an admin-driven feature. The two
 * tables live in the local SQLite (same pattern as reminder_responses) and
 * the config blob lives in automation_configs (key: "potential_scanner").
 */
import Database from "better-sqlite3";
import type { RightRow } from "@shared/schema";

let _db: Database.Database | null = null;
export function bindSqliteDb(db: Database.Database) {
  _db = db;
  db.exec(`
  CREATE TABLE IF NOT EXISTS potential_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    presets_json TEXT NOT NULL DEFAULT '{}',
    hidden_sections_json TEXT NOT NULL DEFAULT '[]',
    active INTEGER NOT NULL DEFAULT 1,
    created_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS potential_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT,
    profile_json TEXT NOT NULL DEFAULT '{}',
    suggestions_json TEXT NOT NULL DEFAULT '[]',
    selected_ids_json TEXT NOT NULL DEFAULT '[]',
    contact_consent INTEGER NOT NULL DEFAULT 0,
    contact_full_name TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    contact_id_number TEXT,
    legal_accepted_json TEXT NOT NULL DEFAULT '{}',
    webhook_status TEXT NOT NULL DEFAULT 'pending',
    webhook_log_id INTEGER,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL
  );
  `);
}
function db(): Database.Database {
  if (!_db) throw new Error("potential-scanner: sqlite db not bound");
  return _db;
}

// ---------------------------------------------------------------------------
// Question schema
// ---------------------------------------------------------------------------

export type FieldType =
  | "text"
  | "number"
  | "date"
  | "select"
  | "radio"
  | "checkbox"
  | "yesno"
  | "yes_no_unknown"
  | "textarea"
  | "child_list";

export interface QuestionOption {
  value: string;
  label: string;
  /** Tags raised when this option is picked. */
  tags?: string[];
}

export interface Question {
  id: string;
  label: string;
  type: FieldType;
  options?: QuestionOption[];
  required?: boolean;
  placeholder?: string;
  /** Optional condition: show only when another field matches. */
  showWhen?: { field: string; equals?: string | string[]; truthy?: boolean };
  help?: string;
}

export interface Section {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
}

export interface TagRule {
  /** Tag raised in answers (via options) or derived (e.g. "high_potential_income_low"). */
  tag: string;
  /** Match topic by keyword in topic/category/audience/aiSearch/aiExtra fields (Hebrew, case-insensitive contains). */
  topicKeywords?: string[];
  /** Match category exactly. */
  category?: string;
  /** Human reason ("ייתכן שכדאי לבדוק כי יש לכם ילד עם ליקוי בריאותי"). */
  reason: string;
  /** Score weight (0..3, default 1). */
  weight?: number;
}

export interface PotentialConfig {
  enabled: boolean;
  introTitle: string;
  introSubtitle: string;
  consentText: string;
  sections: Section[];
  rules: TagRule[];
}

// ---------------------------------------------------------------------------
// Defaults — practical, editable from admin UI
// ---------------------------------------------------------------------------

const FAMILY_STATUSES: QuestionOption[] = [
  { value: "single", label: "רווק/ה" },
  { value: "married", label: "נשוי/אה", tags: ["married"] },
  { value: "divorced", label: "גרוש/ה", tags: ["single_parent_maybe"] },
  { value: "widowed", label: "אלמן/ה", tags: ["widowed", "single_parent_maybe"] },
  { value: "separated", label: "פרוד/ה", tags: ["single_parent_maybe"] },
];

const EMPLOYMENT_OPTIONS: QuestionOption[] = [
  { value: "unemployed", label: "לא עובד", tags: ["low_income_risk", "unemployed"] },
  { value: "salaried", label: "שכיר", tags: ["salaried"] },
  { value: "salaried_and_self", label: "שכיר ועצמאי", tags: ["salaried", "self_employed"] },
  { value: "self_employed", label: "עצמאי", tags: ["self_employed"] },
  { value: "avrech", label: "אברך", tags: ["avrech", "low_income_risk"] },
];

const HEALTH_STATUSES: QuestionOption[] = [
  { value: "normal", label: "תקין לגמרי" },
  { value: "mild", label: "ליקוי קל", tags: ["health_impairment"] },
  { value: "moderate", label: "ליקוי בינוני", tags: ["health_impairment", "health_impairment_mid"] },
  { value: "severe", label: "ליקוי קשה", tags: ["health_impairment", "health_impairment_severe"] },
];

const IMPAIRMENT_TYPES: QuestionOption[] = [
  { value: "physical", label: "גופני" },
  { value: "mental", label: "נפשי" },
  { value: "developmental", label: "התפתחותי" },
  { value: "other", label: "אחר" },
];

const KUPAT_HOLIM: QuestionOption[] = [
  { value: "clalit", label: "כללית" },
  { value: "maccabi", label: "מכבי" },
  { value: "meuhedet", label: "מאוחדת" },
  { value: "leumit", label: "לאומית" },
  { value: "other", label: "אחר" },
];

const YES_NO_UNKNOWN: QuestionOption[] = [
  { value: "yes", label: "כן" },
  { value: "no", label: "לא" },
  { value: "unknown", label: "לא יודע/ת" },
];

const DEFAULT_RULES: TagRule[] = [
  // children present
  { tag: "has_children", topicKeywords: ["ילד", "ילדים", "ילדה", "הורות", "משפחה"], reason: "יש ילדים — שווה לבדוק זכויות וקצבאות לילדים ולמשפחה.", weight: 1 },
  { tag: "child_health_impairment", topicKeywords: ["נכות", "ילד נכה", "מוגבלות", "ילד מיוחד", "ליקוי", "התפתחות", "טיפול רפואי", "טיפולים"], reason: "יש ילד עם ליקוי בריאותי — כדאי לבדוק קצבת ילד נכה והטבות רפואיות.", weight: 3 },
  { tag: "child_developmental", topicKeywords: ["התפתחות", "טיפול", "פארא", "ריפוי בעיסוק", "קלינאי", "פסיכולוג"], reason: "ילד עם צורך התפתחותי — שווה לבדוק החזרי טיפולים והכרה בילד מיוחד.", weight: 2 },

  // employment / income
  { tag: "unemployed", topicKeywords: ["הבטחת הכנסה", "תעסוקה", "השמה", "אבטלה"], reason: "אין הכנסה מעבודה — לבדוק הבטחת הכנסה והטבות לאומיות.", weight: 3 },
  { tag: "low_income_risk", topicKeywords: ["מענק עבודה", "מס הכנסה שלילי", "ארנונה", "הנחה", "תמיכה"], reason: "הכנסה נמוכה — שווה לבדוק מענק עבודה והטבות מזכות.", weight: 2 },
  { tag: "self_employed", topicKeywords: ["עצמאי", "עוסק", "מס", "מע\"מ", "ביטוח לאומי"], reason: "כעצמאי — שווה לבדוק הקלות מס, החזרי מס וזכויות ביטוח לאומי לעצמאים.", weight: 1 },
  { tag: "avrech", topicKeywords: ["אברך", "מלגת לימודים", "מלגה", "כולל", "ת\"ת"], reason: "אברך — לבדוק מלגות, הטבות לימוד וזכויות לאוכלוסיית הכוללים.", weight: 2 },

  // adult health
  { tag: "adult_health_impairment", topicKeywords: ["נכות", "נכה", "ביטוח לאומי", "סיעוד", "בריאות"], reason: "ליקוי בריאותי — לבדוק קצבת נכות, השלמת הכנסה והטבות מס.", weight: 3 },

  // pensions / finances
  { tag: "no_pension", topicKeywords: ["פנסיה", "חיסכון", "פיננסי", "ייעוץ פנסיוני", "הטבות מס"], reason: "אין הפרשה לפנסיה — חשוב לבדוק זכויות וייעוץ פנסיוני.", weight: 3 },
  { tag: "pension_unknown", topicKeywords: ["פנסיה", "ייעוץ פנסיוני", "מסלולים"], reason: "לא מודעים למצב הפנסיה — שווה לעבור ייעוץ פנסיוני.", weight: 2 },
  { tag: "no_child_saving", topicKeywords: ["חיסכון לכל ילד", "חיסכון לילד"], reason: "לא עוקבים אחרי חיסכון לכל ילד — לבדוק שהמסלול מתאים.", weight: 1 },
  { tag: "no_supplementary", topicKeywords: ["ביטוח משלים", "שב\"ן", "החזר רפואי"], reason: "אין ביטוח משלים — לבדוק התאמה והחזרים.", weight: 1 },

  // housing / mortgage / car
  { tag: "own_apartment", topicKeywords: ["דירה", "ארנונה", "ביטוח דירה", "מבנה ותכולה"], reason: "בעלי דירה — לבדוק הנחות ארנונה, ביטוחי דירה ועדכון פוליסות.", weight: 1 },
  { tag: "has_mortgage", topicKeywords: ["משכנתא", "מיחזור משכנתא", "הלוואת זכאות", "ביטוח חיים"], reason: "יש משכנתא — לבדוק מיחזור, הלוואת זכאות וביטוח חיים תואם.", weight: 2 },
  { tag: "renting", topicKeywords: ["סיוע בשכר דירה", "שכר דירה", "דיור ציבורי"], reason: "שוכרים — לבדוק סיוע בשכר דירה.", weight: 2 },
  { tag: "has_car", topicKeywords: ["רכב", "ביטוח רכב", "מיסוי רכב"], reason: "יש רכב — לבדוק התאמת ביטוח רכב והטבות מס לבעלי רכב.", weight: 1 },

  // ongoing payments / discounts
  { tag: "water_household_unknown", topicKeywords: ["מים", "תאגיד מים", "נפשות"], reason: "לא עודכנו נפשות בחשבון מים — תיקון חוסך כסף כל חודש.", weight: 2 },
  { tag: "arnona_discount_unknown", topicKeywords: ["ארנונה", "הנחה", "עירייה"], reason: "לא בדקתם הנחת ארנונה — שווה לבדוק זכאות אצל העירייה.", weight: 2 },
  { tag: "transport_discount_unknown", topicKeywords: ["רב קו", "תחבורה", "פרופיל הנחה", "סטודנט", "ותיק"], reason: "כדאי לעדכן פרופיל הנחה ברב-קו (משפחה, סטודנט, ותיק וכו').", weight: 1 },
  { tag: "electricity_switch_unknown", topicKeywords: ["חשמל", "חברת חשמל", "ספק חשמל", "מיתוג"], reason: "מעבר ספק חשמל יכול לחסוך עשרות שקלים בחודש.", weight: 1 },

  // family situations
  { tag: "single_parent_maybe", topicKeywords: ["חד הורי", "אם חד הורית", "אב חד הורי", "מענק", "נקודות זיכוי"], reason: "מצב משפחתי שעשוי לפתוח זכויות לחד-הוריות — שווה לבדוק.", weight: 2 },
  { tag: "widowed", topicKeywords: ["אלמנה", "אלמן", "ביטוח לאומי", "שאירים"], reason: "אלמנה/אלמן — לבדוק קצבת שאירים והטבות בביטוח לאומי.", weight: 3 },
];

const DEFAULT_SECTIONS: Section[] = [
  {
    id: "personal",
    title: "פרטים אישיים ומשפחה",
    description: "ללא שם, תעודת זהות, טלפון או מייל — רק פרופיל כללי.",
    questions: [
      { id: "birthDate", label: "תאריך לידה", type: "date" },
      { id: "familyStatus", label: "מצב משפחתי", type: "select", options: FAMILY_STATUSES },
      { id: "spouseBirthDate", label: "תאריך לידה של בן/בת הזוג", type: "date", showWhen: { field: "familyStatus", equals: "married" } },
      { id: "spouseEmployment", label: "תעסוקת בן/בת הזוג", type: "select", options: EMPLOYMENT_OPTIONS, showWhen: { field: "familyStatus", equals: "married" } },
      { id: "hasChildren", label: "האם יש ילדים?", type: "yesno", options: [{ value: "yes", label: "כן", tags: ["has_children"] }, { value: "no", label: "לא" }] },
      { id: "childrenCount", label: "כמה ילדים?", type: "number", showWhen: { field: "hasChildren", equals: "yes" } },
      { id: "children", label: "פרטי הילדים", type: "child_list", showWhen: { field: "hasChildren", equals: "yes" }, help: "לכל ילד: תאריך לידה, שם פרטי (לא חובה), ומצב בריאותי. ללא תעודת זהות מזהה." },
    ],
  },
  {
    id: "employment",
    title: "תעסוקה והכנסה",
    questions: [
      { id: "employment", label: "מצב תעסוקתי", type: "select", options: EMPLOYMENT_OPTIONS },
      { id: "incomeFromWork", label: "הכנסה חודשית ממוצעת מעבודה (₪)", type: "number" },
      { id: "incomeNotFromWork", label: "הכנסה חודשית שאינה מעבודה (קצבאות וכו', ₪)", type: "number" },
      { id: "incomeSalaried", label: "מתוך זה — חלק כשכיר (₪)", type: "number", showWhen: { field: "employment", equals: "salaried_and_self" } },
      { id: "incomeSelf", label: "מתוך זה — חלק כעצמאי (₪)", type: "number", showWhen: { field: "employment", equals: "salaried_and_self" } },
    ],
  },
  {
    id: "adult_health",
    title: "מצב בריאותי",
    questions: [
      { id: "adultHealth", label: "מצב בריאות כללי", type: "radio", options: HEALTH_STATUSES },
      { id: "adultImpairmentType", label: "סוג הליקוי", type: "select", options: IMPAIRMENT_TYPES, showWhen: { field: "adultHealth", equals: ["mild", "moderate", "severe"] } },
      { id: "adultImpairmentDetails", label: "פרטים נוספים על הליקוי", type: "textarea", showWhen: { field: "adultHealth", equals: ["mild", "moderate", "severe"] } },
    ],
  },
  {
    id: "finance",
    title: "ביטוח ופיננסים",
    questions: [
      { id: "pensionPaying", label: "האם אתם מפרישים פנסיה?", type: "yes_no_unknown", options: [
        { value: "yes", label: "כן" },
        { value: "no", label: "לא", tags: ["no_pension"] },
        { value: "unknown", label: "לא יודע/ת", tags: ["pension_unknown"] },
      ] },
      { id: "pensionAware", label: "האם אתם מודעים למצב הפנסיה שלכם?", type: "yes_no_unknown", options: [
        { value: "yes", label: "כן" },
        { value: "no", label: "לא", tags: ["pension_unknown"] },
        { value: "unknown", label: "לא יודע/ת", tags: ["pension_unknown"] },
      ] },
      { id: "pensionTracksAware", label: "האם אתם מודעים למסלולי הפנסיה שלכם?", type: "yes_no_unknown", options: [
        { value: "yes", label: "כן" },
        { value: "no", label: "לא", tags: ["pension_unknown"] },
        { value: "unknown", label: "לא יודע/ת", tags: ["pension_unknown"] },
      ] },
      { id: "pensionTrack", label: "פרטי מסלול הפנסיה (אם ידועים)", type: "text", showWhen: { field: "pensionTracksAware", equals: "yes" } },
      { id: "childSaving", label: "האם אתם חוסכים לילדים?", type: "yes_no_unknown", options: [
        { value: "yes", label: "כן" },
        { value: "no", label: "לא", tags: ["no_child_saving"] },
        { value: "unknown", label: "לא יודע/ת", tags: ["no_child_saving"] },
      ], showWhen: { field: "hasChildren", equals: "yes" } },
      { id: "childSavingTracked", label: "האם אתם עוקבים אחרי תוכנית 'חיסכון לכל ילד'?", type: "yes_no_unknown", options: [
        { value: "yes", label: "כן" },
        { value: "no", label: "לא", tags: ["no_child_saving"] },
        { value: "unknown", label: "לא יודע/ת", tags: ["no_child_saving"] },
      ], showWhen: { field: "hasChildren", equals: "yes" } },
      { id: "kupatHolim", label: "קופת חולים", type: "select", options: KUPAT_HOLIM },
      { id: "supplementaryInsurance", label: "ביטוח משלים", type: "yes_no_unknown", options: [
        { value: "yes", label: "כן" },
        { value: "no", label: "לא", tags: ["no_supplementary"] },
        { value: "unknown", label: "לא יודע/ת", tags: ["no_supplementary"] },
      ] },
    ],
  },
  {
    id: "housing",
    title: "דיור, משכנתא וביטוחים",
    questions: [
      { id: "ownsApartment", label: "האם אתם בעלי דירה?", type: "yesno", options: [
        { value: "yes", label: "כן", tags: ["own_apartment"] },
        { value: "no", label: "לא", tags: ["renting"] },
      ] },
      { id: "hasMortgage", label: "האם יש משכנתא?", type: "yesno", options: [
        { value: "yes", label: "כן", tags: ["has_mortgage"] },
        { value: "no", label: "לא" },
      ], showWhen: { field: "ownsApartment", equals: "yes" } },
      { id: "mortgageAmount", label: "יתרת המשכנתא (₪)", type: "number", showWhen: { field: "hasMortgage", equals: "yes" } },
      { id: "mortgageYearsRemaining", label: "שנים שנותרו במשכנתא", type: "number", showWhen: { field: "hasMortgage", equals: "yes" } },
      { id: "homeInsurance", label: "האם משלמים ביטוח דירה (מבנה/תכולה)?", type: "yes_no_unknown", showWhen: { field: "ownsApartment", equals: "yes" }, options: YES_NO_UNKNOWN },
      { id: "lifeInsurance", label: "האם משלמים ביטוח חיים?", type: "yes_no_unknown", options: YES_NO_UNKNOWN, showWhen: { field: "ownsApartment", equals: "yes" } },
      { id: "rentMonthly", label: "שכר דירה חודשי (₪)", type: "number", showWhen: { field: "ownsApartment", equals: "no" } },
      { id: "hasCar", label: "האם יש רכב?", type: "yesno", options: [{ value: "yes", label: "כן", tags: ["has_car"] }, { value: "no", label: "לא" }] },
      { id: "carInsuranceMonthly", label: "תשלום חודשי לביטוח רכב (₪)", type: "number", showWhen: { field: "hasCar", equals: "yes" } },
    ],
  },
  {
    id: "benefits",
    title: "הטבות שוטפות והנחות",
    description: "מענה מהיר — אם לא בטוחים, ‘לא יודע/ת’ עוזר לנו לזהות פוטנציאל.",
    questions: [
      { id: "waterHousehold", label: "האם עדכנתם נפשות בחשבון המים?", type: "yes_no_unknown", options: [
        { value: "yes", label: "כן" },
        { value: "no", label: "לא", tags: ["water_household_unknown"] },
        { value: "unknown", label: "לא יודע/ת", tags: ["water_household_unknown"] },
      ] },
      { id: "arnonaDiscount", label: "האם בדקתם הנחת ארנונה?", type: "yes_no_unknown", options: [
        { value: "yes", label: "כן" },
        { value: "no", label: "לא", tags: ["arnona_discount_unknown"] },
        { value: "unknown", label: "לא יודע/ת", tags: ["arnona_discount_unknown"] },
      ] },
      { id: "transportProfile", label: "האם פרופיל ההנחה ברב-קו מעודכן?", type: "yes_no_unknown", options: [
        { value: "yes", label: "כן" },
        { value: "no", label: "לא", tags: ["transport_discount_unknown"] },
        { value: "unknown", label: "לא יודע/ת", tags: ["transport_discount_unknown"] },
      ] },
      { id: "electricitySwitched", label: "האם בדקתם מעבר/הנחות אצל ספק חשמל?", type: "yes_no_unknown", options: [
        { value: "yes", label: "כן" },
        { value: "no", label: "לא", tags: ["electricity_switch_unknown"] },
        { value: "unknown", label: "לא יודע/ת", tags: ["electricity_switch_unknown"] },
      ] },
    ],
  },
];

export const DEFAULT_POTENTIAL_CONFIG: PotentialConfig = {
  enabled: true,
  introTitle: "זיהוי פוטנציאל זכויות",
  introSubtitle: "ענו על מספר שאלות קצרות על הפרופיל שלכם (ללא פרטים מזהים) — ונראה לכם אילו זכויות והטבות שווה לבדוק.",
  consentText: "האם תרצו להעביר את הפרטים שלכם לצוות בקלות כדי שנבדוק איך ניתן לעזור לכם?",
  sections: DEFAULT_SECTIONS,
  rules: DEFAULT_RULES,
};

// ---------------------------------------------------------------------------
// Config storage (via automation_configs blob)
// ---------------------------------------------------------------------------

function mergeConfig(blob: Record<string, unknown> | null | undefined): PotentialConfig {
  if (!blob || typeof blob !== "object") return DEFAULT_POTENTIAL_CONFIG;
  const sections = Array.isArray((blob as any).sections) ? ((blob as any).sections as Section[]) : DEFAULT_POTENTIAL_CONFIG.sections;
  const rules = Array.isArray((blob as any).rules) ? ((blob as any).rules as TagRule[]) : DEFAULT_POTENTIAL_CONFIG.rules;
  return {
    enabled: (blob as any).enabled !== false,
    introTitle: typeof (blob as any).introTitle === "string" ? (blob as any).introTitle : DEFAULT_POTENTIAL_CONFIG.introTitle,
    introSubtitle: typeof (blob as any).introSubtitle === "string" ? (blob as any).introSubtitle : DEFAULT_POTENTIAL_CONFIG.introSubtitle,
    consentText: typeof (blob as any).consentText === "string" ? (blob as any).consentText : DEFAULT_POTENTIAL_CONFIG.consentText,
    sections,
    rules,
  };
}

export function readPotentialConfig(rawJson: string | null | undefined): PotentialConfig {
  if (!rawJson) return DEFAULT_POTENTIAL_CONFIG;
  try {
    return mergeConfig(JSON.parse(rawJson));
  } catch {
    return DEFAULT_POTENTIAL_CONFIG;
  }
}

// ---------------------------------------------------------------------------
// Matching engine
// ---------------------------------------------------------------------------

export interface SuggestionHit {
  rightId: number;
  topic: string;
  category: string;
  subCategory: string;
  publicSiteText: string;
  serviceUrl: string;
  reasons: string[];
  score: number;
  potential: "גבוה" | "בינוני" | "לבדיקה";
}

interface ProfileAnswers {
  [key: string]: unknown;
}

/**
 * Resolve all option-tags raised by the visitor's answers + derived flags.
 */
export function tagsFromAnswers(config: PotentialConfig, answers: ProfileAnswers): string[] {
  const tags = new Set<string>();

  for (const section of config.sections) {
    for (const q of section.questions) {
      const v = answers[q.id];
      if (v == null || v === "") continue;
      if (q.type === "child_list") continue; // handled below
      if (Array.isArray(q.options)) {
        const opts = q.options;
        const values = Array.isArray(v) ? v.map(String) : [String(v)];
        for (const val of values) {
          const opt = opts.find((o) => o.value === val);
          if (opt?.tags) opt.tags.forEach((t) => tags.add(t));
        }
      }
    }
  }

  // Derived: low income (<= 7000 per family-size unit), unemployed already from options
  const inc = Number(answers.incomeFromWork || 0) + Number(answers.incomeNotFromWork || 0);
  if (inc > 0 && inc < 7000) tags.add("low_income_risk");
  if (Number(answers.incomeFromWork || 0) === 0 && answers.employment !== "salaried" && answers.employment !== "self_employed") {
    // already covered, but be permissive
  }

  // Children health → child_health_impairment / developmental
  const children = Array.isArray(answers.children) ? (answers.children as any[]) : [];
  for (const child of children) {
    const status = String((child && child.healthStatus) || "");
    if (status === "mild" || status === "moderate" || status === "severe") {
      tags.add("child_health_impairment");
    }
    const itype = String((child && child.impairmentType) || "");
    if (itype === "developmental") tags.add("child_developmental");
  }
  if (children.length > 0) tags.add("has_children");

  // Adult impairment → adult_health_impairment
  if (["mild", "moderate", "severe"].includes(String(answers.adultHealth || ""))) {
    tags.add("adult_health_impairment");
  }

  // Owning + no homeInsurance → still flag own_apartment, no extra
  return Array.from(tags);
}

function topicHaystack(r: RightRow): string {
  return [r.topic, r.category, r.subCategory, r.audience, r.aiSearch, r.aiExtra, r.publicSiteText]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function ruleMatches(rule: TagRule, row: RightRow): boolean {
  if (rule.category && row.category && rule.category.trim() === row.category.trim()) return true;
  if (rule.topicKeywords && rule.topicKeywords.length > 0) {
    const hay = topicHaystack(row);
    return rule.topicKeywords.some((kw) => hay.includes(kw.toLowerCase()));
  }
  return false;
}

function level(score: number): SuggestionHit["potential"] {
  if (score >= 4) return "גבוה";
  if (score >= 2) return "בינוני";
  return "לבדיקה";
}

export function computeSuggestions(
  config: PotentialConfig,
  answers: ProfileAnswers,
  rights: RightRow[],
  maxResults = 18,
): { tags: string[]; hits: SuggestionHit[] } {
  const tags = tagsFromAnswers(config, answers);
  const tagSet = new Set(tags);
  const byRight = new Map<number, SuggestionHit>();

  for (const rule of config.rules) {
    if (!tagSet.has(rule.tag)) continue;
    const weight = typeof rule.weight === "number" ? Math.max(0, Math.min(5, rule.weight)) : 1;
    for (const r of rights) {
      if (!ruleMatches(rule, r)) continue;
      const existing = byRight.get(r.id);
      if (existing) {
        existing.score += weight;
        if (!existing.reasons.includes(rule.reason)) existing.reasons.push(rule.reason);
        existing.potential = level(existing.score);
      } else {
        byRight.set(r.id, {
          rightId: r.id,
          topic: r.topic || "",
          category: r.category || "",
          subCategory: r.subCategory || "",
          publicSiteText: r.publicSiteText || "",
          serviceUrl: r.serviceUrl || "",
          reasons: [rule.reason],
          score: weight,
          potential: level(weight),
        });
      }
    }
  }

  const hits = Array.from(byRight.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  return { tags, hits };
}

// ---------------------------------------------------------------------------
// Links + submissions
// ---------------------------------------------------------------------------

export interface PotentialLinkRow {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  presetsJson: string;
  hiddenSectionsJson: string;
  active: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PotentialLinkOut {
  id: number;
  slug: string;
  title: string;
  description: string;
  presets: Record<string, unknown>;
  hiddenSections: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

function parseObj(json: string | null): Record<string, unknown> {
  if (!json) return {};
  try { return JSON.parse(json) as Record<string, unknown>; } catch { return {}; }
}
function parseArr(json: string | null): string[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch { return []; }
}

export function toLinkOut(row: PotentialLinkRow): PotentialLinkOut {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? "",
    presets: parseObj(row.presetsJson),
    hiddenSections: parseArr(row.hiddenSectionsJson),
    active: Boolean(row.active),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function listLinks(): PotentialLinkOut[] {
  const rows = db().prepare(`
    SELECT id, slug, title, description, presets_json AS presetsJson,
      hidden_sections_json AS hiddenSectionsJson, active,
      created_by AS createdBy, created_at AS createdAt, updated_at AS updatedAt
    FROM potential_links ORDER BY id DESC
  `).all() as PotentialLinkRow[];
  return rows.map(toLinkOut);
}

export function getLinkBySlug(slug: string): PotentialLinkOut | null {
  const row = db().prepare(`
    SELECT id, slug, title, description, presets_json AS presetsJson,
      hidden_sections_json AS hiddenSectionsJson, active,
      created_by AS createdBy, created_at AS createdAt, updated_at AS updatedAt
    FROM potential_links WHERE slug = ?
  `).get(slug) as PotentialLinkRow | undefined;
  if (!row) return null;
  return toLinkOut(row);
}

const SLUG_RE = /^[a-z0-9][a-z0-9-_]{1,48}$/i;

export function createLink(input: {
  slug: string;
  title: string;
  description?: string;
  presets?: Record<string, unknown>;
  hiddenSections?: string[];
  createdBy?: string;
}): { ok: true; link: PotentialLinkOut } | { ok: false; error: string } {
  const slug = String(input.slug || "").trim();
  if (!SLUG_RE.test(slug)) return { ok: false, error: "slug חייב להיות אותיות/מספרים בלבד (2-48 תווים)" };
  const title = String(input.title || "").trim();
  if (!title) return { ok: false, error: "כותרת חובה" };
  const exists = db().prepare(`SELECT id FROM potential_links WHERE slug = ?`).get(slug);
  if (exists) return { ok: false, error: "כתובת קיימת כבר — בחרו שונה" };
  const now = new Date().toISOString();
  const info = db().prepare(`
    INSERT INTO potential_links (slug, title, description, presets_json, hidden_sections_json, active, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
  `).run(
    slug,
    title,
    input.description ?? "",
    JSON.stringify(input.presets ?? {}),
    JSON.stringify(input.hiddenSections ?? []),
    input.createdBy ?? "",
    now,
    now,
  );
  const row = db().prepare(`SELECT id, slug, title, description, presets_json AS presetsJson, hidden_sections_json AS hiddenSectionsJson, active, created_by AS createdBy, created_at AS createdAt, updated_at AS updatedAt FROM potential_links WHERE id = ?`).get(Number(info.lastInsertRowid)) as PotentialLinkRow;
  return { ok: true, link: toLinkOut(row) };
}

export function updateLink(id: number, patch: {
  title?: string;
  description?: string;
  presets?: Record<string, unknown>;
  hiddenSections?: string[];
  active?: boolean;
}): PotentialLinkOut | null {
  const cur = db().prepare(`SELECT * FROM potential_links WHERE id = ?`).get(id) as PotentialLinkRow | undefined;
  if (!cur) return null;
  const next = {
    title: patch.title ?? cur.title,
    description: patch.description ?? cur.description ?? "",
    presetsJson: patch.presets !== undefined ? JSON.stringify(patch.presets) : cur.presetsJson,
    hiddenSectionsJson: patch.hiddenSections !== undefined ? JSON.stringify(patch.hiddenSections) : cur.hiddenSectionsJson,
    active: patch.active !== undefined ? (patch.active ? 1 : 0) : cur.active,
    updatedAt: new Date().toISOString(),
  };
  db().prepare(`
    UPDATE potential_links SET title = ?, description = ?, presets_json = ?, hidden_sections_json = ?, active = ?, updated_at = ?
    WHERE id = ?
  `).run(next.title, next.description, next.presetsJson, next.hiddenSectionsJson, next.active, next.updatedAt, id);
  const row = db().prepare(`SELECT id, slug, title, description, presets_json AS presetsJson, hidden_sections_json AS hiddenSectionsJson, active, created_by AS createdBy, created_at AS createdAt, updated_at AS updatedAt FROM potential_links WHERE id = ?`).get(id) as PotentialLinkRow;
  return toLinkOut(row);
}

export function deleteLink(id: number): void {
  db().prepare(`DELETE FROM potential_links WHERE id = ?`).run(id);
}

// ---------- submissions ----------
export interface PotentialSubmissionRow {
  id: number;
  slug: string | null;
  profileJson: string;
  suggestionsJson: string;
  selectedIdsJson: string;
  contactConsent: number;
  contactFullName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  contactIdNumber: string | null;
  legalAcceptedJson: string;
  webhookStatus: string;
  webhookLogId: number | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface PotentialSubmissionInput {
  slug?: string | null;
  profile: Record<string, unknown>;
  suggestions: SuggestionHit[];
  selectedIds: number[];
  contactConsent: boolean;
  contact?: {
    fullName?: string;
    phone?: string;
    email?: string;
    idNumber?: string;
  };
  legalAccepted?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export function insertSubmission(input: PotentialSubmissionInput): PotentialSubmissionRow {
  const now = new Date().toISOString();
  const info = db().prepare(`
    INSERT INTO potential_submissions (
      slug, profile_json, suggestions_json, selected_ids_json,
      contact_consent, contact_full_name, contact_phone, contact_email, contact_id_number,
      legal_accepted_json, webhook_status, webhook_log_id, ip_address, user_agent, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, ?, ?, ?)
  `).run(
    input.slug ?? null,
    JSON.stringify(input.profile ?? {}),
    JSON.stringify(input.suggestions ?? []),
    JSON.stringify(input.selectedIds ?? []),
    input.contactConsent ? 1 : 0,
    input.contactConsent ? (input.contact?.fullName ?? null) : null,
    input.contactConsent ? (input.contact?.phone ?? null) : null,
    input.contactConsent ? (input.contact?.email ?? null) : null,
    input.contactConsent ? (input.contact?.idNumber ?? null) : null,
    JSON.stringify(input.legalAccepted ?? {}),
    input.ipAddress ?? null,
    input.userAgent ?? null,
    now,
  );
  const id = Number(info.lastInsertRowid);
  return getSubmission(id)!;
}

export function getSubmission(id: number): PotentialSubmissionRow | undefined {
  return db().prepare(`
    SELECT id, slug, profile_json AS profileJson, suggestions_json AS suggestionsJson,
      selected_ids_json AS selectedIdsJson, contact_consent AS contactConsent,
      contact_full_name AS contactFullName, contact_phone AS contactPhone,
      contact_email AS contactEmail, contact_id_number AS contactIdNumber,
      legal_accepted_json AS legalAcceptedJson,
      webhook_status AS webhookStatus, webhook_log_id AS webhookLogId,
      ip_address AS ipAddress, user_agent AS userAgent, created_at AS createdAt
    FROM potential_submissions WHERE id = ?
  `).get(id) as PotentialSubmissionRow | undefined;
}

export function listSubmissions(limit = 200): PotentialSubmissionRow[] {
  return db().prepare(`
    SELECT id, slug, profile_json AS profileJson, suggestions_json AS suggestionsJson,
      selected_ids_json AS selectedIdsJson, contact_consent AS contactConsent,
      contact_full_name AS contactFullName, contact_phone AS contactPhone,
      contact_email AS contactEmail, contact_id_number AS contactIdNumber,
      legal_accepted_json AS legalAcceptedJson,
      webhook_status AS webhookStatus, webhook_log_id AS webhookLogId,
      ip_address AS ipAddress, user_agent AS userAgent, created_at AS createdAt
    FROM potential_submissions ORDER BY id DESC LIMIT ?
  `).all(limit) as PotentialSubmissionRow[];
}

export function updateSubmissionWebhook(id: number, status: string, logId: number | null): void {
  db().prepare(`UPDATE potential_submissions SET webhook_status = ?, webhook_log_id = ? WHERE id = ?`).run(status, logId, id);
}
