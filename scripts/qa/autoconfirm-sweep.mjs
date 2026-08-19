// autoconfirm-sweep — §1א/§8ב: מי עוד דורש אישור מייל, בכל המערכות החיות בבת אחת
//
// מה שידוע מהצעד הקודם (QA/platform/own-form-login-0812): הבאג "נרשמתי ואז
// 'סיסמה שגויה'" אינו אי-התאמת hash. הוא הגדרה אחת בפרויקט Supabase —
// mailer_autoconfirm=false. כשהיא כבויה, signup מחזיר 200 בלי session,
// וההתחברות מיד אחריה מחזירה email_not_confirmed, שנראה לקורא עברית בדיוק
// כמו סיסמה שגויה. זה נמדד על שלוש מערכות בלבד (01, 15, 16) כי רק להן יש
// טופס כניסה משלהן. אבל ההגדרה היא **של הפרויקט**, לא של הטופס: כל מערכת
// שנשענת על אותו פרויקט יורשת אותה, וגם מערכת שנכנסים אליה דרך הפורטל
// המשותף. מי יורש מה מעולם לא נמדד — ההערה של הצעד הקודם אמרה זאת מפורשות
// ("probably fine — probably, not measured").
//
// הסקריפט הזה שואל את כל המערכות החיות יחד, ועונה על שתי שאלות:
//   1. לאיזה פרויקט Supabase כל מערכת מדברת **בפועל**, לפי מה ש-more30.com
//      מגיש — לא לפי core.projects.supabase_project (שהוא רישום, לא מדידה).
//   2. מה שרת האימות של אותו פרויקט מצהיר: mailer_autoconfirm, disable_signup,
//      ואילו ספקי כניסה פתוחים.
//
// קריאה בלבד. אין יצירת משתמשים, אין התחברות, אין כתיבה לשום מסד — רק
// GET /auth/v1/settings, שהוא נקודת קצה ציבורית שכל דפדפן קורא בטעינה.
// המערכות המוגנות (08/09/bkalut-app/bkalot-admin/zr_/NEDARIM3873) אינן ברשימה.
//
// שיטת שליפת המפתח זהה ל-own-form-login-roundtrip: הזוג URL+key נלקח מתוך
// **אותו קובץ** והקרוב ביותר זה לזה, ו-/auth-button.js (הווידג'ט המשותף של
// הפורטל) נבדק אחרון — כי הצמדת URL של מערכת אחת למפתח של אחרת מייצרת 401
// שנקרא כבאג שאינו קיים. ראה QA/torah/anon-key-pairing-0812.
//
// שימוש:  node scripts/qa/autoconfirm-sweep.mjs
// פלט:    QA/platform/autoconfirm-0812/_results.json

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(process.cwd(), 'QA', 'platform', 'autoconfirm-0812');

// כל המערכות החיות הלא-מוגנות שיש להן כתובת חיה, לפי core.projects.
// supabase_project כאן הוא מה ש**רשום**; הסקריפט בודק מה מוגש בפועל.
const TARGETS = [
  { num: '01', slug: 'torah', url: 'https://more30.com/torah/', registered: 'bieebmnmkffwbqlsfozh' },
  { num: '02', slug: 'tamlul', url: 'https://more30.com/tamlul/', registered: 'bieebmnmkffwbqlsfozh' },
  { num: '03', slug: 'modaot', url: 'https://more30.com/modaot/', registered: 'bieebmnmkffwbqlsfozh' },
  { num: '04', slug: 'imud', url: 'https://more30.com/imud/', registered: 'uhnrgujbdxhhmoxcjria' },
  { num: '06', slug: 'briut', url: 'https://more30.com/briut/', registered: 'csjekrvukbdznetsrodj' },
  { num: '10', slug: 'bkalot', url: 'https://more30.com/bkalot/', registered: 'bieebmnmkffwbqlsfozh' },
  { num: '12', slug: 'smel', url: 'https://more30.com/smel/', registered: 'csjekrvukbdznetsrodj' },
  { num: '14', slug: 'smachot', url: 'https://more30.com/smachot/', registered: null },
  { num: '15', slug: 'egod', url: 'https://more30.com/egod/', registered: 'hkkkynyoigzlttpynoeo' },
  { num: '16', slug: 'chatzor', url: 'https://more30.com/chatzor/', registered: 'uhnrgujbdxhhmoxcjria' },
  { num: '17', slug: 'chizukim', url: 'https://more30.com/chizukim/', registered: 'csjekrvukbdznetsrodj' },
  { num: '18', slug: 'orech', url: 'https://more30.com/orech/', registered: 'bieebmnmkffwbqlsfozh' },
  { num: '21', slug: 'mthbram', url: 'https://more30.com/mthbram/', registered: 'aypsqqvfohekxxuqsmrw' },
  { num: '22', slug: 'zchuyot', url: 'https://more30.com/zchuyot/', registered: 'trerolyveytzgksawrme' },
  { num: '24', slug: 'galil', url: 'https://more30.com/galil/', registered: 'mwljkonwdeuaahsigjdp' },
  { num: '26', slug: 'studio', url: 'https://more30.com/studio/', registered: 'uhnrgujbdxhhmoxcjria' },
  { num: '27', slug: 'mechiron', url: 'https://more30.com/mechiron/', registered: 'csjekrvukbdznetsrodj' },
  { num: '28', slug: 'kupot', url: 'https://more30.com/kupot/', registered: 'uhnrgujbdxhhmoxcjria' },
  { num: '30', slug: 'crm', url: 'https://more30.com/crm/', registered: 'jhbeelzvjvhnkxldqvxx' },
  { num: '31', slug: 'gesher', url: 'https://more30.com/gesher/', registered: 'ygaqqnuyfnumezxxmtbh' },
  { num: '32', slug: 'nadlan', url: 'https://more30.com/nadlan/', registered: 'uhnrgujbdxhhmoxcjria' },
  { num: '33', slug: 'portal', url: 'https://more30.com/', registered: 'uhnrgujbdxhhmoxcjria' },
  { num: '34', slug: 'kesef', url: 'https://more30.com/kesef/', registered: 'uhnrgujbdxhhmoxcjria' },
  { num: '35', slug: 'kiosk', url: 'https://more30.com/kiosk/', registered: null },
  { num: '36', slug: 'tivuch', url: 'https://more30.com/tivuch/', registered: 'uhnrgujbdxhhmoxcjria' },
  { num: '40', slug: 'gannenet', url: 'https://more30.com/gannenet/', registered: null },
];

