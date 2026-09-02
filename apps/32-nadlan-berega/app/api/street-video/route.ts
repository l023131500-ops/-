// "סיור רחוב" כווידאו — build_tasks id=2 (core.projects #33, P2 FEATURE item 2).
//
// אין ffmpeg/binary בסביבת הבנייה הזו (וגם ב-Vercel serverless זה לא נתיב
// פשוט) — לכן הקידוד עצמו קורה בדפדפן הצופה (StreetWalkPanel.tsx,
// canvas.captureStream()+MediaRecorder), והמסלול הזה הוא רק שכבת המטמון:
// GET בודק אם כבר קיים קליפ לנכס (`slug` = permalink הקבוע, ראה
// lib/savedreports.ts), ו-POST מקבל קליפ שהופק ומעלה אותו פעם אחת כדי שכל
// צופה הבא לא יצטרך להקליט מחדש.
//
// ⚠️ ציבורי בכוונה (בלי adminGate) — כל צופה VIP יכול ליזום הפקה, בדיוק כמו
// tabu-request/area-alert. ההגנה היחידה הדרושה: `slug` חייב להתאים לדוח
// שמור אמיתי (savedReportExists), כדי לא לקבל קליפים שרירותיים תחת מזהה מומצא.

import { NextRequest, NextResponse } from 'next/server';
import { getStreetVideo, saveStreetVideo } from '@/lib/store';
import { savedReportExists } from '@/lib/savedreports';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_MIME = ['video/webm', 'video/mp4'];
const MAX_BYTES = 15 * 1024 * 1024;
// אותו תבנית slug כמו slugOf ב-lib/savedreports.ts: קידומת קריאה (יכולה לכלול
// עברית — נכס בלי גוש/חלקה נופל לכתובת מנורמלת, ראה שם) + מקף + טביעת-אצבע
// base64url. תו עברי נדחה כאן ⇒ בקשות וידאו לנכסים בלי גוש/חלקה (כתובת חופשית
// בלבד) היו נכשלות תמיד — נבדק מול פלט אמיתי של slugOf לפני הקביעה הזו.
const SLUG_RE = /^[֐-׿a-zA-Z0-9_-]{3,80}$/;

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')?.trim() ?? '';
  if (!SLUG_RE.test(slug)) return NextResponse.json({ available: false });
  try {
    const cached = await getStreetVideo(slug);
    if (!cached) return NextResponse.json({ available: false });
    return NextResponse.json({ available: true, url: cached.url, mimeType: cached.mimeType });
  } catch {
    return NextResponse.json({ available: false });
  }
}

/** קליטת קליפ שהופק בדפדפן — multipart/form-data עם `slug`, `frameCount`, `file`. */
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'נדרש multipart/form-data עם שדה file' }, { status: 400 });
  }

  const slug = String(form.get('slug') ?? '').trim();
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ error: 'מזהה נכס לא תקין.' }, { status: 400 });
  }

  const exists = await savedReportExists(slug).catch(() => false);
  if (!exists) {
    return NextResponse.json({ error: 'לא נמצא דוח שמור לנכס הזה.' }, { status: 404 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'לא נשלח קובץ.' }, { status: 400 });
  }
  // MediaRecorder נושא קודק בתוך ה-type ("video/webm;codecs=vp9") — גם
  // ההשוואה כאן וגם ה-contentType שמועבר לאחסון (שם allowed_mime_types
  // בבאקט תואם בדיוק לרשימה הזו) צריכים את הסוג הבסיסי בלבד, אחרת קליפ
  // תקין נדחה תמיד.
  const baseMime = file.type.split(';')[0].trim();
  if (!ALLOWED_MIME.includes(baseMime)) {
    return NextResponse.json(
      { error: `סוג קובץ לא נתמך (${file.type || 'לא ידוע'}). נתמכים: WebM, MP4.` },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'הסרטון גדול מ-15MB.' }, { status: 400 });
  }

  const frameCount = Number(form.get('frameCount'));
  if (!Number.isFinite(frameCount) || frameCount < 2 || frameCount > 10) {
    return NextResponse.json({ error: 'מספר מסגרות לא תקין.' }, { status: 400 });
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const saved = await saveStreetVideo(slug, bytes, baseMime, frameCount);
    return NextResponse.json({ ok: true, url: saved.url, mimeType: saved.mimeType });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'שמירת הסרטון נכשלה.' }, { status: 500 });
  }
}
