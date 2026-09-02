// ==== Mapillary — פנורמת רחוב חלופית כש-Street View אין כיסוי בנקודה ====
//
// חינמי (Meta), דורש רק טוקן-קריאה ציבורי. אם MAPILLARY_ACCESS_TOKEN אינו
// מוגדר — המקור מדווח "לא זמין" בלי לנסות לנחש, בדיוק לפי הכלל "מקור שלא
// נטען → לא זמין" שבראש lib/report.ts.

import { robustFetch } from './http';
import { env } from './env';

const TOKEN = () => env('MAPILLARY_ACCESS_TOKEN') ?? '';

export function mapillaryConfigured(): boolean {
  return TOKEN().length > 0;
}

export interface MapillaryShot {
  /** קישור תמונה ציבורי-חתום מגוף התשובה של Mapillary — בטוח להצגה ישירה
   *  ב-<img>, אינו חושף את הטוקן שלנו. */
  imageUrl: string;
  /** YYYY-MM-DD, נגזר מ-captured_at (מילישניות מאז אפוק). */
  date: string | null;
}

/** מחפש את התמונה הקרובה ביותר לנקודה, ברדיוס צר — לא כל תמונה באזור. */
export async function mapillaryNearest(lat: number, lng: number): Promise<MapillaryShot | null> {
  if (!mapillaryConfigured()) return null;
  try {
    const res = await robustFetch(
      'https://graph.mapillary.com/images' +
        `?access_token=${encodeURIComponent(TOKEN())}` +
        '&fields=id,captured_at,thumb_1024_url' +
        `&closeto=${lng},${lat}&radius=50&limit=1`,
      { timeoutMs: 12000, retries: 1 },
    );
    if (!res.ok) return null;
    const json: any = await res.json();
    const first = json?.data?.[0];
    const imageUrl = first?.thumb_1024_url;
    if (!imageUrl || typeof imageUrl !== 'string') return null;
    const capturedAt = Number(first?.captured_at);
    return {
      imageUrl,
      date: Number.isFinite(capturedAt) ? new Date(capturedAt).toISOString().slice(0, 10) : null,
    };
  } catch {
    return null;
  }
}
