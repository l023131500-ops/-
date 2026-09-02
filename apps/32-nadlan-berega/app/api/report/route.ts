import { NextRequest, NextResponse } from 'next/server';
import { buildReport } from '@/lib/buildreport';
import { logReportSources } from '@/lib/sourcelog';
import { adminGate } from '@/lib/adminauth';
import { saveReport, fastParcelKey, readFreshByParcelKey } from '@/lib/savedreports';
import type { ReportTier } from '@/lib/report';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// דוח מקיף/VIP מושך עסקאות, מודעות (Apify) ומרחקי הליכה — 120 שניות נחתכו
// באמצע בהרצה חיה. 300 הוא המקסימום שהחשבון מאפשר.
export const maxDuration = 300;

const TIERS: ReportTier[] = ['basic', 'premium', 'vip'];

// QA/nadlan.md §המלצות #5: "כל רינדור בונה מחדש כולל הקריאות בתשלום". חלון
// קצר שבו הפקה חוזרת לאותו גוש/חלקה ולאותה רמה בדיוק מוגשת מהאחסון במקום
// לשלם שוב על אותם מקורות — ראה `fastParcelKey`/`readFreshByParcelKey`.
const PARCEL_CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  const tierParam = req.nextUrl.searchParams.get('tier') as ReportTier | null;
  const tier: ReportTier = tierParam && TIERS.includes(tierParam) ? tierParam : 'basic';

  if (!q) {
    return NextResponse.json({ error: 'לא הוזנה כתובת או גוש/חלקה.' }, { status: 400 });
  }

  // שדות רשות — נשלחים רק אם הוזנו.
  const sp = req.nextUrl.searchParams;
  const input = {
    entrance: sp.get('entrance')?.trim() || null,
    floor: sp.get('floor')?.trim() || null,
    rooms: sp.get('rooms')?.trim() || null,
    // §1 במפרט — שדות מובנים. תת-חלקה ומספר דירה מזהים את הנכס בתוך הבניין.
    tatHelka: sp.get('tatHelka')?.trim() || null,
    apartment: sp.get('apartment')?.trim() || null,
    // משמש רק את `/api/deck` — ראה ההסבר ב-PropertyInput.
    skipListings: sp.get('skipListings') === '1',
    // מגורים / שכירות / מסחרי / קרקע. ערך לא מוכר נופל למגורים במנוע עצמו.
    assetType: sp.get('type')?.trim() || null,
  };

  // §8 · המלצה 5 — רק על מסלול גוש/חלקה (הזהות הזמינה בלי גיאוקוד), רק
  // כשהתאמת רמה מדויקת, ורק כשלא התבקש רענון מפורש. `sources=1` (מרכז
  // השליטה) גם מדלג על המטמון — הוא צריך את לוג המקורות של הפקה אמיתית,
  // לא עותק שמור בלי לוג. כל כשל כאן (DB לא מוגדר, שגיאת רשת) נבלע ונופל
  // למסלול הרגיל — זו רק קיצור-דרך, לא תלות.
  if (sp.get('refresh') !== '1' && sp.get('sources') !== '1') {
    const parcelKey = fastParcelKey(q, input.assetType, input);
    if (parcelKey) {
      const cached = await readFreshByParcelKey(parcelKey, tier, PARCEL_CACHE_MAX_AGE_MS).catch(() => null);
      if (cached) {
        return NextResponse.json({
          ...cached.report,
          permalink: cached.slug,
          cached: true,
          cachedAt: cached.updatedAt,
        });
      }
    }
  }

  try {
    const report = await buildReport(q, tier, input);

    // §8 · כל דוח שהופק נשמר, ומקבל קישור קבוע לנכס. השמירה נעשית לפני
    // ההחזרה כי ה-slug נכנס לתשובה — אבל היא best-effort ואינה יכולה להפיל
    // את הדוח: `saveReport` בולע כל שגיאת אחסון ומחזיר את הקישור בכל מקרה.
    const permalink = await saveReport(report, {
      tatHelka: input.tatHelka,
      entrance: input.entrance,
      floor: input.floor,
      apartment: input.apartment,
    }).catch(() => null);

    // המקורות יורדים מהמסך ועולים ללוג — ראה `lib/sourcelog.ts`.
    // מרכז השליטה מקבל אותם עם `?sources=1`; הלקוח לא.
    const log = logReportSources(report);
    if (sp.get('sources') === '1' && (await adminGate(req)).ok) {
      return NextResponse.json({ ...report, permalink, sourceLog: log });
    }
    return NextResponse.json({ ...report, permalink });
  } catch (e: any) {
    return NextResponse.json(
      { error: 'לא הצלחנו להפיק את הדוח כרגע.', detail: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}
