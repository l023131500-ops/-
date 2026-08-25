// ==== פשיעה — תיקים שנפתחו ברמת יישוב, ממאגר משטרת ישראל ב-data.gov.il ====
//
// המאגר ("פירוט של תיקי פשיעה לפי אזור, רבעון וסוגי עבירות") אינו כולל
// קואורדינטת ITM/WGS84 ואינו חושף לציבור את גבולות "האזור הסטטיסטי" הפנימי
// של המשטרה (`StatisticAreaKod`) — רק שם/קוד יישוב (`YeshuvKod`) וקטגוריית
// עבירה (`StatisticGroup`). לכן, שלא כמו בתי-ספר/תחבורה (`environment.ts`,
// רדיוס אמיתי מנקודת הנכס), הספירה כאן היא **ברמת היישוב כולו** — ומתויגת
// ככזו בשדה עצמו, לפי העיקרון "כל שדה נושא את רמת הדיוק האמיתית שלו".
//
// resource_id ברירת המחדל אומת חי (25/08/2026) מול data.gov.il:
// "פירוט של תיקי פשיעה לפי אזור, רבעון וסוגי עבירות ב-2025" — 395,294 תיקים
// ארצית, `YeshuvKod` תואם את סמל היישוב הרשמי (למשל 7400=נתניה, 70=אשדוד,
// אומת מול placenames.ts). ניתן לדריסה דרך ENV (DATAGOV_CRIME_RESOURCE /
// DATAGOV_CRIME_YEAR) כשמתפרסם מאגר שנה חדשה, בלי שינוי קוד.
//
// שאילתה מסוננת לפי יישוב (לא ריקה, לא נטענת בשלמותה) — נבדק חי (25/08/2026):
// קריאה אחת עם `filters`+`limit` גבוה מחזירה את כל השורות המסוננות במכה אחת,
// גם עבור הערים הגדולות בארץ (תל אביב 37,064 תיקים, ירושלים 29,910, חיפה
// 12,478 — כולן תחת ROW_LIMIT), ולכן אין צורך בעימוד/מטמון נפרד כמו
// ב-poiIngest.ts. יישוב שחורג בכל זאת מהתקרה מדווח כ"לא זמין" ולא כמספר
// חלקי מטעה (ראה הבדיקה `res.total > res.records.length` למטה).

import { datastoreSearch } from './datagov';

const DEFAULT_RESOURCE_ID = 'e311b6a1-be5a-4a82-8298-f3afbee07b6b';
const DEFAULT_YEAR = 2025;
const ROW_LIMIT = 100_000;

export interface CrimeCategory {
  label: string;
  count: number;
}

export interface CrimeProfile {
  year: number;
  total: number;
  topCategories: CrimeCategory[];
}

export async function crimeProfile(cityCode: number | null): Promise<CrimeProfile | null> {
  if (cityCode == null || !Number.isFinite(cityCode)) return null;

  const resourceId = process.env.DATAGOV_CRIME_RESOURCE?.trim() || DEFAULT_RESOURCE_ID;
  const year = Number(process.env.DATAGOV_CRIME_YEAR) || DEFAULT_YEAR;

  let records: Record<string, unknown>[];
  try {
    const res = await datastoreSearch(resourceId, {
      filters: { YeshuvKod: cityCode },
      limit: ROW_LIMIT,
      fields: 'StatisticGroup',
    });
    if (res.total > res.records.length) {
      // מעבר לתקרת השורות — אין להציג ספירה חלקית כאילו היא מלאה.
      return null;
    }
    records = res.records as Record<string, unknown>[];
  } catch {
    return null;
  }

  const counts = new Map<string, number>();
  for (const r of records) {
    const group = String(r.StatisticGroup ?? '').trim();
    if (!group) continue;
    counts.set(group, (counts.get(group) ?? 0) + 1);
  }

  const topCategories = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label, count]) => ({ label, count }));

  return { year, total: records.length, topCategories };
}
