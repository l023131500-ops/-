// החלפת סשן: JWT של הפלטפורמה → עוגיית ניהול חתומה.
//
// למה זה נחוץ בכלל: דף `/admin` הוא server component, והסשן המשותף של more30
// יושב ב-localStorage של הדפדפן — שהשרת לא רואה. בלי מסלול כזה, בעל
// הפלטפורמה היה מחובר לכל המערכות ובכל זאת נתקל במסך "אזור מוגן" שדורש
// ממנו טוקן ידני.
//
// מה שנשמר בעוגייה הוא חתימה עם תפוגה בלבד — לא זהות, לא הרשאה, ולא הטוקן.
// ההרשאה עצמה נבדקת כאן, מול ההאב, בכל החלפה.

import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE, isMore30Admin, signAdminCookie } from '@/lib/adminauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const jwt = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ?? '';
  if (!jwt) {
    return NextResponse.json({ ok: false, error: 'חסר טוקן התחברות.' }, { status: 401 });
  }
  if (!(await isMore30Admin(jwt))) {
    return NextResponse.json({ ok: false, error: 'החשבון הזה אינו מנהל של המערכת.' }, { status: 403 });
  }

  const value = signAdminCookie();
  if (!value) {
    return NextResponse.json(
      { ok: false, error: 'לא ניתן לחתום על סשן ניהול — חסר סוד שרת בפריסה.' },
      { status: 503 },
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, value, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 });
  return res;
}
