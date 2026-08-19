// §8 · רשימת כל הדוחות השמורים — למרכז השליטה בלבד.
//
// ⚠️ עובר את אותו שער כמו שאר מסלולי הניהול. הרשימה מכילה את כל הנכסים
// שנבדקו אי פעם, ולכן פתיחתה לציבור הייתה חושפת מה כל לקוח בדק.

import { NextRequest, NextResponse } from 'next/server';
import { adminGate } from '@/lib/adminauth';
import { listSaved } from '@/lib/savedreports';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const gate = await adminGate(req);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get('limit')) || 200, 1), 500);
  const reports = await listSaved(limit);
  return NextResponse.json({ reports });
}
