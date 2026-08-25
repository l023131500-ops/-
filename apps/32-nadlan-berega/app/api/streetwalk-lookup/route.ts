// "סיור רחוב" חינמי לפי כתובת/גוש-חלקה — ללא דוח מלא וללא מקור בתשלום.
//
// נצרך מ-system 36 (nadlan-pro): אותו רעיון בדיוק כמו /api/panorama-lookup
// (ראה שם), רק מחזיר את נקודות "סיור הרחוב" (lib/panoramalookup.ts,
// lookupStreetWalk) במקום נקודת פנורמה בודדת. עדיין בלי שום קריאה בתשלום —
// רק בדיקות מטא-דאטה חינמיות; התמונות עצמן נטענות אח"כ דרך /api/image הקיים.

import { NextRequest, NextResponse } from 'next/server';
import { lookupStreetWalk } from '@/lib/panoramalookup';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q) {
    return NextResponse.json({ available: false, error: 'לא הוזנה כתובת או גוש/חלקה.' }, { status: 400 });
  }
  try {
    const result = await lookupStreetWalk(q);
    if (!result) return NextResponse.json({ available: false });
    return NextResponse.json({ available: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ available: false, error: e?.message ?? 'שגיאה לא צפויה' }, { status: 500 });
  }
}
