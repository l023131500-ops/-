/**
 * The card for a system with no reachable admin entry — what does it draw now?
 *
 * 0046 emptied core.projects.admin_url for #27, so its card falls into
 * adminEntry()'s null branch for the first time. That branch used to assert one
 * cause ("נמדד, לא הונח — core.issues #86"), which is true for the twenty-one
 * admin_auth='none' rows and false for #27, whose admin screen exists on 32
 * routes and is simply unreachable from this mount.
 *
 * This runs the shipped adminEntry() out of portal/public/admin-systems.html
 * against the three shapes the report can hand it, so the change is measured on
 * the function the board actually loads rather than on a copy of it:
 *
 *   no address           admin_url null  → says what was measured, links to תקלות
 *   own address          admin_url set, admin_auth 'own'  → link + "הכניסה של המערכת עצמה"
 *   hub address          admin_url set, admin_auth 'hub'  → link + "כניסת סופר-אדמין"
 *
 *   node scripts/qa/admin-entry-no-address.mjs
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';

const SRC = 'portal/public/admin-systems.html';
const OUT = 'QA/platform/admin-entry-no-address-0807';

const html = await readFile(SRC, 'utf8');

// Lift the two functions the branch depends on straight out of the page.
const grab = (name) => {
  const at = html.indexOf(`const ${name} = `);
  if (at < 0) throw new Error(`${name} not found in ${SRC}`);
  // Balance braces from the arrow body to the closing "};".
  let i = html.indexOf('{', at), depth = 0;
  for (; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') { depth--; if (depth === 0) break; }
  }
  return html.slice(at, i + 2);
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const adminEntry = new Function('esc', `${grab('adminEntry')}; return adminEntry;`)(esc);

const CASES = [
  { name: 'no address', row: { app_key: 'mechiron', admin_url: null, admin_auth: null } },
  { name: 'own address', row: { app_key: 'torah', admin_url: '/admin', admin_auth: 'own' } },
  { name: 'hub address', row: { app_key: 'bkalot', admin_url: 'https://more30.com/admin/rights', admin_auth: 'hub' } },
];

const text = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const checks = [];
const say = (ok, what) => { checks.push({ ok, what }); console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${what}`); };

console.log(`\nadminEntry() as shipped in ${SRC}\n`);

const rendered = CASES.map((c) => {
  const html_out = adminEntry(c.row);
  console.log(`  ${c.name.padEnd(12)} ${text(html_out)}`);
  return { ...c, html: html_out, text: text(html_out) };
});

const none = rendered[0], own = rendered[1], hub = rendered[2];

say(!/<a [^>]*href="\/mechiron/.test(none.html),
    'a system with no address is offered no entry link');
say(!/לא הונח/.test(none.text),
    'the empty branch no longer asserts the screen was never laid');
say(/נמדד/.test(none.text),
    'the empty branch says the absence was measured');
say(none.html.includes('href="/admin/issues"'),
    'the empty branch points at תקלות, where the per-system reason is written');
say(/#86/.test(none.text) && /#115/.test(none.text),
    'both recorded causes are named — #86 (never laid) and #115 (laid, unreachable)');

say(own.html.includes('href="/torah/admin"'), 'a relative own address still mounts under the system');
say(/הכניסה של המערכת עצמה/.test(own.text), 'an own address still names its own gate');
say(hub.html.includes('href="https://more30.com/admin/rights"'), 'an absolute hub address is left alone');
say(/כניסת סופר-אדמין/.test(hub.text), 'a hub address still names the platform gate');

const failed = checks.filter((c) => !c.ok);
await mkdir(OUT, { recursive: true });
await writeFile(`${OUT}/_results.json`, JSON.stringify({
  at: new Date().toISOString(), source: SRC,
  checks, failures: failed.length, rendered,
}, null, 2));

console.log(`\n  ${checks.length - failed.length}/${checks.length} checks pass`);
console.log(`  results: ${OUT}/_results.json\n`);
process.exit(failed.length ? 1 : 0);
