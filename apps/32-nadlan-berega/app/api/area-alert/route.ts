import { NextRequest, NextResponse } from 'next/server';
import { submitAreaAlert, type AreaAlert } from '@/lib/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let body: AreaAlert;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'גוף בקשה לא תקין' }, { status: 400 });
  }
  if (!body.email || !EMAIL_RE.test(body.email)) {
    return NextResponse.json({ error: 'נדרש אימייל תקין' }, { status: 400 });
  }
  try {
    await submitAreaAlert({
      email: body.email,
      address: body.address ?? null,
      gush: body.gush ?? null,
      helka: body.helka ?? null,
      city: body.city ?? null,
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'שגיאה בשמירת ההרשמה' }, { status: 500 });
  }
}
