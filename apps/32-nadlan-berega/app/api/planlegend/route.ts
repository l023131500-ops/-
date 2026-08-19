// ==== מקרא לתשריט המוטמע ====
//
// התשריט שמוחזר מ-`/api/planmap` הוא תמונה צבעונית בלי מקרא, ובלי מקרא צבע
// אינו אומר דבר. שירות המפות של מינהל התכנון חושף `legend?f=json` פתוח, ובו
// לכל ערך ייעוד יש תווית ו**דגימת צבע** כתמונת PNG בבסיס-64.
//
// השירות מחזיר 201 ערכים לשכבת ייעודי הקרקע לבדה. לכן הבקשה כאן מקבלת את
// התוויות שהדוח באמת מציג ומחזירה רק אותן — במקום להעביר ללקוח מקרא ארצי
// שרובו אינו נוגע לחלקה שלו.

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const XPLAN_BASE =
  process.env.XPLAN_BASE ??
  'https://ags.iplan.gov.il/arcgisiplan/rest/services/PlanningPublic/Xplan/MapServer';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/126.0.0.0 Safari/537.36';

const norm = (s: string) => (s ?? '').replace(/["'`״׳]/g, '').replace(/\s+/g, ' ').trim();

export async function GET(req: NextRequest) {
  const wanted = (req.nextUrl.searchParams.get('labels') ?? '')
    .split('|')
    .map(norm)
    .filter(Boolean);
  if (!wanted.length) return NextResponse.json({ items: [] });

  try {
    const res = await fetch(`${XPLAN_BASE}/legend?f=json`, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return NextResponse.json({ items: [], error: 'legend unavailable' });
    const json: any = await res.json();

    const items: { label: string; image: string }[] = [];
    const seen = new Set<string>();
    for (const layer of json?.layers ?? []) {
      // 4 = ייעודי קרקע · 2 = ישויות קוויות (קווי בניין) — שתי השכבות שמוצגות.
      if (layer?.layerId !== 4 && layer?.layerId !== 2) continue;
      for (const entry of layer?.legend ?? []) {
        const label = norm(String(entry?.label ?? ''));
        if (!label || seen.has(label)) continue;
        if (!wanted.some((w) => w === label || w.includes(label) || label.includes(w))) continue;
        seen.add(label);
        items.push({
          label,
          image: `data:${entry?.contentType ?? 'image/png'};base64,${entry?.imageData ?? ''}`,
        });
      }
    }
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [], error: 'legend unavailable' });
  }
}
