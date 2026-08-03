// נסח טאבו לפי דרישה.
//
// GET  — מה אפשר להזמין, באיזו עלות, ובאיזה מצב פועל המתאם.
// POST — הזמנה. ⚠️ מבצעת חיוב אמיתי רק עם `confirmed: true`; בלעדיו מוחזר
//        `awaiting_confirmation` ואין שום פנייה לספק.

import { NextRequest, NextResponse } from 'next/server';
import { orderTabu, tabuOrderInfo, TABU_DOCS, type TabuDocType } from '@/lib/tabu';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(tabuOrderInfo());
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'גוף הבקשה אינו JSON תקין.' }, { status: 400 });
  }

  const docType = String(body?.docType ?? 'regular') as TabuDocType;
  if (!TABU_DOCS[docType]) {
    return NextResponse.json({ error: 'סוג נסח לא מוכר.' }, { status: 400 });
  }

  const result = await orderTabu({
    gush: String(body?.gush ?? '').trim(),
    helka: String(body?.helka ?? '').trim(),
    tatHelka: body?.tatHelka ? String(body.tatHelka).trim() : null,
    docType,
    confirmed: body?.confirmed === true,
  });

  const status = result.status === 'failed' ? 502 : 200;
  return NextResponse.json(result, { status });
}
