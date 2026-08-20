// ==== התראות אזוריות — הפעלה אוטומטית (Vercel Cron) ====
//
// שלב ב (`lib/areaalerts.ts`) בנה את המנוע והפעלה ידנית מ-`/admin`
// (`app/api/admin/area-alerts/route.ts`), ובכוונה **בלי** תזמון — ראה
// NEEDS_USER.md, 20/08. זה המסלול האוטומטי: `vercel.json` (crons) קורא
// לכתובת הזו לפי לוח זמנים, וזה קורא לאותו מנוע בדיוק שהכפתור הידני מפעיל.
//
// ⚠️ הרשאה: Vercel שולח `Authorization: Bearer <CRON_SECRET>` בבקשות cron
// כשמוגדר משתנה סביבה בשם הזה (התבנית הרשמית של Vercel). בלי שהוא מוגדר —
// נעול, לא פתוח: מסלול ששולח מיילים ללקוחות לא ייפתח כברירת מחדל.
// CRON_SECRET צריך להתווסף ל-Variables של פרויקט ה-Vercel (ראה NEEDS_USER.md).

import { NextRequest, NextResponse } from 'next/server';
import { checkAllActiveAlerts } from '@/lib/areaalerts';
import { publicBaseUrl } from '@/lib/baseurl';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// בדיקת כל ההתראות הפעילות קוראת ל-GovMap כמה פעמים לכל אחת, ברצף — כמו הכפתור הידני.
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const secret = env('CRON_SECRET');
  const auth = req.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'אין הרשאה' }, { status: 401 });
  }

  try {
    const results = await checkAllActiveAlerts(publicBaseUrl(req));
    const emailed = results.filter((r) => r.emailed).length;
    const failed = results.filter((r) => !r.ok).length;
    return NextResponse.json({ ok: true, checked: results.length, emailed, failed, results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'שגיאה בבדיקת ההתראות' }, { status: 500 });
  }
}
