// gen-sitemap.mjs — writes portal/public/sitemap.xml from the live registry.
//
// Why generated and not hand-written: App.tsx deliberately holds no hard-coded
// list of systems, because a second copy of the truth drifts from the first.
// A sitemap is a static file by nature, so the only honest way to have one is
// to regenerate it from `more30_public_systems` on every deploy — the same view
// the home page renders from, under the same visibility rules.
//
// Run before scripts/stage-portal.ps1.

// The portal's own static pages are included by the same rule the crawler would
// apply, not by a list kept here: a page belongs when a rewrite serves it at a
// clean address, it does not carry `noindex`, and its canonical in the HTML is
// that same address. Thirteen of the fifteen are noindex — the admin screens,
// /login, /me, /subscribe, /404 — and drop out on the second test. system.html
// drops out on the third: it has no rewrite, and it rewrites its own canonical
// in the browser to https://more30.com/<key>, an address that serves that
// system's deployment. Listing it would advertise nineteen URLs that each point
// away from what Google would find there; it comes in when core.issues #120
// settles the /<name> vs /<name>/ split. What is left is /showcase — the page
// §7 makes the footer of twenty-six mounts point at.
// Locked by scripts/qa/sitemap-covers-indexable-pages.mjs.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SUPABASE_URL = 'https://uhnrgujbdxhhmoxcjria.supabase.co';
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw';

const url =
  `${SUPABASE_URL}/rest/v1/more30_public_systems` +
  '?select=number,path,live,is_deployed,live_url,is_protected,public_visible&order=number';

const r = await fetch(url, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
if (!r.ok) {
  // A sitemap built from a failed fetch would be an empty sitemap, which tells
  // Google the site has no pages. Leave the previous one in place and let the
  // build continue — a stale sitemap is recoverable, a blocked deploy is not.
  console.error(`⚠ registry unreachable (${r.status}) — sitemap.xml left unchanged`);
  process.exit(0);
}
const rows = await r.json();

// Exactly the rule the home page uses to decide a card is enterable.
const openToPublic = (x) =>
  x.is_deployed && !!x.live_url && x.live_url.includes('more30.com') &&
  x.live && x.public_visible && !x.is_protected && !!x.path;

const PUBLIC = path.join(ROOT, 'portal', 'public');
const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'portal', 'vercel.dist.json'), 'utf8'));

// destination -> the address the public sees it at. Only static destinations:
// a rewrite pointing at another deployment is not a page of this portal.
const servedAs = new Map();
for (const rw of vercel.rewrites ?? []) {
  if (/^\/[\w-]+\.html$/.test(rw.destination)) servedAs.set(rw.destination.slice(1), rw.source);
}

const portalPages = fs
  .readdirSync(PUBLIC)
  .filter((f) => f.endsWith('.html') && servedAs.has(f))
  .filter((f) => {
    const html = fs.readFileSync(path.join(PUBLIC, f), 'utf8');
    if (/<meta[^>]+name=["']robots["'][^>]*noindex/i.test(html)) return false;
    if (/getElementById\(['"]canonical['"]\)\.href\s*=/.test(html)) return false;
    const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1];
    return canonical === `https://more30.com${servedAs.get(f)}`;
  })
  .map((f) => servedAs.get(f))
  .sort();

const paths = ['/', ...rows.filter(openToPublic).map((x) => `/${x.path}`), ...portalPages];
const today = new Date().toISOString().slice(0, 10);

const xml =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  paths
    .map(
      (p) =>
        `  <url>\n    <loc>https://more30.com${p}</loc>\n` +
        `    <lastmod>${today}</lastmod>\n` +
        `    <priority>${p === '/' ? '1.0' : '0.8'}</priority>\n  </url>\n`,
    )
    .join('') +
  '</urlset>\n';

const out = path.join(ROOT, 'portal', 'public', 'sitemap.xml');
fs.writeFileSync(out, xml, 'utf8');
console.log(
  `sitemap.xml: ${paths.length} URLs (1 home + ${paths.length - 1 - portalPages.length} systems` +
  ` + ${portalPages.length} portal pages: ${portalPages.join(' ') || 'none'}) -> ${out}`,
);
