// לוח בקשות נסח הטאבו — GET לרשימה, POST לסימון "נשלח לרשם המקרקעין".

import { NextRequest, NextResponse } from 'next/server';
import { adminGate } from '@/lib/adminauth';
import { listTabuRequests, markTabuRequestSent, pendingTabuRequestCount, type TabuRequestStatus } from '@/lib/requests';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STATUSES: TabuRequestStatus[] = ['pending', 'sent', 'fulfilled', 'failed'];

export async function GET(req: NextRequest) {
  const gate = await adminGate(req);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const statusParam = req.nextUrl.searchParams.get('status');
  const status = STATUSES.includes(statusParam as TabuRequestStatus)
    ? (statusParam as TabuRequestStatus)
    : undefined;

  try {
    const [requests, pending] = await Promise.all([
      listTabuRequests({ status, limit: 200 }),
      pendingTabuRequestCount(),
    ]);
    return NextResponse.json({ requests, pending });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'שגיאה בקריאת בקשות הנסח' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const gate = await adminGate(req);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'גוף בקשה לא תקין' }, { status: 400 });
  }

  const id = Number(body?.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'חסר מזהה בקשה' }, { status: 400 });
  if (String(body?.action ?? '') !== 'mark_sent') {
    return NextResponse.json({ error: 'פעולה לא מוכרת' }, { status: 400 });
  }

  try {
    const row = await markTabuRequestSent(id, 'admin');
    if (!row) {
      return NextResponse.json(
        { error: 'הבקשה אינה קיימת או שכבר סומנה כנשלחה קודם.' },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: true, request: row });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'שגיאה' }, { status: 500 });
  }
}
