// ==== שער הניהול ====
//
// שני מפתחות לאותה דלת:
//
// 1. `ADMIN_TOKEN` — הטוקן ההיסטורי (`?key=` או כותרת `x-admin-token`).
// 2. **סופר-אדמין של more30** — מי שמחובר לפלטפורמה ומאושר בשרת. זה הכלל
//    הרוחבי של הפלטפורמה: "אדמין מקומי **או** סופר-אדמין גלובלי". בלי זה
//    בעל הפלטפורמה היה צריך להחזיק טוקן נפרד לכל מערכת כדי להיכנס לניהול
//    של עצמו.
//
// ⚠️ כשאין `ADMIN_TOKEN` **ואין** סשן מאושר, מסלולי ה-API מחזירים 401/503 ולא
// נפתחים. דף הניהול יכול להרשות לעצמו להיפתח בלי טוקן בפיתוח מקומי, אבל מסלול
// שקורא כתובות מייל של לקוחות, מעלה קבצים ושולח מיילים — לא. פתיחה כברירת
// מחדל היא בדיוק סוג התקלה שגורמת לדליפה.

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { env } from './env';

export type AdminGate = { ok: true; token: string } | { ok: false; status: number; error: string };

/** העוגייה שנכתבת אחרי שהסשן של הפלטפורמה אומת בשרת. */
export const ADMIN_COOKIE = 'n30_admin';

function hmacSecret(): string | null {
  // כל סוד שרת שקיים ממילא בפריסה. הוא לא נחשף — משמש רק לחתימה.
  return env('SUPABASE_SERVICE_KEY') || env('SUPABASE_SERVICE_ROLE_KEY') || env('ADMIN_TOKEN') || null;
}

/** חתימה קצרת-מועד: `<expiry>.<hmac>`. אין בה מידע על המשתמש. */
export function signAdminCookie(ttlSeconds = 60 * 60 * 8): string | null {
  const secret = hmacSecret();
  if (!secret) return null;
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = createHmac('sha256', secret).update(String(exp)).digest('hex');
  return `${exp}.${sig}`;
}

export function verifyAdminCookie(value: string | undefined): boolean {
  const secret = hmacSecret();
  if (!secret || !value) return false;
  const [expRaw, sig] = value.split('.');
  const exp = Number(expRaw);
  if (!exp || !sig || exp * 1000 <= Date.now()) return false;
  const expected = createHmac('sha256', secret).update(String(exp)).digest('hex');
  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expected, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * שואל את ההאב האם ה-JWT הזה שייך למנהל של המערכת הזו. התשובה מגיעה מהמסד
 * (`more30_app_access`), שמכריע "אדמין מקומי או סופר-אדמין" במקום אחד — כאן
 * לא מפרשים הרשאות ולא סומכים על תוכן הטוקן.
 */
export async function isMore30Admin(jwt: string): Promise<boolean> {
  const url = env('SUPABASE_URL') || env('NEXT_PUBLIC_SUPABASE_URL');
  const anon = env('NEXT_PUBLIC_SUPABASE_ANON_KEY') || env('SUPABASE_ANON_KEY');
  if (!url || !anon || !jwt) return false;
  try {
    const r = await fetch(`${url}/rest/v1/rpc/more30_app_access`, {
      method: 'POST',
      headers: {
        apikey: anon,
        Authorization: `Bearer ${jwt}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ p_app: 'nadlan' }),
    });
    if (!r.ok) return false;
    const data = (await r.json()) as { is_admin?: boolean } | null;
    return data?.is_admin === true;
  } catch {
    return false;
  }
}

export async function adminGate(req: NextRequest): Promise<AdminGate> {
  // מסלול 1 — סשן מאושר של הפלטפורמה (עוגייה חתומה, או Bearer ישיר).
  if (verifyAdminCookie(req.cookies.get(ADMIN_COOKIE)?.value)) {
    return { ok: true, token: 'more30-admin' };
  }
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (bearer && (await isMore30Admin(bearer))) {
    return { ok: true, token: 'more30-admin' };
  }

  // מסלול 2 — הטוקן ההיסטורי.
  const expected = env('ADMIN_TOKEN');
  if (!expected) {
    return {
      ok: false,
      status: 503,
      error:
        'ADMIN_TOKEN אינו מוגדר ואין סשן ניהול מאושר. מסלולי הניהול נעולים — הם קוראים פרטי לקוחות ושולחים מיילים.',
    };
  }
  const supplied =
    req.headers.get('x-admin-token')?.trim() ||
    req.nextUrl.searchParams.get('key')?.trim() ||
    '';

  // השוואה באורך קבוע — לא כדי לרשום הישג אבטחה, אלא כדי לא לדלוף את אורך
  // הטוקן ואת הקידומת שלו דרך זמן התגובה.
  if (supplied.length !== expected.length) {
    return { ok: false, status: 401, error: 'אין הרשאה.' };
  }
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= supplied.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return { ok: false, status: 401, error: 'אין הרשאה.' };

  return { ok: true, token: expected };
}
