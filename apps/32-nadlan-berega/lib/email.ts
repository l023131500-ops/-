// ==== שליחת מייל דרך Resend ====
//
// קריאה ישירה ל-REST API ולא דרך SDK — חוסכת תלות שלמה בשביל בקשת POST אחת,
// והיא מה שרץ בפועל ב-Vercel Function.
//
// ⚠️ שני דברים שהמערכת מחויבת לומר עליהם את האמת:
// 1. בלי `RESEND_API_KEY` **אין שליחה**. הפונקציה מחזירה כשל מפורש; היא לא
//    מדווחת "נשלח" ולא כותבת sent_at. בקשה תישאר "נכשלה" עם הסיבה, כדי שלא
//    ייווצר מצב שהניהול מראה "נשלח" ולקוח מחכה למייל שלא יצא.
// 2. `RESEND_FROM` חייב להיות דומיין מאומת ב-Resend. בלעדיו Resend מחזיר 403
//    וההודעה נשמרת כשגיאה גלויה בניהול.

import { env, envSet } from './env';

const API = 'https://api.resend.com/emails';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: { filename: string; content: string }[];
}

export interface SendEmailResult {
  ok: boolean;
  id: string | null;
  error: string | null;
}

/**
 * שם השולח נשמר **בקוד** ולא במשתנה סביבה.
 *
 * ⚠️ זו החלטה שנגזרה מכשל אמיתי שחזר שלוש פעמים. הערך `נדלן ברגע` נכתב
 * למשתנה הסביבה דרך ה-CLI, והגיע לצד השני כ-`???? ????` — שמונה סימני שאלה.
 * הסיבה אינה בקוד: המחרוזת מושחתת בדרך אל Vercel (קידוד הקונסולה/ה-CLI),
 * ו-`vercel env ls` מציג "Encrypted" ולכן הערך המושחת בלתי נראה מבחוץ.
 * שלושה נסיונות תיקון — כולל כתיבה מקובץ UTF-8 והזנה דרך stdin — לא עזרו.
 *
 * טקסט עברי בקוד עובר את כל הצינור הזה בשלום: כל הדוח בעברית ומגיע תקין.
 * לכן במשתנה הסביבה נשארת **כתובת ASCII בלבד**, שאין דרך להשחית אותה, והשם
 * מגיע מכאן. `RESEND_FROM_NAME` מאפשר לדרוס אותו למי שירצה.
 */
const DEFAULT_FROM_NAME = 'נדל״ן ברגע';

export function emailConfigured(): boolean {
  return envSet('RESEND_API_KEY') && envSet('RESEND_FROM');
}

/** הכתובת בלבד, מתוך RESEND_FROM (גם אם הוגדר בו שם תצוגה). */
function fromAddress(): string {
  const raw = env('RESEND_FROM') ?? '';
  const m = /<([^>]+)>/.exec(raw);
  return (m ? m[1] : raw).trim();
}

/**
 * שם השולח מקודד לפי RFC 2047 כשהוא אינו ASCII.
 *
 * ⚠️ נמצא במייל אמיתי שנשלח ללקוח: השולח הופיע כ-`???? ????`. הכותרת `From`
 * היא כותרת MIME, ומותרים בה תווי ASCII בלבד — שם תצוגה בעברית שאינו מקודד
 * מומר לסימני שאלה בדרך. הנושא הגיע בעברית תקינה כי הוא כן עובר קידוד
 * אוטומטית, ולכן התקלה נראתה כמו בעיית קידוד מקומית ולא כמו באג.
 *
 * הפורמט: `=?UTF-8?B?<base64>?= <address@domain>`.
 */
export function encodeFromHeader(raw: string): string {
  const value = raw.trim();
  if (!value) return '';
  // eslint-disable-next-line no-control-regex
  const isAscii = /^[\x00-\x7F]*$/.test(value);
  if (isAscii) return value;

  const m = /^(.*?)\s*<([^>]+)>\s*$/.exec(value);
  if (!m) {
    // כתובת בלבד, בלי שם תצוגה — אם היא עצמה אינה ASCII אין מה לעשות כאן.
    return value;
  }
  const [, display, address] = m;
  if (!display) return `<${address}>`;
  const b64 = Buffer.from(display, 'utf8').toString('base64');
  return `=?UTF-8?B?${b64}?= <${address}>`;
}

export function emailFrom(): string {
  const address = fromAddress();
  if (!address) return '';
  // שם שהוגדר בסביבה מתקבל רק אם הוא ASCII — אחרת הוא כבר מושחת, ואין טעם
  // לקודד סימני שאלה. עברית באה מהקוד.
  const envName = env('RESEND_FROM_NAME');
  // eslint-disable-next-line no-control-regex
  const usable = envName && /^[\x20-\x7E֐-׿\s]+$/.test(envName) && !/\?{3,}/.test(envName);
  const name = usable ? envName : DEFAULT_FROM_NAME;
  return encodeFromHeader(`${name} <${address}>`);
}

/** השם והכתובת כפי שיישלחו, בלי קידוד — לתצוגה בניהול. */
export function emailFromRaw(): string {
  const address = fromAddress();
  return address ? `${DEFAULT_FROM_NAME} <${address}>` : '';
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const key = env('RESEND_API_KEY');
  const from = emailFrom();
  if (!key) {
    return { ok: false, id: null, error: 'RESEND_API_KEY אינו מוגדר — אין שליחת מייל.' };
  }
  if (!from) {
    return {
      ok: false,
      id: null,
      error: 'RESEND_FROM אינו מוגדר. נדרש שולח בדומיין מאומת ב-Resend.',
    };
  }

  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        ...(input.text ? { text: input.text } : {}),
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
        ...(input.attachments?.length ? { attachments: input.attachments } : {}),
      }),
    });
    const json: any = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = json?.message ?? json?.error ?? `Resend HTTP ${res.status}`;
      return { ok: false, id: null, error: String(msg) };
    }
    return { ok: true, id: json?.id ?? null, error: null };
  } catch (e: any) {
    return { ok: false, id: null, error: `שליחת המייל נכשלה: ${e?.message ?? e}` };
  }
}
