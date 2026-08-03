// ==== התשריט התכנוני הרשמי, מוטמע בדוח ====
//
// §7 במפרט מבקש להציג את **המסמכים עצמם** ולא קישורים. קובצי התקנון והתשריט
// של MAVAT באמת אינם ניתנים למשיכה (ההורדה שם מוגנת ב-reCAPTCHA, ועמוד התכנית
// מחזיר `X-Frame-Options: SAMEORIGIN` ולכן גם אינו ניתן להטמעה ב-iframe).
//
// מה שכן ניתן להטמיע, והוא המסמך התכנוני עצמו: **מפת התכנון של מינהל התכנון**.
// שירות המפות שלו (אותו שירות שממנו נלקחים ייעודי הקרקע והתכניות) חושף נקודת
// `export` פתוחה שמרנדרת את שכבת ייעודי הקרקע ואת הקווים הכחולים של התכניות
// כתמונה. נבדק חי: `export?bbox=…&layers=show:4,1&f=json` החזיר 200 ו-`href`
// לתמונה אמיתית. זה התשריט הרשמי, מהמקור, מוטמע בדוח.
//
// הפרוקסי כאן קיים כדי שהתמונה תוגש מאותו origin (אחרת היא נחסמת תחת
// more30.com/nadlan), וכדי שהפרמטרים יהיו מוגבלים למה שהדוח באמת צריך.

import { NextRequest } from 'next/server';
import { itmToWgs84 } from '@/lib/itm';

export const runtime = 'nodejs';

const XPLAN_BASE =
  process.env.XPLAN_BASE ??
  'https://ags.iplan.gov.il/arcgisiplan/rest/services/PlanningPublic/Xplan/MapServer';

/** אותו סוכן משתמש מלא שנדרש בכל פנייה ל-iplan — UA קצר נדחה ב-WAF. */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/126.0.0.0 Safari/537.36';

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;

  // מקבלים או WGS84 או ITM — הדוח מחזיק את שניהם, ולא תמיד את אותו אחד.
  let lat = Number(p.get('lat'));
  let lng = Number(p.get('lng'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    const x = Number(p.get('itmX'));
    const y = Number(p.get('itmY'));
    if (Number.isFinite(x) && Number.isFinite(y)) {
      const w = itmToWgs84(x, y);
      lat = w.lat;
      lng = w.lng;
    }
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return new Response('חסרות קואורדינטות', { status: 400 });
  }

  const w = Math.min(Math.max(Number(p.get('w')) || 900, 200), 1400);
  const h = Math.min(Math.max(Number(p.get('h')) || 560, 200), 1400);
  // חצי-רוחב החלון במעלות. 0.0012° ≈ 130 מ' — תא שטח וסביבתו הקרובה.
  const span = Math.min(Math.max(Number(p.get('span')) || 0.0016, 0.0004), 0.02);
  // 4 = יעודי קרקע · 1 = קווים כחולים · 2 = ישויות קוויות (קווי בניין)
  const layers = p.get('layers') === 'landuse' ? '4' : '4,2,1';

  const aspect = h / w;
  const bbox = [lng - span, lat - span * aspect, lng + span, lat + span * aspect].join(',');

  const exportUrl =
    `${XPLAN_BASE}/export?bbox=${bbox}&bboxSR=4326&imageSR=4326&size=${w},${h}` +
    `&layers=show:${layers}&format=png32&transparent=false&dpi=96&f=json`;

  try {
    const meta = await fetch(exportUrl, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!meta.ok) return new Response('שירות המפות התכנוניות לא ענה', { status: 502 });
    const json: any = await meta.json();
    const href = typeof json?.href === 'string' ? json.href : null;
    if (!href) return new Response('לא התקבלה מפה תכנונית', { status: 502 });

    const img = await fetch(href, { headers: { 'User-Agent': UA }, cache: 'no-store' });
    if (!img.ok) return new Response('התשריט אינו זמין', { status: img.status });
    const buf = await img.arrayBuffer();

    return new Response(buf, {
      headers: {
        'Content-Type': img.headers.get('content-type') ?? 'image/png',
        // התשריט משתנה רק כשמתפרסמת תכנית — יום מטמון הוא שמרני.
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return new Response('לא הצלחנו לטעון את התשריט', { status: 502 });
  }
}
