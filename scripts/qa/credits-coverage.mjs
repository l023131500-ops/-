/**
 * Does the API-balances screen cover every provider we are actually connected to?
 *
 * more30-priority.md §3א asks for a screen that shows, per service we're wired
 * to, whether the connection works, how much is left, and where to top it up —
 * and it names `core.secrets` as the list to cover. The failure mode this checks
 * is the quiet one: a service that has a secret in the vault but **no row in the
 * screen** isn't shown as broken or missing, it just isn't shown. That is how a
 * credit runs out with a dashboard that says everything is fine.
 *
 * Two halves, both measured and neither assumed:
 *
 *   1. Coverage. Parse the SPECS table out of portal/api/credits.ts and match it
 *      against QA/platform/credits-coverage-0807/_secrets-services.json — a
 *      names-only snapshot of `core.secrets`. A service matches a spec when the
 *      spec names one of its keys, or when the spec claims it in `covers`
 *      (`supabase` and `invoicing`, where the account and the key differ).
 *
 *   2. The two new live probes. Reading the source proves a row exists; it does
 *      not prove the probe distinguishes a working credential from a rejected
 *      one. Google's token endpoint and data.gov.il are called for real.
 *
 * The Google probe needs the pair to be present in the environment. Without it
 * that half reports SKIP and says so — it does not pass by default:
 *
 *   $env:GOOGLE_OAUTH_CLIENT_ID='...'; $env:GOOGLE_OAUTH_CLIENT_SECRET='...'
 *   node scripts/qa/credits-coverage.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const SRC = 'portal/api/credits.ts';
const SNAP = 'QA/platform/credits-coverage-0807/_secrets-services.json';
const OUT = 'QA/platform/credits-coverage-0807/_results.json';

let pass = 0, fail = 0, skip = 0;
const rows = [];
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (detail ? `  << ${detail}` : '')); }
  rows.push({ check: name, result: cond ? 'pass' : 'fail', detail: detail ?? null });
};
const skipped = (name, why) => {
  skip++; console.log('  SKIP  ' + name + `  << ${why}`);
  rows.push({ check: name, result: 'skip', detail: why });
};

// ── 1. כיסוי ──────────────────────────────────────────────────────────────────
const src = readFileSync(SRC, 'utf8');

/** מוציא את טבלת SPECS מהמקור. שדה חסר יזוהה כחסר, ולא ינוחש. */
function parseSpecs(text) {
  const start = text.indexOf('const SPECS: Spec[] = [');
  if (start < 0) throw new Error('לא נמצאה טבלת SPECS ב-' + SRC);
  const body = text.slice(start, text.indexOf('\n];', start));
  const specs = [];
  for (const chunk of body.split(/\n  \{\n/).slice(1)) {
    const one = (re) => chunk.match(re)?.[1] ?? null;
    const list = (field) => {
      const raw = chunk.match(new RegExp(`${field}:\\s*\\[([^\\]]*)\\]`, 's'))?.[1];
      return raw ? [...raw.matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];
    };
    const key = one(/key: '([^']+)'/);
    if (!key) continue;
    specs.push({
      key,
      env: one(/\n    env: '([^']+)'/),
      alsoNeeds: list('alsoNeeds'),
      covers: list('covers'),
      keyless: /keyless: true/.test(chunk),
      hasCheck: /async check\(/.test(chunk),
      topUp: one(/topUp: '([^']+)'/),
    });
  }
  return specs;
}

const specs = parseSpecs(src);
// BOM: כלי חלונות מוסיפים אותו בשקט, ו-JSON.parse נופל עליו.
const snap = JSON.parse(readFileSync(SNAP, 'utf8').replace(/^﻿/, ''));

console.log(`=== §3א — כיסוי ספקים: ${specs.length} שורות במסך מול ${snap.services.length} שירותים בכספת (${snap.measuredAt}) ===`);

ok('כל שורה במסך מצהירה env, שימוש ויעד להוספה',
  specs.every((s) => s.env && s.topUp),
  specs.filter((s) => !s.env || !s.topUp).map((s) => s.key).join(', '));

const nameOf = new Map();      // env name -> spec key
for (const s of specs) for (const n of [s.env, ...s.alsoNeeds]) nameOf.set(n, s.key);
const coversOf = new Map();    // service -> spec key
for (const s of specs) for (const c of s.covers) coversOf.set(c, s.key);

