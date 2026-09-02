// בקשת תיק מידע להיתר מתוך דוח VIP — build_tasks id=5: checkbox+grade →
// משימת ניהול + מייל(גוש/חלקה). אותו דפוס מדויק כמו `app/api/tabu-request`.
//
// ⚠️ הכתיבה עוברת דרך `createTikMeidaRequest` (anon key, INSERT בלבד ב-RLS).
// שליחת מייל ההתראה לצוות היא best-effort: כישלון שליחה **לא** מפיל את
// הבקשה עצמה (היא כבר נשמרה ותופיע בלוח הניהול), רק מתועד ב-`admin_email_error`.

import { NextRequest, NextResponse } from 'next/server';
import { emailConfigured, sendEmail } from '@/lib/email';
import { env } from '@/lib/env';
import {
  createTikMeidaRequest,
  looksLikeEmail,
  recordTikMeidaRequestEmailResult,
  type TikMeidaRequestGrade,
} from '@/lib/requests';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const GRADE_LABEL: Record<TikMeidaRequestGrade, string> = { normal: 'רגילה', urgent: 'דחופה' };

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function adminEmailHtml(input: {
  gush: string;
  helka: string;
  address: string | null;
  city: string | null;
  assetType: string | null;
  purpose: string | null;
  grade: TikMeidaRequestGrade;
  requesterName: string | null;
  requesterEmail: string;
  requesterPhone: string | null;
  notes: string | null;
}): string {
  const rows: [string, string | null][] = [
    ['גוש / חלקה', `${input.gush} / ${input.helka}`],
    ['כתובת', [input.address, input.city].filter(Boolean).join(', ') || null],
    ['סוג נכס', input.assetType],
    ['מטרת הבקשה', input.purpose],
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
  <h2 style="margin:0 0 10px">בקשת תיק מידע להיתר חדשה${input.grade === 'urgent' ? ' — דחוף' : ''}</h2>
  <p style="color:#475569;font-size:13px">לקוח ביקש הפקת תיק מידע להיתר רשמי מהוועדה המקומית לתכנון ולבנייה. יש להגיש ידנית לוועדה, ואז לסמן את הבקשה כ"נשלחה" ולהעלות את התיק בלוח הניהול כשהוא מתקבל.</p>
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
  const grade: TikMeidaRequestGrade = gradeRaw === 'urgent' ? 'urgent' : 'normal';

  if (!gush || !helka) {
    return NextResponse.json({ error: 'נדרשים גוש וחלקה כדי לבקש תיק מידע להיתר.' }, { status: 400 });
  }
  if (!looksLikeEmail(requesterEmail)) {
    return NextResponse.json({ error: 'כתובת המייל אינה תקינה.' }, { status: 400 });
  }

  const input = {
    gush,
    helka,
    address: body?.address ? String(body.address).trim() : null,
    city: body?.city ? String(body.city).trim() : null,
    assetType: body?.assetType ? String(body.assetType).trim() : null,
    purpose: body?.purpose ? String(body.purpose).trim().slice(0, 300) : null,
    grade,
    requesterName: body?.requesterName ? String(body.requesterName).trim().slice(0, 120) : null,
    requesterEmail,
    requesterPhone: body?.requesterPhone ? String(body.requesterPhone).trim().slice(0, 40) : null,
    notes: body?.notes ? String(body.notes).trim().slice(0, 500) : null,
  };

  try {
    await createTikMeidaRequest(input);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'שמירת הבקשה נכשלה.' }, { status: 500 });
  }

  // המייל הוא best-effort: הבקשה כבר נשמרה ותופיע בלוח הניהול גם אם השליחה
  // נכשלת. נופל ל-TABU_ADMIN_EMAIL כשלא הוגדר יעד ייעודי — אותו צוות מקבל
  // גם בקשות נסח טאבו וגם בקשות תיק מידע.
  const adminEmail = env('TIK_MEIDA_ADMIN_EMAIL') ?? env('TABU_ADMIN_EMAIL');
  if (!adminEmail) {
    await recordTikMeidaRequestEmailResult(
      requesterEmail,
      gush,
      helka,
      false,
      'TIK_MEIDA_ADMIN_EMAIL/TABU_ADMIN_EMAIL אינם מוגדרים — הבקשה נשמרה אך לא נשלחה התראה.',
    );
  } else if (!emailConfigured()) {
    await recordTikMeidaRequestEmailResult(
      requesterEmail,
      gush,
      helka,
      false,
      'RESEND_API_KEY/RESEND_FROM אינם מוגדרים — הבקשה נשמרה אך לא נשלחה התראה.',
    );
  } else {
    const sent = await sendEmail({
      to: adminEmail,
      subject: `בקשת תיק מידע להיתר${grade === 'urgent' ? ' — דחוף' : ''} · גוש ${gush} חלקה ${helka}`,
      html: adminEmailHtml(input),
      replyTo: requesterEmail,
    });
    await recordTikMeidaRequestEmailResult(requesterEmail, gush, helka, sent.ok, sent.error);
  }

  return NextResponse.json({ ok: true });
}
