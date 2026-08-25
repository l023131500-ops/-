// ==== פנורמה עצמאית — בלי לעבור דרך buildReport/הרמות ====
//
// שכבת "פנורמה" בדוח המלא (lib/buildreport.ts) זמינה VIP בלבד כי שם היא חלק
// מדוח מלא שברמות אחרות מדלג במכוון על מקורות בתשלום (Apify, Places,
// Distance Matrix — ראה tierMayUsePaidSources ב-lib/report.ts). המטרה כאן
// שונה: מערכת 36 (nadlan-pro) צריכה נקודת-פנורמה בלבד לכל נכס במלאי שלה,
// בלי להריץ דוח שלם ובלי לגעת במקור בתשלום כלשהו — בדיוק ברוח הנחיית הבעלים
// (core.projects #33, "P2 FEATURE", 25/08/2026): "Use the existing Google
// Maps API key already configured. Real data only, no cost beyond existing
// key." לכן זה מסלול עצמאי: איתור חינמי לגמרי (GovMap/Nominatim/קדסטר —
// אותם מקורות שהרמה החינמית כבר משתמשת בהם, ראה buildreport.ts), ואז בדיקת
// מטא-דאטה של Street View (חינמית אצל גוגל — רק התמונה עצמה נגבית, לא
// metadata) עם נפילה חזרה ל-Mapillary (חינמי, אם מוגדר טוקן).

import { geocodeAddress } from './geocode';
import { googleConfigured, streetViewMeta } from './googlemaps';
import { mapillaryNearest } from './mapillary';
import { parcelByGushHelka } from './cadastre';
import { itmToWgs84 } from './itm';
import { resolveStreet } from './placenames';
import { parseQuery } from './buildreport';
import { aimQuality, destinationPoint } from './aim';

export interface PanoramaLookupResult {
  available: boolean;
  source?: 'google' | 'mapillary';
  lat?: number;
  lng?: number;
  date?: string | null;
  mapillaryImageUrl?: string;
  reason?: 'no-location' | 'no-coverage';
}

/** "גוש X חלקה Y" או כתובת חופשית -> נקודת lat/lng, חינמי בלבד (בלי גוגל). */
async function resolveFreeLocation(q: string): Promise<{ lat: number; lng: number } | null> {
  const parsed = parseQuery(q);

  if (parsed.kind === 'parcel' && parsed.gush && parsed.helka) {
    try {
      const parcel = await parcelByGushHelka(parsed.gush, parsed.helka);
      if (parcel?.centroidItm) {
        return itmToWgs84(parcel.centroidItm.x, parcel.centroidItm.y);
      }
    } catch {
      /* אין חלקה תואמת — ייחשב כ"לא אותרה נקודה" */
    }
    return null;
  }

  if (parsed.kind !== 'address') return null;

  let streetResolved: Awaited<ReturnType<typeof resolveStreet>> | null = null;
  if (parsed.city && parsed.street) {
    try {
      streetResolved = await resolveStreet(parsed.city, parsed.street);
    } catch {
      /* נמשיך עם מה שהוקלד */
    }
  }
  const searchAddress =
    streetResolved && streetResolved.matchedByAlias
      ? [streetResolved.official, parsed.houseNum ?? '', parsed.city ?? ''].join(' ').replace(/\s+/g, ' ').trim()
      : parsed.raw;

  try {
    let candidates = await geocodeAddress(searchAddress);
    let chosen = candidates.find((c) => c.cityVerified) ?? candidates[0] ?? null;
    if ((!chosen || !chosen.cityVerified) && searchAddress !== parsed.raw) {
      const retry = await geocodeAddress(parsed.raw);
      chosen = retry.find((c) => c.cityVerified) ?? chosen;
    }
    return chosen ? { lat: chosen.lat, lng: chosen.lng } : null;
  } catch {
    return null;
  }
}

export async function lookupPanorama(q: string): Promise<PanoramaLookupResult> {
  const point = await resolveFreeLocation(q);
  if (!point) return { available: false, reason: 'no-location' };
  const { lat, lng } = point;

  if (googleConfigured()) {
    const meta = await streetViewMeta(lat, lng);
    if (meta.available) {
      return { available: true, source: 'google', lat: meta.lat ?? lat, lng: meta.lng ?? lng, date: meta.date };
    }
  }

  const shot = await mapillaryNearest(lat, lng);
  if (shot) {
    return { available: true, source: 'mapillary', lat, lng, date: shot.date, mapillaryImageUrl: shot.imageUrl };
  }

  return { available: false, lat, lng, reason: 'no-coverage' };
}

export interface StreetWalkLookupResult {
  points: { lat: number; lng: number }[];
  date: string | null;
  heading: number;
}

/**
 * "סיור רחוב" חינמי-לאיתור לפי כתובת/גוש-חלקה — אותו שער "מסלול נפרד וזול"
 * כמו `lookupPanorama` למעלה, בשביל system 36 (nadlan-pro): הגרסה שנבנתה
 * ב-`buildreport.ts` (`streetWalk`) זמינה VIP בלבד כי היא רצה בתוך דוח מלא;
 * כאן זו נקודת-כניסה עצמאית שמשכפלת בדיוק את אותה גיאומטריה/סף (ראה שם),
 * בלי דוח VIP ובלי תלות ברמה. כל קריאה כאן היא `streetViewMeta` — בדיקת
 * מטא-דאטה חינמית אצל גוגל (ראה `lookupPanorama` למעלה); התמונות עצמן
 * (בתשלום) נטענות רק אח"כ, ביוזמת המשתמש, דרך `/api/image` הקיים —
 * בדיוק כמו שכל תמונה אחרת במערכת הזאת כבר עובדת.
 */
export async function lookupStreetWalk(q: string): Promise<StreetWalkLookupResult | null> {
  const point = await resolveFreeLocation(q);
  if (!point || !googleConfigured()) return null;
  const { lat, lng } = point;

  const meta = await streetViewMeta(lat, lng);
  const aim = meta.available ? aimQuality(meta, lat, lng) : null;
  if (!aim?.ok || aim.heading == null || meta.lat == null || meta.lng == null) return null;
  const anchorLat = meta.lat;
  const anchorLng = meta.lng;

  const alongStreet = (aim.heading + 90) % 360;
  const offsetsM = [-40, -20, 0, 20, 40];
  const candidates = offsetsM.map((o) => destinationPoint(anchorLat, anchorLng, alongStreet, o));
  const metas = await Promise.all(candidates.map((c) => streetViewMeta(c.lat, c.lng).catch(() => null)));

  const points: { lat: number; lng: number }[] = [];
  let lastPanoKey: string | null = null;
  for (let i = 0; i < candidates.length; i++) {
    const m = metas[i];
    if (!m?.available || m.lat == null || m.lng == null) continue;
    const panoKey = `${m.lat.toFixed(6)},${m.lng.toFixed(6)}`;
    if (panoKey === lastPanoKey) continue;
    lastPanoKey = panoKey;
    points.push(candidates[i]);
  }

  if (points.length < 3) return null;
  // `aim.heading` (pano-to-building) is reused for every frame, same reason as
  // buildreport.ts's streetWalk: each candidate point already sits on the road,
  // so letting `/api/image` self-aim from that point's own nearest pano almost
  // always trips the <4m "too close to aim" rejection in `aimQuality`.
  return { points, date: meta.date, heading: aim.heading };
}
