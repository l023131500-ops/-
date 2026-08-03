// ==== נדל"ן ברגע — טיפוסי ליבה ====
// עיקרון: כל שדה נתונים נושא איתו מקור, תאריך עדכון, וסימון תשלום.

export type LayerKey =
  | 'legal' // משפטית
  | 'planning' // תכנונית
  | 'value' // שווי
  | 'physical' // פיזית
  | 'environment' // סביבה וסיכונים
  | 'renewal' // פוטנציאל השבחה
  | 'documents'; // מסמכים ותחזוקה

export type Confidence = 'high' | 'medium' | 'low';

export type FieldStatus = 'ok' | 'pending' | 'unavailable' | 'paid_locked';

// סוג המקור — לשקיפות מלאה של מקור כל שדה (ארכיטקטורת דיוק מקסימלי).
export type SourceType =
  | 'official' // מקור ממשלתי רשמי (GovMap, למ"ס, XPLAN, data.gov, משרד הבינוי)
  | 'community' // קהילתי (OpenStreetMap/Nominatim)
  | 'computed' // חישוב שלנו (חציונים, ציונים)
  | 'paid' // ספק בתשלום / מקור סגור (טאבו, רמ"י, רישוי)
  | 'pending'; // טרם חובר מקור

export type Tier = 'free' | 'premium' | 'vip';

export interface SourcedValue<T = string | number | null> {
  label: string;
  value: T;
  status: FieldStatus;
  sourceKey: string; // מפתח מתוך מרשם המקורות
  sourceType?: SourceType; // סוג המקור
  confidence?: Confidence; // רמת ביטחון ברמת השדה
  lastUpdated?: string; // ISO — תאריך הנתון/העדכון
  isPaid?: boolean;
  costIls?: number;
  requiresTier?: Tier; // המסלול הנדרש לצפייה בשדה (ברירת מחדל free)
  note?: string;
}

export interface PropertyKey {
  gush?: string;
  helka?: string;
  tatHelka?: string;
  address?: string;
  city?: string;
  itmX?: number; // EPSG:2039
  itmY?: number;
  lat?: number;
  lng?: number;
}

export interface Transaction {
  dealDate: string; // ISO
  price: number | null;
  areaSqm: number | null;
  rooms: number | null;
  floor: string | null;
  buildYear: number | null;
  dealType: string | null;
  /**
   * סוג הנכס כפי שדווח (`propertyTypeDescription`): "דירה" / "קרקע" / "מחסן"...
   * נשמר בנפרד מ-`dealType` (`dealNatureDescription` — "דירה בבית קומות",
   * "קומבינציה", "ניוד זכויות בניה") כי שני השדות עונים על שאלות שונות,
   * ורק שילוב שלהם מבדיל מכירת דירה ממכירת קרקע באותה כתובת.
   */
  propertyType?: string | null;
  address?: string | null;
  /**
   * שם הרחוב ומספר הבית **כפי שהם ברשומת העסקה עצמה**, בנפרד מ-`address`
   * המחורז. שמירתם בנפרד היא תנאי לדיוק: פענוח מספר בית מתוך מחרוזת נכשל
   * על "הבעש\"ט 9" (גרש) ועל כתובות בלי מספר, ואז עסקה של בניין אחר מסווגת
   * כ"בבניין הזה". המקור מחזיר את שניהם כשדות נפרדים — אין סיבה לנחש.
   */
  streetName?: string | null;
  houseNum?: number | null;
  /** היישוב כפי שרשום בעסקה — המקור האמין ביותר לשם היישוב. */
  settlement?: string | null;
  /**
   * קוד היישוב של הלמ"ס כפי שהמקור מחזיר (5000 ת"א, 8400 רחובות).
   * נשמר כי אתר הנדל"ן הממשלתי דורש אותו בקישור לעמוד הכתובת.
   */
  settlementId?: number | null;
  // המקור מחזיר את המפתח האחיד יחד עם כל עסקה — כולל תת-חלקה,
  // שהיא הדרך היחידה חינם לקשר עסקה לדירה ספציפית בבית משותף.
  gush?: string | null;
  helka?: string | null;
  tatHelka?: string | null;
  /**
   * `sourceorder` של המקור: 1 = הרשומה שייכת לבניין/הנכס שנשאל,
   * 2 = רשומה מהרחוב/הסביבה. זהו הסיווג של המקור עצמו, לא שלנו.
   */
  sourceOrder?: number | null;
  /**
   * מזהה הבניין של המקור הממשלתי. **זהו מזהה הבניין האמיתי** — המקור מקבץ
   * לפיו את העסקאות של אותו בניין, והוא יציב גם כשמספר החלקה שברישום העסקה
   * שונה ממספר החלקה שהקדסטר מחזיר לנקודת הכתובת (חלוקה מחדש).
   */
  polygonId?: string | null;
  neighborhood?: string | null;
  raw?: unknown;
}

export interface CbsIndexPoint {
  period: string; // e.g. 2026-05
  value: number;
}

export interface LayerData {
  key: LayerKey;
  title: string;
  fields: SourcedValue[];
  confidence?: Confidence;
}

export interface PropertyProfile {
  key: PropertyKey;
  layers: LayerData[];
  /**
   * עסקאות באזור הנכס (היקף גוש-עיר/רחוב) — בסיס להשוואה ולגרף.
   * ⚠️ אינן בהכרח עסקאות בנכס עצמו. ראה `parcelTransactions`.
   */
  transactions: Transaction[];
  /** עסקאות בחלקה של הנכס עצמו בלבד. זהו הנתון ברמת הנכס. */
  parcelTransactions?: Transaction[];
  /** תיאור היקף הנתונים, להצגה למשתמש. */
  transactionsScope?: string | null;
  cbsIndex: CbsIndexPoint[];
  /** מטא-דאטה של סדרת המדד — בסיס המדידה חובה להצגה נכונה. */
  cbsIndexMeta?: { seriesName: string | null; baseDesc: string | null; yearChangePct: number | null } | null;
  opportunityScore?: number | null;
  /** שקיפות זיהוי: איך הכתובת זוהתה וכמה אפשר לסמוך על כך. */
  identification?: {
    matchedLabel: string | null;
    source: string | null; // govmap | nominatim
    sourceType: SourceType; // official | community
    /** האם היישוב בתוצאה אומת מול השאילתה. */
    cityVerified: boolean;
    /** האם היישוב שבקדסטר תואם את התוצאה — אימות בלתי תלוי. */
    cadastreLocality: string | null;
  } | null;
  generatedAt: string;
  warnings: string[];
}

export interface SourceRegistryItem {
  key: string;
  /** השם המלא והמדויק — למרכז השליטה ולעמוד המקורות. */
  displayName: string;
  /**
   * השם שמוצג ללקוח. חייב להיות עברית מדוברת בלי ז'רגון טכני:
   * "מנהל התכנון" ולא "XPLAN / mavat". כשאין — מוצג displayName.
   */
  publicName?: string;
  category: 'ממשלתי' | 'מסחרי';
  isPaid: boolean;
  costIls?: string; // טווח/תיאור עלות
  apiAvailable: boolean;
  url: string;
  refreshCadence: string;
  notes?: string;
  /**
   * ההערה שמוצגת ללקוח. כשאין — מוצגת `notes`.
   * קיימת כדי ש-`notes` יוכל להישאר מפורט ומדויק למרכז השליטה, בלי שהפירוט
   * הטכני יגיע לעמוד המקורות הציבורי.
   */
  publicNotes?: string;
}
