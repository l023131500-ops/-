// ==== אפיון אוכלוסייה לפי תוצאות קלפי ====
//
// למה זה בכלל אפשרי: מאגר תוצאות הקלפי אינו מכיל קואורדינטות — רק סמל יישוב
// וקלפי. אבל מאגר *מיקומי הקלפיות* מכיל רחוב ומספר בית לכל קלפי. החיבור ביניהם
// (נבדק חי 28/07/2026): סמל_קלפי_בתחנה = floor(קלפי_בתוצאות) × 10.
//   תל אביב: קלפי 3 ← תחנה 30 (עשהאל 3)   ·   בני ברק: קלפי 2.1/2.2 ← תחנה 20
//
// ⚠️ למה זה **תמיד "מקורב"**: אין מאגר ציבורי שממפה כתובת → הקלפי שמשרתת אותה.
// אנחנו בוחרים את הקלפי הקרובה גיאוגרפית, וזו הערכת סביבה — לא נתון על
// דיירי הבניין. זה נאמר ללקוח במפורש ולא מוסתר מאחורי אחוזים.

import { datastoreSearch, haversineKm } from './datagov';
import { envResourceId } from './env';
import { geocodeGovmap, verifyCity } from './geocode';
import { readPoiCache, writePoiCache } from './store';
import { itmToWgs84 } from './itm';

const BALLOTS = () =>
  envResourceId('DATAGOV_ELECTIONS_BALLOTS', 'cc223336-07bc-485d-b160-62df92967c0a');
const CITIES = () =>
  envResourceId('DATAGOV_ELECTIONS_CITIES', 'b392b8ee-ba45-4ea0-bfed-f03a1a36e99c');
const STATIONS = () =>
  envResourceId('DATAGOV_POLLING_STATIONS', '68c4d7e8-2218-48ee-996f-2db2f72b2395');

/** עמודות מטא בקובץ התוצאות — כל היתר הן אותיות מפלגה. */
const META_COLS = new Set([
  '_id', 'סמל ועדה', 'ברזל', 'שם ישוב', 'סמל ישוב', 'קלפי',
  'ריכוז', 'שופט', 'בזב', 'מצביעים', 'פסולים', 'כשרים',
]);

/**
 * שיוך אות מפלגה (כנסת 25) לזרם באוכלוסייה.
 * המטרה אינה פוליטית — היא לתאר את **אופי השכונה** למי ששוקל לגור בה:
 * חרדית, דתית-לאומית, ערבית, או כללית/חילונית.
 */
const PARTY_GROUP: Record<string, 'חרדי' | 'דתי-לאומי' | 'ערבי' | 'כללי'> = {
  שס: 'חרדי',
  ג: 'חרדי',
  ט: 'דתי-לאומי', // הציונות הדתית
  מחל: 'כללי',
  פה: 'כללי',
  אמת: 'כללי',
  מרצ: 'כללי',
  ל: 'כללי',
  כן: 'כללי',
  עם: 'ערבי',
  ודעם: 'ערבי',
  ום: 'ערבי',
  ד: 'ערבי',
};

// ⚠️ שתי מגבלות אמת שהתוויות האלה חייבות לכבד:
// 1. הפילוח מוצג כ**מגזרים**, והמקור שממנו הוא נגזר אינו נחשף ללקוח — לא
//    בתוויות, לא ב-`basis` ולא בשום מחרוזת אחרת שיוצאת מהקובץ הזה.
// 2. הקטגוריה הרביעית מאגדת קבוצה רחבה שאינה מגזרית, ובתוכה גם ציבור מסורתי
//    ודתי. לכן "חילוני וכללי" ולא "חילוני" סתם — והכל מסומן כהערכה.
const GROUP_LABEL: Record<string, string> = {
  חרדי: 'חרדי',
  'דתי-לאומי': 'דתי-לאומי',
  ערבי: 'ערבי',
  כללי: 'חילוני וכללי',
};

