// ==== ארבעת סוגי הנכס ====
//
// אותו מנוע נתונים, ארבע זרימות דוח. מגורים הוא הדוח הקיים ולא השתנה;
// שכירות, מסחרי וקרקע מוסיפים סעיף ייעודי משלהם, וכולם מקבלים את סעיף
// ההיתרים והמסמכים.

import type { CategoryKey } from './report';
import type { ListingDealType } from './apify';

export type AssetType = 'residential' | 'rental' | 'commercial' | 'land';

export const ASSET_TYPES: AssetType[] = ['residential', 'rental', 'commercial', 'land'];

export function isAssetType(v: unknown): v is AssetType {
  return typeof v === 'string' && (ASSET_TYPES as string[]).includes(v);
}

export const ASSET_LABEL: Record<AssetType, string> = {
  residential: 'מגורים',
  rental: 'שכירות',
  commercial: 'מסחרי',
  land: 'קרקעות ומגרשים',
};

export const ASSET_TAGLINE: Record<AssetType, string> = {
  residential: 'דירה או בית — מה נמכר כאן באמת, ומה מסביב',
  rental: 'כמה עולה לשכור כאן, ומה התשואה מול מחיר הנכס',
  commercial: 'משרד או חנות — זכויות מסחר, עסקאות וסביבה עסקית',
  land: 'מגרש או קרקע — הייעוד היום, ומה בהליך שעשוי לשנות אותו',
};

/** מה כל כפתור מבטיח — כל שורה מכוסה בפועל בדוח. */
export const ASSET_LINES: Record<AssetType, string[]> = {
  residential: [
    'כל העסקאות שנסגרו בבניין ובסביבה, מהחדשה לישנה',
    'הבניין: גיל, קומות, וכמה דירות נמכרו בו',
    'מוסדות, תחבורה ואפיון האוכלוסייה',
  ],
  rental: [
    'מודעות שכירות באזור, עם מחיר וגודל',
    'שכר דירה חציוני למ"ר, ואומדן לנכס לפי שטחו',
    'תשואה שנתית מול מחיר הנכס באזור',
    'מדד מחירי הדיור של הלמ"ס להשוואה',
  ],
  commercial: [
    'זכויות למסחר ולתעסוקה מתוך התוכניות שחלות',
    'עסקאות מסחריות שנרשמו באזור',
    'נכסים מסחריים המוצעים כרגע',
    'הסביבה העסקית: מסחר, תחבורה ונגישות',
  ],
  land: [
    'גוש, חלקה ושטח המגרש',
    'ייעוד הקרקע היום, לפי מנהל התכנון',
    'תוכניות בהליך שעשויות לשנות את הייעוד — מסומן כצפי',
    'מדיניות רמ"י לשינוי ייעוד של קרקע חקלאית',
  ],
};

/** הסעיף הייעודי של כל סוג נכס (מגורים משתמש בסעיפים הקיימים). */
export const ASSET_CATEGORY: Record<AssetType, CategoryKey | null> = {
  residential: null,
  rental: 'rental',
  commercial: 'commercial',
  land: 'land',
};

/** מה מבקשים מהלוחות עבור כל סוג נכס. */
export const ASSET_DEAL_TYPE: Record<AssetType, ListingDealType> = {
  residential: 'buy',
  rental: 'rent',
  commercial: 'commercial',
  land: 'buy',
};

/**
 * ⚠️ בקרקע אין בניין, אין דירות ואין קומות. הצגת "הבניין והכניסה" על מגרש
 * ריק היא סעיף שלם שאין לו מה לומר — ולכן הוא מוסתר, במקום להתמלא ב"אין נתון".
 *
 * ⚠️ `listings` מוסתר בכל סוג שאינו מגורים: הסעיף הזה נקרא "דירות מוצעות
 * כרגע", ובזרימת שכירות/מסחרי אותן מודעות עצמן כבר מוצגות בסעיף הייעודי
 * ובשמן הנכון. שני סעיפים עם אותה רשימה ושתי כותרות שונות הם בדיוק סוג
 * הכפילות שגורמת ללקוח לספור פעמיים. בקרקע אין מודעות רלוונטיות כלל, ולכן
 * שם גם לא נמשכות מודעות מלכתחילה.
 */
export const ASSET_HIDDEN_CATEGORIES: Record<AssetType, CategoryKey[]> = {
  residential: [],
  rental: ['listings'],
  commercial: ['listings'],
  land: ['building', 'listings'],
};
