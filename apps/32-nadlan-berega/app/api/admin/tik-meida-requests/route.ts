// לוח בקשות תיק המידע להיתר — GET לרשימה, POST לסימון "נשלח לוועדה המקומית".
// אותו דפוס מדויק כמו app/api/admin/tabu-requests.

import { NextRequest, NextResponse } from 'next/server';
import { adminGate } from '@/lib/adminauth';
import {
  attachFulfilledTikMeidaDocumentNames,
  listTikMeidaRequests,
  markTikMeidaRequestSent,
  pendingTikMeidaRequestCount,
  type TikMeidaRequestStatus,
} from '@/lib/requests';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STATUSES: TikMeidaRequestStatus[] = ['pending', 'sent', 'fulfilled', 'failed'];

export async function GET(req: NextRequest) {
  const gate = await adminGate(req);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const statusParam = req.nextUrl.searchParams.get('status');
  const status = STATUSES.includes(statusParam as TikMeidaRequestStatus)
    ? (statusParam as TikMeidaRequestStatus)
    : undefined;

  try {
    const [rows, pending] = await Promise.all([
      listTikMeidaRequests({ status, limit: 200 }),
      pendingTikMeidaRequestCount(),
    ]);
    const requests = await attachFulfilledTikMeidaDocumentNames(rows);
    return NextResponse.json({ requests, pending });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'שגיאה בקריאת בקשות תיק המידע' }, { status: 500 });
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
    const row = await markTikMeidaRequestSent(id, 'admin');
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
