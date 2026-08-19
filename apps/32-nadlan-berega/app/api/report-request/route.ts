// בקשת דוח מהציבור. הדוח נשלח למייל שמזינים — זה מודל האספקה של המערכת.
import { NextRequest, NextResponse } from 'next/server';
import { createReportRequest, looksLikeEmail } from '@/lib/requests';
import type { ReportTier } from '@/lib/report';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TIERS: ReportTier[] = ['basic', 'premium', 'vip'];

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'גוף בקשה לא תקין' }, { status: 400 });
  }

  const query = String(body?.query ?? '').trim();
  const email = String(body?.email ?? '').trim();

  if (!query) {
    return NextResponse.json({ error: 'נדרשת כתובת או גוש וחלקה.' }, { status: 400 });
  }
  if (!looksLikeEmail(email)) {
    return NextResponse.json(
      { error: 'נדרשת כתובת מייל תקינה — הדוח נשלח אליה.' },
      { status: 400 },
    );
  }

  const tier: ReportTier = TIERS.includes(body?.tier) ? body.tier : 'premium';

  // ⚠️ חיתוך אורך על כל שדה טקסט. הטופס ציבורי, ואין סיבה שערך יחיד יגיע
  // באורך שרירותי למסד.
  const cut = (v: unknown, n: number) => {
    const s = String(v ?? '').trim();
    return s ? s.slice(0, n) : null;
  };

  try {
    await createReportRequest({
      query: query.slice(0, 300),
      email,
      fullName: cut(body?.full_name ?? body?.fullName, 120),
      phone: cut(body?.phone, 40),
      tier,
      entrance: cut(body?.entrance, 20),
      floor: cut(body?.floor, 20),
      rooms: cut(body?.rooms, 20),
      notes: cut(body?.notes, 1000),
    });
    return NextResponse.json({
      ok: true,
      message: 'הבקשה נרשמה. הדוח יישלח לכתובת המייל שהזנת.',
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? 'לא הצלחנו לשמור את הבקשה.' },
      { status: 500 },
    );
  }
}
