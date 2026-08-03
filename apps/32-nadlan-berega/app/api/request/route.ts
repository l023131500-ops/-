import { NextRequest, NextResponse } from 'next/server';
import { submitDocumentRequest, type DocRequest } from '@/lib/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED = ['tabu', 'rami', 'permit', 'other'];

export async function POST(req: NextRequest) {
  let body: DocRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'גוף בקשה לא תקין' }, { status: 400 });
  }
  if (!body.doc_type || !ALLOWED.includes(body.doc_type)) {
    return NextResponse.json({ error: 'סוג מסמך לא חוקי' }, { status: 400 });
  }
  if (!body.full_name || (!body.email && !body.phone)) {
    return NextResponse.json({ error: 'נדרש שם + דרך התקשרות (אימייל או טלפון)' }, { status: 400 });
  }
  try {
    await submitDocumentRequest({
      doc_type: body.doc_type,
      gush: body.gush ?? null,
      helka: body.helka ?? null,
      tat_helka: body.tat_helka ?? null,
      address: body.address ?? null,
      full_name: body.full_name ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      notes: body.notes ?? null,
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'שגיאה בשמירת הבקשה' }, { status: 500 });
  }
}
