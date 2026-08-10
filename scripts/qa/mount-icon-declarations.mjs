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
 * Root-relative hrefs that the *portal* serves are resolved against
 * portal/public/, not against the network: NetFree rewrites images in flight
 * from this machine (41bc299 watched favicon.ico answer 418 while production
 * served it fine), so a status code here proves nothing. The tree does.
 *
 * Addresses that live inside a mount's own deployment are not in this repo, so
 * the tree cannot answer for them — they are probed live instead, and a reply
 * is only believed when it carries `server: Vercel`. NetFree does not forge
 * that header; every mount is a Vercel deployment, so its absence means the
 * answer came from something between here and production, and the check says
 * so rather than guessing. What the live probe judges:
 *
 *   · the address answers 200 and the body is an image
 *   · a PNG's real IHDR size matches the size it is named/declared for — a
 *     file called pwa-192 that is 1024×1024 is a full-size picture in an
 *     icon's clothing
 *   · an icon weighs less than 150 KB. Nothing drawn at 512px or smaller
 *     needs more, and an apple-touch-icon is fetched by every iOS visitor
 *
 * The same question again, one level down: a mount that declares a web app
 * manifest hands the browser a *second* list of icon addresses, and those are
 * resolved against the document — so a manifest written before the app was
 * mounted under a path points its icons at the portal root, where nothing of
 * that name has ever existed. `start_url` has the same trap: outside `scope`,
 * it is not merely wrong, it makes the manifest uninstallable.
 */
import { readFile, access, mkdir, writeFile } from 'node:fs/promises';

const BASE = (process.argv[2] || 'https://more30.com').replace(/\/+$/, '');
const PUBLIC = 'portal/public';
const OUT = 'QA/platform/mount-icons-0810';
const MAX_ICON_BYTES = 150 * 1024;

let pass = 0, fail = 0;
const rows = [];
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (detail ? `  << ${detail}` : '')); }
  rows.push({ check: name, result: cond ? 'pass' : 'fail', detail: detail ?? null });
};
const skip = (name, detail) => {
  console.log('  ----  ' + name + (detail ? `  << ${detail}` : ''));
  rows.push({ check: name, result: 'unverifiable_here', detail: detail ?? null });
};
const exists = (p) => access(p).then(() => true, () => false);
const kb = (n) => `${Math.round(n / 1024)} KB`;

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
const MANIFEST = /<link\b[^>]*\brel=["']manifest["'][^>]*>/i;
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
  const manifest = html.match(MANIFEST)?.[0]?.match(HREF)?.[1] ?? null;
  results.push({ mount: m, url, status, bytes: html.length, base, icons, manifest });
}

/**
 * הכתובת שהדפדפן באמת יבקש. מסמך ההרכבה יושב ב-more30.com/<שם>/, ולכן
 * מוחלט-לשורש נפתר מול השורש של הפורטל — לא מול ההרכבה. זה בדיוק המקום
 * שבו הצהרה שנכתבה לפני שהמערכת הורכבה תחת נתיב מפספסת את עצמה.
 */
const resolveHref = (href, docUrl, baseHref) =>
  new URL(href, baseHref ? new URL(baseHref, docUrl) : docUrl).toString();

/**
 * קריאה חיה של נכס, עם ההסתייגות של הרשת המקומית: תשובה נחשבת רק אם היא
 * מגיעה מ-Vercel. אחרת — לא הכרעה, לא כישלון.
 */
async function probe(url) {
  try {
    const r = await fetch(url, { redirect: 'follow' });
    const buf = Buffer.from(await r.arrayBuffer());
    const served_by = r.headers.get('server');
    const out = {
      url, status: r.status, served_by,
      content_type: r.headers.get('content-type'),
      bytes: buf.length,
      trusted: /vercel/i.test(served_by ?? ''),
    };
    // PNG: IHDR יושב בבייטים 16..23 ומספר את הגודל האמיתי, בלי קשר לשם הקובץ.
    if (buf.length > 24 && buf.subarray(1, 4).toString('latin1') === 'PNG') {
      out.pixels = `${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}`;
    }
    return out;
  } catch (e) { return { url, error: String(e), trusted: false }; }
}

