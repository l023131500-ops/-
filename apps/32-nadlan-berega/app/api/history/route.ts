// build_tasks id=6 חלק (c) · "ההיסטוריה שלי" — נתונים מאחורי הכניסה הקיימת.
//
// לא נוגע בנתיב הציבורי (/report, /p/[slug]) בשום צורה — זהו מסלול חדש
// לגמרי. כל בקשה מאומתת מול Supabase Auth (`callerFromRequest`) לפני כל
// קריאה/כתיבה; משתמש לא-מחובר מקבל 401, לא רשימה ריקה, כדי שהמסך יידע
// להציג "התחברות" ולא "אין היסטוריה".

import { NextRequest, NextResponse } from 'next/server';
import { callerFromRequest } from '@/lib/requireuser';
import { recordView, listHistory } from '@/lib/reporthistory';
import { savedReportExists } from '@/lib/savedreports';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// אותה תבנית בדיוק כמו SLUG_RE ב-app/api/street-video/route.ts — כולל טווח
// היוניקוד העברי, כי slugOf מייצר slugs עם עברית לנכס בלי גוש/חלקה.
const SLUG_RE = /^[֐-׿a-zA-Z0-9_-]{3,80}$/;

export async function GET(req: NextRequest) {
  const caller = await callerFromRequest(req);
  if (!caller) return NextResponse.json({ error: 'נדרשת התחברות.' }, { status: 401 });
  const items = await listHistory(caller.id);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const caller = await callerFromRequest(req);
  if (!caller) return NextResponse.json({ error: 'נדרשת התחברות.' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const slug = String(body?.slug ?? '').trim();
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ error: 'מזהה דוח לא תקין.' }, { status: 400 });
  }
  const exists = await savedReportExists(slug).catch(() => false);
  if (!exists) {
    return NextResponse.json({ error: 'לא נמצא דוח שמור לנכס הזה.' }, { status: 404 });
  }
  await recordView(caller.id, slug);
  return NextResponse.json({ ok: true });
}
