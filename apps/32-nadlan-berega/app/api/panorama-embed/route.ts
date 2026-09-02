// פרוקסי-הפניה לפנורמת Street View אינטראקטיבית (Google Maps Embed API).
//
// ⚠️ חריג מודע לכלל "המפתח לעולם לא מגיע לדפדפן" שמתועד ב-/api/image: Embed
// API היא תצוגה חיה שגוגל חייבת להגיש ישירות לדפדפן בתוך <iframe> — אי אפשר
// לפרוקסי אותה כמו תמונה סטטית, כי מדובר בממשק אינטראקטיבי (סיבוב/זום) עם
// חיבור מתמשך אל גוגל, לא בקובץ בודד שאפשר למשוך בשרת ולהעביר הלאה.
//
// הפתרון הקרוב ביותר לעיקרון הקיים: 302 מהשרת אל כתובת ה-embed עם המפתח,
// כך שהמפתח לא מופיע בקוד המקור/בחבילת ה-JS שלנו בכלל — רק בתגובת ההפניה
// עצמה (נראה ב-DevTools Network, לא בצפייה רגילה בדף). בנוסף, Maps Embed API
// אינה מחויבת בתשלום לפי שימוש (בשונה מ-Street View Static API שבה המפתח
// נשאר צד-שרת לגמרי) — כלומר גם אם הכתובת נחשפת, אין חשיפת חיוב. מומלץ עדיין
// להגביל את המפתח ב-Cloud Console ל-HTTP referrer של הדומיין החי.

import { NextRequest } from 'next/server';
import { env } from '@/lib/env';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const key = env('GOOGLE_MAPS_API_KEY');
  if (!key) return new Response('שירות המפות אינו מחובר', { status: 503 });

  const p = req.nextUrl.searchParams;
  const lat = Number(p.get('lat'));
  const lng = Number(p.get('lng'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return new Response('חסרות קואורדינטות', { status: 400 });
  }

  // בלי heading/pitch קבועים: זו בדיוק הנקודה של "אינטראקטיבי" — המשתמש
  // גורר ומסתובב בעצמו, ולכן אין צורך בחישוב הכיוון-אל-הבניין שמשמש את
  // צילום הרחוב הסטטי הקבוע (streetViewShot ב-lib/googlemaps.ts).
  const url =
    'https://www.google.com/maps/embed/v1/streetview' +
    `?key=${encodeURIComponent(key)}&location=${lat},${lng}` +
    '&heading=0&pitch=0&fov=90&language=he&region=IL';

  return Response.redirect(url, 302);
}
