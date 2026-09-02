// פנורמה חינמית לפי כתובת/גוש-חלקה — ללא דוח מלא וללא מקור בתשלום.
//
// נצרך מ-system 36 (nadlan-pro): המשרד רוצה פנורמה 360° לכל נכס במלאי בלי
// לשלם על דוח VIP מלא (Apify/Places/Distance Matrix) רק כדי לקבל תמונת רחוב.
// ראה lib/panoramalookup.ts להסבר המלא.

import { NextRequest, NextResponse } from 'next/server';
import { lookupPanorama } from '@/lib/panoramalookup';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q) {
    return NextResponse.json({ available: false, error: 'לא הוזנה כתובת או גוש/חלקה.' }, { status: 400 });
  }
  try {
    const result = await lookupPanorama(q);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ available: false, error: e?.message ?? 'שגיאה לא צפויה' }, { status: 500 });
  }
}
