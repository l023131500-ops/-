// ==== קווי תחבורה ציבורית בכל תחנה (GTFS דרך Stride) ====
//
// עד היום נרשם בתיעוד ש"הקווים אינם ניתנים לשאילתה לפי כתובת": מרשם התחנות
// של data.gov.il מפרסם מיקום ושם בלבד, והקווים קיימים רק בארכיון ה-GTFS המלא
// (קובץ ZIP כבד שאי אפשר לשאול לפי נקודה). זה נכון לגבי המקורות ההם — אבל
// **לא** לגבי Stride של הסדנא לידע ציבורי, שמגיש את אותו GTFS כ-API חופשי.
//
// נבדק חי: `/gtfs_ride_stops/list` מחזיר בקריאה אחת גם את התחנה וגם את הקו —
// `gtfs_route__route_short_name` (מספר הקו), `gtfs_route__route_long_name`
// (המסלול) ו-`gtfs_route__agency_name` (המפעיל).
//
// ⚠️ אין ב-API סינון גאוגרפי. `/gtfs_stops/list` מסנן לפי `city` בלבד, ולכן
// התחנות של היישוב נמשכות פעם אחת ומסוננות לפי מרחק אצלנו.

import { fetchJson } from './http';
import { haversineKm } from './datagov';

const BASE = 'https://open-bus-stride-api.hasadna.org.il';

export interface GtfsStop {
  id: number;
  code: number | null;
  name: string;
  lat: number;
  lng: number;
  meters: number;
}

export interface StopLine {
  /** מספר הקו כפי שמופיע על האוטובוס. */
  shortName: string;
  /** המסלול המלא — "תל אביב-רמת גן". */
  longName: string | null;
  operator: string | null;
}

export interface StopWithLines extends GtfsStop {
  lines: StopLine[];
  /** נכשלה שליפת הקווים לתחנה הזו — מוצג במפורש ולא כ"אין קווים". */
  linesUnavailable?: boolean;
  /** מאיזה יום נלקח לוח הזמנים — לא בהכרח היום, ראה linesAtStopOnDate. */
  timetableDate?: string;
}

