/**
 * Does a path-mounted page's CSS and JS actually resolve at its canonical URL?
 *
 * Every system here is served from a sub-path (more30.com/kiosk, /bkalot, …).
 * A page that references `css/style.css` resolves that against the *directory*
 * of the current URL, so the same file works at `/kiosk/` and silently loads
 * nothing at `/kiosk` — the browser asks for `/more30.com/css/style.css`, the
 * SPA catch-all answers 200 with HTML, and no request fails. That is why this
 * class of bug survives: nothing 404s, so an asset probe passes.
 *
 * It has now bitten three times:
 *   · /bkalot ran with no CSS and no JS for weeks.
 *   · 19 of 25 mounts served the portal at `/<mount>/` (fixed 05/08, routing).
 *   · /kiosk served its landing page completely unstyled at `/kiosk`, the exact
 *     URL held in core.projects.live_url — found 06/08 by a dark-mode probe,
 *     because an unstyled page has no theme either. Measured before the fix:
 *     19 CSS rules against 142, body background transparent against
 *     rgb(245,247,251), h1 at the browser default 32px against 56px. Fixed by
 *     redirecting the bare form to `/kiosk/` in portal/vercel.dist.json, since
 *     the page itself is served by Railway and is not in this repo.
 *
 * So this asks production, at BOTH forms of the URL, and reports a mount as
 * broken when a referenced asset does not come back as the right content type.
 * Checking the status code alone is not enough: the catch-all returns 200.
 *
 *   node scripts/qa/relative-asset-audit.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const ORIGIN = 'https://more30.com';

const table = JSON.parse(fs.readFileSync(path.join(ROOT, 'portal', 'vercel.dist.json'), 'utf8'));
const mounts = [
  ...new Set(
    table.rewrites.map((r) => /^\/([a-z0-9-]+)\/:path\*$/.exec(r.source)?.[1]).filter(Boolean),
  ),
].sort();

const ARGS = process.argv.slice(2);
const TARGETS = ARGS.length ? ARGS : mounts;

async function html(url) {
  const res = await fetch(url, { redirect: 'follow', headers: { 'cache-control': 'no-cache' } });
  return { status: res.status, url: res.url, body: await res.text() };
}

/** Asset references that are resolved against the current directory. */
function relativeRefs(body) {
  const refs = new Set();
  for (const m of body.matchAll(/<(?:link|script|img)\b[^>]*?\b(?:href|src)="([^"]+)"/gi)) {
    const v = m[1];
    if (/^(?:https?:)?\/\//i.test(v)) continue; // absolute origin
    if (v.startsWith('/') || v.startsWith('data:') || v.startsWith('#')) continue;
    if (/^(?:mailto|tel|javascript):/i.test(v)) continue;
    refs.add(v);
  }
  return [...refs];
}

/**
 * A stylesheet that comes back as text/html is the SPA catch-all answering, not
 * the file. That is the whole failure mode, and it is invisible to a status
 * check.
 */
async function resolves(assetUrl, expectHtml = false) {
  try {
    const res = await fetch(assetUrl, { headers: { 'cache-control': 'no-cache' } });
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    const isHtml = ct.includes('text/html');
    return { status: res.status, ct, ok: res.ok && (expectHtml ? isHtml : !isHtml) };
  } catch (e) {
    return { status: 0, ct: String(e).slice(0, 60), ok: false };
  }
}

const rows = [];
for (const m of TARGETS) {
  const row = { mount: m, forms: {} };
  for (const form of [`/${m}`, `/${m}/`]) {
    const page = await html(ORIGIN + form);
    const refs = relativeRefs(page.body);
    const base = /<base[^>]+href="([^"]+)"/i.exec(page.body)?.[1] ?? '';
    // Resolve exactly the way a browser would: against the URL the document
    // ENDED on, honouring <base> when present. Resolving against the requested
    // form instead would keep reporting /kiosk as broken after the redirect
    // that fixed it — the browser is at /kiosk/ by the time it reads the href.
    const dir = new URL(base || new URL(page.url).pathname, ORIGIN);
    const checks = [];
    for (const r of refs.slice(0, 8)) {
      const abs = new URL(r, dir).href;
      checks.push({ ref: r, abs, ...(await resolves(abs)) });
    }
    row.forms[form] = {
      status: page.status,
      base,
      relCount: refs.length,
      broken: checks.filter((c) => !c.ok),
    };
  }
  const broken = Object.entries(row.forms).filter(([, f]) => f.broken.length);
  row.ok = broken.length === 0;
  rows.push(row);

  const detail = broken
    .map(([f, v]) => `${f} -> ${v.broken.map((b) => b.ref + ' (' + (b.ct || b.status) + ')').join(', ')}`)
    .join('  |  ');
  console.log(`${m.padEnd(10)} ${row.ok ? 'ok' : 'BROKEN  ' + detail}`);
}

const out = path.join(ROOT, 'QA', 'platform', '_relative-assets.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(rows, null, 2), 'utf8');

const bad = rows.filter((r) => !r.ok);
console.log(`\n${rows.length - bad.length}/${rows.length} mounts resolve their assets at both URL forms`);
if (bad.length) console.log(`broken: ${bad.map((r) => r.mount).join(' ')}`);
console.log(`-> ${out}`);
process.exit(bad.length ? 1 : 0);
