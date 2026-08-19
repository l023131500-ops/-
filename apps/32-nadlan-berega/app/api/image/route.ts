// פרוקסי תמונות — Street View ומפה סטטית.
//
// ⚠️ הסיבה שזה קיים: מפתח Google חייב להופיע ב-URL של התמונה. אם הדפדפן היה
// פונה ישירות לגוגל, המפתח היה נחשף בקוד המקור של הדף וכל אחד היה יכול לחייב
// את החשבון. כאן השרת מושך את התמונה עם המפתח ומגיש אותה — הדפדפן לא רואה אותו.

import { NextRequest } from 'next/server';
import {
  staticMapUrl,
  streetViewImageUrl,
  streetViewShot,
  googleConfigured,
  MARKER_LABELS,
  type MapMarker,
} from '@/lib/googlemaps';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (!googleConfigured()) {
    return new Response('שירות המפות אינו מחובר', { status: 503 });
  }

  const p = req.nextUrl.searchParams;
  const kind = p.get('kind') ?? 'street';
  const lat = Number(p.get('lat'));
  const lng = Number(p.get('lng'));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return new Response('חסרות קואורדינטות', { status: 400 });
  }

  // מגבילים למה שהמערכת באמת צריכה — לא פרוקסי פתוח לכל בקשה לגוגל.
  const w = Math.min(Math.max(Number(p.get('w')) || 900, 100), 1280);
  const h = Math.min(Math.max(Number(p.get('h')) || 500, 100), 1280);
  const zoom = Math.min(Math.max(Number(p.get('zoom')) || 16, 3), 20);

  // כל מה שאינו מפה/לוויין מטופל כצילום רחוב (זו גם ברירת המחדל).
  const isStreet = kind !== 'map' && kind !== 'satellite';

  let target: string;
  let headingUsed: number | null = null;
  let panoMeters: number | null = null;
  let panoAt: string | null = null;
  if (!isStreet) {
    // פורמט הסימונים על החוט: `lat,lng,תווית` מופרדים בנקודה-פסיק.
    let markers: MapMarker[] = [];
    const raw = p.get('markers');
    if (raw) {
      markers = raw
        .split(';')
        .map((s) => {
          const [a, b, label] = s.split(',');
          const la = Number(a);
          const ln = Number(b);
          if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
          return { lat: la, lng: ln, label: label?.trim() || undefined };
        })
        .filter(Boolean)
        .slice(0, MARKER_LABELS.length) as MapMarker[];
    }
    target = staticMapUrl(lat, lng, {
      zoom,
      w,
      h,
      markers,
      mapType: kind === 'satellite' ? 'hybrid' : 'roadmap',
    });
  } else {
    // הכיוון מחושב מעמדת הפנורמה אל הבניין — אחרת גוגל מצלם לכיוון ברירת
    // המחדל של הפנורמה, וזה מה שהראה את הצד השני של הרחוב בדורש טוב 17.
    // `heading` בבקשה גובר על החישוב, כדי שאפשר יהיה לכוון ידנית.
    // ⚠️ `Number(null)` הוא 0, ו-`isFinite(0)` הוא true — כלומר בדיקה ישירה על
    // הפרמטר החסר הייתה מפרשת "אין heading" כ"heading=0" ומצלמת צפונה בכל דוח.
    const rawHeading = p.get('heading');
    const manual = rawHeading != null && rawHeading.trim() !== '' ? Number(rawHeading) : NaN;
    if (Number.isFinite(manual)) {
      headingUsed = ((manual % 360) + 360) % 360;
      target = streetViewImageUrl(lat, lng, w, h, { heading: headingUsed });
    } else {
      const shot = await streetViewShot(lat, lng, w, h);
      if (!shot) {
        return new Response('אין צילום רחוב זמין', {
          status: 404,
          headers: { 'X-Image-Reason': 'no-panorama' },
        });
      }
      target = shot.url;
      headingUsed = shot.heading >= 0 ? shot.heading : null;
      panoMeters = shot.panoMeters >= 0 ? shot.panoMeters : null;
      panoAt = shot.panoLat != null && shot.panoLng != null ? `${shot.panoLat},${shot.panoLng}` : null;
    }
  }

  try {
    const res = await fetch(target, { cache: 'no-store' });
    if (!res.ok) return new Response('התמונה אינה זמינה', { status: res.status });
    const buf = await res.arrayBuffer();

    // ⚠️ צילום רחוב מוחזר לפעמים כתמונת חלופה אפורה עם קוד 200 — קורה כששירות
    // צילומי הרחוב אינו מופעל בפרויקט הענן, גם כשכל שאר השירותים תקינים.
    // צילום אמיתי בגודל הזה שוקל עשרות קילובייטים; חלופה אפורה שוקלת כ-5.
    // עדיף להחזיר "אין תמונה" מאשר להציג ללקוח ריבוע אפור חסר משמעות.
    if (isStreet && buf.byteLength < 12_000) {
      return new Response('אין צילום רחוב זמין', {
        status: 404,
        headers: { 'X-Image-Reason': 'streetview-placeholder' },
      });
    }
    return new Response(buf, {
      headers: {
        // הכיוון והמרחק נחשפים ככותרות כדי שאפשר יהיה לאמת בפועל שהמצלמה
        // הופנתה אל הבניין — בלי לפתוח את התמונה ובלי לנחש.
        ...(headingUsed != null ? { 'X-Street-Heading': headingUsed.toFixed(1) } : {}),
        ...(panoMeters != null ? { 'X-Street-Pano-Meters': String(panoMeters) } : {}),
        ...(panoAt != null ? { 'X-Street-Pano-At': panoAt } : {}),
        'Content-Type': res.headers.get('content-type') ?? 'image/jpeg',
        // התמונות יציבות — מטמון יום מקטין עלות מול גוגל.
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch {
    return new Response('לא הצלחנו לטעון את התמונה', { status: 502 });
  }
}
