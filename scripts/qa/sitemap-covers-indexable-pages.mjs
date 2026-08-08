/**
 * Does the sitemap list every page this site actually offers a crawler?
 *
 * scripts/gen-sitemap.mjs writes portal/public/sitemap.xml from the live
 * registry, and it was written to answer one question — which *systems* are open
 * to the public. So it lists the home page and the system mounts, and nothing
 * else. The portal serves fifteen static pages of its own from portal/public/,
 * and not one of them was ever considered.
 *
 * Thirteen of the fifteen carry `<meta name="robots" content="noindex">` — the
 * nine admin screens, /login, /me, /subscribe, /404 — and their absence is
 * correct. Two do not:
 *
 *   showcase.html — served at /showcase by a real rewrite, declares the
 *     self-canonical https://more30.com/showcase, and is the page §7 makes the
 *     footer of twenty-six mounts point at (862d6b1). It carries the brand name.
 *     It was missing from the sitemap.
 *
 *   system.html — the plans page of §8. It has no rewrite of its own; it is
 *     reached as /system.html?app=<key>, and line 197 rewrites its canonical in
 *     the browser to https://more30.com/<key> — an address the rewrites mount to
 *     that system's own deployment. So the page disowns itself in favour of a URL
 *     that serves something else, and listing it would advertise nineteen URLs
 *     that each point away from the content Google would find there. It stays out
 *     until the /<name> vs /<name>/ split of core.issues #120 is decided.
 *
 * Both of those are asserted here, in both directions, and neither is a hand
 * list: the expected set is derived from the files — a page belongs in the
 * sitemap when a rewrite serves it, it is not noindex, and its canonical in the
 * HTML points at the address that rewrite serves it from.
 *
 *   node scripts/qa/sitemap-covers-indexable-pages.mjs [base-url]
 *
 * The last block probes production. A sitemap is only worth what its addresses
 * answer, so every <loc> is fetched: 200, and not the branded 404 body that
 * f5c0e85 taught the site to return.
 */
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';

const BASE = (process.argv[2] || 'https://more30.com').replace(/\/+$/, '');
const PUBLIC = 'portal/public';
const OUT = 'QA/platform/sitemap-coverage-0809';

const SUPABASE = 'https://uhnrgujbdxhhmoxcjria.supabase.co';
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw';

let pass = 0, fail = 0;
const rows = [];
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (detail ? `  << ${detail}` : '')); }
  rows.push({ check: name, result: cond ? 'pass' : 'fail', detail: detail ?? null });
};

// ── 1. מה הפורטל מגיש בכלל ─────────────────────────────────────────────────────
// היעד של rewrite הוא הקובץ; המקור הוא הכתובת שהציבור רואה. רק יעדים סטטיים
// (‎/x.html‎) נספרים — שורה שמפנה לפריסה אחרת אינה עמוד של הפורטל.
const vercel = JSON.parse(await readFile('portal/vercel.dist.json', 'utf8'));
const servedAs = new Map(); // 'showcase.html' -> '/showcase'
for (const rw of vercel.rewrites ?? []) {
  if (/^\/[\w-]+\.html$/.test(rw.destination)) servedAs.set(rw.destination.slice(1), rw.source);
}