/** YYYY-MM-DD בשעון מקומי. */
function isoDate(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/**
 * וריאנטים של שם היישוב.
 * ⚠️ ב-GTFS היישוב הוא "תל אביב יפו" — בלי מקף. הקדסטר מחזיר "תל אביב-יפו".
 * התאמה מדויקת בלבד מחזירה 0 תחנות בלי שום שגיאה.
 */
function cityVariants(city: string): string[] {
  const t = city.trim();
  const noHyphen = t.replace(/[-–—־]/g, ' ').replace(/\s+/g, ' ').trim();
  const noQuotes = noHyphen.replace(/["'`״׳]/g, '');
  return Array.from(new Set([t, noHyphen, noQuotes])).filter(Boolean);
}

/** מטמון בתוך התהליך — אותו יישוב נשאל שוב ושוב באותה הרצה. */
const stopsCache = new Map<string, GtfsStop[]>();

async function cityStops(city: string, date: string): Promise<GtfsStop[]> {
  const cacheKey = `${city}|${date}`;
  const hit = stopsCache.get(cacheKey);
  if (hit) return hit;

  let rows: any[] = [];
  for (const variant of cityVariants(city)) {
    const url =
      `${BASE}/gtfs_stops/list?city=${encodeURIComponent(variant)}` +
      `&date_from=${date}&date_to=${date}&limit=5000&get_count=false`;
    const json = await fetchJson<any>(url, { timeoutMs: 25000, retries: 1 });
    if (Array.isArray(json) && json.length) {
      rows = json;
      break;
    }
  }

  const stops = rows
    .map((s) => ({
      id: Number(s?.id),
      code: Number.isFinite(Number(s?.code)) ? Number(s.code) : null,
      name: String(s?.name ?? '').trim(),
      lat: Number(s?.lat),
      lng: Number(s?.lon),
      meters: 0,
    }))
    .filter((s) => Number.isFinite(s.id) && Number.isFinite(s.lat) && Number.isFinite(s.lng));

  stopsCache.set(cacheKey, stops);
  return stops;
}

/** יום קודם, בפורמט ISO. */
function previousDay(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * הקווים שעוצרים בתחנה, ביום נתון.
 *
 * ⚠️ שני כשלים אמיתיים שהובילו למימוש הזה, ושניהם נראו כמו "אין קווים":
 *
 * 1. לוח הזמנים של **היום** אינו נטען למקור עד מהלך היום. הפקה שרצה אחרי חצות
 *    UTC שאלה חלון שכולו בעתיד וקיבלה אפס — והדוח תרגם את זה ל"תחנות שיצאו
 *    משימוש", אמירה עובדתית שגויה על כל התחנות בשני יישובים.
 * 2. **מזהה התחנה משתנה מיום ליום.** נמדד: אותה תחנה פיזית (קוד 38899,
 *    "ת. רכבת רחובות/הורדה") היא `47080169` ב-30/07 ו-`47049937` ב-29/07.
 *    לכן נסיון ראשון לתקן — לשאול את היום הקודם עם מזהה של היום — נכשל גם הוא:
 *    המזהה של היום פשוט אינו קיים אתמול. מה שיציב הוא **קוד התחנה**.
 *
 * לכן הנפילה אחורה מביאה את תחנות היום הקודם, מתאימה לפי קוד, ושואלת עם
 * המזהה של אותו יום.
 */
async function linesAtStopOnDate(stopId: number, date: string): Promise<StopLine[]> {
  const url =
    `${BASE}/gtfs_ride_stops/list?gtfs_stop_ids=${stopId}` +
    `&arrival_time_from=${date}T05:00:00Z&arrival_time_to=${date}T20:00:00Z` +
    `&limit=400&get_count=false`;
  const json = await fetchJson<any>(url, { timeoutMs: 25000, retries: 1 });
  if (!Array.isArray(json)) return [];

  // אותו קו עוצר עשרות פעמים ביום — מאחדים לפי מספר הקו וכיוון המסלול.
  const byLine = new Map<string, StopLine>();
  for (const r of json) {
    const shortName = String(r?.gtfs_route__route_short_name ?? '').trim();
    if (!shortName) continue;
    const longName = r?.gtfs_route__route_long_name
      ? String(r.gtfs_route__route_long_name).trim()
      : null;
    const key = `${shortName}|${longName ?? ''}`;
    if (!byLine.has(key)) {
      byLine.set(key, {
        shortName,
        longName,
        operator: r?.gtfs_route__agency_name ? String(r.gtfs_route__agency_name).trim() : null,
      });
    }
  }

  return Array.from(byLine.values()).sort((a, b) => {
    const na = Number(a.shortName);
    const nb = Number(b.shortName);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return a.shortName.localeCompare(b.shortName, 'he');
  });
}

/**
 * תחנות סביב נקודה, כל אחת עם הקווים שעוברים בה.
 *
 * `maxStops` הוא תקרת עלות מפורשת: כל תחנה היא קריאת רשת נוספת.
 */
/**
 * למה יש כאן סטטוס ולא רק מערך.
 *
 * ⚠️ נמצא במייל אמיתי: הדוח הודיע "לא נמצאו תחנות, ולכן אין קווים לדווח עליהם"
 * ובאותה נשימה הציג תחנה בשם ובמרחק 157 מ' ועוד 20 תחנות בטווח הליכה. מערך ריק
 * אינו מבחין בין "אין תחנות ביישוב" לבין "המקור לא ענה", ולכן נוסח החוסר יצא
 * שקרי. הקורא צריך לדעת מה בדיוק קרה כדי לנסח נכון.
 */
export type TransitLookupStatus =
  | 'ok'
  | 'no_stops_in_city' // המקור ענה, אך אין תחנות ביישוב הזה
  | 'none_in_radius' // יש תחנות ביישוב, אך אף אחת בטווח
  | 'source_unavailable'; // המקור לא ענה

export interface TransitLookup {
  stops: StopWithLines[];
  status: TransitLookupStatus;
  /** מה לומר ללקוח כשאין קווים — בעברית מדוברת, לפי הסטטוס. */
  note: string | null;
}

export async function stopsWithLinesDetailed(
  city: string,
  lat: number,
  lng: number,
  opts: { radiusM?: number; maxStops?: number; date?: string } = {},
): Promise<TransitLookup> {
  const radiusM = opts.radiusM ?? 700;
  const date = opts.date ?? isoDate();
  try {
    const all = await cityStops(city, date);
    if (!all.length) {
      return {
        stops: [],
        status: 'no_stops_in_city',
        note: `לוח הזמנים הארצי אינו מכיל תחנות ל${city} בתאריך הבדיקה.`,
      };
    }
    const stops = await stopsWithLines(city, lat, lng, opts);
    if (!stops.length) {
      return {
        stops: [],
        status: 'none_in_radius',
        note: `יש תחנות ב${city}, אך אף אחת מהן אינה בטווח של ${radiusM} מ' מהנכס.`,
      };
    }
    return { stops, status: 'ok', note: null };
  } catch (e: any) {
    return {
      stops: [],
      status: 'source_unavailable',
      note: 'לוח הזמנים הארצי של התחבורה הציבורית לא היה זמין בזמן הפקת הדוח, ולכן רשימת הקווים חסרה.',
    };
  }
}

export async function stopsWithLines(
  city: string,
  lat: number,
  lng: number,
  opts: { radiusM?: number; maxStops?: number; date?: string } = {},
): Promise<StopWithLines[]> {
  const radiusM = opts.radiusM ?? 700;
  const maxStops = opts.maxStops ?? 6;
  const date = opts.date ?? isoDate();

  const all = await cityStops(city, date);
  if (!all.length) return [];

  // ⚠️ אותה תחנה פיזית מופיעה כמה פעמים (רשומה ליום/כיוון). מאחדים לפי הקוד
  // כדי לא להציג ללקוח את אותה תחנה שלוש פעמים.
  //
  // הנרמול כולל גם את השם: נמדד שהמקור מחזיר "הבעשט/חיים וייסבורג" ו-"הבעשט/חיים
  // ויסבורג" — אותה תחנה בשני כתיבים, בשני קודים — והן הוצגו כשתי תחנות.
  const normName = (s: string) => s.replace(/["'`״׳]/g, '').replace(/\s+/g, '').replace(/י{2,}/g, 'י');
  const byCode = new Map<string, GtfsStop>();
  for (const s of all) {
    const meters = Math.round(haversineKm(lat, lng, s.lat, s.lng) * 1000);
    if (meters > radiusM) continue;
    const key = `n${normName(s.name)}`;
    const prev = byCode.get(key);
    if (!prev || meters < prev.meters) byCode.set(key, { ...s, meters });
  }

  const near = Array.from(byCode.values())
    .sort((a, b) => a.meters - b.meters)
    .slice(0, maxStops);

  let settled = await Promise.allSettled(near.map((s) => linesAtStopOnDate(s.id, date)));
  let lines = settled.map((r) => (r.status === 'fulfilled' ? r.value : null));
  let timetableDate = date;

  // ⚠️ נפילה אחורה ליום קודם — עם מזהי התחנות **של אותו יום**. מזהה התחנה
  // משתנה בין ימים; שאילתה עם מזהה של היום על אתמול מחזירה אפס תמיד.
  if (!lines.some((l) => l && l.length)) {
    const prevDate = previousDay(date);
    try {
      const prevStops = await cityStops(city, prevDate);
      const byCodePrev = new Map<number, number>();
      for (const s of prevStops) if (s.code != null) byCodePrev.set(s.code, s.id);
      const ids = near.map((s) => (s.code != null ? byCodePrev.get(s.code) ?? null : null));
      if (ids.some((id) => id != null)) {
        settled = await Promise.allSettled(
          ids.map((id) => (id != null ? linesAtStopOnDate(id, prevDate) : Promise.resolve([]))),
        );
        const retry = settled.map((r) => (r.status === 'fulfilled' ? r.value : null));
        if (retry.some((l) => l && l.length)) {
          lines = retry;
          timetableDate = prevDate;
        }
      }
    } catch {
      /* נשארים עם מה שיש */
    }
  }

  return near.map((s, i) => {
    const l = lines[i];
    if (l) return { ...s, lines: l, timetableDate };
    // כשל בתחנה בודדת אינו מפיל את הסעיף, והוא נאמר במפורש.
    return { ...s, lines: [], linesUnavailable: true, timetableDate };
  });
}
