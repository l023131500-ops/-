/**
 * GET /api/credits
 *
 * מצב הקרדיטים והמפתחות של הספקים החיצוניים, ללוח הניהול המאוחד.
 *
 * אבטחה: אין כאן service_role ואין החזרה של אף מפתח. הפונקציה מקבלת את ה-JWT
 * של האדמין המחובר, מאמתת אותו מול `more30_is_admin()` ב-PostgREST, ורק אז
 * פונה לספקים. מה שחוזר לדפדפן הוא מספרים וסטטוסים בלבד.
 *
 * ⚠️ הערה שחשוב שתישאר מדויקת: רק ל-Apify יש ממשק שמחזיר יתרה אמיתית.
 * ל-OpenAI, Anthropic ו-Gemini אין ממשק יתרה למפתח רגיל — ולכן מה שנבדק שם
 * הוא **תקפות המפתח** בלבד, וכך גם נאמר במסך. עדיף "לא נמדד" מאשר מספר יפה
 * שאין מאחוריו כלום.
 */

const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').replace(/﻿/g, '').trim();
const ANON_KEY = (process.env.SUPABASE_ANON_KEY ?? '').replace(/﻿/g, '').trim();

const KEYS = {
  apify: (process.env.APIFY_TOKEN ?? '').replace(/﻿/g, '').trim(),
  openai: (process.env.OPENAI_API_KEY ?? '').replace(/﻿/g, '').trim(),
  anthropic: (process.env.ANTHROPIC_API_KEY ?? '').replace(/﻿/g, '').trim(),
  gemini: (process.env.GEMINI_API_KEY ?? '').replace(/﻿/g, '').trim(),
};

export const config = { maxDuration: 60 };

type Provider = {
  key: string;
  label: string;
  /** למה המפתח הזה משמש — כדי שברור מה נשבר כשהוא נגמר. */
  usedBy: string;
  state: 'ok' | 'missing' | 'invalid' | 'unknown';
  /** מדידה אמיתית של יתרה, כשהספק מספק אחת. */
  usage?: { usedUsd: number; limitUsd: number; percent: number; cycleEnds: string | null };
  detail: string;
};

async function isAdmin(jwt: string): Promise<boolean> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/more30_is_admin`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${jwt}`,
      'content-type': 'application/json',
    },
    body: '{}',
  });
  if (!res.ok) return false;
  const text = await res.text();
  return text.trim() === 'true';
}

/** בקשה עם תקרת זמן משלנו — ספק שלא עונה לא יתקע את כל המסך. */
async function probe(url: string, init: RequestInit = {}, ms = 12_000): Promise<Response | null> {
  const clock = new AbortController();
  const alarm = setTimeout(() => clock.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: clock.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(alarm);
  }
}

async function apify(): Promise<Provider> {
  const base: Provider = {
    key: 'apify',
    label: 'Apify',
    usedBy: 'נדל״ן ברגע — דירות שמוצעות כרגע (יד2 / מדלן)',
    state: 'missing',
    detail: 'המפתח לא מוגדר בפריסה הזו.',
  };
  if (!KEYS.apify) return base;

  const res = await probe(`https://api.apify.com/v2/users/me/limits?token=${encodeURIComponent(KEYS.apify)}`);
  if (!res) return { ...base, state: 'unknown', detail: 'הספק לא ענה בזמן.' };
  if (res.status === 401 || res.status === 403) {
    return { ...base, state: 'invalid', detail: 'המפתח נדחה על ידי הספק.' };
  }
  if (!res.ok) return { ...base, state: 'unknown', detail: `הספק החזיר ${res.status}.` };

  const j: any = await res.json().catch(() => null);
  const d = j?.data;
  const usedUsd = Number(d?.current?.monthlyUsageUsd ?? 0);
  const limitUsd = Number(d?.limits?.maxMonthlyUsageUsd ?? 0);
  const percent = limitUsd > 0 ? Math.round((usedUsd / limitUsd) * 100) : 0;

  return {
    ...base,
    state: 'ok',
    usage: {
      usedUsd: Math.round(usedUsd * 100) / 100,
      limitUsd,
      percent,
      cycleEnds: d?.monthlyUsageCycle?.endAt ?? null,
    },
    detail:
      percent >= 80
        ? 'קרוב לתקרה — כשהיא נגמרת, משיכת המודעות מפסיקה להחזיר תוצאות.'
        : 'יתרה חודשית אמיתית, נמדדת מול הספק.',
  };
}

