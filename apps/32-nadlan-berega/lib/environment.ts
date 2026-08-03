// ==== סביבה — ספירת מוסדות ותחנות ברדיוס אמיתי סביב הנכס ====
// בתי ספר ותחבורה נטענו פעם אחת מ-data.gov.il למטמון nadlan.poi (נתוני אמת),
// והספירה כאן היא ברדיוס מטרי אמיתי סביב נקודת ה-ITM של הנכס — לא ספירת עיר
// גסה. אם המטמון אינו זמין (Supabase לא מוגדר) — מוחזר null → "לא זמין".

import { countPoiWithinRadius } from './store';

export interface EnvMetric {
  label: string;
  count: number | null;
  configured: boolean;
  radiusM: number;
}

const RADIUS_M = 1000;

export async function environmentMetrics(itmX?: number, itmY?: number): Promise<EnvMetric[]> {
  const base = (label: string, count: number | null): EnvMetric => ({
    label,
    count,
    configured: count !== null,
    radiusM: RADIUS_M,
  });

  if (itmX == null || itmY == null) {
    return [base('בתי ספר ומוסדות חינוך', null), base('תחנות תחבורה ציבורית', null)];
  }

  const [schools, transport] = await Promise.all([
    countPoiWithinRadius('school', itmX, itmY, RADIUS_M).catch(() => null),
    countPoiWithinRadius('transport', itmX, itmY, RADIUS_M).catch(() => null),
  ]);

  return [
    base('בתי ספר ומוסדות חינוך', schools),
    base('תחנות תחבורה ציבורית', transport),
  ];
}
