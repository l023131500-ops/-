// ==== גיאוקוד: כתובת חופשית -> נקודת ITM ====
//
// מקור ראשי: GovMap autocomplete (נבדק חי — ללא token, ללא cookie, ללא Referer).
//   POST https://www.govmap.gov.il/api/search-service/autocomplete   body: {"searchText": "..."}
//   מפתח הגוף חייב להיות בדיוק `searchText`; text/query/q/term מחזירים 400.
//   שדה `shape` הוא WKT ב-EPSG:3857 (Web Mercator) — לא ITM. ראה `lib/itm.ts`.
//
// ⚠️ ההתאמה של GovMap מטושטשת ומחזירה תוצאות שגויות בשקט:
//   "שדרות ירושלים 12 ירוחם" -> כתובת בעיר שדרות · "הנביאים 5 צפת" -> "הנשיאים 5 פת".
//   לכן כל תוצאה עוברת אימות יישוב מול הטקסט שהמשתמש הקליד, ומסומנת
//   ב-`cityVerified`. הקורא אחראי לא להציג תוצאה לא-מאומתת כעובדה.
//
// גיבוי: Nominatim/OSM (WGS84). מדיניות השימוש מגבילה ל-~1 בקשה לשנייה ואוסרת
// שימוש בכמויות — ולכן הוא גיבוי בלבד, לא הנתיב הראשי.

import { fetchJson, robustFetch } from './http';
import { mercatorToItm, wgs84ToItm, parseWktPoint, isPlausibleItm } from './itm';

export interface GeocodeResult {
  /** התווית כפי שהוחזרה מהמקור, למשל "הרצל 42 תל-אביב". */
  label: string;
  itmX: number;
  itmY: number;
  lat: number;
  lng: number;
  /** address | street | parcel | block | neighborhood */
  kind: string;
  source: 'govmap' | 'nominatim';
  /** ציון התאמה מהמקור (govmap בלבד). */
  score?: number;
  /** האם היישוב בתוצאה תואם את היישוב שבשאילתה. */
  cityVerified: boolean;
}

const AUTOCOMPLETE = 'https://www.govmap.gov.il/api/search-service/autocomplete';

/**
 * נרמול טקסט עברי להשוואה: הסרת גרשיים, מקף עברי/רגיל, ו-א' שימוש.
 * "תל אביב" · "תל-אביב" · "תל־אביב–יפו" -> "תלאביב" / "תלאביביפו"
 */
function normalizeHe(s: string): string {
  return (s ?? '')
    .replace(/["'`״׳]/g, '')
    .replace(/[-–—־]/g, '')
    .replace(/\s+/g, '')
    .trim();
}

/**
 * אימות יישוב — המחסום מפני ההתאמה המטושטשת של GovMap.
 *
 * ⚠️ אסור להשתמש בהכלת תת-מחרוזת. גרסה קודמת עשתה זאת ונכשלה בפועל:
 * השאילתה "הנביאים 5 צפת" הוחזרה כ"הנשיאים 5 פת" (פתח תקווה) ואומתה
 * כתקינה, משום ש-"צפת" מכילה את "פת". ההשוואה חייבת להיות ברמת טוקן שלם.
 *
 * לכן: בונים את כל רצפי הטוקנים (1..3) מהשאילתה, ומשווים אליהם את היישוב
 * שבתוצאה בשוויון מנורמל. הרחבה מבוקרת אחת מותרת — הכלה עם הפרש קצר —
 * כדי לכסות "תל אביב" מול "תל-אביב-יפו".
 */
export function verifyCity(query: string, resultLabel: string): boolean {
  const qTokens = (query ?? '').split(/\s+/).filter(Boolean);
  const parts = (resultLabel ?? '').split(/\s+/).filter(Boolean);
  if (!parts.length || !qTokens.length) return false;

  // ⚠️ רק סיומת השאילתה, לא כל טוקן בה. היישוב מופיע כמעט תמיד בסוף,
  // ובדיקה מול כל הטוקנים יוצרת התאמות שווא: "שדרות ירושלים 12 ירוחם"
  // הוחזר כתובת בעיר שדרות, ואומת בטעות כי "שדרות" מופיעה בשם הרחוב.
  const grams = new Set<string>();
  for (let n = 1; n <= 3 && n <= qTokens.length; n++) {
    const g = normalizeHe(qTokens.slice(-n).join(''));
    if (g.length >= 2) grams.add(g);
  }

  // היישוב הוא בדרך כלל הרכיב האחרון, ולעיתים שניים או שלושה אחרונים.
  const tails = [
    normalizeHe(parts.slice(-1).join('')),
    normalizeHe(parts.slice(-2).join('')),
    normalizeHe(parts.slice(-3).join('')),
  ].filter((t) => t.length >= 2);

  for (const city of tails) {
    if (grams.has(city)) return true;
    // "תלאביב" מול "תלאביביפו" — הכלה מותרת רק כשההפרש קצר, כדי שלא
    // ייווצר שוב מצב שבו "פת" מתקבל כהתאמה ל-"צפת".
    for (const g of grams) {
      if (g.length < 4 || city.length < 4) continue;
      const [short, long] = g.length <= city.length ? [g, city] : [city, g];
      if (long.startsWith(short) && long.length - short.length <= 3) return true;
    }
  }
  return false;
}

/** גיאוקוד ראשי דרך GovMap. מחזיר מועמדים ממויינים לפי ציון. */
export async function geocodeGovmap(query: string): Promise<GeocodeResult[]> {
  const json = await fetchJson<any>(AUTOCOMPLETE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ searchText: query }),
    timeoutMs: 20000,
  });

  const results: GeocodeResult[] = [];
  for (const r of json?.results ?? []) {
    const pt = parseWktPoint(r?.shape ?? '');
    if (!pt) continue;
    const itm = mercatorToItm(pt.x, pt.y);
    if (!isPlausibleItm(itm.x, itm.y)) continue;
    const { lat, lng } = mercatorToWgs84Safe(pt.x, pt.y);
    results.push({
      label: String(r?.text ?? query),
      itmX: itm.x,
      itmY: itm.y,
      lat,
      lng,
      kind: String(r?.type ?? 'unknown'),
      source: 'govmap',
      score: Number(r?.score) || undefined,
      cityVerified: verifyCity(query, String(r?.text ?? '')),
    });
  }
  // כתובת מדויקת עדיפה על רחוב/שכונה; אחר כך ציון.
  const rank = (k: string) => (k === 'address' ? 0 : k === 'parcel' ? 1 : k === 'street' ? 2 : 3);
  results.sort((a, b) => rank(a.kind) - rank(b.kind) || (b.score ?? 0) - (a.score ?? 0));
  return results;
}