async function openai(): Promise<Provider> {
  const base: Provider = {
    key: 'openai',
    label: 'OpenAI',
    usedBy: 'תמלול חיזוקים · תמלול איגוד · העורך התורני',
    state: 'missing',
    detail: 'המפתח לא מוגדר בפריסה הזו.',
  };
  if (!KEYS.openai) return base;
  const res = await probe('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${KEYS.openai}` },
  });
  if (!res) return { ...base, state: 'unknown', detail: 'הספק לא ענה בזמן.' };
  if (res.status === 401) return { ...base, state: 'invalid', detail: 'המפתח נדחה.' };
  if (!res.ok) return { ...base, state: 'unknown', detail: `הספק החזיר ${res.status}.` };
  return { ...base, state: 'ok', detail: 'המפתח תקף. OpenAI אינו מפרסם יתרה למפתח רגיל.' };
}

async function anthropic(): Promise<Provider> {
  const base: Provider = {
    key: 'anthropic',
    label: 'Anthropic',
    usedBy: 'סטודיו מודעות · דוח הנדל״ן · ניתוח האפיונים',
    state: 'missing',
    detail: 'המפתח לא מוגדר בפריסה הזו.',
  };
  if (!KEYS.anthropic) return base;
  // הבקשה הזולה ביותר שעדיין מוכיחה שהמפתח מתקבל: ספירת טוקנים, בלי יצירה.
  const res = await probe('https://api.anthropic.com/v1/messages/count_tokens', {
    method: 'POST',
    headers: {
      'x-api-key': KEYS.anthropic,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ model: 'claude-opus-5', messages: [{ role: 'user', content: 'ping' }] }),
  });
  if (!res) return { ...base, state: 'unknown', detail: 'הספק לא ענה בזמן.' };
  if (res.status === 401 || res.status === 403) return { ...base, state: 'invalid', detail: 'המפתח נדחה.' };
  if (!res.ok) return { ...base, state: 'unknown', detail: `הספק החזיר ${res.status}.` };
  return { ...base, state: 'ok', detail: 'המפתח תקף. Anthropic אינו מפרסם יתרה למפתח רגיל.' };
}

async function gemini(): Promise<Provider> {
  const base: Provider = {
    key: 'gemini',
    label: 'Google Gemini',
    usedBy: 'סטודיו מודעות — יצירת רקעים',
    state: 'missing',
    detail: 'המפתח לא מוגדר בפריסה הזו.',
  };
  if (!KEYS.gemini) return base;
  const res = await probe(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(KEYS.gemini)}`,
  );
  if (!res) return { ...base, state: 'unknown', detail: 'הספק לא ענה בזמן.' };
  if (res.status === 400 || res.status === 401 || res.status === 403) {
    return { ...base, state: 'invalid', detail: 'המפתח נדחה.' };
  }
  if (!res.ok) return { ...base, state: 'unknown', detail: `הספק החזיר ${res.status}.` };
  return { ...base, state: 'ok', detail: 'המפתח תקף. גוגל אינה מפרסמת יתרה למפתח רגיל.' };
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }
  const jwt = String(req.headers?.authorization ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!jwt) {
    res.status(401).json({ error: 'נדרשת התחברות אדמין.' });
    return;
  }
  if (!SUPABASE_URL || !ANON_KEY) {
    res.status(503).json({ error: 'החיבור למסד אינו מוגדר בפריסה הזו.' });
    return;
  }
  if (!(await isAdmin(jwt))) {
    res.status(403).json({ error: 'המשתמש הזה אינו אדמין.' });
    return;
  }

  const providers = await Promise.all([apify(), openai(), anthropic(), gemini()]);
  res.setHeader('cache-control', 'no-store');
  res.status(200).json({ providers, checkedAt: new Date().toISOString() });
}
