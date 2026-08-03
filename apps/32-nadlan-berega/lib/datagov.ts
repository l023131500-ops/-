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
  } = {},
): Promise<CkanResult> {
  const body: Record<string, unknown> = { resource_id: resourceId, limit: opts.limit ?? 50 };
  if (opts.q) body.q = opts.q;
  if (opts.filters) body.filters = opts.filters;
  if (opts.offset) body.offset = opts.offset;

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
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
