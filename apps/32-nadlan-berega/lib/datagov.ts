// ==== data.gov.il — CKAN Action API (גנרי) ====
// חינם, ללא מפתח. משמש להתחדשות עירונית, בתי"ס, תחבורה ועוד.
// resource_id של כל מאגר מוגדר ב-ENV (ראה .env.example) כדי שיהיה קל לכייל.

const CKAN_BASE = 'https://data.gov.il/api/3/action';

export interface CkanResult {
  records: any[];
  total: number;
}

export async function datastoreSearch(
  resourceId: string,
  opts: {
    q?: string | Record<string, string>;
    filters?: Record<string, unknown>;
    limit?: number;
    /** עימוד — מאגר כמו מוסדות חינוך חורג בהרבה מתקרת השורות של קריאה אחת. */
    offset?: number;
    /** צמצום עמודות מוחזרות (CKAN `fields`, מחרוזת מופרדת בפסיקים) — מקטין payload בשאילתות עם מספר שורות גדול. */
    fields?: string;
  } = {},
): Promise<CkanResult> {
  const body: Record<string, unknown> = { resource_id: resourceId, limit: opts.limit ?? 50 };
  if (opts.q) body.q = opts.q;
  if (opts.filters) body.filters = opts.filters;
  if (opts.offset) body.offset = opts.offset;
  if (opts.fields) body.fields = opts.fields;

  const res = await fetch(`${CKAN_BASE}/datastore_search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    // @ts-ignore
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!res.ok) throw new Error(`CKAN HTTP ${res.status}`);
  const json: any = await res.json();
  if (!json?.success) throw new Error('CKAN: success=false');
  return {
    records: json?.result?.records ?? [],
    total: json?.result?.total ?? 0,
  };
}

// מרחק הברסין (ק"מ) — לחישוב קרבה לבתי"ס/תחבורה כשיש lat/lng.
// ההגדרה עברה ל-`./aim`, שהוא גאומטריה טהורה בלי רשת ולכן ניתן לבדיקה.
// מיוצא מחדש כאן כדי שכל היבוא הקיים במערכת ימשיך לעבוד כמו שהוא.
export { haversineKm } from './aim';
