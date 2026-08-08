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
 * הריצה הזאת מודדת כל מסלול כאנונימי מול `more30.com` ומשווה את הבייטים
 * שהוגשו לקובץ שבעץ העבודה, אחרי שהיא מסירה את שלוש שורות ההזרקה של
 * NetFree — שהן של הרשת הזאת ולא של הפריסה.
 *
 * בנוסף היא בודקת סימנים בשמם: מחרוזת שקומיט מסוים הוסיף, שאם היא בעץ
 * ואיננה בייצור אז אותו קומיט אינו חי.
 *
 * ‏**רשימת המסלולים נגזרת ואינה מוקלדת.** כשהיא הייתה מוקלדת היא החזיקה 14
 * שורות, ו-`portal/public/` החזיק 16 קבצי HTML: `system.html` — עמוד המסלולים
 * של §8, שדרכו עוברת ההכנסה — ו-`404.html` של §4 נוספו אחריה ואיש לא הוסיף
 * אותם לרשימה. השומר שנבנה כדי שלא יישנה #118 הצהיר "כל עמוד שהפורטל מגיש",
 * ובדק 14 מתוך 16. עכשיו שני המקורות נקראים מהדיסק: כל rewrite שיעדו קובץ
 * HTML מקומי, ובנוסף כל קובץ HTML שאין לו rewrite ולכן מוגש בשמו המלא. בדיקה
 * שלישית קובעת שלא נשאר קובץ שאיש לא מדד.
 *
 *   node scripts/qa/portal-deploy-drift.mjs [--after]
 */
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const AFTER = process.argv.includes('--after');
const OUT = 'QA/platform/portal-deploy-drift-0808';
const PUBLIC = 'portal/public';

/** כל קבצי ה-HTML שיושבים תחת portal/public, בנתיב יחסי עם לוכסן קדימה. */
async function htmlFiles(dir = PUBLIC, prefix = '') {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const rel = prefix + e.name;
    if (e.isDirectory()) out.push(...(await htmlFiles(`${dir}/${e.name}`, `${rel}/`)));
    else if (e.name.endsWith('.html')) out.push(rel);
  }
  return out.sort();
}

const FILES = await htmlFiles();

/**
 * המסלולים, נגזרים משני המקורות:
 * ‏(א) rewrite שיעדו קובץ HTML מקומי — הכתובת היפה שהמשתמש פוגש;
 * ‏(ב) קובץ HTML שאיש לא ניתב אליו — Vercel מגיש אותו בשמו המלא.
 */
const dist = JSON.parse(await readFile('portal/vercel.dist.json', 'utf8'));
const rewritten = (dist.rewrites ?? [])
  .filter((r) => r.destination.startsWith('/') && r.destination.endsWith('.html'))
  .map((r) => [r.source, r.destination.slice(1)]);
const routedFiles = new Set(rewritten.map(([, f]) => f));
const direct = FILES.filter((f) => !routedFiles.has(f)).map((f) => ['/' + f, f]);
const ROUTES = [...rewritten, ...direct];

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
  const tree = norm(await readFile(`${PUBLIC}/${file}`, 'utf8'));
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

/**
 * שתי בדיקות ששומרות על השומר עצמו. הן אינן על הפער בין העץ לייצור אלא על
 * הרשימה שנגזרה — כי הרשימה היא מה שקבע ש-#118 ייתפס או לא.
 *
 * הראשונה: rewrite שמצביע על קובץ שאינו בעץ. הכתובת היפה תיפרס, תיראה תקינה
 * בקובץ הניתוב, ותחזיר 404 ללקוח. שלוש-עשרה מהמסלולים כאן הם מסכי לוח, ואף
 * אחד מהם אינו נטען משום מקום אחר — אין מי שיגלה את זה חוץ מכאן.
 */
const dangling = rewritten.filter(([, f]) => !FILES.includes(f)).map(([s, f]) => `${s} → ${f}`);
ok('every rewrite destination in vercel.dist.json exists in the tree',
   dangling.length === 0,
   dangling.length ? dangling.join(' · ') : `all ${rewritten.length}`);

/**
 * השנייה: עמוד שנמדד וענה משהו שאינו 200. השוואת הבייטים למעלה משווה גם שני
 * גופי שגיאה זהים ועוברת, ולכן היא לבדה אינה יודעת להבחין בין "מוגש" ל"נפל".
 */
const notOk = rows.filter((r) => r.status !== 200).map((r) => `${r.route} (${r.status})`);
ok('every page the portal serves answers 200',
   notOk.length === 0,
   notOk.length ? notOk.join(', ') : `all ${rows.length}`);

/** הסימנים: מחרוזת שקיימת בעץ ואיננה בייצור. */
const missing = [];
for (const [commit, route, marker, what] of MARKERS) {
  const row = rows.find((r) => r.route === route);
  if (!row || row.error) continue;
  const tree = norm(await readFile(`${PUBLIC}/${row.file}`, 'utf8'));
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
    route_list: 'derived from portal/vercel.dist.json + portal/public/**/*.html',
    html_files: FILES,
    routes: rows,
    stale: stale.map((r) => r.route),
    dangling_rewrites: dangling,
    not_200: notOk,
    missing_commits: missing,
    summary: { pass, fail, stale: stale.length, served: rows.length, html_files: FILES.length },
    checks: results,
  }, null, 2) + '\n',
  'utf8',
);

console.log(`\n${pass} passed · ${fail} failed  →  ${OUT}`);
process.exit(fail ? 1 : 0);
