// ==== כתובת הבסיס הציבורית ====
//
// נשלף מ-PUBLIC_BASE_URL כשמוגדר (המקור המהימן ביותר — לא תלוי בכותרות
// בקשה), ואם לא — נבנה מכותרות ה-host/proto + NEXT_PUBLIC_BASE_PATH. משמש
// לקישורים בתוך מיילים/ייצוא PDF, כולל קריאות מ-Vercel Cron שאין להן
// כותרות דפדפן אמיתיות.

import type { NextRequest } from 'next/server';

export function publicBaseUrl(req: NextRequest): string {
  const explicit = process.env.PUBLIC_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '';
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  return `${proto}://${host}${basePath}`.replace(/\/+$/, '');
}