function judgeAsset(name, p, declaredSizes) {
  if (p.error) { skip(name, p.error); return; }
  if (!p.trusted) {
    skip(name, `answered ${p.status} but not from Vercel (server: ${p.served_by ?? 'none'}) — NetFree sits in the way`);
    return;
  }
  if (p.status !== 200) {
    ok(name, false, `status ${p.status} — the declaration suppresses the /favicon.ico fallback, so this mount draws nothing`);
    return;
  }
  if (!/^image\//.test(p.content_type ?? '')) {
    ok(name, false, `content-type ${p.content_type} — the address answers, but not with an image`);
    return;
  }
  ok(name, true);

  if (p.pixels && declaredSizes && !declaredSizes.split(/\s+/).includes(p.pixels)) {
    ok(`${name} — is the ${declaredSizes} it is declared to be`, false,
      `the file is ${p.pixels}`);
  }
  if (p.bytes > MAX_ICON_BYTES) {
    ok(`${name} — weighs what an icon weighs`, false,
      `${kb(p.bytes)}${p.pixels ? ` at ${p.pixels}` : ''} — every visitor downloads this to draw one small square`);
  }
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
    const abs = resolveHref(ic.href, r.url, r.base);
    ic.resolved = abs;
    const path = new URL(abs).pathname;
    const intoMount = mounts.some((m) => path.startsWith(m));

    if (intoMount) {
      // הקובץ יושב בפריסה של אותה מערכת ולא בריפו הזה — הרשת היא העדות היחידה.
      ic.resolves_from = 'the mount deployment';
      const p = await probe(abs);
      ic.live = p;
      judgeAsset(`${r.mount} — ${ic.href} answers`, p);
      continue;
    }
    if (path.startsWith('/')) {
      // הפורטל מגיש את זה, והעץ הוא העדות — קוד סטטוס מכאן אינו קביל.
      const file = `${PUBLIC}${path}`;
      const inTree = await exists(file);
      ic.resolves_from = 'portal/public';
      ic.exists = inTree;
      ok(`${r.mount} — ${ic.href} exists at the portal root`, inTree,
        `${file} is not in the tree, so the browser gets nothing and the /favicon.ico fallback is suppressed`);
    } else {
      ic.resolves_from = 'off-site';
      skip(`${r.mount} — ${ic.href}`, 'not served by more30.com');
    }
  }
}

// ── 4. המניפסט — רשימת כתובות שנייה, שנפתרת מול המסמך ──────────────────────────
for (const r of results) {
  if (!r.manifest || r.status !== 200) continue;
  const mUrl = resolveHref(r.manifest, r.url, r.base);
  let man = null;
  try {
    const resp = await fetch(mUrl, { redirect: 'follow' });
    if (resp.status !== 200) { ok(`${r.mount} — the manifest answers`, false, `status ${resp.status} at ${mUrl}`); continue; }
    man = JSON.parse(await resp.text());
  } catch (e) { skip(`${r.mount} — the manifest at ${mUrl}`, String(e)); continue; }

  ok(`${r.mount} — the manifest answers and parses`, true);
  r.manifest_url = mUrl;
  r.manifest_json = man;

  // start_url מחוץ ל-scope אינו רק שגוי — הוא הופך את המניפסט לבלתי-ניתן להתקנה.
  if (man.start_url && man.scope) {
    const start = new URL(man.start_url, mUrl).pathname;
    const scope = new URL(man.scope, mUrl).pathname;
    ok(`${r.mount} — start_url ${man.start_url} sits inside scope ${man.scope}`,
      start.startsWith(scope),
      `start_url resolves to ${start}, outside ${scope} — installing the app lands the user somewhere else, and the browser may refuse the manifest outright`);
  }

  for (const ic of man.icons ?? []) {
    if (!ic.src) continue;
    const abs = new URL(ic.src, mUrl).toString();
    const path = new URL(abs).pathname;
    const label = `${r.mount} — manifest icon ${ic.src}`;
    if (mounts.some((m) => path.startsWith(m))) {
      judgeAsset(`${label} answers`, await probe(abs), ic.sizes);
    } else if (path.startsWith('/')) {
      // נפתר מחוץ להרכבה — כלומר לשורש הפורטל, שאינו מכיר את הקובץ הזה.
      const inTree = await exists(`${PUBLIC}${path}`);
      ok(`${label} resolves inside its own mount`, inTree,
        `it resolves to ${path} — the portal root, not ${r.mount} — and ${PUBLIC}${path} does not exist, so this icon is simply absent`);
    } else {
      skip(label, 'not served by more30.com');
    }
  }
}

await mkdir(OUT, { recursive: true });
await writeFile(`${OUT}/_results.json`, JSON.stringify(
  { base: BASE, mounts, results, checks: rows, pass, fail }, null, 2), 'utf8');

console.log(`\n${pass} passed · ${fail} failed   (${OUT}/_results.json)`);
process.exit(fail ? 1 : 0);
