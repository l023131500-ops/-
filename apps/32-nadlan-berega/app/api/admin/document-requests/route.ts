// לוח בקשות המסמכים הכלליות (RequestForm — נסח/רמ"י/היתר/אחר) — GET לרשימה,
// POST לסימון "נוצר קשר".

import { NextRequest, NextResponse } from 'next/server';
import { adminGate } from '@/lib/adminauth';
import {
  listDocumentRequests,
  markDocumentRequestContacted,
  pendingDocumentRequestCount,
  type DocumentRequestStatus,
} from '@/lib/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STATUSES: DocumentRequestStatus[] = ['new', 'contacted'];

export async function GET(req: NextRequest) {
  const gate = await adminGate(req);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const statusParam = req.nextUrl.searchParams.get('status');
  const status = STATUSES.includes(statusParam as DocumentRequestStatus)
    ? (statusParam as DocumentRequestStatus)
    : undefined;

  try {
    const [requests, pending] = await Promise.all([
      listDocumentRequests({ status, limit: 200 }),
      pendingDocumentRequestCount(),
    ]);
    return NextResponse.json({ requests, pending });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'שגיאה בקריאת בקשות המסמכים' }, { status: 500 });
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
  if (String(body?.action ?? '') !== 'mark_contacted') {
    return NextResponse.json({ error: 'פעולה לא מוכרת' }, { status: 400 });
  }

  try {
    const row = await markDocumentRequestContacted(id);
    if (!row) {
      return NextResponse.json(
        { error: 'הבקשה אינה קיימת או שכבר סומנה קודם.' },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: true, request: row });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'שגיאה' }, { status: 500 });
  }
}
