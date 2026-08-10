/**
 * favicon-mounts — what does the browser tab actually draw, for every mount?
 *
 * The round of 10/08 (QA/platform/favicon-0810/_mounts.json) measured six mounts
 * and found that a mount with no <link rel="icon"> does not end up with a blank
 * tab: the browser falls back to /favicon.ico on the ORIGIN, and the origin is
 * more30.com — so it draws the portal's mark. That was measured on six of the
 * twenty-four mounts. This reads the same thing on all of them.
 *
 * Reads production only. Writes QA/platform/favicon-mounts-0810/_scan.json.
 *
 * NetFree rewrites image bytes in flight from this machine, so nothing here
 * compares image content: only the declared href, the resolved URL, the status,
 * the Content-Type and the Content-Length the server reported.
 */
import fs from 'node:fs';
import path from 'node:path';

const ORIGIN = 'https://more30.com';

const MOUNTS = {
  torah: '/torah', tamlul: '/tamlul', modaot: '/modaot', imud: '/imud',
  briut: '/briut', bkalot: '/bkalot', smel: '/smel', smachot: '/smachot',
  egod: '/egod', chatzor: '/chatzor/', chizukim: '/chizukim/',
  orech: '/orech', zchuyot: '/zchuyot', mthbram: '/mthbram', galil: '/galil',
  studio: '/studio', mechiron: '/mechiron', kupot: '/kupot',
  nadlan: '/nadlan/', crm: '/crm', gesher: '/gesher', kesef: '/kesef',
  kiosk: '/kiosk/', tivuch: '/tivuch',
};

const ICON_REL = /^(shortcut )?icon$|apple-touch-icon|mask-icon/i;

async function head(url) {
  try {
    const r = await fetch(url, { method: 'GET', redirect: 'follow', cache: 'no-store' });
    const buf = Buffer.from(await r.arrayBuffer());
    return {
      status: r.status,
      content_type: r.headers.get('content-type') || null,
      content_length: Number(r.headers.get('content-length')) || buf.length,
      bytes_received: buf.length,
    };
  } catch (e) {
    return { status: null, error: String(e.message || e) };
  }
}

/** Pulls every <link> whose rel names an icon, with its href and sizes. */
function iconLinks(html) {
  const out = [];
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = m[0];
    const rel = (tag.match(/\brel\s*=\s*["']([^"']+)["']/i) || [])[1];
    if (!rel || !ICON_REL.test(rel.trim())) continue;
    out.push({
      rel: rel.trim(),
      href: (tag.match(/\bhref\s*=\s*["']([^"']+)["']/i) || [])[1] || null,
      sizes: (tag.match(/\bsizes\s*=\s*["']([^"']+)["']/i) || [])[1] || null,
      type: (tag.match(/\btype\s*=\s*["']([^"']+)["']/i) || [])[1] || null,
    });
  }
  return out;
}

const rootIcon = await head(`${ORIGIN}/favicon.ico`);

const mounts = [];
for (const [name, route] of Object.entries(MOUNTS)) {
  const url = ORIGIN + route;
  let html = '';
  let status = null;
  try {
    const r = await fetch(url, { redirect: 'follow', cache: 'no-store' });
    status = r.status;
    html = await r.text();
  } catch (e) {
    mounts.push({ mount: name, route, error: String(e.message || e) });
    continue;
  }

  const declared = iconLinks(html);
  const base = (html.match(/<base\b[^>]*href\s*=\s*["']([^"']+)["']/i) || [])[1] || null;

  for (const link of declared) {
    if (!link.href) continue;
    link.resolved = new URL(link.href, new URL(base || route, ORIGIN)).toString();
    link.probe = await head(link.resolved);
  }

  // Only rel="icon" decides the tab; apple-touch-icon and mask-icon do not.
  const tabLinks = declared.filter((l) => /^(shortcut )?icon$/i.test(l.rel));

  // A declaration is not the same as owning the icon. A root-absolute href in a
  // mount that lives under a path resolves to the ORIGIN, not to the mount — so
  // the tag is present, resolves 200, and still draws the portal's mark.
  const mountPrefix = '/' + name + '/';
  const landsOnMount = tabLinks.some((l) => {
    try {
      return new URL(l.resolved).pathname.startsWith(mountPrefix);
    } catch {
      return false;
    }
  });

  let verdict;
  let tabSource;
  if (!tabLinks.length) {
    verdict = 'inherits-portal';
    tabSource = 'no rel=icon — the browser falls back to /favicon.ico on the origin, which is the portal mark';
  } else if (!landsOnMount) {
    verdict = 'declares-but-lands-on-origin';
    tabSource = 'a rel=icon is declared, but its href is root-absolute and resolves to the origin — still the portal mark';
  } else {
    verdict = 'declares-own';
    tabSource = 'own asset under the mount';
  }

  mounts.push({
    mount: name,
    route,
    page_status: status,
    base_href: base,
    declared_icon_links: declared,
    tab_source: tabSource,
    verdict,
  });
}

const outDir = path.join('QA', 'platform', 'favicon-mounts-0810');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, '_scan.json'),
  JSON.stringify(
    {
      measured_at: new Date().toISOString(),
      read: 'production only, anon, no cache',
      origin_root_favicon: { url: `${ORIGIN}/favicon.ico`, ...rootIcon },
      mounts,
    },
    null,
    2,
  ) + '\n',
);

const tag = { 'declares-own': 'OWN ', 'inherits-portal': 'INH ', 'declares-but-lands-on-origin': 'ORIG' };
const portal = mounts.filter((m) => m.verdict !== 'declares-own');
console.log(`${mounts.length} mounts · ${portal.length} draw the portal mark`);
for (const m of mounts) {
  const hrefs = m.declared_icon_links.map((l) => `${l.rel}=${l.href} (${l.probe?.status})`).join(' | ');
  console.log(`${tag[m.verdict]} ${m.mount.padEnd(10)} ${hrefs || '(no icon link)'}`);
}