const files = (await readdir(PUBLIC)).filter((f) => f.endsWith('.html')).sort();
const pages = [];
for (const f of files) {
  const html = await readFile(`${PUBLIC}/${f}`, 'utf8');
  pages.push({
    file: f,
    route: servedAs.get(f) ?? null,
    noindex: /<meta[^>]+name=["']robots["'][^>]*noindex/i.test(html),
    canonical: html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1] ?? null,
    // system.html מחליף את ה-canonical בדפדפן. זה מה שמוציא אותו מהרשימה,
    // ולכן זה נמדד ולא מונח.
    canonicalRewrittenInJs: /getElementById\(['"]canonical['"]\)\.href\s*=/.test(html),
  });
}

const indexable = pages.filter((p) => !p.noindex);
console.log(`\n${pages.length} static pages served from ${PUBLIC}/ — ` +
  `${pages.length - indexable.length} noindex, ${indexable.length} indexable: ` +
  `${indexable.map((p) => p.file).join(', ')}\n`);
ok('there is at least one indexable page and one noindex page to test',
  indexable.length > 0 && indexable.length < pages.length);

// עמוד נכנס לרשימה כשהוא מוגש בכתובת נקייה, אינו noindex, וה-canonical שלו
// מצביע בדיוק על אותה כתובת. השלישי הוא התנאי שמוציא את system.html.
const belongs = indexable.filter(
  (p) => p.route && !p.canonicalRewrittenInJs && p.canonical === `https://more30.com${p.route}`,
);
const excluded = indexable.filter((p) => !belongs.includes(p));

// ── 2. המערכות — אותו כלל שהמחולל והדף הראשי מפעילים ──────────────────────────
const registry = await fetch(
  `${SUPABASE}/rest/v1/more30_public_systems` +
  '?select=number,path,live,is_deployed,live_url,is_protected,public_visible&order=number',
  { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } },
).then((r) => r.json());
const openToPublic = (x) =>
  x.is_deployed && !!x.live_url && x.live_url.includes('more30.com') &&
  x.live && x.public_visible && !x.is_protected && !!x.path;
const systems = registry.filter(openToPublic).map((x) => `/${x.path}`);
ok('the registry returned systems to expect', systems.length > 0);

// ── 3. מול sitemap.xml שבעץ ────────────────────────────────────────────────────
const xml = await readFile(`${PUBLIC}/sitemap.xml`, 'utf8');
const listed = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => m[1].replace('https://more30.com', '') || '/');

const expected = ['/', ...systems, ...belongs.map((p) => p.route)];
const missing = expected.filter((p) => !listed.includes(p));
const extra = listed.filter((p) => !expected.includes(p));

console.log(`sitemap.xml lists ${listed.length} URLs; expected ${expected.length} ` +
  `(1 home + ${systems.length} systems + ${belongs.length} portal pages)\n`);
ok('every expected URL is listed', missing.length === 0, missing.join(' '));
ok('nothing is listed that was not expected', extra.length === 0, extra.join(' '));

for (const p of belongs) {
  ok(`${p.file} — served at ${p.route}, self-canonical, listed`, listed.includes(p.route));
}
// והכיוון השני: עמוד שה-canonical שלו מצביע למקום אחר אסור שייכנס.
for (const p of excluded) {
  // כל הסיבות, ולא הראשונה שנתפסה: system.html נופל על שתיים, ואם אחת מהן
  // תיפתר לבד הבדיקה עדיין צריכה להגיד למה הוא בחוץ.
  const why = [
    p.route ? null : 'no clean route',
    p.canonicalRewrittenInJs ? 'canonical rewritten in the browser to another address (#120)' : null,
    p.route && p.canonical !== `https://more30.com${p.route}` ? `canonical is ${p.canonical}` : null,
  ].filter(Boolean).join('; ');
  ok(`${p.file} — stays out (${why})`,
    !listed.includes(p.route) && !listed.some((l) => l.includes(p.file)));
}

// ── 4. הייצור — כל כתובת ברשימה חייבת לענות ────────────────────────────────────
const NOT_FOUND = 'הכתובת הזו לא נמצאה';
const probes = [];
for (const p of listed) {
  const url = `${BASE}${p}`;
  try {
    const r = await fetch(url, { redirect: 'follow' });
    const body = await r.text();
    const soft404 = body.includes(NOT_FOUND);
    probes.push({ url, status: r.status, bytes: body.length, soft404 });
    ok(`${p} — ${r.status}, ${body.length} bytes, not the 404 page`, r.ok && !soft404,
      soft404 ? 'body is the branded 404' : `status ${r.status}`);
  } catch (e) {
    probes.push({ url, status: null, error: String(e) });
    ok(`${p} — reachable`, false, String(e));
  }
}

await mkdir(OUT, { recursive: true });
await writeFile(`${OUT}/_results.json`, JSON.stringify({
  base: BASE, listed, expected, missing, extra,
  pages: pages.map(({ file, route, noindex, canonical, canonicalRewrittenInJs }) =>
    ({ file, route, noindex, canonical, canonicalRewrittenInJs })),
  probes, checks: rows, pass, fail,
}, null, 2), 'utf8');

console.log(`\n${pass} passed · ${fail} failed   (${OUT}/_results.json)`);
process.exit(fail ? 1 : 0);
