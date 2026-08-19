// multi-project-sweep — לאילו פרויקטי Supabase כל מערכת חיה מדברת **בפועל**, כולם
//
// למה זה נכתב. הסריקות של 12/08 (autoconfirm-sweep, own-form-login-roundtrip)
// שלפו מכל מערכת **זוג אחד** URL+key — הקרוב ביותר זה לזה, בקובץ הראשון שיש בו
// שניהם — והצמידו למערכת פרויקט אחד. זו הנחה, לא מדידה: מערכת יכולה לדבר עם
// יותר מפרויקט אחד. bkalot (10) היא בדיוק המקרה הזה, ועליה הסריקה טעתה:
//
//   /bkalot/repo.js  → uhnrgujbdxhhmoxcjria   (מאגר הזכויות המרכזי, hub)
//   /bkalot/app.js   → bieebmnmkffwbqlsfozh   (הפרויקט של המערכת עצמה)
//
// repo.js נטען ראשון, ולכן autoconfirm-sweep רשם ל-bkalot פרויקט uhnrg, סימן
// "לא תואם ל-core.projects" — ו**שאל את /auth/v1/settings של הפרויקט הלא נכון**.
// core.projects דווקא צדק. המסקנה על ההרשמה/אישור-המייל של bkalot נמדדה על ה-hub.
//
// מה הסקריפט הזה עושה אחרת:
//   1. אוסף את **כל** ההתייחסויות ל-*.supabase.co בכל קובץ שהדף טוען, לא אחת.
//   2. לכל פרויקט — המפתח הקרוב אליו באותו קובץ, ומאיזה קובץ הוא הגיע.
//   3. מפריד בין קובצי המערכת עצמה לבין /auth-button.js, שהוא הווידג'ט המשותף
//      של הפורטל: פרויקט שמופיע רק שם אינו הפרויקט של המערכת.
//   4. שואל GET /auth/v1/settings לכל פרויקט שמופיע בקובצי המערכת עצמה.
//
// קריאה בלבד. אין יצירת משתמשים, אין התחברות, אין כתיבה לשום מסד — settings
// הוא נקודת קצה ציבורית שכל דפדפן קורא בטעינה. המערכות המוגנות
// (08/09/bkalut-app/bkalot-admin/zr_/NEDARIM3873) אינן ברשימה.
//
// שימוש:  node scripts/qa/multi-project-sweep.mjs
// פלט:    QA/platform/multi-project-0812/_results.json

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(process.cwd(), 'QA', 'platform', 'multi-project-0812');

// אותה רשימה כמו autoconfirm-sweep, כדי שההשוואה תהיה שורה-מול-שורה.
// registered = מה ש-core.projects.supabase_project רושם.
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
// (sb_publishable_…, שאינו נושא ref כלל).
const KEY_RE = /(?:eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,})|(?:sb_publishable_[A-Za-z0-9_-]{20,})/g;
const SHARED = '/auth-button.js';

