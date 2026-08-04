/**
 * GET /api/credits
 *
 * מצב הקרדיטים והמפתחות של כל הספקים החיצוניים, ללוח הניהול המאוחד.
 *
 * ── אבטחה
 * אין כאן `service_role` ואין החזרה של אף מפתח. הפונקציה מקבלת את ה-JWT של
 * האדמין המחובר, מאמתת אותו מול `more30_is_admin()` ב-PostgREST, ורק אז פונה
 * לספקים. מה שחוזר לדפדפן הוא מספרים, סטטוסים וקישורים בלבד.
 *
 * ── שלוש שאלות שונות, ולא אחת
 * המסך הזה נשאל "האם החיבור פועל, כמה נשאר, ואיפה מוסיפים קרדיט". קל לכווץ
 * את זה למצב יחיד, וזו הייתה טעות: יש הבדל בין **אין לנו מפתח לספק הזה** לבין
 * **יש מפתח בכספת אבל הוא לא נפרס לפונקציה הזאת**. לשתיהן המסך היה מציג
 * "חסר", והתיקון שלהן הפוך לגמרי — באחת צריך לפתוח חשבון, בשנייה רק להעתיק
 * ערך קיים. לכן כל ספק נושא גם `inVault` (מ-`more30_secret_names()`, שמות
 * בלבד) וגם `deployed` (האם `process.env` מחזיק אותו כאן).
 *
 * ── ⚠️ הערה שחשוב שתישאר מדויקת
 * רק לחלק מהספקים יש ממשק שמחזיר יתרה אמיתית: Apify (יתרה חודשית), Recraft
 * (קרדיטים) ו-ElevenLabs (תווים מתוך מכסה). ל-OpenAI, Anthropic ו-Gemini אין
 * ממשק יתרה למפתח רגיל — שם נבדקת **תקפות המפתח** בלבד, וכך גם נאמר במסך.
 * עדיף "לא נמדד" מאשר מספר יפה שאין מאחוריו כלום.
 */

const clean = (v: string | undefined) => (v ?? '').replace(/﻿/g, '').trim();

const SUPABASE_URL = clean(process.env.SUPABASE_URL);
const ANON_KEY = clean(process.env.SUPABASE_ANON_KEY);

export const config = { maxDuration: 60 };

type State = 'ok' | 'missing' | 'not-deployed' | 'invalid' | 'unknown';

type Provider = {
  key: string;
  label: string;
  /** למה המפתח הזה משמש — כדי שברור מה נשבר כשהוא נגמר. */
  usedBy: string;
  state: State;
  /** מדידה אמיתית של יתרה, כשהספק מספק אחת. */
  usage?: { used: number; limit: number; percent: number; unit: string; cycleEnds?: string | null };
  detail: string;
  /** לאן הולכים כדי להוסיף קרדיט או לחדש מפתח. */
  topUp: string;
  inVault: boolean;
  deployed: boolean;
};

/** בקשה עם תקרת זמן משלנו — ספק שלא עונה לא יתקע את כל המסך. */
async function probe(url: string, init: RequestInit = {}, ms = 10_000): Promise<Response | null> {
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

async function isAdmin(jwt: string): Promise<boolean> {
  const res = await probe(`${SUPABASE_URL}/rest/v1/rpc/more30_is_admin`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${jwt}`, 'content-type': 'application/json' },
    body: '{}',
  });
  if (!res?.ok) return false;
  return (await res.text()).trim() === 'true';
}

/** שמות הסודות בכספת — בלי ערכים. ראה `more30_secret_names()`. */
async function vaultNames(jwt: string): Promise<Set<string>> {
  const res = await probe(`${SUPABASE_URL}/rest/v1/rpc/more30_secret_names`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${jwt}`, 'content-type': 'application/json' },
    body: '{}',
  });
  if (!res?.ok) return new Set();
  const rows: any[] = await res.json().catch(() => []);
  return new Set(rows.filter((r) => r?.has_value).map((r) => String(r.name)));
}

/**
 * מפרט הספקים. `env` הוא שם המפתח כפי שהוא מופיע גם בכספת וגם ב-`process.env`,
 * כדי שהשוואה בין השניים תהיה על אותו שם ולא על ניחוש.
 */
type Spec = {
  key: string;
  label: string;
  env: string;
  usedBy: string;
  topUp: string;
  check?: (k: string) => Promise<Partial<Provider>>;
};

