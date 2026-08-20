// ==== מקוואות טהרה — מקור רשמי ====
//
// המפרט דורש מקוואות לפי סוג, שם ומרחק. Google Places אינו מכיר סוג "מקווה"
// (חיפוש טקסטואלי מחזיר גם בתי כנסת ובתי מרחץ, ותוצאות מיישובים אחרים), ולכן
// המקור כאן הוא המאגר הממשלתי "מקוואות טהרה" — 606 רשומות, אומת חי.
//
// ⚠️ מגבלה אמיתית: למאגר **אין קואורדינטות**, רק יישוב וכתובת. לכן הכתובות
// מגואקדות דרך GovMap (חינמי, ברמת כתובת) והמרחק מחושב אצלנו. רשומה שלא
// הצלחנו למקם מוצגת בלי מרחק ולא מושמטת — היא עדיין מקווה אמיתי ביישוב.
//
// מה לא יוצא מכאן ללקוח: שם האחראי/ת. זהו שם של אדם פרטי בקובץ ממשלתי, ואין
// לו שום מקום בדוח נדל"ן. שעות הפעילות, הנגישות והטלפון כן — הם מידע שירות.

import { datastoreSearch, haversineKm } from './datagov';
import { envResourceId } from './env';
import { geocodeGovmap } from './geocode';
import { readPoiCache, writePoiCache } from './store';

const MIKVE_RESOURCE = () =>
  envResourceId('DATAGOV_MIKVE_RESOURCE', 'e80a5e59-3b0f-4be9-983a-dc0971907626');

export interface Mikve {
  name: string;
  address: string | null;
  city: string;
  /** מרחק אווירי במטרים. null = לא הצלחנו למקם את הכתובת. */
  meters: number | null;
  lat: number | null;
  lng: number | null;
  hoursSummer: string | null;
  hoursWinter: string | null;
  hoursShabbat: string | null;
  accessibility: string | null;
  phone: string | null;
  forWomen: boolean;
  forMen: boolean;
  forDishes: boolean;
  brideRoom: boolean;
}

const yes = (v: unknown) => String(v ?? '').trim() === 'כן';
const clean = (v: unknown) => {
  // המאגר מכיל רווחים כפולים ושורות חדשות בתוך שעות הפעילות.
  const s = String(v ?? '').replace(/\s+/g, ' ').trim();
  return s && s !== '-' ? s : null;
};

