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
 * ‏**וגם רשימת הנכסים.** אחרי אותו תיקון היא עדיין הייתה מוקלדת, ובה שורה
 * אחת: `auth-button.js`. `robots.txt` ו-`sitemap.xml` — שני הקבצים שמספרים
 * למנועי החיפוש מה קיים באתר — לא נמדדו מעולם, וב-09/08 הייצור הגיש מפה בת
 * 20 כתובות בזמן שהעץ החזיק 21. עכשיו נמדד כל קובץ שתחת `portal/public`.
 *
 *   node scripts/qa/portal-deploy-drift.mjs [--after]
 */
import { readFile, readdir, mkdir, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const AFTER = process.argv.includes('--after');
const OUT = 'QA/platform/portal-deploy-drift-0808';
const PUBLIC = 'portal/public';

/** כל הקבצים שיושבים תחת portal/public, בנתיב יחסי עם לוכסן קדימה. */
async function allFiles(dir = PUBLIC, prefix = '') {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const rel = prefix + e.name;
    if (e.isDirectory()) out.push(...(await allFiles(`${dir}/${e.name}`, `${rel}/`)));
    else out.push(rel);
  }
  return out.sort();
}

const ALL_FILES = await allFiles();
const FILES = ALL_FILES.filter((f) => f.endsWith('.html'));

/**
 * המסלולים, נגזרים משני המקורות:
 * ‏(א) rewrite שיעדו קובץ HTML מקומי — הכתובת היפה שהמשתמש פוגש;
 * ‏(ב) קובץ HTML שאיש לא ניתב אליו — Vercel מגיש אותו בשמו המלא.
 */
const dist = JSON.parse(await readFile('portal/vercel.dist.json', 'utf8'));
const rewritten = (dist.rewrites ?? [])
  .filter((r) => r.destination.startsWith('/') && r.destination.endsWith('.html'))
  .map((r) => [r.source, r.destination.slice(1)]);
/** כל יעד rewrite מקומי, גם כשאינו HTML — כדי שנכס מנותב לא יימדד פעמיים. */
const routedFiles = new Set(
  (dist.rewrites ?? [])
    .filter((r) => r.destination.startsWith('/'))
    .map((r) => r.destination.slice(1)),
);
const direct = FILES.filter((f) => !routedFiles.has(f)).map((f) => ['/' + f, f]);
const ROUTES = [...rewritten, ...direct];

/**
 * ‏**רשימת הנכסים נגזרת אף היא, מאותה סיבה.** כשהיא הייתה מוקלדת היא החזיקה
 * שורה אחת — `auth-button.js`, הקובץ שכל העמודים טוענים — ושני הקבצים
 * שמספרים למנועי החיפוש מה קיים באתר, `robots.txt` ו-`sitemap.xml`, לא נמדדו
 * מעולם. `sitemap.xml` הוא בדיוק הקובץ שהקומיט הקודם (8d7cb59, #127) שינה,
 * ולכן השומר שהצהיר "כל עמוד שהפורטל מגיש" עבר 4/4 בזמן שהייצור הגיש מפה
 * ישנה בת 20 כתובות בלי `/showcase` — אתר התדמית שכל 26 הפוטרים מקשרים אליו.
 *
 * עכשיו: כל קובץ שאינו HTML תחת `portal/public` שאין לו rewrite. קובץ חדש
 * נכנס למדידה מעצם קיומו.
 */
const ASSETS = ALL_FILES.filter((f) => !f.endsWith('.html') && !routedFiles.has(f)).map((f) => [
  '/' + f,
  f,
]);

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

/**
 * נכס בינארי — לא נקרא כטקסט ולא מושווה בייטים.
 *
 * נמדד ב-10/08, כששלושת קובצי האייקון נכנסו ל-portal/public: נטפרי אינה
 * מעבירה תמונה כמות שהיא. `favicon.svg` חזר 806 בייטים מהמקור ו-2842 כאן,
 * בטיפוס image/webp; `apple-touch-icon.png` חזר 4477 מול 13850; ו-`favicon.ico`
 * חזר 418 עם גוף בן 76 בייטים במקום 200. שלושתם נכונים בייצור — נמדדו
 * שרת-צד ב-200 עם image/vnd.microsoft.icon ו-image/svg+xml באורכים המדויקים
 * של העץ. כלומר ההפרש הוא הרשת שבדרך, לא הפריסה.
 *
 * לכן השוואת בייטים ובדיקת 200 מדלגות עליהם: שומר שנצבע אדום בגלל המתווך
 * שבדרך מלמד להתעלם ממנו, וזה בדיוק מה שהוא אמור לתפוס. הם עדיין נספרים
 * ב"כל קובץ נמדד" ומדווחים ב-_results תחת unverifiable_here, כדי שהדילוג
 * יהיה גלוי ולא שקט. אימות בינארי אמיתי דורש קריאה שאינה עוברת כאן.
 */