const uncovered = [];
for (const svc of snap.services) {
  const via = coversOf.get(svc.service) ?? svc.names.map((n) => nameOf.get(n)).find(Boolean) ?? null;
  if (!via) uncovered.push(svc.service);
  rows.push({ check: `coverage:${svc.service}`, result: via ? 'pass' : 'fail', detail: via ? `מכוסה על ידי ${via}` : 'אין שורה במסך' });
}
ok(`כל שירות בכספת מקבל שורה במסך (${snap.services.length} שירותים)`,
  uncovered.length === 0, uncovered.join(', '));

// שורה שמצהירה covers על שירות שאינו בכספת היא כיסוי מדומה, ולכן נבדקת גם היא.
const phantom = [...coversOf.keys()].filter((c) => !snap.services.some((s) => s.service === c));
ok('אין הצהרת covers על שירות שאינו בכספת', phantom.length === 0, phantom.join(', '));

// ── 2. הבדיקות החיות שנוספו ───────────────────────────────────────────────────
console.log('\n=== שתי הבדיקות החדשות, מול הספק האמיתי ===');

const id = (process.env.GOOGLE_OAUTH_CLIENT_ID ?? '').trim();
const secret = (process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? '').trim();

async function googleToken(clientId, clientSecret) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: 'more30-probe-not-a-real-code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: 'https://more30.com/auth/callback',
    }).toString(),
  });
  return { status: r.status, error: String((await r.json().catch(() => ({})))?.error ?? '') };
}

if (!id || !secret) {
  skipped('Google OAuth — הזוג האמיתי מתקבל', 'GOOGLE_OAUTH_CLIENT_ID/SECRET אינם בסביבה של הריצה הזאת');
  skipped('Google OAuth — סוד שגוי נדחה', 'אותה סיבה');
} else {
  // הזוג האמיתי: הקוד פסול ולכן invalid_grant — וזו בדיוק ההוכחה שהזיהוי התקבל.
  const good = await googleToken(id, secret);
  ok('Google OAuth — הזוג האמיתי מתקבל (400 invalid_grant)',
    good.status === 400 && good.error === 'invalid_grant', `${good.status} ${good.error}`);

  // ובלי ההבחנה הזאת הבדיקה חסרת ערך: סוד שגוי חייב להיראות אחרת.
  const bad = await googleToken(id, 'GOCSPX-not-a-real-secret');
  ok('Google OAuth — סוד שגוי נדחה (401 invalid_client)',
    bad.status === 401 && bad.error === 'invalid_client', `${bad.status} ${bad.error}`);
}

const resourceId = (process.env.DATAGOV_POLLING_STATIONS ?? '68c4d7e8-2218-48ee-996f-2db2f72b2395').trim();
const ds = await fetch(
  `https://data.gov.il/api/3/action/datastore_search?resource_id=${encodeURIComponent(resourceId)}&limit=0`,
).then((r) => r.json()).catch(() => null);
ok('data.gov.il — מאגר הקלפיות עונה ומחזיר ספירה',
  ds?.success === true && Number(ds?.result?.total) > 0, `total=${ds?.result?.total}`);

// המסלול חסר-המזהה, שהוא מה שיקרה בפריסת הפורטל: חייב להיות מדיד גם הוא.
const ps = await fetch('https://data.gov.il/api/3/action/package_search?rows=0')
  .then((r) => r.json()).catch(() => null);
ok('data.gov.il — נפילה לספירת הקטלוג עובדת בלי מזהה',
  ps?.success === true && Number(ps?.result?.count) > 0, `count=${ps?.result?.count}`);

// status_show חסום (403) — נבדק, ולכן אינו הבדיקה שנבחרה. אם ייפתח, הוא זול יותר.
const st = await fetch('https://data.gov.il/api/3/action/status_show').then((r) => r.status).catch(() => 0);
rows.push({ check: 'data.gov.il — status_show', result: 'note', detail: `HTTP ${st} — חסום, ומכאן הבחירה ב-package_search` });
console.log(`  NOTE  data.gov.il status_show → HTTP ${st} (חסום; מכאן הבחירה ב-package_search)`);

mkdirSync('QA/platform/credits-coverage-0807', { recursive: true });
writeFileSync(OUT, JSON.stringify({
  ran: 'scripts/qa/credits-coverage.mjs',
  source: SRC,
  snapshot: SNAP,
  specs: specs.map(({ key, env, alsoNeeds, covers, keyless, hasCheck }) => ({ key, env, alsoNeeds, covers, keyless, hasCheck })),
  summary: { pass, fail, skip },
  checks: rows,
}, null, 2) + '\n', 'utf8');

console.log(`\n${pass} עברו · ${fail} נכשלו · ${skip} דולגו  →  ${OUT}`);
process.exit(fail ? 1 : 0);
