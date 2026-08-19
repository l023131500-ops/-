// own-form-login-roundtrip — §1א: הרשמה → התנתקות → התחברות, מורצת בפועל
//
// הסריקה של 12/08 (own-login-hash-sweep) קבעה ששלוש מערכות חיות מחזיקות
// טופס כניסה משלהן מעל Supabase Auth — torah (01), egod (15), chatzor (16) —
// ושאי-התאמת hash לא יכולה לקרות בהן מבנית. זו הייתה **קריאה בקוד**, לא
// הרצה: "אין אי-התאמת hash" איננו "ההתחברות עובדת".
//
// §1א מנוסח כקריטריון קבלה: "אמת: הרשמה → התנתקות → התחברות עובדת".
// הסקריפט הזה מריץ אותו בפועל מול שרת האימות האמיתי של כל מערכת, עם
// המפתח ש-more30.com מגיש בפועל (לא מהקוד המקומי):
//
//   1. שולף מה-HTML החי את חבילות ה-JS, ומהן את SUPABASE_URL + anon key.
//   2. GET /auth/v1/settings — האם ההרשמה פתוחה, והאם המייל מאושר אוטומטית
//      (mailer_autoconfirm). זה הסעיף המכריע: אם ההרשמה דורשת אישור מייל,
//      התחברות מיד אחריה מחזירה "Invalid login credentials" — בדיוק התסמין
//      שעליו §1א מתלונן, בלי שום אי-התאמת hash.
//   3. התחברות עם משתמש הבדיקה הרשמי (§1ב) — test@more30.com.
//   4. סבב מלא: signup עם כתובת QA חדשה → מיד token grant_type=password
//      עם אותם פרטים → מה קרה.
//
// מצב טסט: נוצרים משתמשי QA בלבד, בכתובות qa-…, ואין שום שליחה ללקוח.
// המערכות המוגנות (08/09/bkalut-app/bkalot-admin/zr_/NEDARIM3873) אינן כאן.
//
// שימוש:  node scripts/qa/own-form-login-roundtrip.mjs [first|rest]
//   first — שלוש המערכות של 12/08 (ברירת מחדל, כדי שהרצה חוזרת תשחזר)
//   rest  — שלוש המערכות שנותרו: 21 mthbram, 30 crm, 31 gesher,
//           עם 01 ו-15 כ**ביקורת**: תוצאה שסותרת אותן פוסלת את הסקריפט,
//           לא את המערכת (הלקח מ-notconfirmed-message-sweep).
// פלט:    QA/platform/own-form-login-<set>-0812/_results.json
//         (הסט הראשון נשאר ב-own-form-login-0812/, ראיה קיימת)

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

// חמש המערכות שיש להן טופס כניסה משלהן מעל Supabase Auth, לפי
// QA/platform/own-login-hash-0812 ו-notconfirmed-message-0812, ועוד 16
// chatzor שנמדדה בסט הראשון. ref הפרויקט הוא מה ש-core.projects רושם.
const SETS = {
  first: [
    { num: '01', slug: 'torah', url: 'https://more30.com/torah/', project: 'bieebmnmkffwbqlsfozh' },
    { num: '15', slug: 'egod', url: 'https://more30.com/egod/', project: 'hkkkynyoigzlttpynoeo' },
    { num: '16', slug: 'chatzor', url: 'https://more30.com/chatzor/', project: 'uhnrgujbdxhhmoxcjria' },
  ],
  rest: [
    { num: '21', slug: 'mthbram', url: 'https://more30.com/mthbram/', project: 'aypsqqvfohekxxuqsmrw' },
    { num: '30', slug: 'crm', url: 'https://more30.com/crm/', project: 'jhbeelzvjvhnkxldqvxx' },
    { num: '31', slug: 'gesher', url: 'https://more30.com/gesher/', project: 'ygaqqnuyfnumezxxmtbh' },
    { num: '01', slug: 'torah', url: 'https://more30.com/torah/', project: 'bieebmnmkffwbqlsfozh', control: true },
    { num: '15', slug: 'egod', url: 'https://more30.com/egod/', project: 'hkkkynyoigzlttpynoeo', control: true },
  ],
};