export interface PollingStation {
  kalpiSymbol: number;
  street: string | null;
  houseNumber: number | null;
  placeName: string | null;
  cityName: string;
  lat?: number;
  lng?: number;
  meters?: number;
}

export interface PopulationProfile {
  /** ברמת שכונה (קלפי קרובה) או ברמת יישוב — נאמר במפורש. */
  level: 'ballot' | 'city';
  /** תיאור מדובר: "רוב חרדי מובהק", "מעורבת". */
  headline: string;
  /** התפלגות באחוזים לפי זרם, ממוינת. */
  breakdown: { group: string; label: string; pct: number }[];
  /** אחוז ההצבעה — מדד מעורבות קהילתית. */
  turnoutPct: number | null;
  /** על מה זה מבוסס, בעברית מדוברת. */
  basis: string;
  /** מתחם המדידה הקרוב ביותר ששימש, אם ברמת שכונה. */
  station?: PollingStation | null;
  /** כמה מתחמי מדידה אוחדו — מדגם אחד רגיש למקריות. */
  stationsUsed?: number;
  /** מרחק המתחם הקרוב ביותר במטרים. */
  nearestMeters?: number;
  votesCounted: number;
}

/**
 * מה מותר לשלוח ללקוח.
 *
 * ⚠️ המפרט אוסר לחשוף שהאפיון נגזר מהצבעה. הממשק אכן אינו מציג את זה, אבל
 * גוף התשובה של ה-API כן הכיל `station.kalpiSymbol` ואת שם מקום הקלפי — כלומר
 * מי שפותח כלי פיתוח בדפדפן רואה מיד על מה זה מבוסס. השדות האלה נשארים
 * פנימיים ואינם יוצאים מהשרת.
 */
export function publicPopulation(p: PopulationProfile | null): PopulationProfile | null {
  if (!p) return null;
  const { station, turnoutPct, ...rest } = p;
  return { ...rest, turnoutPct: null, station: null };
}

/**
 * נרמול שם יישוב להשוואה בין מאגרים.
 * ⚠️ הכרחי: מרשם החלקות מחזיר "תל אביב -יפו" ואילו קובץ הבחירות שומר
 * "תל אביב  יפו" (רווח כפול, בלי מקף). בלי הסרת מקפים ההשוואה נכשלת בשקט.
 */
