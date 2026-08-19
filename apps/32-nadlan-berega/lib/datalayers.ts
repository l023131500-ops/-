// ==== §1 · "אילו נתונים לכלול" — בחירת שכבות המידע כבר בעמוד התדמית ====
//
// המפרט (`NADLAN_SPEC_V2` §1) דורש שהמשתמש יסמן בדיוק מה הוא רוצה: סוג
// הבדיקה, סוג הדוח, **ואילו נתונים לכלול**. סוג הבדיקה וסוג הדוח כבר קיימים
// בטופס; הקובץ הזה הוא השלישי.
//
// שלושה עקרונות שמחייבים את המימוש:
//
// 1. **כל שכבה כאן מתאימה לתוכן אמיתי בדוח.** אין כאן מתג שלא מזיז כלום.
//    לכל שכבה רשומים במפורש הסעיפים והפאנלים שהיא שולטת עליהם, וה-UI מסתמך
//    על אותה רשימה — כך שאי אפשר להוסיף מתג בלי להצמיד לו תוכן.
//
// 2. **ביטול שכבה שעולה כסף גם חוסך את המשיכה.** "דירות מוצעות כרגע" נמשכות
//    מלוחות המודעות דרך Apify, וזו משיכה בתשלום. מי שלא ביקש אותן — לא
//    משלמים עליהן. לכן `skipsListings` ולא רק הסתרה במסך.
//
// 3. **ברירת המחדל היא הכול.** מי שלא נגע בסעיף הזה מקבל את הדוח המלא, בדיוק
//    כמו לפני התוספת. הפרמטר `include` נשלח רק כשבאמת נבחרה תת-קבוצה, ולכן
//    קישורים ישנים ממשיכים לעבוד בלי שינוי.

import type { CategoryKey } from './report';

export type DataLayer =
  | 'property'
  | 'valuation'
  | 'building'
  | 'street'
  | 'sold'
  | 'listings'
  | 'permits'
  | 'surroundings'
  | 'transport'
  | 'potential'
  | 'neighborhood'
  | 'imagery';

export interface DataLayerDef {
  key: DataLayer;
  label: string;
  /** משפט אחד בעברית מדוברת: מה בדיוק נכנס לדוח אם מסמנים. */
  hint: string;
  /**
   * סעיפי הדוח שהשכבה שולטת עליהם. שכבה בלי סעיף (הערכת שווי, הרחוב, רקע
   * השכונה, צילום) שולטת על בלוק שיושב מחוץ לרשימת הסעיפים — ראה `ReportView`.
   */
  categories: CategoryKey[];
  /** אי אפשר לבטל — בלי זיהוי הנכס אין דוח. */
  locked?: boolean;
  /** ביטול השכבה חוסך משיכה בתשלום, ולא רק מסתיר תצוגה. */
  skipsListings?: boolean;
  /** השכבה זמינה רק מרמה זו ומעלה — נאמר בטופס, לא מתגלה רק אחר כך. */
  tierNote?: string;
}

