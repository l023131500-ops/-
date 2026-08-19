// ==== GovMap — שכבת תאימות ====
//
// ⚠️ היסטוריה חשובה: הקובץ הזה פנה בעבר ל-`es.govmap.gov.il` ול-`api.govmap.gov.il`
// והניח שנדרש token. בדיקה חיה מול השרתים העלתה תמונה אחרת:
//   · es.govmap.gov.il  — כשל DNS (השירות הוסר).
//   · api.govmap.gov.il — 403 מ-CloudFront גם ל-GET וגם ל-POST.
//   · open.govmap.gov.il/geoserver — עובד מצוין, ללא שום אימות.
// כלומר אין token להשיג — הנתיב הנכון הוא ה-GeoServer הפתוח.
//
// הבאג האמיתי שגרם ל"תשובה ריקה" לא היה אימות אלא אי-התאמת CRS:
// `PARCEL_ALL` שמורה ב-EPSG:3857, ופילטר CQL מתפרש ב-CRS המקורי של השכבה,
// ולכן נקודת ITM החזירה FeatureCollection ריק ללא שגיאה. ראה `lib/cadastre.ts`.
//
// הקובץ נשמר כשכבת תאימות דקה בלבד. קוד חדש — יש לייבא ישירות מ:
//   `lib/cadastre.ts` (גוש/חלקה) · `lib/geocode.ts` (כתובת→נקודה) · `lib/itm.ts` (המרות)

import { parcelAtPoint as cadastreParcelAtPoint, type Parcel } from './cadastre';
import { geocodeAddress as geocode, type GeocodeResult } from './geocode';

export type { Parcel, GeocodeResult };

export interface ParcelResult {
  gush?: string;
  helka?: string;
}

/** @deprecated השתמש ב-`geocodeAddress` מתוך `lib/geocode.ts`. */
export async function geocodeAddress(query: string): Promise<GeocodeResult[]> {
  return geocode(query);
}

/** @deprecated השתמש ב-`parcelAtPoint` מתוך `lib/cadastre.ts` (מחזיר אובייקט עשיר). */
export async function parcelAtPoint(itmX: number, itmY: number): Promise<ParcelResult> {
  const parcel = await cadastreParcelAtPoint(itmX, itmY);
  return { gush: parcel?.gush, helka: parcel?.helka };
}
