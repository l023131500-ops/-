// ==== רענון מטמון נקודות העניין (POI) מ-data.gov.il ====
// נקודת קצה תפעולית, לא ציבורית. מוגנת ב-POI_REFRESH_TOKEN:
// אם המשתנה לא מוגדר — המסלול לא קיים כלל (404), כך שאין משטח תקיפה בפריסה רגילה.

import { NextResponse } from 'next/server';
import { ingestConfiguredPoi } from '@/lib/poiIngest';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const expected = process.env.POI_REFRESH_TOKEN;
  if (!expected) return new NextResponse('Not Found', { status: 404 });
  if (req.headers.get('x-poi-token') !== expected) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const url = new URL(req.url);
  const categories = (url.searchParams.get('categories') ?? 'education_gis')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    const results = await ingestConfiguredPoi(categories);
    const failed = results.some((r) => r.error);
    return NextResponse.json({ ok: !failed, results }, { status: failed ? 502 : 200 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'ingest failed' },
      { status: 500 },
    );
  }
}