function mercatorToWgs84Safe(mx: number, my: number): { lat: number; lng: number } {
  const R = 20037508.34;
  const lng = (mx / R) * 180;
  const t = (my / R) * 180;
  const lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((t * Math.PI) / 180)) - Math.PI / 2);
  return { lat, lng };
}

/** גיבוי: Nominatim/OSM. מוגבל בקצב — לשימוש רק כשה-GovMap נכשל. */
export async function geocodeNominatim(query: string): Promise<GeocodeResult[]> {
  const url =
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}` +
    `&format=jsonv2&countrycodes=il&limit=3&addressdetails=1`;
  const res = await robustFetch(url, {
    // מדיניות Nominatim מחייבת זיהוי אמיתי עם דרך יצירת קשר.
    headers: { 'User-Agent': 'NadlanBerega/1.0 (nadlan.more30.com)' },
    timeoutMs: 20000,
    retries: 1,
  });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  const arr: any[] = await res.json();

  const out: GeocodeResult[] = [];
  for (const r of arr ?? []) {
    const lat = Number(r?.lat), lng = Number(r?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const itm = wgs84ToItm(lat, lng);
    if (!isPlausibleItm(itm.x, itm.y)) continue;
    const city = r?.address?.city ?? r?.address?.town ?? r?.address?.village ?? '';
    out.push({
      label: String(r?.display_name ?? query),
      itmX: itm.x,
      itmY: itm.y,
      lat,
      lng,
      kind: 'address',
      source: 'nominatim',
      cityVerified: city ? verifyCity(query, String(city)) : false,
    });
  }
  return out;
}

/**
 * גיאוקוד עם שרשרת גיבוי. שני המסלולים חינמיים לחלוטין וללא רישום:
 *   1) GovMap autocomplete — מדויק (רמת בניין), ללא token. אם ייעלם — נופלים ל-(2).
 *   2) Nominatim/OSM — מסלול הגיבוי החינמי (WGS84 → ITM → קדסטר WFS).
 * שניהם מזינים את אותו צינור: נקודה → `Parcels_ITM` WFS → גוש/חלקה.
 * לעולם לא ממציא נקודה — מערך ריק פירושו "לא זמין".
 *
 * `opts.skipGovmap` כופה את המסלול החינמי (Nominatim) — לאימות ולבדיקת עמידות
 * למקרה ש-GovMap יושבת/ידרוש רישום בעתיד.
 */
export async function geocodeAddress(
  query: string,
  opts: { skipGovmap?: boolean } = {},
): Promise<GeocodeResult[]> {
  const errors: string[] = [];
  if (!opts.skipGovmap) {
    try {
      const primary = await geocodeGovmap(query);
      if (primary.length) return primary;
      errors.push('GovMap: אין תוצאות');
    } catch (e: any) {
      errors.push(`GovMap: ${e?.message ?? e}`);
    }
  }
  try {
    const fallback = await geocodeNominatim(query);
    if (fallback.length) return fallback;
    errors.push('Nominatim: אין תוצאות');
  } catch (e: any) {
    errors.push(`Nominatim: ${e?.message ?? e}`);
  }
  if (errors.length) throw new Error(errors.join(' · '));
  return [];
}
