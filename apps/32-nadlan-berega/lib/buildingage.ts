// ==== גיל הבניין — שנת בנייה, גיל בשנים, וסימני התחדשות ====
//
// למה זה נגזר ולא נשלף: אין מאגר ציבורי ארצי של היתרי בנייה. נבדק בפועל מול
// data.gov.il — חיפוש "היתרי בנייה", "שנת בניה", "רישוי זמין" ו-"בניינים"
// מחזיר **אפס** מאגרים ארציים (יש רק מאגרים עירוניים בודדים, למשל באר-שבע).
// מערכת "רישוי זמין" סגורה לציבור.
//
// מה כן קיים, וממנו אפשר להסיק בביטחון: **היסטוריית העסקאות של הבניין עצמו**.
// עסקת קרקע או קומבינציה על הבניין, ואחריה מכירות דירות חדשות — זו חתימה
// חד-משמעית של בנייה חדשה. נבדק חי על "הבעש״ט 9 רחובות":
//   2001-07  דירה 130 מ״ר 6 חדרים   → בניין קודם עמד כאן
//   2020-09  קרקע / קומבינציה 834 מ״ר ב-4,000,000 ₪ → המגרש נמכר בקומבינציה
//   2023-07  שלוש דירות 125 מ״ר בקומות 3 → הבניין החדש נמסר
// כלומר: בניין חדש מ-2023, בן ~3 שנים, שהוקם במקום בניין ותיק.
//
// ⚠️ שתי מגבלות אמת שהמודול הזה מחויב להצהיר עליהן:
// 1. מרשם העסקאות הממשלתי מתחיל בשנת 1998. לבניין שכל עסקאותיו מ-1998–2001
//    אפשר לומר רק "קיים **לפחות** משנה X" — לא לקבוע שנת בנייה.
// 2. מכירות של קבלן מתחילות לפני מסירה. לכן שנת הבנייה היא **הערכה**, ואומרים
//    זאת במפורש; היא לא מסומנת "אמת" באף מצב.

import { isHomeSale } from './nadlan';
import type { Transaction } from './types';

/** השנה הראשונה שקיימת במרשם העסקאות של רשות המסים. */
export const DEALS_REGISTRY_FROM = 1998;

export interface BuildingAge {
  /** שנת הבנייה המשוערת. null = אין די עדות. */
  buildYear: number | null;
  /** גיל בשנים, מעוגל. */
  ageYears: number | null;
  /** האם זהו רק גבול תחתון ("לפחות מ-"), בגלל תקרת המרשם. */
  isLowerBound: boolean;
  /** בניין חדש — עד 8 שנים. */
  isNew: boolean;
  /** ההסבר המלא בעברית מדוברת — נכנס לדוח כפי שהוא. */
  basis: string;
  /** תיאור קצר להצגה: "בניין חדש, בן כ-3 שנים". */
  headline: string;
  /** שנת עסקת הקרקע/קומבינציה שסימנה בנייה מחדש. */
  redevelopmentYear: number | null;
  redevelopmentNature: string | null;
  /** מכירת דירה בבניין שקדם לבנייה מחדש — עדות שהיה כאן בניין ותיק. */
  previousBuildingSaleYear: number | null;
  firstHomeSaleYear: number | null;
  lastHomeSaleYear: number | null;
  /** כמה עסקאות מגורים שימשו לחישוב. */
  homeSalesCount: number;
}

function yearOf(t: Transaction): number | null {
  const y = Number(String(t.dealDate ?? '').slice(0, 4));
  return Number.isFinite(y) && y > 1900 ? y : null;
}

/** עסקה שמסמנת בנייה מחדש על המגרש: קרקע, קומבינציה, או ניוד זכויות. */
function isRedevelopmentDeal(t: Transaction): boolean {
  const pt = (t.propertyType ?? '').trim();
  const nature = (t.dealType ?? '').trim();
  if (/קומבינציה/.test(nature)) return true;
  return /קרקע/.test(pt) && !/דירה/.test(pt);
}

/**
 * גיל הבניין מתוך העסקאות של הבניין עצמו.
 * `buildingTxns` חייב להיות עסקאות של **בניין אחד** (לפי מזהה הבניין), אחרת
 * התוצאה תערבב בניינים שכנים ותהיה חסרת משמעות.
 */
