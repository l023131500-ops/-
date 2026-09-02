// §8/build_tasks id=7 · יומן-ביקורת מלא לנכס בודד — כל הפקה וכל הורדה, לא רק
// מונה מצטבר. נטען בעצלנות (לחיצה על שורה ב-SavedReportsBoard), לא בכל
// טעינת הלוח — הלוח הראשי כבר מציג את כל הנכסים, הפירוט הזה הוא ברמת-נכס.
//
// ⚠️ עובר את אותו שער כמו שאר מסלולי הניהול, ולאותה סיבה בדיוק: חושף מה כל
// לקוח בדק.

import { NextRequest, NextResponse } from 'next/server';
import { adminGate } from '@/lib/adminauth';
import { listVersionsBySlug } from '@/lib/savedreports';
import { listExportsBySlug } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const gate = await adminGate(req);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const slug = req.nextUrl.searchParams.get('slug')?.trim();
  if (!slug) return NextResponse.json({ error: 'חסר slug.' }, { status: 400 });

  const [versions, exports] = await Promise.all([listVersionsBySlug(slug), listExportsBySlug(slug)]);
  return NextResponse.json({ versions, exports });
}
