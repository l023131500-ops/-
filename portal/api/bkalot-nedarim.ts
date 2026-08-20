/**
 * ערוץ קליטה 2 — webhook של נדרים פלוס.
 *
 * נדרים מדווחת על תרומה שהושלמה, ומכאן התורם יכול להצטרף לעדכוני הזכויות.
 * הפונקציה **אינה מחייבת ואינה מבטלת שום דבר** — היא מקבלת דיווח ומתרגמת
 * אותו לפנייה בתור התוכן שלנו. אין כאן קריאה יוצאת לנדרים בכלל.
 *
 * ── ההחלטה החשובה: תרומה איננה הסכמה לדיוור
 * הפיתוי המובן הוא לרשום כל תורם לעדכונים; הוא הרי מסר אימייל. אבל האימייל
 * נמסר כדי לקבל **קבלה**, וזה שימוש אחר. לכן `p_consent` נלקח משדה הסכמה
 * מפורש שהטופס העביר ב-`Param2`, וברירת המחדל היא `false`. תורם בלי סימון
 * ייכנס ליומן כ-`rejected/no_consent` — נראה, לא נשלח.
 *
 * ── אימות המקור
 * נדרים פונה מכתובת קבועה. בלי אימות, כל אחד שמכיר את ה-URL יכול להזריק
 * "תרומות" ולמלא את התור. שני מנעולים, ושניהם חייבים להיפתח:
 *   1. IP ברשימה — `18.194.219.73` (מתועד אצל נדרים; ניתן להרחבה ב-ENV).
 *   2. `NEDARIM_WEBHOOK_TOKEN` — סוד משותף שמגיע כ-`?t=` בכתובת ה-callback.
 * ה-IP לבדו אינו מספיק: הוא מזוהה מכותרת `x-forwarded-for` שאפשר לזייף אם
 * מישהו מגיע לפונקציה שלא דרך הקצה של Vercel.
 *
 * ── מצב נוכחי (NEEDS_USER #6)
 * `NEDARIM_WEBHOOK_TOKEN` אינו מוגדר. כל עוד הוא חסר, הפונקציה מחזירה 503
 * ואינה כותבת דבר — **ולא** "עוברת בשקט בלי אימות". ברירת מחדל פתוחה
 * במשטח שכל האינטרנט מגיע אליו היא בדיוק הטעות שקשה לגלות אחר כך.
 * מיקום ה-callback עצמו אצל נדרים ממתין להכרעת המשתמש ולכן אינו מוגדר עדיין.
 */

const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').replace(/﻿/g, '').trim();
const ANON_KEY = (process.env.SUPABASE_ANON_KEY ?? '').replace(/﻿/g, '').trim();
const TOKEN = (process.env.NEDARIM_WEBHOOK_TOKEN ?? '').replace(/﻿/g, '').trim();

const ALLOWED_IPS = new Set(
  (process.env.NEDARIM_WEBHOOK_IPS ?? '18.194.219.73')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
);

export const config = { maxDuration: 30 };

function fields(req: any): Record<string, string> {
  const out: Record<string, string> = {};
  const url = new URL(req.url ?? '/', 'https://more30.com');
  url.searchParams.forEach((v, k) => (out[k] = v));
  const body = req.body;
  if (body && typeof body === 'object') {
    for (const [k, v] of Object.entries(body)) out[k] = String(v);
  } else if (typeof body === 'string') {
    new URLSearchParams(body).forEach((v, k) => (out[k] = v));
  }
  return out;
}

/** השוואה בזמן קבוע — משווה מחרוזות סוד בלי לדלוף את אורך ההתאמה. */
function sameSecret(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// more30.com sits behind Cloudflare in front of Vercel. cf-connecting-ip is
// set by Cloudflare's own edge from the actual TCP connection and cannot be
// overridden by the caller -- the correct primary source for an IP allowlist
// check like this one. x-forwarded-for is NOT safe to read as "first entry":
// both Cloudflare and Vercel append the connecting IP to whatever the caller
// already sent rather than replacing it, so a caller can prepend any IP it
// likes (e.g. the Nedarim IP itself, to walk straight through this allowlist)
// and the first entry will be that spoofed value. If we ever fall back to
// x-forwarded-for, only the LAST entry (the one the edge actually appended)
// is trustworthy. Same fix as apps/01-torah-platform, apps/03-igud-ads and
// apps/15-egod's Edge Functions -- see DECISIONS.md #229-232/#234-235.
function callerIp(req: any): string {
  const cfIp = String(req.headers?.['cf-connecting-ip'] ?? '').trim();
  if (cfIp) return cfIp;
  const fwd = String(req.headers?.['x-forwarded-for'] ?? '');
  const lastXff = fwd.split(',').map((s) => s.trim()).filter(Boolean).pop() || '';
  return lastXff || String(req.headers?.['x-real-ip'] ?? '').trim();
}

export default async function handler(req: any, res: any) {
  res.setHeader('cache-control', 'no-store');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }
  if (!SUPABASE_URL || !ANON_KEY) {
    res.status(503).json({ error: 'db not configured' });
    return;
  }
  if (!TOKEN) {
    // חסר הסוד → סגור. ראו הערת NEEDS_USER למעלה.
    res.status(503).json({ error: 'webhook not configured' });
    return;
  }

  const f = fields(req);

  if (!sameSecret(String(f.t ?? ''), TOKEN)) {
    res.status(401).json({ error: 'bad token' });
    return;
  }
  const ip = callerIp(req);
  if (ALLOWED_IPS.size && !ALLOWED_IPS.has(ip)) {
    res.status(403).json({ error: 'source not allowed' });
    return;
  }

  // Param1 נושא את מזהה הפרויקט בשילוב הקיים; Param2 מוקצה כאן להסכמה+נושא,
  // בצורה "<topic>|<consent>" — שני ערכים בשדה אחד כי נדרים מספקת רק שניים.
  const [topicRaw = '', consentRaw = ''] = String(f.Param2 ?? '').split('|');
  const topicNo = Number(topicRaw.replace(/\D/g, ''));
  const consent = consentRaw.trim() === '1';

  if (!Number.isFinite(topicNo) || topicNo <= 0) {
    // מאשרים קבלה לנדרים כדי שלא תנסה שוב ושוב, אבל לא כותבים פנייה.
    res.status(200).json({ received: true, enrolled: false, reason: 'no_topic_in_param2' });
    return;
  }

  const name = [f.FirstName, f.LastName].filter(Boolean).join(' ').trim() || null;

  const rpc = await fetch(`${SUPABASE_URL}/rest/v1/rpc/more30_auto_intake`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      p_app: 'bkalot',
      p_topic_no: topicNo,
      p_name: name,
      p_email: String(f.Mail ?? '').trim() || null,
      p_phone: String(f.Phone ?? '').trim() || null,
      p_consent: consent,
      p_source: 'nedarim',
    }),
  });

  const out = rpc.ok ? await rpc.json() : { ok: false, reason: `rpc_${rpc.status}` };

  // 200 תמיד למקור מאומת: נדרים מפרשת כישלון כתקלה וחוזרת שוב, ופנייה
  // שנדחתה בכוונה (בלי הסכמה) אינה תקלה שכדאי לנסות שוב.
  res.status(200).json({ received: true, result: out });
}
