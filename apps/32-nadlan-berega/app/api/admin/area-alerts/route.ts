import { NextRequest, NextResponse } from 'next/server';
import { adminGate } from '@/lib/adminauth';
import { checkAllActiveAlerts, checkAreaAlert, listAreaAlerts } from '@/lib/areaalerts';
import { publicBaseUrl } from '@/lib/baseurl';
import { emailConfigured } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// בדיקת כל ההתראות הפעילות קוראת ל-GovMap כמה פעמים לכל אחת, ברצף.
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const gate = await adminGate(req);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  try {
    const alerts = await listAreaAlerts();
    return NextResponse.json({ alerts, emailConfigured: emailConfigured() });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'שגיאה בקריאת ההתראות' }, { status: 500 });
  }
}

/**
 * הפעלה ידנית של הבדיקה — התאמת עסקאות חדשות + שליחת מייל למי שיש לו מה חדש.
 * מאז 20/08 יש גם הפעלה אוטומטית יומית (`app/api/cron/area-alerts/route.ts`,
 * מתוזמן ב-`vercel.json`) שמריצה בדיוק את אותו מנוע — זה נשאר כפתור "בדוק
 * עכשיו" לבדיקה מיידית בין ריצות התזמון.
 */
export async function POST(req: NextRequest) {
  const gate = await adminGate(req);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'גוף בקשה לא תקין' }, { status: 400 });
  }

  const baseUrl = publicBaseUrl(req);

  try {
    if (body?.action === 'check-all') {
      const results = await checkAllActiveAlerts(baseUrl);
      return NextResponse.json({ results });
    }

    const id = Number(body?.id);
    if (!Number.isFinite(id)) return NextResponse.json({ error: 'חסר מזהה התראה' }, { status: 400 });

    const alerts = await listAreaAlerts();
    const alert = alerts.find((a) => a.id === id);
    if (!alert) return NextResponse.json({ error: 'התראה לא נמצאה' }, { status: 404 });

    const result = await checkAreaAlert(alert, baseUrl);
    return NextResponse.json({ result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'שגיאה בבדיקת ההתראות' }, { status: 500 });
  }
}
