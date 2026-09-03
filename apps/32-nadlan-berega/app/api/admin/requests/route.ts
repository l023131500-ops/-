// ==== תור הבקשות בניהול: רשימה, הפקה ושליחה למייל ====
//
// זהו הצינור שהמפרט מתאר: בקשה → התראה בניהול → עיבוד → שליחה ב-Resend.
// ההפקה והשליחה הן פעולה אחת מכוונת: דוח שהופק ולא נשלח הוא עבודה שנשרפה,
// ודוח שנשלח בלי שהופק אינו קיים.

import { NextRequest, NextResponse } from 'next/server';
import { adminGate } from '@/lib/adminauth';
import { buildReport } from '@/lib/buildreport';
import { publicBaseUrl } from '@/lib/baseurl';
import { emailConfigured, sendEmail } from '@/lib/email';
import { reportEmailHtml, reportEmailText } from '@/lib/reporthtml';
import { propertyKeyOf, slugOf } from '@/lib/savedreports';
import { getStreetVideo } from '@/lib/store';
import {
  claimForProcessing,
  getReportRequest,
  listReportRequests,
  markFailed,
  markSent,
  pendingCount,
  resetToPending,
  tabuForProperty,
  tikMeidaForProperty,
  type RequestStatus,
} from '@/lib/requests';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// הפקת דוח מקיף לוקחת עשרות שניות, ואחריה שליחת מייל. 60 שניות נחתכו באמצע.
export const maxDuration = 300;

const STATUSES: RequestStatus[] = ['pending', 'processing', 'sent', 'failed'];

export async function GET(req: NextRequest) {
  const gate = await adminGate(req);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const statusParam = req.nextUrl.searchParams.get('status');
  const status = STATUSES.includes(statusParam as RequestStatus)
    ? (statusParam as RequestStatus)
    : undefined;

  try {
    const [requests, pending] = await Promise.all([
      listReportRequests({ status, limit: 200 }),
      pendingCount(),
    ]);
    return NextResponse.json({
      requests,
      pending,
      emailConfigured: emailConfigured(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'שגיאה בקריאת הבקשות' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const gate = await adminGate(req);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'גוף בקשה לא תקין' }, { status: 400 });
  }

  const id = Number(body?.id);
  const action = String(body?.action ?? 'process');
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'חסר מזהה בקשה' }, { status: 400 });

  if (action === 'retry') {
    try {
      await resetToPending(id);
      return NextResponse.json({ ok: true, status: 'pending' });
    } catch (e: any) {
      return NextResponse.json({ error: e?.message ?? 'שגיאה' }, { status: 500 });
    }
  }

  if (action !== 'process') {
    return NextResponse.json({ error: 'פעולה לא מוכרת' }, { status: 400 });
  }

  // ⚠️ בלי ספק מייל אין להתחיל: הפקה עולה כסף אמיתי (Places, Apify), ואם
  // בסופה אין דרך לשלוח — שרפנו את העלות והלקוח לא קיבל כלום.
  if (!emailConfigured()) {
    return NextResponse.json(
      {
        error:
          'שליחת מייל אינה מוגדרת (RESEND_API_KEY ו-RESEND_FROM). הבקשה לא עובדה, כדי לא לשרוף עלות הפקה בלי יכולת לשלוח.',
      },
      { status: 503 },
    );
  }

  const claimed = await claimForProcessing(id).catch(() => null);
  if (!claimed) {
    const current = await getReportRequest(id).catch(() => null);
    return NextResponse.json(
      {
        error: current
          ? `הבקשה אינה במצב "ממתין" אלא "${current.status}". אם היא נכשלה — אפשר להחזיר אותה לתור.`
          : 'הבקשה לא נמצאה.',
      },
      { status: 409 },
    );
  }

  try {
    const report = await buildReport(claimed.query, claimed.tier, {
      entrance: claimed.entrance,
      floor: claimed.floor,
      rooms: claimed.rooms,
    });

    // נסחי טאבו שהועלו ונותחו בניהול, משויכים לנכס לפי דירה/כניסה/בניין.
    const tabuDocs = await tabuForProperty({
      gush: report.title.gush,
      helka: report.building.registeredHelka ?? report.title.helka,
      tatHelka: report.unit?.tatHelka ?? null,
      entrance: claimed.entrance,
    }).catch(() => []);

    // תיקי מידע להיתר שהונפקו בניהול, משויכים לנכס ברמת גוש/חלקה.
    const tikMeidaDocs = await tikMeidaForProperty({
      gush: report.title.gush,
      helka: report.building.registeredHelka ?? report.title.helka,
    }).catch(() => []);

    // סיור-רחוב (build_tasks id=2) מקודד אצל צופה קודם באתר ונשמר תחת אותו
    // slug דטרמיניסטי (`slugOf`, לא דורש `saveReport`) — אם קליפ כבר קיים
    // לאותו נכס בדיוק, המייל מקבל אותו; אחרת הסעיף פשוט לא מופיע.
    const propertyKey = propertyKeyOf(report, { entrance: claimed.entrance });
    const slug = slugOf(report, propertyKey);
    const streetVideo = await getStreetVideo(slug).catch(() => null);

    const baseUrl = publicBaseUrl(req);
    const html = reportEmailHtml(report, {
      baseUrl,
      tabuDocs,
      tikMeidaDocs,
      customerName: claimed.full_name,
      streetVideoUrl: streetVideo?.url ?? null,
    });

    const sent = await sendEmail({
      to: claimed.email,
      subject: `דוח נדל"ן — ${report.title.headline}`,
      html,
      text: reportEmailText(report, { tabuDocs, tikMeidaDocs, streetVideoUrl: streetVideo?.url ?? null }),
    });

    if (!sent.ok) {
      await markFailed(id, sent.error ?? 'שליחת המייל נכשלה');
      return NextResponse.json({ error: sent.error, reportProduced: true }, { status: 502 });
    }

    await markSent(id, {
      providerId: sent.id,
      costUsd: report.costUsd,
      // תצלום הדוח שנשלח — כדי שאפשר יהיה לראות בדיוק מה הלקוח קיבל.
      snapshot: report,
    });

    return NextResponse.json({
      ok: true,
      status: 'sent',
      emailId: sent.id,
      costUsd: report.costUsd,
      headline: report.title.headline,
      tabuAttached: tabuDocs.length,
      tikMeidaAttached: tikMeidaDocs.length,
      warnings: report.warnings.length,
    });
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    await markFailed(id, msg);
    return NextResponse.json({ error: `הפקת הדוח נכשלה: ${msg}` }, { status: 500 });
  }
}
