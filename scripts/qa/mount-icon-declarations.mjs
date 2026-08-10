/**
 * Every mount under more30.com asks the browser for an icon. Does the address
 * it asks for exist?
 *
 * 41bc299 gave the platform an icon: portal/public/favicon.svg · favicon.ico ·
 * apple-touch-icon.png, declared by all nineteen portal pages. It closed the
 * root — a page that declares nothing makes the browser ask /favicon.ico by
 * itself, and that request now answers.
 *
 * The mounts are a different case, and the fallback does not reach them. A
 * mount is served through a rewrite, so the document URL is more30.com/<name>/
 * and every root-relative href in it resolves against more30.com — but the HTML
 * comes from that system's own deployment, written before the portal had an
 * icon at all. A mount that declares `<link rel="icon" href="/favicon.png">`
 * hands the browser one address and suppresses the automatic /favicon.ico it
 * would otherwise have asked for. If that address is empty, the mount ends up
 * with no icon *because* it asked for one.
 *
 *   node scripts/qa/mount-icon-declarations.mjs [base-url]
 *
 * The mount list is not typed in — it is the set of rewrites in
 * portal/vercel.dist.json that leave the portal for another deployment.
 *
 * Root-relative hrefs are resolved against portal/public/, not against the
 * network: NetFree rewrites images in flight from this machine (41bc299 watched
 * favicon.ico answer 418 while production served it fine), so a status code
 * here proves nothing about an icon. The tree does. Hrefs that point inside a
 * mount are probed live and reported without a verdict — those files live in a
 * deployment this repo does not hold.
 */
import { readFile, access, mkdir, writeFile } from 'node:fs/promises';

const BASE = (process.argv[2] || 'https://more30.com').replace(/\/+$/, '');
const PUBLIC = 'portal/public';
const OUT = 'QA/platform/mount-icons-0810';

let pass = 0, fail = 0;
const rows = [];
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (detail ? `  << ${detail}` : '')); }
  rows.push({ check: name, result: cond ? 'pass' : 'fail', detail: detail ?? null });
};
const exists = (p) => access(p).then(() => true, () => false);

// ── 1. מי המערכות שמורכבות תחת נתיב ────────────────────────────────────────────
const vercel = JSON.parse(await readFile('portal/vercel.dist.json', 'utf8'));
const mounts = [...new Set(
  (vercel.rewrites ?? [])
    .filter((rw) => /^https?:\/\//.test(rw.destination) && /^\/[\w-]+\/?$/.test(rw.source))
    .map((rw) => '/' + rw.source.replace(/^\/|\/$/g, '') + '/'),
)].sort();
ok('the rewrite map named mounts to check', mounts.length > 0);
console.log(`\n${mounts.length} mounts: ${mounts.join(' ')}\n`);

// ── 2. מה כל אחת מהן מצהירה ────────────────────────────────────────────────────
const ICON = /<link\b[^>]*\brel=["']([^"']*\bicon\b[^"']*)["'][^>]*>/gi;
const HREF = /\bhref=["']([^"']+)["']/i;

const results = [];
for (const m of mounts) {
  const url = `${BASE}${m}`;
  let html = null, status = null, err = null;
  try {
    const r = await fetch(url, { redirect: 'follow' });
    status = r.status;
    html = await r.text();
  } catch (e) { err = String(e); }

  if (html === null) { results.push({ mount: m, url, status, error: err, icons: [] }); continue; }

  // <base href> משנה את משמעות ה-href היחסי; מוחלט-לשורש אינו מושפע ממנו.
  const base = html.match(/<base\b[^>]*\bhref=["']([^"']+)["']/i)?.[1] ?? null;
  const icons = [...html.matchAll(ICON)].map((mm) => ({
    rel: mm[1],
    href: mm[0].match(HREF)?.[1] ?? null,
    tag: mm[0],
  }));
  results.push({ mount: m, url, status, bytes: html.length, base, icons });
}

// ── 3. האם הכתובת שהוצהרה קיימת ────────────────────────────────────────────────
for (const r of results) {
  if (r.error || r.status !== 200) {
    ok(`${r.mount} — the page answers`, false, r.error ?? `status ${r.status}`);
    continue;
  }
  if (r.icons.length === 0) {
    // אין הצהרה → הדפדפן מבקש /favicon.ico מיוזמתו, וזה קיים מאז 41bc299.
    r.verdict = 'falls back to the root';
    ok(`${r.mount} — declares nothing, falls back to /favicon.ico`,
      await exists(`${PUBLIC}/favicon.ico`), 'the root icon itself is missing');
    continue;
  }

  for (const ic of r.icons) {
    if (!ic.href) { ok(`${r.mount} — ${ic.rel} carries an href`, false, ic.tag); continue; }
    if (ic.href.startsWith('/') && !ic.href.startsWith('//')) {
      const file = `${PUBLIC}${ic.href}`;
      const inTree = await exists(file);
      ic.resolves_from = 'portal/public';
      ic.exists = inTree;
      // חריג: נתיב שנכנס לתוך הרכבה אחרת אינו מוגש מהפורטל כלל.
      const intoMount = mounts.some((m) => ic.href.startsWith(m));
      if (intoMount) {
        ic.resolves_from = 'the mount deployment';
        ic.exists = null;
        console.log(`  ----  ${r.mount} — ${ic.href} is served by the mount itself, not the portal`);
        rows.push({ check: `${r.mount} — ${ic.href}`, result: 'unverifiable_here',
          detail: 'lives in that system\'s deployment, not in this repo' });
        continue;
      }
      ok(`${r.mount} — ${ic.href} exists at the portal root`, inTree,
        `${file} is not in the tree, so the browser gets nothing and the /favicon.ico fallback is suppressed`);
    } else {
      ic.resolves_from = 'absolute or relative';
      console.log(`  ----  ${r.mount} — ${ic.href} is not root-relative`);
    }
  }
}

await mkdir(OUT, { recursive: true });
await writeFile(`${OUT}/_results.json`, JSON.stringify(
  { base: BASE, mounts, results, checks: rows, pass, fail }, null, 2), 'utf8');

console.log(`\n${pass} passed · ${fail} failed   (${OUT}/_results.json)`);
process.exit(fail ? 1 : 0);
