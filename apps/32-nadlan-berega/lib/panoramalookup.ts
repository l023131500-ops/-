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
