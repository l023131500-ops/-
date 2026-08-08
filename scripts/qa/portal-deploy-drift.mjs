/**
 * הפורטל — כמה מהעמודים שנמצאים בגיט באמת מוגשים מהייצור.
 *
 * ‏`portal/vercel.dist.json` הוא מקור האמת לניתוב, ו-14 מסלולים בו מוגשים
 * מקבצי HTML סטטיים שיושבים ב-`portal/public/`. תשעה מהם הם מסכי לוח
 * הניהול של §3, ואחד — `/showcase` — הוא אתר התדמית של §7.
 *
 * ‏`NEEDS_USER.md §0ט` פתח את הפער הזה ב-07/08 על עמוד אחד (`/subscribe`)
 * וקרא לו "כולם בגיט ולא בייצור". אף ריצה לא ספרה כמה עמודים זה באמת.
 *
 * הריצה הזאת מודדת כל אחד מ-14 המסלולים כאנונימי מול `more30.com` ומשווה
 * את הבייטים שהוגשו לקובץ שבעץ העבודה, אחרי שהיא מסירה את שלוש שורות
 * ההזרקה של NetFree — שהן של הרשת הזאת ולא של הפריסה.
 *
 * בנוסף היא בודקת סימנים בשמם: מחרוזת שקומיט מסוים הוסיף, שאם היא בעץ
 * ואיננה בייצור אז אותו קומיט אינו חי.
 *
 *   node scripts/qa/portal-deploy-drift.mjs [--after]
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const AFTER = process.argv.includes('--after');
const OUT = 'QA/platform/portal-deploy-drift-0808';

/** 14 המסלולים ש-portal/vercel.dist.json מגיש מ-portal/public/. */
const ROUTES = [
  ['/login', 'login.html'],
  ['/me', 'me.html'],
  ['/subscribe', 'subscribe.html'],
  ['/showcase', 'showcase.html'],
  ['/auth/callback', 'auth/callback.html'],
  ['/admin/activity', 'admin-activity.html'],
  ['/admin/pricing', 'admin-pricing.html'],
  ['/admin/systems', 'admin-systems.html'],
  ['/admin/customers', 'admin-customers.html'],
  ['/admin/automation', 'admin-automation.html'],
  ['/admin/credits', 'admin-credits.html'],
  ['/admin/issues', 'admin-issues.html'],
  ['/admin/leads', 'admin-leads.html'],
  ['/admin/rights', 'admin-rights.html'],
];

/** קובץ משותף שכל העמודים טוענים — הוא נפרס באותה פריסה. */
const ASSETS = [['/auth-button.js', 'auth-button.js']];

/**
 * סימנים בשמם: המחרוזת שקומיט הוסיף, והעמוד שנושא אותה.
 * אם היא בעץ ולא בייצור — אותו קומיט אינו חי.
 */
const MARKERS = [
  ['e95b47e', '/admin/pricing', 'nav class="nav"', 'סרגל אחים למסך המחירים'],
  ['f12dd5b', '/admin/systems', '/admin/rights', 'שני המסכים שלא היו על אף סרגל'],
  ['5c0c007', '/admin/leads', '/admin/automation', 'סרגל אחים מלא בכל תשעת המסכים'],
  ['7d25bea', '/admin/customers', 'טלפון', 'שם וטלפון בטבלת הלקוחות'],
  ['25a47ce', '/subscribe', 'margin-top:auto', 'יישור הכפתור בכרטיסי המסלול'],
  ['d004dab', '/me', 'more30-return-to', 'כתובת החזרה אל תוך המערכת'],
];

/** שלוש שורות שהרשת הזאת מזריקה לכל תשובה, ואינן חלק מהפריסה. */
const stripNetFree = (html) =>
  html
    .split('\n')
    .filter((l) => !/netfree\.link|Injection By NetFree/i.test(l))
    .join('\n');

const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 12);
const norm = (s) => s.replace(/\r\n/g, '\n').trimEnd();

let pass = 0, fail = 0;
const results = [];
const ok = (n, c, d) => {
  results.push({ check: n, pass: !!c, detail: d ?? null });
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? `  << ${d}` : '')); }
};

const rows = [];
for (const [route, file] of [...ROUTES, ...ASSETS]) {
  const url = 'https://more30.com' + route;
  let live = null, status = 0;
  try {
    const r = await fetch(url, { redirect: 'follow' });
    status = r.status;
    live = norm(stripNetFree(await r.text()));
  } catch (e) {
    rows.push({ route, file, status: 0, error: e.message });
    continue;
  }
  const tree = norm(await readFile('portal/public/' + file, 'utf8'));
  rows.push({
    route, file, status,
    live_bytes: Buffer.byteLength(live, 'utf8'),
    tree_bytes: Buffer.byteLength(tree, 'utf8'),
    live_sha: sha(live),
    tree_sha: sha(tree),
    identical: live === tree,
  });
}

console.log(`\nהפורטל — ${rows.length} קבצים מוגשים, ${AFTER ? 'אחרי' : 'לפני'} הפריסה\n`);
for (const r of rows) {
  console.log(
    `  ${r.identical ? 'חי  ' : 'ישן '} ${r.route.padEnd(20)} ` +
    `live ${String(r.live_bytes ?? 0).padStart(6)}  tree ${String(r.tree_bytes ?? 0).padStart(6)}`,
  );
}

const stale = rows.filter((r) => !r.identical);
ok('every page the portal serves matches the file in the tree',
   stale.length === 0,
   stale.length ? `${stale.length}/${rows.length} stale: ${stale.map((r) => r.route).join(', ')}` : 'none');

/** הסימנים: מחרוזת שקיימת בעץ ואיננה בייצור. */
const missing = [];
for (const [commit, route, marker, what] of MARKERS) {
  const row = rows.find((r) => r.route === route);
  if (!row || row.error) continue;
  const tree = norm(await readFile('portal/public/' + row.file, 'utf8'));
  const live = norm(stripNetFree(await (await fetch('https://more30.com' + route)).text()));
  const inTree = tree.includes(marker), inLive = live.includes(marker);
  if (inTree && !inLive) missing.push({ commit, route, marker, what });
}
ok('every committed fix on those pages is the one production serves',
   missing.length === 0,
   missing.length ? missing.map((m) => `${m.commit} ${m.route} — ${m.what}`).join(' · ') : 'none');

await mkdir(OUT, { recursive: true });
await writeFile(
  `${OUT}/_${AFTER ? 'after' : 'before'}.json`,
  JSON.stringify({
    ran: 'scripts/qa/portal-deploy-drift.mjs',
    phase: AFTER ? 'after' : 'before',
    read_as: 'anon, through more30.com',
    netfree_lines_stripped: 3,
    routes: rows,
    stale: stale.map((r) => r.route),
    missing_commits: missing,
    summary: { pass, fail, stale: stale.length, served: rows.length },
    checks: results,
  }, null, 2) + '\n',
  'utf8',
);

console.log(`\n${pass} passed · ${fail} failed  →  ${OUT}`);
process.exit(fail ? 1 : 0);