/** נרמול שם יישוב — אותו נרמול שנדרש בכל מאגר ממשלתי אחר במערכת. */
function normCity(s: string | null | undefined): string {
  return (s ?? '')
    .replace(/["'`״׳]/g, '')
    .replace(/[-–—־]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * מקוואות ביישוב, ממויינים לפי מרחק מהנכס.
 * `lat`/`lng` אופציונליים — בלעדיהם מוחזרת רשימת היישוב בלי מרחקים.
 */
export async function mikvaotNear(
  city: string,
  lat?: number | null,
  lng?: number | null,
  opts: { radiusM?: number } = {},
): Promise<Mikve[]> {
  const want = normCity(city);
  if (!want) return [];

  let records: Record<string, unknown>[] = [];
  try {
    // ⚠️ סינון לפי `filters` על שם יישוב נכשל כשהכתיב שונה במקצת, ולכן מסננים
    // אצלנו במקום ב-CKAN. אבל `q: want` (חיפוש חופשי, שדורג לפי רלוונטיות)
    // עם limit נמוך מהמאגר המלא הוא בדיוק המלכודת שתועדה כבר בקבצי הרחובות/
    // הבחירות: תוצאה אמיתית של היישוב יכולה להיות מדורגת מתחת ל-limit ולהיעלם
    // בשקט. המאגר הזה קטן (606 רשומות, אומת חי — ראה הערת הכותרת) ולכן פשוט
    // טוענים את **כולו** בלי `q` ומסננים בזיכרון על השוואת יישוב מדויקת/מקורבת
    // למטה — limit נותן מרווח בטיחות של פי 3+ מעל 606, בלי סיכון לתקרת שורות.
    const res = await datastoreSearch(MIKVE_RESOURCE(), { limit: 2000 });
    records = res.records as Record<string, unknown>[];
  } catch {
    return [];
  }

  // ⚠️ הכלה חד-כיוונית/דו-כיוונית בלי הגבלת אורך זיהתה בעבר יישוב שגוי כאותו
  // יישוב רק כי שם אחד מוכל תת-מחרוזתית בשני (למשל "הרצליה" בתוך "הרצליה
  // פיתוח"). מתירים הכלה רק כשההפרש קצר וכששני הצדדים ארוכים מספיק —
  // בדיוק העיקרון של `verifyCity` ב-`lib/geocode.ts`.
  const fuzzyCityMatch = (a: string, b: string): boolean => {
    if (a.length < 4 || b.length < 4) return false;
    const [short, long] = a.length <= b.length ? [a, b] : [b, a];
    return long.startsWith(short) && long.length - short.length <= 3;
  };
  const inCity = records.filter((r) => {
    const c = normCity(String(r.mikveCity ?? ''));
    const council = normCity(String(r.counciName ?? ''));
    return c === want || council === want || fuzzyCityMatch(c, want) || fuzzyCityMatch(council, want);
  });
  if (!inCity.length) return [];

  // מטמון מיקומים — הכתובות אינן משתנות בין דוחות.
  const CATEGORY = 'mikve';
  const cached = new Map<string, { lat: number; lng: number }>();
  for (const row of await readPoiCache(CATEGORY, `${want}|`)) {
    if (row.lat != null && row.lng != null) cached.set(row.extId, { lat: row.lat, lng: row.lng });
  }
  const fresh: { extId: string; name: string; itmX: number; itmY: number; lat: number; lng: number }[] = [];

  const out: Mikve[] = [];
  for (const r of inCity) {
    const name = clean(r.mikveName) ?? 'מקווה';
    const address = clean(r.mikveAddress);
    const cityName = clean(r.mikveCity) ?? city;
    const extId = `${want}|${name}|${address ?? ''}`;

    let point = cached.get(extId) ?? null;
    if (!point && address && lat != null && lng != null) {
      try {
        const results = await geocodeGovmap(`${address} ${cityName}`);
        const best =
          results.find((x) => x.kind === 'address' && x.cityVerified) ??
          results.find((x) => x.kind === 'address') ??
          results[0] ??
          null;
        if (best) {
          point = { lat: best.lat, lng: best.lng };
          fresh.push({ extId, name, itmX: best.itmX, itmY: best.itmY, lat: best.lat, lng: best.lng });
        }
      } catch {
        /* נציג בלי מרחק */
      }
    }

    const meters =
      point && lat != null && lng != null
        ? Math.round(haversineKm(lat, lng, point.lat, point.lng) * 1000)
        : null;

    out.push({
      name,
      address,
      city: cityName,
      meters,
      lat: point?.lat ?? null,
      lng: point?.lng ?? null,
      hoursSummer: clean(r.activityHoursSummer),
      hoursWinter: clean(r.activityHoursWinter),
      hoursShabbat: clean(r.activityHoursShabat),
      accessibility: clean(r.accessability),
      phone: clean(r.mikvePhone),
      forWomen: yes(r.mikveForWomenYesNo),
      forMen: yes(r.mikveForMenYesNo),
      forDishes: yes(r.mikveForDishesYesNo),
      brideRoom: yes(r.brideRoomYesNo),
    });
  }

  await writePoiCache(
    CATEGORY,
    fresh.map((f) => ({
      extId: f.extId,
      name: f.name,
      itmX: f.itmX,
      itmY: f.itmY,
      lat: f.lat,
      lng: f.lng,
      meta: { city: want },
    })),
  );

  const radius = opts.radiusM ?? null;
  return out
    .filter((m) => radius == null || m.meters == null || m.meters <= radius)
    .sort((a, b) => (a.meters ?? Infinity) - (b.meters ?? Infinity));
}
