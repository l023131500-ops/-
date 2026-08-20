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
 *
 * ── כיסוי: כל ספק שיש לו סוד בכספת
 * §3א מבקש את **כל** הספקים שאנחנו מחוברים אליהם, ו-`core.secrets` הוא הרשימה
 * הקובעת. ספק שיש לו סוד בכספת ואין לו שורה כאן פשוט נעלם מהמסך — לא "תקין"
 * ולא "חסר", אלא לא-קיים; וזה בדיוק המצב שבו נגמר קרדיט בלי שאף אחד ראה.
 * `scripts/qa/credits-coverage.mjs` מאמת את הכיסוי מול צילום של רשימת השירותים
 * שבכספת, כדי ששירות חדש בכספת ייכשל בבדיקה ולא יישכח.
 *
 * שני דברים שהכיסוי הזה חייב לדעת ושלא היו בטיפוס המקורי:
 * 1. **ספק שדורש יותר ממפתח אחד.** Google OAuth בלי ה-secret אינו "פועל", והוא
 *    היה מוצג כפועל אם היינו בודקים רק את ה-client id. `alsoNeeds` מונה את שאר
 *    השמות, ו-inVault/deployed נמדדים על כולם.
 * 2. **ספק ציבורי בלי מפתח.** data.gov.il אינו דורש מאיתנו כלום, ולכן היעדר
 *    משתנה סביבה כאן אינו אומר שהחיבור שבור. `keyless` מריץ את הבדיקה בכל מקרה.
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
  /** כשהיעד אינו עמוד חיוב — "הוספת קרדיט" יהיה שקר, ולכן הכיתוב נאמר במפורש. */
  topUpLabel?: string;
  /** ספק ציבורי שאינו דורש מאיתנו מפתח כלל. */
  keyless?: boolean;
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
  /** שמות נוספים שהספק אינו עובד בלעדיהם. inVault/deployed נמדדים על כל הרשימה. */
  alsoNeeds?: string[];
  /** הממשק ציבורי — הבדיקה תרוץ גם בלי משתנה סביבה. */
  keyless?: boolean;
  usedBy: string;
  topUp: string;
  topUpLabel?: string;
  /** מה באמת חסר, כשלספק אין מפתח — לא כל "אין מפתח" הוא פתיחת חשבון. */
  whenMissing?: string;
  /**
   * ערכי `core.secrets.service` שהשורה הזאת מכסה, כשהם אינם נגזרים משמות
   * המפתחות. אינו בשימוש בזמן ריצה — רק בדיקת הכיסוי קוראת אותו.
   */
  covers?: string[];
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
        body: JSON.stringify({ model: 'claude-haiku-4-5', messages: [{ role: 'user', content: 'ping' }] }),
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
    key: 'google-oauth',
    label: 'Google — כניסה עם חשבון',
    env: 'GOOGLE_OAUTH_CLIENT_ID',
    alsoNeeds: ['GOOGLE_OAUTH_CLIENT_SECRET'],
    usedBy: 'המסלול החינמי בכל המערכות — כניסה עם Google (§8ב)',
    topUp: 'https://console.cloud.google.com/apis/credentials',
    topUpLabel: 'עמוד ההרשאות אצל גוגל',
    async check(id) {
      const secret = clean(process.env.GOOGLE_OAUTH_CLIENT_SECRET);
      // בקשת טוקן עם קוד פסול: אינה מנפיקה דבר ואינה נוגעת במשתמש אמיתי, ובכל
      // זאת מבחינה בין שתי תקלות שנראות זהות מבחוץ. נמדד 07/08 מול גוגל:
      // זיהוי נכון → 400 invalid_grant ("Malformed auth code"), כלומר הזוג
      // התקבל; סוד שגוי → 401 invalid_client. זה ההפרש שאנחנו קוראים.
      const res = await probe('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: 'more30-probe-not-a-real-code',
          client_id: id,
          client_secret: secret,
          redirect_uri: 'https://more30.com/auth/callback',
        }).toString(),
      });
      if (!res) return { state: 'unknown', detail: 'גוגל לא ענתה בזמן.' };
      const j: any = await res.json().catch(() => null);
      const err = String(j?.error ?? '');
      if (err === 'invalid_grant') {
        return { state: 'ok', detail: 'זיהוי הלקוח והסוד התקבלו על ידי גוגל. ל-OAuth אין יתרה — הוא חינמי.' };
      }
      if (err === 'invalid_client' || err === 'unauthorized_client') {
        return {
          state: 'invalid',
          detail: `גוגל דחתה את זוג הזיהוי: ${j?.error_description ?? err}. כניסה עם Google לא תעבוד באף מערכת.`,
        };
      }
      return { state: 'unknown', detail: `גוגל החזירה ${err || res.status} — לא מסקנה על תקפות הזוג.` };
    },
  },
  {
    key: 'gov-il',
    label: 'data.gov.il — מאגרים ציבוריים',
    env: 'DATAGOV_POLLING_STATIONS',
    alsoNeeds: [
      'DATAGOV_ELECTIONS_BALLOTS',
      'DATAGOV_ELECTIONS_CITIES',
      'DATAGOV_TRANSPORT_RESOURCE',
      'CBS_HOUSING_INDEX_ID',
      'XPLAN_BASE',
    ],
    keyless: true,
    usedBy: 'נדל״ן ברגע · סמל נדל״ן — קלפיות, תחבורה, תב״ע ומדד מחירי הדיור',
    topUp: 'https://data.gov.il/dataset',
    topUpLabel: 'קטלוג המאגרים',
    async check(resourceId) {
      // הערכים כאן הם מזהי מאגר, לא מפתחות: הממשק פתוח לכל. לכן שאלת "האם
      // החיבור פועל" נשאלת גם בפריסה שאין בה את המזהים — ואם יש מזהה, נמדד
      // המאגר עצמו ולא רק שהשרת חי. status_show חסום (403), datastore_search
      // ו-package_search פתוחים; נמדד 07/08.
      if (resourceId) {
        const res = await probe(
          `https://data.gov.il/api/3/action/datastore_search?resource_id=${encodeURIComponent(resourceId)}&limit=0`,
          {},
          15_000,
        );
        if (!res) return { state: 'unknown', detail: 'data.gov.il לא ענה בזמן.' };
        const j: any = await res.json().catch(() => null);
        if (res.ok && j?.success) {
          const total = Number(j?.result?.total ?? NaN);
          return {
            state: 'ok',
            detail: Number.isFinite(total)
              ? `המאגר חי — ${total.toLocaleString('he-IL')} שורות בקלפיות. אין מפתח ואין יתרה: הממשק ציבורי.`
              : 'המאגר עונה. אין מפתח ואין יתרה: הממשק ציבורי.',
          };
        }
        return { state: 'invalid', detail: `המאגר לא נמצא (${res.status}) — מזהה שהוחלף מפיל את הנתון בשקט.` };
      }
      const res = await probe('https://data.gov.il/api/3/action/package_search?rows=0', {}, 15_000);
      if (!res) return { state: 'unknown', detail: 'data.gov.il לא ענה בזמן.' };
      const j: any = await res.json().catch(() => null);
      if (!res.ok || !j?.success) return { state: 'unknown', detail: `data.gov.il החזיר ${res.status}.` };
      const count = Number(j?.result?.count ?? 0);
      return {
        state: 'ok',
        detail: `הממשק הציבורי עונה · ${count.toLocaleString('he-IL')} מאגרים בקטלוג. מזהי המאגרים שלנו יושבים בכספת בהיקף nadlan ואינם משתני סביבה כאן, ולכן נמדד השרת ולא המאגר עצמו.`,
      };
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
    topUpLabel: 'לוח נדרים פלוס',
    // אין ל"נדרים" ממשק יתרה, וסליקה אינה קרדיט שנגמר. בדיקה אמיתית כאן
    // הייתה מחייבת קריאה לממשק החיוב — ולא נוגעים בסליקה חיה כדי לצייר מסך.
  },
  {
    key: 'nedarim-platform',
    label: 'נדרים פלוס — חשבון הפלטפורמה',
    env: 'PLATFORM_NEDARIM_MOSAD',
    alsoNeeds: ['PLATFORM_NEDARIM_API_VALID'],
    usedBy: 'המנויים של more30 עצמם — חשבון נפרד מזה של הלקוח',
    topUp: 'https://matara.pro/nedarimplus/Reports/',
    topUpLabel: 'לוח נדרים פלוס',
    // חשבון סליקה שני, ולא כפילות: מוסד 7016674 גובה את המנויים שלנו, בעוד
    // ה-NEDARIM_* למעלה הוא החשבון שדרכו נגבים לקוחות המערכות. אין ממשק יתרה,
    // ומאותה סיבה כמו למעלה אין כאן קריאה לממשק החיוב.
  },
  {
    key: 'greeninvoice',
    label: 'Green Invoice — חשבוניות',
    env: 'GREENINVOICE_API_KEY',
    alsoNeeds: ['GREENINVOICE_API_SECRET'],
    // בכספת יושב INVOICE_PROVIDER בלבד — שם הספק שנבחר, לא מפתח שלו.
    covers: ['invoicing'],
    usedBy: 'חשבונית על כל מנוי ועל כל תשלום — §8ג',
    topUp: 'https://app.greeninvoice.co.il/settings/api',
    topUpLabel: 'מפתחות ה-API אצל Green Invoice',
    whenMissing:
      'הספק כבר נבחר — INVOICE_PROVIDER=greeninvoice יושב בכספת, ו-iCount הוא החלופה המאושרת. ' +
      'מה שחסר הוא זוג המפתחות של חשבון אמיתי (core.issues #14), ובלעדיו אין חשבונית על אף תשלום.',
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
    // service='supabase' בכספת הוא כתובות ומפתחות anon של הפרויקטים עצמם, ולא
    // חשבון נפרד: מי שמחזיק את החשבון הוא הטוקן הניהולי, ולכן הוא מכסה את שניהם.
    covers: ['supabase', 'supabase-management'],
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
      // ספק יכול לדרוש יותר משם אחד, ואז "יש מפתח" נמדד על כולם: זוג שחסר בו
      // צד אחד אינו עובד, ואין טעם להציג אותו כפועל.
      const names = [spec.env, ...(spec.alsoNeeds ?? [])];
      const notInVault = names.filter((n) => !vault.has(n));
      const notDeployed = names.filter((n) => !clean(process.env[n]));
      const inVault = notInVault.length === 0;
      const deployed = notDeployed.length === 0;

      const base: Provider = {
        key: spec.key,
        label: spec.label,
        usedBy: spec.usedBy,
        topUp: spec.topUp,
        topUpLabel: spec.topUpLabel,
        keyless: spec.keyless,
        inVault,
        deployed,
        state: 'missing',
        detail:
          spec.whenMissing ??
          'אין מפתח לספק הזה — לא בכספת ולא בפריסה. צריך לפתוח חשבון ולהוסיף מפתח.',
      };

      // ספק ציבורי נבדק תמיד: היעדר משתנה סביבה אצלנו אינו אומר שהממשק שלו שבור.
      if (!deployed && !spec.keyless) {
        if (notInVault.length === names.length) return base;
        if (notInVault.length) {
          return {
            ...base,
            detail: `חסר בכספת: ${notInVault.join(', ')}. הספק לא יעבוד גם אם השאר קיימים.`,
          };
        }
        return {
          ...base,
          state: 'not-deployed',
          detail: `${notDeployed.join(', ')} — קיים ב-core.secrets אבל אינו משתנה סביבה בפריסה הזאת, ולכן אי אפשר לבדוק אותו מכאן. זה תיקון של העתקת ערך קיים, לא של פתיחת חשבון.`,
        };
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