function describeKey(key) {
  if (!key) return null;
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

// כל הפרויקטים שמוזכרים בכל הקבצים שהדף טוען — לא רק הראשון.
async function projectsFromProduction(target) {
  let page;
  try {
    page = await fetchText(target.url);
  } catch (e) {
    return { error: `page unreachable: ${e.message}` };
  }
  if (page.status !== 200) return { error: `page ${page.status}` };

  const srcs = [...page.body.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
  const abs = srcs.map((s) => new URL(s, target.url).href);
  const files = [{ href: '(page)', body: page.body }];
  for (const href of abs.slice(0, 12)) {
    try {
      const r = await fetchText(href);
      if (r.status === 200) files.push({ href: href.replace('https://more30.com', ''), body: r.body });
    } catch {
      /* חבילה שלא נענתה — נרשמת כשקט, לא כהיעדר */
    }
  }

  // ref → { key, from[], shared_only, kinds }. המפתח נלקח מהקובץ שבו ה-ref מופיע,
  // והקרוב ביותר אליו בתוכו — אותה שיטה שתוקנה ב-12/08, אבל לכל ref בנפרד.
  //
  // לא כל הפניה ל-*.supabase.co היא "המערכת מדברת עם הפרויקט הזה". mechiron (27)
  // טוענת קובץ CSS מ-Storage של פרויקט אחר (bkalot-theme.css) — נכס סטטי, לא
  // מסד ולא אימות. גרסה שלא הבחינה בכך דיווחה על 27 "MISMATCH מול core.projects",
  // ממצא שאינו קיים. לכן כל הפניה מסווגת לפי מה שבא **אחרי** הדומיין.
  const found = new Map();
  for (const f of files) {
    const keys = [...f.body.matchAll(KEY_RE)];
    for (const u of f.body.matchAll(/https:\/\/([a-z]{20})\.supabase\.co(\/[A-Za-z0-9/._-]{0,40})?/g)) {
      const ref = u[1];
      const tail = u[2] ?? '';
      const kind = tail.startsWith('/storage/') ? 'storage' : 'api';
      let best = null;
      for (const k of keys) {
        const d = Math.abs(k.index - u.index);
        if (!best || d < best.d) best = { d, key: k[0] };
      }
      const prev = found.get(ref);
      const isShared = f.href.includes(SHARED);
      if (!prev) {
        found.set(ref, { ref, key: best?.key ?? null, pair_distance: best?.d ?? null, from: [f.href], shared_only: isShared, kinds: [kind] });
      } else {
        if (!prev.from.includes(f.href)) prev.from.push(f.href);
        if (!prev.kinds.includes(kind)) prev.kinds.push(kind);
        if (!isShared) prev.shared_only = false;
        // מפתח מקובץ של המערכת עצמה גובר על מפתח מהווידג'ט המשותף
        if (!isShared && best && (prev.pair_distance === null || best.d < prev.pair_distance)) {
          prev.key = best.key;
          prev.pair_distance = best.d;
        }
      }
    }
  }
  return { projects: [...found.values()], files_read: files.length, scripts: abs.length };
}

async function settingsFor(ref, key) {
  if (!key) return { error: 'no key found beside this url' };
  try {
    const res = await fetch(`https://${ref}.supabase.co/auth/v1/settings`, { headers: { apikey: key } });
    const text = await res.text();
    if (res.status !== 200) return { error: `http-${res.status}`, body: text.slice(0, 200) };
    const j = JSON.parse(text);
    return {
      disable_signup: j.disable_signup ?? null,
      mailer_autoconfirm: j.mailer_autoconfirm ?? null,
      external_google: j.external?.google ?? null,
      external_email: j.external?.email ?? null,
    };
  } catch (e) {
    return { error: e.message };
  }
}

const results = [];

for (const t of TARGETS) {
  const row = { number: t.num, slug: t.slug, live_url: t.url, registered: t.registered };
  const seen = await projectsFromProduction(t);
  if (seen.error) {
    row.error = seen.error;
    results.push(row);
    continue;
  }
  row.files_read = seen.files_read;
  row.scripts = seen.scripts;

  // הפרויקטים של המערכת עצמה — בלי אלה שמופיעים רק ב-auth-button.js, ובלי
  // אלה שההפניה היחידה אליהם היא נכס סטטי מ-Storage.
  const isOwn = (p) => !p.shared_only && p.kinds.includes('api');
  const own = seen.projects.filter(isOwn);
  row.projects = [];
  for (const p of seen.projects) {
    const entry = {
      ref: p.ref,
      own_files: !p.shared_only,
      reference_kind: p.kinds.join('+'),
      counts_as_own_project: isOwn(p),
      from: p.from,
      key: describeKey(p.key),
      key_ref_matches_url: p.key ? (describeKey(p.key).ref ?? p.ref) === p.ref : null,
      pair_distance: p.pair_distance,
    };
    if (isOwn(p)) entry.settings = await settingsFor(p.ref, p.key);
    row.projects.push(entry);
  }

  row.own_project_count = own.length;
  row.registered_is_served = t.registered ? seen.projects.some((p) => p.ref === t.registered) : null;
  row.registered_in_own_files = t.registered ? own.some((p) => p.ref === t.registered) : null;
  row.storage_only_refs = seen.projects.filter((p) => !p.kinds.includes('api')).map((p) => p.ref);

  if (!seen.projects.length) row.verdict = 'no supabase reference in served bundles';
  else if (!own.length) row.verdict = 'portal-only — the only key served is the shared login widget';
  else if (t.registered === null) row.verdict = `unregistered in core.projects; serves ${own.map((p) => p.ref).join(' + ')}`;
  else if (row.registered_in_own_files && own.length > 1) row.verdict = `multi-project: registered ${t.registered} + ${own.filter((p) => p.ref !== t.registered).map((p) => p.ref).join(' + ')}`;
  else if (row.registered_in_own_files) row.verdict = 'single project, matches core.projects';
  else row.verdict = `MISMATCH — core.projects says ${t.registered}, own files serve ${own.map((p) => p.ref).join(' + ')}`;

  results.push(row);
}

mkdirSync(OUT, { recursive: true });
writeFileSync(
  join(OUT, '_results.json'),
  JSON.stringify({ at: new Date().toISOString(), targets: TARGETS.length, results }, null, 2),
  'utf8',
);

for (const r of results) {
  console.log(`${r.number} ${r.slug.padEnd(9)} ${r.verdict ?? r.error}`);
}