const SPECS: Spec[] = [
  {
    key: 'apify',
    label: 'Apify',
    env: 'APIFY_TOKEN',
    usedBy: 'נדל״ן ברגע — דירות שמוצעות כרגע (יד2 / מדלן)',
    topUp: 'https://console.apify.com/billing',
    async check(k) {
      const res = await probe(`https://api.apify.com/v2/users/me/limits?token=${encodeURIComponent(k)}`);
      if (!res) return { state: 'unknown', detail: 'הספק לא ענה בזמן.' };
      if (res.status === 401 || res.status === 403) return { state: 'invalid', detail: 'המפתח נדחה על ידי הספק.' };
      if (!res.ok) return { state: 'unknown', detail: `הספק החזיר ${res.status}.` };
      const d = (await res.json().catch(() => null))?.data;
      const used = Number(d?.current?.monthlyUsageUsd ?? 0);
      const limit = Number(d?.limits?.maxMonthlyUsageUsd ?? 0);
      const percent = limit > 0 ? Math.round((used / limit) * 100) : 0;
      return {
        state: 'ok',
        usage: {
          used: Math.round(used * 100) / 100,
          limit,
          percent,
          unit: 'USD',
          cycleEnds: d?.monthlyUsageCycle?.endAt ?? null,
        },
        detail:
          percent >= 80
            ? 'קרוב לתקרה — כשהיא נגמרת, משיכת המודעות מפסיקה להחזיר תוצאות.'
            : 'יתרה חודשית אמיתית, נמדדת מול הספק.',
      };
    },
  },
  {
    key: 'recraft',
    label: 'Recraft',
    env: 'RECRAFT_API_KEY',
    usedBy: 'סטודיו המודעות — יצירת תמונות',
    topUp: 'https://www.recraft.ai/profile/billing',
    async check(k) {
      const res = await probe('https://external.api.recraft.ai/v1/users/me', {
        headers: { Authorization: `Bearer ${k}` },
      });
      if (!res) return { state: 'unknown', detail: 'הספק לא ענה בזמן.' };
      if (res.status === 401 || res.status === 403) return { state: 'invalid', detail: 'המפתח נדחה.' };
      if (!res.ok) return { state: 'unknown', detail: `הספק החזיר ${res.status}.` };
      const j: any = await res.json().catch(() => null);
      const left = Number(j?.credits ?? NaN);
      if (!Number.isFinite(left)) {
        return { state: 'ok', detail: 'המפתח תקף. הספק לא החזיר מספר קרדיטים בתשובה הזאת.' };
      }
      return {
        state: 'ok',
        usage: { used: 0, limit: left, percent: 0, unit: 'קרדיטים' },
        detail: left <= 50 ? 'נותרו מעט קרדיטים — יצירת תמונות תיעצר כשייגמרו.' : 'קרדיטים שנותרו, נמדד מול הספק.',
      };
    },
  },
  {
    key: 'elevenlabs',
    label: 'ElevenLabs',
    env: 'ELEVENLABS_API_KEY',
    usedBy: 'הקראות קוליות — אוטומציית בקלות ושלוחות ימות',
    topUp: 'https://elevenlabs.io/app/subscription',
    async check(k) {
      const res = await probe('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': k } });
      if (!res) return { state: 'unknown', detail: 'הספק לא ענה בזמן.' };
      if (res.status === 401) return { state: 'invalid', detail: 'המפתח נדחה.' };
      if (!res.ok) return { state: 'unknown', detail: `הספק החזיר ${res.status}.` };
      const j: any = await res.json().catch(() => null);
      const used = Number(j?.character_count ?? 0);
      const limit = Number(j?.character_limit ?? 0);
      const percent = limit > 0 ? Math.round((used / limit) * 100) : 0;
      return {
        state: 'ok',
        usage: { used, limit, percent, unit: 'תווים', cycleEnds: j?.next_character_count_reset_unix
          ? new Date(Number(j.next_character_count_reset_unix) * 1000).toISOString()
          : null },
        detail: percent >= 80 ? 'קרוב למכסת התווים החודשית.' : 'מכסת תווים אמיתית, נמדדת מול הספק.',
      };
    },
  },
  {
    key: 'openai',
    label: 'OpenAI',
    env: 'OPENAI_API_KEY',
    usedBy: 'תמלול חיזוקים · תמלול איגוד · העורך התורני',
    topUp: 'https://platform.openai.com/settings/organization/billing/overview',
    async check(k) {
      const res = await probe('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${k}` } });
      if (!res) return { state: 'unknown', detail: 'הספק לא ענה בזמן.' };
      if (res.status === 401) return { state: 'invalid', detail: 'המפתח נדחה.' };
      if (!res.ok) return { state: 'unknown', detail: `הספק החזיר ${res.status}.` };
      return { state: 'ok', detail: 'המפתח תקף. OpenAI אינו מפרסם יתרה למפתח רגיל.' };
    },
  },
  {
    key: 'anthropic',
    label: 'Anthropic',
    env: 'ANTHROPIC_API_KEY',
    usedBy: 'סטודיו מודעות · דוח הנדל״ן · ניתוח האפיונים',
    topUp: 'https://console.anthropic.com/settings/billing',
    async check(k) {
      // הבקשה הזולה ביותר שעדיין מוכיחה שהמפתח מתקבל: ספירת טוקנים, בלי יצירה.
      const res = await probe('https://api.anthropic.com/v1/messages/count_tokens', {
        method: 'POST',
        headers: { 'x-api-key': k, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'claude-opus-5', messages: [{ role: 'user', content: 'ping' }] }),
      });
      if (!res) return { state: 'unknown', detail: 'הספק לא ענה בזמן.' };
      if (res.status === 401 || res.status === 403) return { state: 'invalid', detail: 'המפתח נדחה.' };
      if (!res.ok) return { state: 'unknown', detail: `הספק החזיר ${res.status}.` };
      return { state: 'ok', detail: 'המפתח תקף. Anthropic אינו מפרסם יתרה למפתח רגיל.' };
    },
  },
  {
    key: 'gemini',
    label: 'Google Gemini',
    env: 'GEMINI_API_KEY',
    usedBy: 'סטודיו מודעות — יצירת רקעים',
    topUp: 'https://console.cloud.google.com/billing',
    async check(k) {
      const res = await probe(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(k)}`);
      if (!res) return { state: 'unknown', detail: 'הספק לא ענה בזמן.' };
      if ([400, 401, 403].includes(res.status)) return { state: 'invalid', detail: 'המפתח נדחה.' };
      if (!res.ok) return { state: 'unknown', detail: `הספק החזיר ${res.status}.` };
      return { state: 'ok', detail: 'המפתח תקף. גוגל אינה מפרסמת יתרה למפתח רגיל.' };
    },
  },
  {
    key: 'maps',
    label: 'Google Maps',
    env: 'GOOGLE_MAPS_API_KEY',
    usedBy: 'נדל״ן ברגע · סמל נדל״ן — מפות, גיאוקוד ו-Street View',
    topUp: 'https://console.cloud.google.com/google/maps-apis/quotas',
    async check(k) {
      // גיאוקוד לכתובת ידועה: זולה, ומחזירה סטטוס טקסטואלי שמבחין בין
      // מפתח פסול לבין חיוב מושבת — שתי תקלות שנראות אותו דבר מבחוץ.
      const res = await probe(
        `https://maps.googleapis.com/maps/api/geocode/json?address=Tel+Aviv&key=${encodeURIComponent(k)}`,
      );
      if (!res) return { state: 'unknown', detail: 'הספק לא ענה בזמן.' };
      const j: any = await res.json().catch(() => null);
      const s = String(j?.status ?? '');
      if (s === 'OK' || s === 'ZERO_RESULTS') return { state: 'ok', detail: 'המפתח תקף. גוגל אינה מפרסמת יתרה — הצריכה נמדדת במסך המכסות.' };
      if (s === 'REQUEST_DENIED') return { state: 'invalid', detail: `המפתח נדחה: ${j?.error_message ?? 'REQUEST_DENIED'}` };
      if (s === 'OVER_QUERY_LIMIT') return { state: 'invalid', detail: 'המכסה נגמרה — המפות והצילומים יפסיקו לעבוד.' };
      return { state: 'unknown', detail: `גוגל החזירה ${s || res.status}.` };
    },
  },
  {
    key: 'resend',
    label: 'Resend',
    env: 'RESEND_API_KEY',
    usedBy: 'שליחת מיילים — אוטומציית בקלות וקמפיינים',
    topUp: 'https://resend.com/settings/billing',
    async check(k) {
      const res = await probe('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${k}` } });
      if (!res) return { state: 'unknown', detail: 'הספק לא ענה בזמן.' };
      if (res.status === 401 || res.status === 403) return { state: 'invalid', detail: 'המפתח נדחה.' };
      if (!res.ok) return { state: 'unknown', detail: `הספק החזיר ${res.status}.` };
      const j: any = await res.json().catch(() => null);
      const list: any[] = j?.data ?? [];
      const verified = list.filter((d) => d?.status === 'verified').length;
      return {
        state: 'ok',
        detail: list.length
          ? `המפתח תקף · ${verified} מתוך ${list.length} דומיינים מאומתים. Resend אינו מפרסם יתרה — המכסה לפי המסלול.`
          : 'המפתח תקף, אך אין דומיין מוגדר — שליחה מדומיין לא מאומת תיחסם.',
      };
    },
  },
  {
    key: 'nedarim',
    label: 'נדרים פלוס',
    env: 'NEDARIM_MOSAD_ID',
    usedBy: 'סליקה וחשבוניות — סטודיו המודעות ומנויים',
    topUp: 'https://matara.pro/nedarimplus/Reports/',
    // אין ל"נדרים" ממשק יתרה, וסליקה אינה קרדיט שנגמר. בדיקה אמיתית כאן
    // הייתה מחייבת קריאה לממשק החיוב — ולא נוגעים בסליקה חיה כדי לצייר מסך.
  },
  {
    key: 'yemot',
    label: 'ימות המשיח',
    env: 'YEMOT_TOKEN',
    usedBy: 'שלוחות טלפון — הקראות והקשות באוטומציית בקלות',
    topUp: 'https://www.call2all.co.il/ym/api/',
  },
  {
    key: 'runpod',
    label: 'RunPod',
    env: 'RUNPOD_API_KEY',
    usedBy: 'הרצות GPU — המרת כתב יד',
    topUp: 'https://www.runpod.io/console/user/billing',
  },
  {
    key: 'vercel',
    label: 'Vercel',
    env: 'VERCEL_TOKEN',
    usedBy: 'אירוח כל המערכות · מכסת פריסות יומית',
    topUp: 'https://vercel.com/account/billing',
    async check(k) {
      const res = await probe('https://api.vercel.com/v2/user', { headers: { Authorization: `Bearer ${k}` } });
      if (!res) return { state: 'unknown', detail: 'הספק לא ענה בזמן.' };
      if (res.status === 401 || res.status === 403) return { state: 'invalid', detail: 'הטוקן נדחה.' };
      if (!res.ok) return { state: 'unknown', detail: `הספק החזיר ${res.status}.` };
      return { state: 'ok', detail: 'הטוקן תקף. מכסת הפריסות (100/יום) אינה נחשפת ב-API ונמדדת בלוח של Vercel.' };
    },
  },
  {
    key: 'supabase',
    label: 'Supabase',
    env: 'SUPABASE_ACCESS_TOKEN',
    usedBy: 'המסד המרכזי וכל מסדי המערכות',
    topUp: 'https://supabase.com/dashboard/org/_/billing',
    async check(k) {
      const res = await probe('https://api.supabase.com/v1/projects', { headers: { Authorization: `Bearer ${k}` } });
      if (!res) return { state: 'unknown', detail: 'הספק לא ענה בזמן.' };
      if (res.status === 401 || res.status === 403) return { state: 'invalid', detail: 'הטוקן נדחה.' };
      if (!res.ok) return { state: 'unknown', detail: `הספק החזיר ${res.status}.` };
      const list: any[] = (await res.json().catch(() => [])) ?? [];
      const paused = list.filter((p) => p?.status && p.status !== 'ACTIVE_HEALTHY').length;
      return {
        state: 'ok',
        detail: paused
          ? `הטוקן תקף · ${list.length} פרויקטים, מתוכם ${paused} אינם פעילים — מערכת שתלויה בהם לא תעבוד.`
          : `הטוקן תקף · ${list.length} פרויקטים, כולם פעילים.`,
      };
    },
  },
];

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }
  const jwt = clean(String(req.headers?.authorization ?? '')).replace(/^Bearer\s+/i, '');
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

  const vault = await vaultNames(jwt);

  const providers = await Promise.all(
    SPECS.map(async (spec): Promise<Provider> => {
      const key = clean(process.env[spec.env]);
      const inVault = vault.has(spec.env);
      const base: Provider = {
        key: spec.key,
        label: spec.label,
        usedBy: spec.usedBy,
        topUp: spec.topUp,
        inVault,
        deployed: !!key,
        state: 'missing',
        detail: 'אין מפתח לספק הזה — לא בכספת ולא בפריסה. צריך לפתוח חשבון ולהוסיף מפתח.',
      };

      if (!key) {
        return inVault
          ? {
              ...base,
              state: 'not-deployed',
              detail:
                'המפתח קיים ב-core.secrets אבל אינו מוגדר כמשתנה סביבה בפריסה הזאת, ולכן אי אפשר לבדוק אותו מכאן. זה תיקון של העתקת ערך קיים, לא של פתיחת חשבון.',
            }
          : base;
      }

      if (!spec.check) {
        return {
          ...base,
          state: 'ok',
          detail: 'המפתח מוגדר. לספק הזה אין ממשק שמחזיר יתרה, ולכן לא נמדד כאן מספר.',
        };
      }

      try {
        return { ...base, ...(await spec.check(key)) } as Provider;
      } catch {
        return { ...base, state: 'unknown', detail: 'הבדיקה נכשלה.' };
      }
    }),
  );

  res.setHeader('cache-control', 'no-store');
  res.status(200).json({
    providers,
    checkedAt: new Date().toISOString(),
    summary: {
      ok: providers.filter((p) => p.state === 'ok').length,
      needsKey: providers.filter((p) => p.state === 'missing').length,
      needsDeploy: providers.filter((p) => p.state === 'not-deployed').length,
      broken: providers.filter((p) => p.state === 'invalid').length,
    },
  });
}