export function buildingAge(buildingTxns: Transaction[], now = new Date()): BuildingAge | null {
  if (!buildingTxns.length) return null;
  const thisYear = now.getFullYear();

  const homes = buildingTxns
    .filter(isHomeSale)
    .map((t) => ({ t, y: yearOf(t) }))
    .filter((r): r is { t: Transaction; y: number } => r.y !== null)
    .sort((a, b) => a.y - b.y);

  const redev = buildingTxns
    .filter(isRedevelopmentDeal)
    .map((t) => ({ t, y: yearOf(t) }))
    .filter((r): r is { t: Transaction; y: number } => r.y !== null)
    .sort((a, b) => a.y - b.y);

  if (!homes.length && !redev.length) return null;

  const firstHomeSaleYear = homes.length ? homes[0].y : null;
  const lastHomeSaleYear = homes.length ? homes[homes.length - 1].y : null;

  // עסקת ההתחדשות האחרונה שאחריה נמכרו דירות — היא שקובעת את הבניין הנוכחי.
  let redevelopmentYear: number | null = null;
  let redevelopmentNature: string | null = null;
  for (const r of redev) {
    if (homes.some((h) => h.y >= r.y)) {
      redevelopmentYear = r.y;
      redevelopmentNature = r.t.dealType ?? r.t.propertyType ?? null;
    }
  }

  const afterRedev = redevelopmentYear != null ? homes.filter((h) => h.y >= redevelopmentYear!) : [];
  const beforeRedev = redevelopmentYear != null ? homes.filter((h) => h.y < redevelopmentYear!) : [];
  const previousBuildingSaleYear = beforeRedev.length ? beforeRedev[0].y : null;

  let buildYear: number | null = null;
  let isLowerBound = false;
  let basis: string;

  if (redevelopmentYear != null && afterRedev.length) {
    // בנייה חדשה: המגרש נמכר, ואחריו נמכרו דירות חדשות.
    buildYear = afterRedev[0].y;
    basis =
      `בשנת ${redevelopmentYear} נמכר המגרש עצמו (${redevelopmentNature ?? 'עסקת קרקע'}), ` +
      `ומשנת ${buildYear} נרשמו בבניין ${afterRedev.length} מכירות של דירות. ` +
      'זו החתימה של בניין שנבנה מחדש — שנת הבנייה נגזרת ממכירת הדירות הראשונה, ' +
      'ולכן היא הערכה: קבלן מוכר דירות עוד לפני המסירה בפועל.' +
      (previousBuildingSaleYear
        ? ` לפני כן, בשנת ${previousBuildingSaleYear}, נמכרה כאן דירה — כלומר במקום הזה עמד בניין ותיק יותר.`
        : '');
  } else if (firstHomeSaleYear != null) {
    buildYear = firstHomeSaleYear;
    if (firstHomeSaleYear <= DEALS_REGISTRY_FROM + 3) {
      // המרשם מתחיל ב-1998; עסקה מ-1998–2001 אינה מלמדת שהבניין נבנה אז.
      isLowerBound = true;
      basis =
        `העסקה הראשונה שנרשמה בבניין היא משנת ${firstHomeSaleYear}, ולכן הבניין קיים ` +
        `**לפחות** מאז. מרשם העסקאות הממשלתי מתחיל בשנת ${DEALS_REGISTRY_FROM}, ` +
        'ולכן אי אפשר ללמוד ממנו על בניינים ותיקים יותר. שנת הבנייה המדויקת מופיעה ' +
        'בהיתר הבנייה בתיק הבניין בוועדה המקומית.';
    } else {
      basis =
        `הדירה הראשונה בבניין נמכרה בשנת ${firstHomeSaleYear}, ואין לפניה עסקת קרקע ` +
        'או קומבינציה. זו האינדיקציה הטובה ביותר לשנת הבנייה מהמקורות הציבוריים, ' +
        'והיא הערכה — לא נתון מהיתר הבנייה.';
    }
  } else {
    // רק עסקת קרקע, בלי מכירות דירות: המגרש נמכר אך אין עדות למסירה.
    const y = redev[redev.length - 1].y;
    basis =
      `בשנת ${y} נרשמה כאן עסקת ${redev[redev.length - 1].t.dealType ?? 'קרקע'}, אך לא נרשמה ` +
      'אף מכירת דירה אחריה. כלומר אין במקורות הציבוריים עדות שהבנייה הושלמה ונמסרה.';
    return {
      buildYear: null,
      ageYears: null,
      isLowerBound: false,
      isNew: false,
      basis,
      headline: 'לא ניתן לקבוע שנת בנייה',
      redevelopmentYear: y,
      redevelopmentNature: redev[redev.length - 1].t.dealType ?? null,
      previousBuildingSaleYear: null,
      firstHomeSaleYear: null,
      lastHomeSaleYear: null,
      homeSalesCount: 0,
    };
  }

  const ageYears = buildYear != null ? Math.max(0, thisYear - buildYear) : null;
  const isNew = ageYears != null && !isLowerBound && ageYears <= 8;

  let headline: string;
  if (ageYears == null) headline = 'לא ניתן לקבוע שנת בנייה';
  else if (isLowerBound) headline = `קיים לפחות מ-${buildYear} — כלומר בן ${ageYears} שנים ומעלה`;
  else if (ageYears <= 3) headline = `בניין חדש — בן כ-${ageYears} שנים`;
  else if (ageYears <= 8) headline = `בניין חדש יחסית — בן כ-${ageYears} שנים`;
  else if (ageYears <= 25) headline = `בן כ-${ageYears} שנים`;
  else headline = `בניין ותיק — בן כ-${ageYears} שנים`;

  return {
    buildYear,
    ageYears,
    isLowerBound,
    isNew,
    basis,
    headline,
    redevelopmentYear,
    redevelopmentNature,
    previousBuildingSaleYear,
    firstHomeSaleYear,
    lastHomeSaleYear,
    homeSalesCount: homes.length,
  };
}