export const DATA_LAYERS: DataLayerDef[] = [
  {
    key: 'property',
    label: 'הנכס',
    hint: 'כתובת, גוש, חלקה ותת-חלקה, שטח ומחיר — הזיהוי עצמו.',
    // הסעיף הייעודי של שכירות/מסחרי/קרקע נשען על אותו זיהוי, ולכן הוא נכלל כאן.
    categories: ['property', 'rental', 'commercial', 'land'],
    locked: true,
  },
  {
    key: 'valuation',
    label: 'הערכת שווי',
    hint: 'טווח השווי מעסקאות קרובות ועדכניות, ומחיר למ"ר אזורי עם תאריך.',
    categories: [],
  },
  {
    key: 'building',
    label: 'הבניין והכניסה',
    hint: 'שנת בנייה וגיל, מספר קומות, וכמה דירות נמכרו בבניין הזה.',
    categories: ['building'],
  },
  {
    key: 'street',
    label: 'הרחוב',
    hint: 'שמות הרחוב, כמה נמכר בו, מחיר למ"ר ברחוב והמספרים הסמוכים.',
    categories: [],
  },
  {
    key: 'sold',
    label: 'עסקאות שנמכרו',
    hint: 'מחירים שנסגרו בפועל — בבניין, ברחוב ובסביבה הקרובה — וגרף המגמה.',
    categories: ['sold'],
  },
  {
    key: 'listings',
    label: 'דירות מוצעות כרגע',
    hint: 'מה מוצע היום באזור וכמה זמן המודעות באוויר. משיכה מלוחות המודעות.',
    categories: ['listings'],
    skipsListings: true,
    tierNote: 'מפרימיום ומעלה',
  },
  {
    key: 'permits',
    label: 'היתרים, זכויות ומסמכים',
    hint: 'אילו תוכניות חלות, מה הן מתירות, התשריט המוטמע והיתכנות להיתר נוסף.',
    categories: ['permits'],
  },
  {
    key: 'surroundings',
    label: 'סביבה ומוסדות',
    hint: 'חינוך, בתי כנסת ומקוואות, מסחר, בריאות ופנאי — בשם ובמרחק.',
    categories: ['surroundings'],
  },
  {
    key: 'transport',
    label: 'תחבורה',
    hint: 'תחנות בטווח הליכה והקווים שעוצרים בכל אחת.',
    categories: ['transport'],
  },
  {
    key: 'potential',
    label: 'פוטנציאל והתחדשות',
    hint: 'התחדשות עירונית ותוכניות שעשויות לשנות את ערך הנכס.',
    categories: ['potential'],
  },
  {
    key: 'neighborhood',
    label: 'רקע השכונה',
    hint: 'מי גר כאן, אופי דתי וקהילתי, נוחות מגורים, מרכזים ופנאי.',
    categories: [],
  },
  {
    key: 'imagery',
    label: 'צילום הבניין והמפה',
    hint: 'המפה האינטראקטיבית, ובדוח VIP גם צילום הבניין ומפה אזורית.',
    categories: [],
  },
];

export const ALL_LAYERS: DataLayer[] = DATA_LAYERS.map((l) => l.key);

/** השכבות שאי אפשר לבטל — נכנסות תמיד, גם כשלא נשלחו ב-URL. */
export const LOCKED_LAYERS: DataLayer[] = DATA_LAYERS.filter((l) => l.locked).map((l) => l.key);

const BY_KEY = new Map(DATA_LAYERS.map((l) => [l.key, l]));

export function layerDef(k: DataLayer): DataLayerDef | undefined {
  return BY_KEY.get(k);
}

export function isDataLayer(v: unknown): v is DataLayer {
  return typeof v === 'string' && (ALL_LAYERS as string[]).includes(v);
}

/**
 * קריאת הפרמטר `include` מה-URL.
 *
 * ⚠️ פרמטר חסר, ריק, או כזה שאין בו אף שכבה מוכרת → **הכול**. זו לא סלחנות
 * סתם: קישור ישן, קישור שנחתך בהעתקה, או ערך שגוי — כולם צריכים להחזיר את
 * הדוח המלא ולא דוח קטוע שהלקוח לא יבין למה חסר בו חצי.
 */
export function parseLayers(raw: string | null | undefined): DataLayer[] {
  if (!raw) return [...ALL_LAYERS];
  const picked = raw
    .split(',')
    .map((s) => s.trim())
    .filter(isDataLayer);
  if (picked.length === 0) return [...ALL_LAYERS];
  const set = new Set<DataLayer>([...picked, ...LOCKED_LAYERS]);
  // סדר קבוע לפי `DATA_LAYERS` — כדי ששני קישורים לאותה בחירה ייראו זהים.
  return ALL_LAYERS.filter((k) => set.has(k));
}

/** נשלח ל-URL רק כשנבחרה תת-קבוצה. בחירה מלאה → `null`, והפרמטר לא נכתב. */
export function serializeLayers(layers: DataLayer[]): string | null {
  if (layers.length >= ALL_LAYERS.length) return null;
  return ALL_LAYERS.filter((k) => layers.includes(k)).join(',');
}

/** האם סעיף הדוח נכלל בבחירה. סעיף שאינו שייך לאף שכבה — מוצג תמיד. */
export function categoryIncluded(cat: CategoryKey, layers: DataLayer[]): boolean {
  const owner = DATA_LAYERS.find((l) => l.categories.includes(cat));
  if (!owner) return true;
  return layers.includes(owner.key);
}

/** האם צריך לוותר על משיכת המודעות בתשלום. */
export function shouldSkipListings(layers: DataLayer[]): boolean {
  return DATA_LAYERS.some((l) => l.skipsListings && !layers.includes(l.key));
}
