import { NextRequest, NextResponse } from 'next/server';
import { composeReport } from '@/lib/agent';
import type { PropertyProfile } from '@/lib/types';
import { apiUrl } from '@/lib/basepath';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// איסוף הפרופיל + ניסוח AI חורגים בקלות מ-60 שניות, וברירת המחדל הורגת
// את הפונקציה באמצע עם FUNCTION_INVOCATION_TIMEOUT.
export const maxDuration = 300;

// סוכן ה-AI: אוסף את פרופיל הנכס (בזמן אמת) ומרכיב דוח מנוסח.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q) return NextResponse.json({ error: 'חסר פרמטר חיפוש (q)' }, { status: 400 });

  // שולף את הפרופיל המלא דרך נתיב הפרופיל (אותו מקור אמת).
  let profile: PropertyProfile;
  try {
    const url = `${req.nextUrl.origin}${apiUrl(`/api/profile?q=${encodeURIComponent(q)}`)}`;
    const res = await fetch(url, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`profile HTTP ${res.status}`);
    profile = await res.json();
  } catch (e: any) {
    return NextResponse.json({ error: `שגיאה באיסוף הנתונים: ${e?.message ?? e}` }, { status: 502 });
  }

  const report = await composeReport(profile);
  return NextResponse.json({ q, report, warnings: profile.warnings });
}