const isBinary = (f) => /\.(png|ico|jpe?g|gif|webp|avif|svg|woff2?|ttf|otf|mp[34]|pdf)$/i.test(f);
// `svg` ברשימה למרות שהוא טקסט: נטפרי ממירה גם אותו ל-webp, ולכן מה שמגיע
// לכאן אינו הקובץ אלא תמונה שנוצרה ממנו. אין כאן מה להשוות תו מול תו.

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
  if (isBinary(file)) {
    rows.push({
      route, file, status, binary: true,
      tree_bytes: (await stat(`${PUBLIC}/${file}`)).size,
      note: 'binary — not comparable through this network',
    });
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
    `  ${r.binary ? 'בינ׳' : r.identical ? 'חי  ' : 'ישן '} ${r.route.padEnd(20)} ` +
    `live ${String(r.binary ? '—' : r.live_bytes ?? 0).padStart(6)}  tree ${String(r.tree_bytes ?? 0).padStart(6)}`,
  );
}

/** מה שהושווה בפועל — בלי הבינאריים, שהרשת שבדרך משכתבת. */
const comparable = rows.filter((r) => !r.binary);
const skipped = rows.filter((r) => r.binary).map((r) => r.route);

const stale = comparable.filter((r) => !r.identical);
ok('every page the portal serves matches the file in the tree',
   stale.length === 0,
   stale.length ? `${stale.length}/${comparable.length} stale: ${stale.map((r) => r.route).join(', ')}`
                : `all ${comparable.length}${skipped.length ? ` (${skipped.length} binary skipped: ${skipped.join(', ')})` : ''}`);

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
const notOk = comparable.filter((r) => r.status !== 200).map((r) => `${r.route} (${r.status})`);
ok('every page the portal serves answers 200',
   notOk.length === 0,
   notOk.length ? notOk.join(', ') : `all ${comparable.length}`);

/**
 * השלישית, וזו שהייתה תופסת את sitemap.xml: קובץ שיושב ב-portal/public ואף
 * שורה למעלה לא מדדה אותו. שתי הרשימות נגזרות עכשיו, אבל גזירה יכולה להשאיר
 * קטגוריה בחוץ בדיוק כפי שרשימה מוקלדת משאירה שורה — ולכן ההשוואה כאן היא
 * מול תוכן התיקייה כולה ולא מול מה שהגזירה ייצרה.
 */
const measured = new Set([...ROUTES, ...ASSETS].map(([, f]) => f));
const unmeasured = ALL_FILES.filter((f) => !measured.has(f));
ok('every file under portal/public is measured by one of the routes above',
   unmeasured.length === 0,
   unmeasured.length ? unmeasured.join(' · ') : `all ${ALL_FILES.length}`);

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
    route_list: 'derived from portal/vercel.dist.json + every file under portal/public/**',
    html_files: FILES,
    asset_files: ASSETS.map(([, f]) => f),
    routes: rows,
    stale: stale.map((r) => r.route),
    unverifiable_here: skipped,
    dangling_rewrites: dangling,
    not_200: notOk,
    unmeasured_files: unmeasured,
    missing_commits: missing,
    summary: {
      pass, fail,
      stale: stale.length,
      served: rows.length,
      compared: comparable.length,
      binary_skipped: skipped.length,
      html_files: FILES.length,
      asset_files: ASSETS.length,
      public_files: ALL_FILES.length,
    },
    checks: results,
  }, null, 2) + '\n',
  'utf8',
);

console.log(`\n${pass} passed · ${fail} failed  →  ${OUT}`);
process.exit(fail ? 1 : 0);