const SET = process.argv[2] === 'rest' ? 'rest' : 'first';
const TARGETS = SETS[SET];
const OUT = join(process.cwd(), 'QA', 'platform', SET === 'first' ? 'own-form-login-0812' : 'own-form-login-rest-0812');

// משתמש הבדיקה הרשמי לפי §1ב.
const TEST_EMAIL = 'test@more30.com';
const TEST_PASS = 'More30Test2026';
// סיסמת ה-QA לסבב ההרשמה — לא בשימוש בשום מקום אחר.
const QA_PASS = 'Qa!Roundtrip2026';

// מזהה ריצה, כדי שכל הרצה תיצור כתובת QA חדשה ולא תיתקל ב"כבר רשום"
// של ההרצה הקודמת — אחרת סבב שני מודד משתמש ותיק, לא הרשמה.
const STAMP = `0812-${Date.now().toString(36).slice(-4)}`;

// שני פורמטים חיים במקביל: מפתח anon ישן (JWT, ה-ref בתוכו) ומפתח
// publishable חדש (sb_publishable_…, שאינו נושא ref כלל).
const KEY_RE = /(?:eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,})|(?:sb_publishable_[A-Za-z0-9_-]{20,})/g;

function describeKey(key) {
  if (key.startsWith('sb_publishable_')) return { format: 'publishable', role: 'anon', ref: null };
  try {
    const body = JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString('utf8'));
    return { format: 'jwt', role: body.role ?? null, ref: body.ref ?? null };
  } catch {
    return { format: 'jwt', role: null, ref: null };
  }
}

async function fetchText(url) {
  const res = await fetch(url, { redirect: 'follow' });
  return { status: res.status, body: await res.text() };
}

