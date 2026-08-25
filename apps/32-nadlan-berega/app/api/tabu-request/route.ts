// בקשת נסח טאבו מתוך דוח VIP — §1-2 של "TABU workflow" (core.projects #33,
// build_tasks id=4/11): checkbox+grade → משימת ניהול + מייל(גוש/חלקה).
//
// ⚠️ הכתיבה עוברת דרך `createTabuRequest` (anon key, INSERT בלבד ב-RLS) —
// אותו דפוס הגנה-כפולה כמו `createReportRequest`. שליחת מייל ההתראה לצוות
// היא best-effort: כישלון שליחה **לא** מפיל את הבקשה עצמה (היא כבר נשמרה
// ותופיע בלוח הניהול), רק מתועד ב-`admin_email_error` כדי שהניהול יראה בקשה
// "תקועה" בלי מייל, ולא בקשה סתומה.

import { NextRequest, NextResponse } from 'next/server';
import { emailConfigured, sendEmail } from '@/lib/email';
import { env } from '@/lib/env';
import {
  createTabuRequest,
  looksLikeEmail,
  recordTabuRequestEmailResult,
  type TabuRequestGrade,
} from '@/lib/requests';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const GRADE_LABEL: Record<TabuRequestGrade, string> = { normal: 'רגילה', urgent: 'דחופה' };

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function adminEmailHtml(input: {
  gush: string;
  helka: string;
  tatHelka: string | null;
  entrance: string | null;
  apartment: string | null;
  address: string | null;
  city: string | null;
  grade: TabuRequestGrade;
  requesterName: string | null;
  requesterEmail: string;
  requesterPhone: string | null;
  notes: string | null;
}): string {
  const rows: [string, string | null][] = [
    ['גוש / חלקה', `${input.gush} / ${input.helka}`],
    ['תת-חלקה', input.tatHelka],
    ['כניסה', input.entrance],
    ['דירה', input.apartment],
    ['כתובת', [input.address, input.city].filter(Boolean).join(', ') || null],
    ['עדיפות', GRADE_LABEL[input.grade]],
    ['שם הלקוח', input.requesterName],
    ['מייל הלקוח', input.requesterEmail],
    ['טלפון הלקוח', input.requesterPhone],
    ['הערות', input.notes],
  ];
  const tr = rows
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 10px;color:#64748b;font-size:13px">${esc(k)}</td>` +
        `<td style="padding:6px 10px;font-size:13px;font-weight:700">${esc(v as string)}</td></tr>`,
    )
    .join('');
  return `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:520px">
  <h2 style="margin:0 0 10px">בקשת נסח טאבו חדשה${input.grade === 'urgent' ? ' — דחוף' : ''}</h2>
  <p style="color:#475569;font-size:13px">לקוח ביקש הפקת נסח טאבו רשמי מתוך דוח VIP. יש להזמין ידנית באתר רשם המקרקעין, ואז לסמן את הבקשה כ"נשלחה" ולהעלות את הנסח בלוח הניהול.</p>
  <table style="border-collapse:collapse;width:100%">${tr}</table>
</div>`;
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'גוף הבקשה אינו JSON תקין.' }, { status: 400 });
  }

  const gush = String(body?.gush ?? '').trim();
  const helka = String(body?.helka ?? '').trim();
  const requesterEmail = String(body?.requesterEmail ?? '').trim();
  const gradeRaw = String(body?.grade ?? 'normal');
  const grade: TabuRequestGrade = gradeRaw === 'urgent' ? 'urgent' : 'normal';

  if (!gush || !helka) {
    return NextResponse.json({ error: 'נדרשים גוש וחלקה כדי לבקש נסח טאבו.' }, { status: 400 });
  }
  if (!looksLikeEmail(requesterEmail)) {
    return NextResponse.json({ error: 'כתובת המייל אינה תקינה.' }, { status: 400 });
  }

  const input = {
    gush,
    helka,
    tatHelka: body?.tatHelka ? String(body.tatHelka).trim() : null,
    entrance: body?.entrance ? String(body.entrance).trim() : null,
    apartment: body?.apartment ? String(body.apartment).trim() : null,
    address: body?.address ? String(body.address).trim() : null,
    city: body?.city ? String(body.city).trim() : null,
    assetType: body?.assetType ? String(body.assetType).trim() : null,
    grade,
    requesterName: body?.requesterName ? String(body.requesterName).trim().slice(0, 120) : null,
    requesterEmail,
    requesterPhone: body?.requesterPhone ? String(body.requesterPhone).trim().slice(0, 40) : null,
    notes: body?.notes ? String(body.notes).trim().slice(0, 500) : null,
  };

  try {
    await createTabuRequest(input);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'שמירת הבקשה נכשלה.' }, { status: 500 });
  }

  // המייל הוא best-effort: הבקשה כבר נשמרה ותופיע בלוח הניהול גם אם השליחה
  // נכשלת, בלי RESEND מוגדר, או בלי TABU_ADMIN_EMAIL מוגדר.
  const adminEmail = env('TABU_ADMIN_EMAIL');
  if (!adminEmail) {
    await recordTabuRequestEmailResult(
      requesterEmail,
      gush,
      helka,
      false,
      'TABU_ADMIN_EMAIL אינו מוגדר — הבקשה נשמרה אך לא נשלחה התראה.',
    );
  } else if (!emailConfigured()) {
    await recordTabuRequestEmailResult(
      requesterEmail,
      gush,
      helka,
      false,
      'RESEND_API_KEY/RESEND_FROM אינם מוגדרים — הבקשה נשמרה אך לא נשלחה התראה.',
    );
  } else {
    const sent = await sendEmail({
      to: adminEmail,
      subject: `בקשת נסח טאבו${grade === 'urgent' ? ' — דחוף' : ''} · גוש ${gush} חלקה ${helka}`,
      html: adminEmailHtml(input),
      replyTo: requesterEmail,
    });
    await recordTabuRequestEmailResult(requesterEmail, gush, helka, sent.ok, sent.error);
  }

  return NextResponse.json({ ok: true });
}
