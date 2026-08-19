// ==== למ"ס (CBS) — מדד מחירי דירות ====
// API רשמי ומלא, ללא מפתח.
//
// ⚠️ תיקון מזהה: הערך שהיה כאן, 120010, הוא "מדד המחירים לצרכן - כללי" —
// כלומר מדד המחירים לצרכן הכללי, ולא מדד מחירי דירות. נבדק חי.
// המזהה הנכון הוא 40010 = "מחירי דירות" (מדד מבוסס-עסקאות, חודשי מ-1994).
//
// מזהי סדרה נוספים (מתוך catalog/tree?chapter=aa):
//   40010  — מחירי דירות (בסיס: ממוצע 1993)          ← ברירת המחדל שלנו
//   70000  — מדד מחירי דירות חדשות (מ-2017/10)
//   60000..60500 — לפי מחוז: ירושלים/צפון/חיפה/מרכז/ת"א/דרום (מ-2017/10)
//   120450 — "דיור": רכיב הדיור בתוך מדד המחירים לצרכן, מבוסס שכ"ד.
//
// ⚠️ 40010 ו-120450 מודדים דברים שונים ואין לערבב ביניהם: הראשון הוא מדד
// מחירי דירות מעסקאות, השני הוא רכיב שכר-דירה בתוך המדד לצרכן.
// כמו כן בסיסי המדידה שונים בין הסדרות (1993 / 2017-10 / 2024), ולכן אין
// להשוות ערכים בין מזהים שונים בלי ריבייס.

import { fetchJson } from './http';
import type { CbsIndexPoint } from './types';

const CBS_HOUSING_INDEX_ID = process.env.CBS_HOUSING_INDEX_ID ?? '40010';

/**
 * מדד שכר הדירה — הסדרה לדוח השכירות.
 *
 * ⚠️ **120450 אינו המדד הנכון.** הוא נקרא "דיור", וכשקוראים לו הוא באמת חוזר
 * בשם הזה — אבל הוא הקבוצה הראשית, וכוללת בתוכה גם את 120490 ("שירותי דיור
 * **בבעלות הדיירים**", כלומר זקיפת דיור לבעלי דירות) וגם 120510 (תיווך, עריכת
 * חוזים וביטוח). כלומר רוב משקלו אינו שכר דירה בפועל.
 *
 * הסדרה שמודדת שכר דירה ממש היא **120460** — "שכר דירה פרטי, ציבורי ושכירות
 * ארוכת טווח בפיקוח ממשלתי". נלקח מעץ הקטלוג הרשמי
 * (`index/catalog/tree?id=a`, subjectId 38), ואומת חי: 106.4 בבסיס
 * "2024 ממוצע", 3.3% שינוי שנתי ביוני 2026.
 *
 * ⚠️ אין להשוות ערך של 120460 לערך של 40010: בסיסי המדידה שונים (2024 מול
 * 1993). כל אחד מוצג בנפרד ועם שם הבסיס שלו.
 */
const CBS_RENT_INDEX_ID = process.env.CBS_RENT_INDEX_ID ?? '120460';

export interface HousingIndex {
  points: CbsIndexPoint[];
  seriesName: string | null;
  /** תיאור בסיס המדד, למשל "1993 ממוצע". קריטי להצגה נכונה. */
  baseDesc: string | null;
  /** שינוי שנתי באחוזים בנקודה האחרונה. */
  yearChangePct: number | null;
}

export async function fetchHousingIndex(last = 24): Promise<HousingIndex> {
  return fetchIndex(CBS_HOUSING_INDEX_ID, last);
}

/** מדד שכר הדירה (סעיף שכר הדירה במדד לצרכן) — לשימוש דוח השכירות בלבד. */
export async function fetchRentIndex(last = 24): Promise<HousingIndex> {
  return fetchIndex(CBS_RENT_INDEX_ID, last);
}

async function fetchIndex(id: string, last: number): Promise<HousingIndex> {
  const url =
    `https://api.cbs.gov.il/index/data/price?id=${id}` +
    `&format=json&download=false&last=${last}`;

  const json = await fetchJson<any>(url, { timeoutMs: 20000 });

  const series = json?.month?.[0] ?? json?.quarter?.[0] ?? null;
  const rows: any[] = series?.date ?? [];

  const points: CbsIndexPoint[] = [];
  let baseDesc: string | null = null;
  let yearChangePct: number | null = null;

  for (const r of rows) {
    const value = Number(r?.currBase?.value ?? r?.value);
    if (!Number.isFinite(value)) continue;
    const year = r?.year;
    const month = r?.month ?? (r?.quarter != null ? r.quarter * 3 : null);
    if (!baseDesc && r?.currBase?.baseDesc) baseDesc = String(r.currBase.baseDesc);
    if (yearChangePct === null && Number.isFinite(Number(r?.percentYear))) {
      yearChangePct = Number(r.percentYear);
    }
    points.push({
      period: year && month ? `${year}-${String(month).padStart(2, '0')}` : String(year ?? ''),
      value,
    });
  }

  // המקור מחזיר מהחדש לישן; לגרף נוח כרונולוגי.
  points.reverse();

  return {
    points,
    seriesName: series?.name ? String(series.name) : null,
    baseDesc,
    yearChangePct,
  };
}