// מוצא את SUPABASE_URL + המפתח בתוך החבילות ש-more30.com מגיש בפועל.
//
// הזוג נלקח **מתוך אותו קובץ**, והקרוב ביותר זה לזה. גרסה קודמת לקחה את
// ההתאמה הראשונה מכל סוג על פני כל החבילות יחד, והצמידה את ה-URL של torah
// למפתח של פורטל מתוך /auth-button.js המשותף — צירוף שאף פעם לא נשלח
// בפועל, שהחזיר 401 "Invalid API key" ונקרא כבאג שאינו קיים. auth-button.js
// הוא הווידג'ט המשותף של הפורטל, לא מערכת האימות של האתר, ולכן נבדק אחרון.
async function credsFromProduction(target) {
  const page = await fetchText(target.url);
  if (page.status !== 200) return { error: `page ${page.status}` };

  const srcs = [...page.body.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
  const abs = srcs.map((s) => new URL(s, target.url).href);
  const files = [{ href: target.url, body: page.body }];
  for (const href of abs.slice(0, 12)) {
    try {
      const r = await fetchText(href);
      if (r.status === 200) files.push({ href, body: r.body });
    } catch {
      /* חבילה שלא נענתה — נרשמת כשקט, לא כהיעדר */
    }
  }
  files.sort((a, b) => Number(a.href.includes('/auth-button.js')) - Number(b.href.includes('/auth-button.js')));

  for (const f of files) {
    const urls = [...f.body.matchAll(/https:\/\/([a-z]{20})\.supabase\.co/g)];
    const keys = [...f.body.matchAll(KEY_RE)];
    if (!urls.length || !keys.length) continue;
    let best = null;
    for (const u of urls) {
      for (const k of keys) {
        const d = Math.abs(k.index - u.index);
        if (!best || d < best.d) best = { d, url: `https://${u[1]}.supabase.co`, key: k[0] };
      }
    }
    return {
      supabaseUrl: best.url,
      anonKey: best.key,
      scripts: abs.length,
      from: f.href.replace('https://more30.com', ''),
      pair_distance: best.d,
    };
  }
  return { error: 'no supabase creds in served bundles', scripts: abs.length };
}

async function authCall(base, key, path, init = {}) {
  const res = await fetch(`${base}/auth/v1/${path}`, {
    ...init,
    headers: { apikey: key, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* גוף שאינו JSON נשמר כטקסט */
  }
  return { status: res.status, json, text: json ? null : text.slice(0, 300) };
}

// מסכם תשובת התחברות לכדי מסקנה אחת, בלי לשמור טוקן לדיסק.
function summarizeLogin(r) {
  if (r.status === 200 && r.json?.access_token) {
    return { ok: true, verdict: 'session-issued', user_confirmed: !!r.json.user?.email_confirmed_at };
  }
  const code = r.json?.error_code ?? r.json?.error ?? null;
  const msg = r.json?.msg ?? r.json?.error_description ?? r.json?.message ?? r.text ?? null;
  return { ok: false, verdict: code || `http-${r.status}`, message: msg };
}

const results = [];

for (const t of TARGETS) {
  const row = { number: t.num, slug: t.slug, live_url: t.url, project_in_core: t.project, control: !!t.control };
  const creds = await credsFromProduction(t);
  if (creds.error) {
    row.creds = creds;
    results.push(row);
    continue;
  }
  row.creds = {
    supabase_url: creds.supabaseUrl,
    project_served: creds.supabaseUrl.slice(8, 28),
    matches_core_projects: creds.supabaseUrl.includes(t.project),
    key: describeKey(creds.anonKey),
    found_in: creds.from,
    pair_distance: creds.pair_distance,
    scripts_read: creds.scripts,
  };

  const base = creds.supabaseUrl;
  const key = creds.anonKey;

  // (2) מה שרת האימות עצמו מצהיר.
  const settings = await authCall(base, key, 'settings');
  row.settings = settings.status === 200
    ? {
        disable_signup: settings.json?.disable_signup ?? null,
        mailer_autoconfirm: settings.json?.mailer_autoconfirm ?? null,
        external_google: settings.json?.external?.google ?? null,
        external_email: settings.json?.external?.email ?? null,
      }
    : { error: `http-${settings.status}`, body: settings.text };

  // (3) משתמש הבדיקה הרשמי של §1ב.
  row.test_user_login = summarizeLogin(
    await authCall(base, key, 'token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS }),
    }),
  );

  // (4) הסבב שעליו §1א מדבר: הרשמה ואז מיד התחברות, אותם פרטים.
  const qaEmail = `qa-roundtrip-${t.slug}-${STAMP}@more30.com`;
  const signup = await authCall(base, key, 'signup', {
    method: 'POST',
    body: JSON.stringify({ email: qaEmail, password: QA_PASS }),
  });
  row.roundtrip = {
    email: qaEmail,
    signup: {
      status: signup.status,
      session_returned: !!signup.json?.access_token,
      user_created: !!(signup.json?.id || signup.json?.user?.id),
      email_confirmed_at: signup.json?.email_confirmed_at ?? signup.json?.user?.email_confirmed_at ?? null,
      error: signup.status >= 400 ? (signup.json?.msg ?? signup.json?.error_description ?? signup.text) : null,
    },
  };
  row.roundtrip.login_after_signup = summarizeLogin(
    await authCall(base, key, 'token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email: qaEmail, password: QA_PASS }),
    }),
  );

  // המסקנה: האם §1א משוחזר כאן, ואם כן — מאיזו סיבה.
  const rt = row.roundtrip;
  if (rt.signup.status >= 400) {
    row.verdict = `signup-blocked (${rt.signup.error})`;
  } else if (rt.login_after_signup.ok) {
    row.verdict = 'roundtrip-passes';
  } else if (row.settings.mailer_autoconfirm === false) {
    row.verdict = 'REPRODUCES §1א — email confirmation required, login after signup fails';
  } else {
    row.verdict = `roundtrip-fails (${rt.login_after_signup.verdict})`;
  }

  results.push(row);
}

mkdirSync(OUT, { recursive: true });
writeFileSync(
  join(OUT, '_results.json'),
  JSON.stringify({ at: new Date().toISOString(), set: SET, targets: TARGETS.length, results }, null, 2),
  'utf8',
);
console.log(JSON.stringify(results, null, 2));