// שני פורמטים חיים במקביל: anon ישן (JWT, ה-ref בתוכו) ו-publishable חדש
// (sb_publishable_…, שאינו נושא ref כלל). regex שמכיר רק את הראשון מדווח
// "אין מפתח" על אתר שיש בו מפתח תקין — זה קרה ב-torah ב-12/08.
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

async function credsFromProduction(target) {
  let page;
  try {
    page = await fetchText(target.url);
  } catch (e) {
    return { error: `page unreachable: ${e.message}` };
  }
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
  // auth-button.js אחרון: הוא של הפורטל, לא של המערכת.
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
      // האם הקובץ שממנו נלקח הזוג הוא הווידג'ט המשותף — כלומר: המערכת עצמה
      // לא נושאת מפתח, והיא נשענת על כניסת הפורטל.
      from_shared_widget: f.href.includes('/auth-button.js'),
    };
  }
  return { error: 'no supabase creds in served bundles', scripts: abs.length };
}

const results = [];
// זיכרון לפי פרויקט — /auth/v1/settings של אותו ref נשאל פעם אחת.
const settingsCache = new Map();

for (const t of TARGETS) {
  const row = { number: t.num, slug: t.slug, live_url: t.url, project_in_core: t.registered };
  const creds = await credsFromProduction(t);
  if (creds.error) {
    row.creds = creds;
    row.verdict = `not-measurable (${creds.error})`;
    results.push(row);
    console.log(`${t.num} ${t.slug}: ${row.verdict}`);
    continue;
  }

  const served = creds.supabaseUrl.slice(8, 28);
  row.creds = {
    supabase_url: creds.supabaseUrl,
    project_served: served,
    matches_core_projects: t.registered ? served === t.registered : null,
    key: describeKey(creds.anonKey),
    found_in: creds.from,
    from_shared_widget: creds.from_shared_widget,
    pair_distance: creds.pair_distance,
    scripts_read: creds.scripts,
  };

  const cacheKey = `${served}|${creds.anonKey.slice(-12)}`;
  if (!settingsCache.has(cacheKey)) {
    let s;
    try {
      const res = await fetch(`${creds.supabaseUrl}/auth/v1/settings`, { headers: { apikey: creds.anonKey } });
      const text = await res.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {
        /* גוף שאינו JSON נשמר כטקסט */
      }
      s = res.status === 200 && json
        ? {
            disable_signup: json.disable_signup ?? null,
            mailer_autoconfirm: json.mailer_autoconfirm ?? null,
            external_google: json.external?.google ?? null,
            external_email: json.external?.email ?? null,
          }
        : { error: `http-${res.status}`, body: text.slice(0, 200) };
    } catch (e) {
      s = { error: `unreachable: ${e.message}` };
    }
    settingsCache.set(cacheKey, s);
  }
  row.settings = settingsCache.get(cacheKey);

  // המסקנה. mailer_autoconfirm=false הוא בדיוק מה ש-§1א מתאר, ו-§8ב
  // ("מיד לאחר ההרשמה הלקוח נכנס לתוך המערכת") לא יכול להתקיים תחתיו.
  if (row.settings.error) {
    row.verdict = `settings-unreadable (${row.settings.error})`;
  } else if (row.settings.disable_signup === true) {
    row.verdict = 'signup-closed — §8ב cannot run here at all';
  } else if (row.settings.mailer_autoconfirm === false) {
    row.verdict = 'REQUIRES EMAIL CONFIRMATION — reproduces §1א, breaks §8ב';
  } else if (row.settings.mailer_autoconfirm === true) {
    row.verdict = 'autoconfirm on — signup→login roundtrip can pass';
  } else {
    row.verdict = 'mailer_autoconfirm not reported';
  }

  results.push(row);
  console.log(`${t.num} ${t.slug}: ${served} — ${row.verdict}`);
}

// סיכום לפי פרויקט: ההגדרה היא של הפרויקט, ולכן זו יחידת התיקון.
const byProject = {};
for (const r of results) {
  const p = r.creds?.project_served;
  if (!p) continue;
  byProject[p] ??= { autoconfirm: r.settings?.mailer_autoconfirm ?? null, disable_signup: r.settings?.disable_signup ?? null, systems: [] };
  byProject[p].systems.push(`${r.number}/${r.slug}`);
}

mkdirSync(OUT, { recursive: true });
writeFileSync(
  join(OUT, '_results.json'),
  JSON.stringify({ at: new Date().toISOString(), targets: TARGETS.length, by_project: byProject, results }, null, 2),
  'utf8',
);
console.log('\n--- by project ---');
console.log(JSON.stringify(byProject, null, 2));