function normCity(s: string | null | undefined): string {
  return (s ?? '')
    .replace(/["'`״׳]/g, '')
    .replace(/[-–—־]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** מוצא את סמל היישוב מתוך קובץ התוצאות לפי יישובים. */
export async function findCitySymbol(cityName: string): Promise<{ symbol: number; name: string } | null> {
  const want = normCity(cityName);
  if (!want) return null;
  try {
    // ⚠️ מקף שובר את החיפוש החופשי של CKAN ומחזיר 0 תוצאות — שולחים בלי מקפים.
    const res = await datastoreSearch(CITIES(), { q: want, limit: 60 });
    let best: { symbol: number; name: string } | null = null;
    for (const r of res.records) {
      const nm = normCity(String(r['שם ישוב'] ?? ''));
      const sym = Number(r['סמל ישוב']);
      if (!Number.isFinite(sym) || !nm) continue;
      if (nm === want) return { symbol: sym, name: nm };
      // ⚠️ לא includes() גולמי — אותה מלכודת-הכלה של geocode.ts/verifyCity:
      // "ציון" מוכל ב"ראשון לציון" בלי שום קשר ליישוב. השוואה ברמת טוקן שלם בלבד.
      if (!best && verifyCity(want, nm)) best = { symbol: sym, name: nm };
    }
    return best;
  } catch {
    return null;
  }
}

/** כל הקלפיות ביישוב, עם הכתובת שבה הן ממוקמות. */
export async function stationsInCity(citySymbol: number): Promise<PollingStation[]> {
  const res = await datastoreSearch(STATIONS(), {
    filters: { 'סמל ישוב': citySymbol },
    limit: 1000,
  });
  return res.records
    .map((r) => ({
      kalpiSymbol: Number(r['סמל קלפי']),
      street: String(r['שם רחוב'] ?? '').trim() || null,
      houseNumber: Number.isFinite(Number(r['מספר בית'])) ? Number(r['מספר בית']) : null,
      placeName: String(r['תיאור מקום הקלפי'] ?? '').trim() || null,
      cityName: String(r['שם ישוב'] ?? '').trim(),
    }))
    .filter((s) => Number.isFinite(s.kalpiSymbol));
}

// מטמון גיאוקוד בתוך התהליך. המטמון המתמיד הוא nadlan.poi (ראה store.ts).
const stationGeoCache = new Map<string, { lat: number; lng: number } | null>();

/** מריץ משימות במקביל עם תקרה — 155 קריאות סדרתיות לוקחות דקה, במקביל שניות. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const idx = i++;
      if (idx >= items.length) return;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

function stationAddress(s: PollingStation): string {
  return `${s.street} ${s.houseNumber && s.houseNumber > 0 ? s.houseNumber : ''} ${s.cityName}`
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * מיקום **כל** הקלפיות ביישוב, עם מטמון מתמיד.
 *
 * ⚠️ זה התיקון של התקלה השנייה בחומרתה שנמצאה באימות. הגרסה הקודמת גיאוקדה
 * 12 קלפיות בלבד, ממויינות לפי דמיון שם הרחוב לרחוב הנכס. כשאף קלפי אינה
 * באותו רחוב — וזה המצב הרגיל — המיון לא משנה דבר, והמערכת בחרה את 12
 * הראשונות בסדר שבו המאגר מחזיר אותן, כלומר שרירותית.
 * נמדד על "הבעש״ט 9 רחובות": נבחרה קלפי במרחק **1,985 מ'** בשכונה אחרת,
 * והדוח הכריז "אוכלוסייה חילונית וכללית 89.8%". הקלפיות שבאמת הקרובות הן
 * 309 מ' (תלמוד תורה חב"ד) ו-432 מ' (תלמוד תורה "הראם") — ובהן חרדי 42%
 * ו-57%. כלומר הדוח תיאר את ההפך מהמציאות בשכונה שיש בה 20 בתי כנסת.
 *
 * הגיאוקוד עובר ל-GovMap, שהוא חינמי לחלוטין וברמת כתובת — ולכן אין סיבה
 * להגביל את מספר המועמדים. התוצאות נשמרות ב-nadlan.poi כדי שדוח שני על
 * אותו יישוב לא ישלם את הזמן הזה שוב.
 */
export async function locateStations(
  stations: PollingStation[],
  citySymbol: number,
): Promise<PollingStation[]> {
  if (!stations.length) return [];
  const CATEGORY = 'polling_station';
  const prefix = `${citySymbol}-`;

  // 1. מטמון מתמיד
  const cached = new Map<string, { lat: number; lng: number }>();
  for (const row of await readPoiCache(CATEGORY, prefix)) {
    const lat = row.lat ?? itmToWgs84(row.itmX, row.itmY).lat;
    const lng = row.lng ?? itmToWgs84(row.itmX, row.itmY).lng;
    if (Number.isFinite(lat) && Number.isFinite(lng)) cached.set(row.extId, { lat, lng });
  }

  const fresh: { extId: string; name: string; itmX: number; itmY: number; lat: number; lng: number }[] = [];

  const located = await mapLimit(stations, 8, async (s) => {
    if (!s.street) return s;
    const extId = `${citySymbol}-${s.kalpiSymbol}`;
    const hit = cached.get(extId);
    if (hit) return { ...s, lat: hit.lat, lng: hit.lng };

    const addr = stationAddress(s);
    let geo = stationGeoCache.get(addr);
    if (geo === undefined) {
      try {
        const results = await geocodeGovmap(addr);
        const best = results.find((r) => r.kind === 'address') ?? results[0] ?? null;
        geo = best ? { lat: best.lat, lng: best.lng } : null;
        if (best) {
          fresh.push({
            extId,
            name: s.placeName ?? addr,
            itmX: best.itmX,
            itmY: best.itmY,
            lat: best.lat,
            lng: best.lng,
          });
        }
      } catch {
        geo = null;
      }
      stationGeoCache.set(addr, geo);
    } else if (geo) {
      // אותה כתובת, קלפי אחרת — עדיין שווה לשמור תחת המזהה שלה.
      fresh.push({ extId, name: s.placeName ?? addr, itmX: 0, itmY: 0, lat: geo.lat, lng: geo.lng });
    }
    return geo ? { ...s, lat: geo.lat, lng: geo.lng } : s;
  });

  // כתיבה למטמון — רק רשומות עם ITM תקף, כי העמודות האלה NOT NULL.
  await writePoiCache(
    CATEGORY,
    fresh
      .filter((f) => f.itmX > 0 && f.itmY > 0)
      .map((f) => ({
        extId: f.extId,
        name: f.name,
        itmX: f.itmX,
        itmY: f.itmY,
        lat: f.lat,
        lng: f.lng,
        meta: { city_symbol: citySymbol },
      })),
  );

  return located;
}

/** הופך שורת תוצאות להתפלגות זרמים. */
function summarize(row: Record<string, any>): {
  breakdown: PopulationProfile['breakdown'];
  turnoutPct: number | null;
  votes: number;
} {
  const totals: Record<string, number> = {};
  let counted = 0;

  for (const [k, v] of Object.entries(row)) {
    if (META_COLS.has(k)) continue;
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) continue;
    const group = PARTY_GROUP[k.trim()];
    counted += n;
    if (!group) continue;
    totals[group] = (totals[group] ?? 0) + n;
  }

  const kosher = Number(row['כשרים']) || counted;
  const bzb = Number(row['בזב']) || 0;
  const voters = Number(row['מצביעים']) || 0;

  const breakdown = Object.entries(totals)
    .map(([group, n]) => ({
      group,
      label: GROUP_LABEL[group] ?? group,
      pct: kosher > 0 ? Math.round((n / kosher) * 1000) / 10 : 0,
    }))
    .filter((b) => b.pct > 0)
    .sort((a, b) => b.pct - a.pct);

  // ⚠️ האחוזים לא הסתכמו ל-100 (נמדד: 97.8%), כי חלק מהרשומות אינן משויכות
  // לאף אחת מארבע הקבוצות. פילוח שלא מסתכם ומוצג בלי שארית נראה כמו טעות
  // חישוב. השארית מוצגת בשמה.
  const attributed = breakdown.reduce((s, b) => s + b.pct, 0);
  const remainder = Math.round((100 - attributed) * 10) / 10;
  if (remainder >= 0.5) {
    breakdown.push({ group: 'other', label: 'לא מסווג', pct: remainder });
  }

  return {
    breakdown,
    turnoutPct: bzb > 0 && voters > 0 ? Math.round((voters / bzb) * 1000) / 10 : null,
    votes: kosher,
  };
}

/**
 * ניסוח מדובר של האופי, מתוך ההתפלגות.
 *
 * ⚠️ ארבע הקבוצות אינן שוות מהותית: "חילוני וכללי" היא קבוצת שארית רחבה שכוללת
 * גם ציבור מסורתי, בעוד "חרדי" ו"דתי-לאומי" מוגדרות היטב. השוואת המספר הגדול
 * ביותר בין הארבע לבדה תיארה שכונה שבה 42% חרדי ועוד 18% דתי-לאומי כ"מעורבת",
 * בעוד שבפועל שישה מכל עשרה שם שומרי מצוות — וזה מה שקונה שוקל.
 * לכן הכותרת מתייחסת גם לשיעור המשולב.
 */
function headlineOf(breakdown: PopulationProfile['breakdown']): string {
  if (!breakdown.length) return 'לא ניתן לאפיין את האוכלוסייה מהנתונים הקיימים';
  const top = breakdown[0];
  const second = breakdown[1];
  const pctOf = (g: string) => breakdown.find((b) => b.group === g)?.pct ?? 0;
  const haredi = pctOf('חרדי');
  const dati = pctOf('דתי-לאומי');
  const observant = haredi + dati;

  if (observant >= 55) {
    if (haredi >= 55) return 'אוכלוסייה חרדית במובהק';
    if (haredi >= observant * 0.65) {
      return `אוכלוסייה חרדית ברובה — כ-${Math.round(haredi)}% חרדי ועוד כ-${Math.round(dati)}% דתי-לאומי`;
    }
    if (dati >= observant * 0.65) {
      return `אוכלוסייה דתית-לאומית ברובה — כ-${Math.round(dati)}% דתי-לאומי ועוד כ-${Math.round(haredi)}% חרדי`;
    }
    return `אוכלוסייה שומרת מצוות ברובה — כ-${Math.round(observant)}%, חרדי ודתי-לאומי יחד`;
  }

  if (top.pct >= 65) return `אוכלוסייה ${top.label} במובהק`;
  if (top.pct >= 45) return `רוב ${top.label}`;
  if (second && top.pct - second.pct <= 12) {
    return `אוכלוסייה מעורבת — ${top.label} לצד ${second.label}`;
  }
  return `נטייה ל${top.label}`;
}

/**
 * הפרופיל המלא. מנסה קודם ברמת הקלפי הקרובה (מדויק יותר),
 * ונופל ליישוב כשאין קואורדינטות או גיאוקוד.
 */
export async function populationProfile(
  cityName: string,
  opts: { lat?: number | null; lng?: number | null; street?: string | null } = {},
): Promise<PopulationProfile | null> {
  const city = await findCitySymbol(cityName);
  if (!city) return null;
  /** כשהקלפי הקרובה רחוקה מדי — הסבר שנוסף לאפיון ברמת היישוב. */
  let cityFallbackNote: string | null = null;

  // --- ניסיון א': רמת שכונה, לפי הקלפיות הקרובות בפועל ---
  if (opts.lat != null && opts.lng != null) {
    try {
      const stations = await locateStations(await stationsInCity(city.symbol), city.symbol);
      const ballots = await datastoreSearch(BALLOTS(), {
        filters: { 'סמל ישוב': city.symbol },
        limit: 1500,
      });

      // סמל_תחנה = floor(קלפי) × 10 — קלפיות משנה (2.1, 2.2) חולקות תחנה.
      const rowsFor = (kalpiSymbol: number) =>
        ballots.records.filter((r) => Math.floor(Number(r['קלפי'])) * 10 === kalpiSymbol);

      // רק קלפיות שאותרו **וגם** יש להן תוצאות. קלפי בלי תוצאות אינה מועמדת:
      // בחירתה הייתה מפילה את כל הניסיון לרמת היישוב בלי סיבה.
      const withData = stations
        .filter((s) => s.lat != null && s.lng != null && rowsFor(s.kalpiSymbol).length > 0)
        .map((s) => ({
          ...s,
          meters: Math.round(haversineKm(opts.lat!, opts.lng!, s.lat!, s.lng!) * 1000),
        }))
        .sort((a, b) => a.meters - b.meters);

      // ⚠️ תקרת מרחק. קלפי במרחק 2 ק"מ מתארת שכונה אחרת, ואפיון לפיה גרוע
      // מאפיון ברמת היישוב — כי הוא מוצג כאילו הוא מקומי ומדויק יותר.
      const NEAR_M = 700;
      const MAX_M = 1400;
      let selected = withData.filter((s) => s.meters <= NEAR_M);
      if (!selected.length) selected = withData.filter((s) => s.meters <= MAX_M).slice(0, 3);

      // מאחדים עד שלושה מקומות קלפי שונים — קלפי בודדת היא מדגם של כמה מאות
      // בוחרים, ורגישה מאוד למקריות.
      if (selected.length) {
        const byPlace = new Map<string, typeof selected>();
        for (const s of selected) {
          const key = stationAddress(s);
          const arr = byPlace.get(key) ?? [];
          arr.push(s);
          byPlace.set(key, arr);
        }
        // ⚠️ לא לאחד יותר מהנדרש. מתחם ב-309 מ' עם 3,675 רשומות הוא מדגם מספק
        // **ומקומי**; הוספת מתחם ב-512 מ' רק כדי "להגדיל מדגם" מרחיקה את
        // האפיון מהנכס. לכן מוסיפים מתחמים לפי קרבה עד שיש די רשומות בלבד.
        const ENOUGH_RECORDS = 2500;
        const ordered = [...byPlace.values()].sort((a, b) => a[0].meters - b[0].meters);
        const places: typeof ordered = [];
        let accumulated = 0;
        for (const place of ordered) {
          places.push(place);
          accumulated += place.reduce(
            (sum, s) =>
              sum + rowsFor(s.kalpiSymbol).reduce((n, r) => n + (Number(r['כשרים']) || 0), 0),
            0,
          );
          if (accumulated >= ENOUGH_RECORDS || places.length >= 3) break;
        }
        const chosen = places.flat();

        const merged: Record<string, number> = {};
        for (const s of chosen) {
          for (const r of rowsFor(s.kalpiSymbol)) {
            for (const [k, v] of Object.entries(r)) {
              if (k === '_id') continue;
              const n = Number(v);
              if (Number.isFinite(n)) merged[k] = (merged[k] ?? 0) + n;
            }
          }
        }

        const { breakdown, turnoutPct, votes } = summarize(merged);
        if (breakdown.length) {
          const nearest = chosen[0];
          const farthest = chosen[chosen.length - 1];
          return {
            level: 'ballot',
            headline: headlineOf(breakdown),
            breakdown,
            turnoutPct,
            // ⚠️ תיאור רמת הפירוט בלבד. המקור שממנו נגזר הפילוח אינו נחשף.
            basis:
              `הערכה ברמת השכונה, מבוססת על ${places.length === 1 ? 'מתחם מדידה אחד' : `${places.length} מתחמי מדידה`} ` +
              `במרחק ${nearest.meters}${farthest.meters !== nearest.meters ? `–${farthest.meters}` : ''} מ' מהנכס, ` +
              `ועל ${votes.toLocaleString('he-IL')} רשומות. ` +
              'זהו אפיון של אופי הסביבה ולא נתון על דיירי הבניין עצמו, והוא עשוי להשתנות ממתחם למתחם.',
            station: nearest,
            stationsUsed: places.length,
            nearestMeters: nearest.meters,
            votesCounted: votes,
          };
        }
      }

      // אין קלפי בטווח סביר — אומרים זאת, ולא מציגים אפיון של שכונה אחרת.
      if (withData.length) {
        cityFallbackNote =
          `המתחם הקרוב ביותר שיש עליו נתונים נמצא ${withData[0].meters} מ' מהנכס — רחוק מדי ` +
          'מכדי לתאר את הסביבה המיידית, ולכן מוצג אפיון ברמת היישוב.';
      }
    } catch {
      // נופלים לרמת היישוב.
    }
  }

  // --- ניסיון ב': רמת יישוב ---
  try {
    const res = await datastoreSearch(CITIES(), {
      filters: { 'סמל ישוב': city.symbol },
      limit: 5,
    });
    const row = res.records[0];
    if (!row) return null;
    const { breakdown, turnoutPct, votes } = summarize(row);
    if (!breakdown.length) return null;
    return {
      level: 'city',
      headline: headlineOf(breakdown),
      breakdown,
      turnoutPct,
      basis:
        `הערכה ברמת ${city.name} כולה. ` +
        (cityFallbackNote ? `${cityFallbackNote} ` : '') +
        'זהו ממוצע של היישוב כולו — שכונות בתוכו עשויות להיות שונות מאוד זו מזו.',
      station: null,
      votesCounted: votes,
    };
  } catch {
    return null;
  }
}
