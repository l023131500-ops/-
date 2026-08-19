/**
 * /admin/customers — the table that drew six columns while the function
 * returned nine fields.
 *
 * Migration 0043 rewrote `more30_admin_customers(p_app)`: it now returns
 * `full_name` (profile, then the §8ב signup metadata), `phone`, and the plan
 * split into what is in force (`plan`) and what was merely asked for
 * (`plan_requested` / `plan_status`). The migration says so itself, in its own
 * closing note — the portal table was left on אימייל · תפקיד · מסלול · הצטרף ·
 * פעילות אחרונה · אומת, and none of the three new answers reached a cell.
 *
 * Measured on the hub, 07/08/2026, over all 22 systems that have members:
 *   110 membership rows · 63 carry a name · 7 carry a phone · 1 carries a
 *   requested plan · every row's plan in force is 'free'.
 *
 * What this checks, with no assumption about the browser:
 *
 *   1. The five renderers are lifted verbatim out of the page source
 *      (portal/public/admin-customers.html) and evaluated. Copying them into
 *      this file would prove only that the copy works; they are parsed out of
 *      the shipped HTML so a later edit that breaks them fails here.
 *   2. They are run over `_payload.json` — the real payload of every app,
 *      taken from the live hub through the super-admin path and then masked
 *      (email local part, name after the first letter, phone middle digits)
 *      because this repository is public. Row count, null/non-null shape,
 *      plan codes and timestamps are untouched, and those are what is asserted.
 *   3. The direction that must not regress: billing is off and no subscription
 *      is active, so no row may be shown holding a paid plan. The one row with
 *      a request must say it is a request.
 *
 *   node scripts/qa/admin-customers-name-phone.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const PAGE = 'portal/public/admin-customers.html';
const DIST = 'portal/dist/admin-customers.html';
const DIR = 'QA/platform/admin-customers-name-phone-0807';
const PAYLOAD = `${DIR}/_payload.json`;

let pass = 0, fail = 0;
const results = [];
const ok = (name, cond, detail) => {
  results.push({ check: name, pass: !!cond, detail: detail ?? null });
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (detail ? `  << ${detail}` : '')); }
};

const src = readFileSync(PAGE, 'utf8');
// BOM: כלי חלונות מוסיפים אותו בשקט, ו-JSON.parse נופל עליו.
const snap = JSON.parse(readFileSync(PAYLOAD, 'utf8').replace(/^﻿/, ''));

// ── 1. הפונקציות נלקחות מהעמוד עצמו ────────────────────────────────────────
/** חותך מהמקור את הבלוק שבין שני סמנים, כולל הראשון. */
function slice(from, to) {
  const a = src.indexOf(from);
  if (a < 0) throw new Error(`לא נמצא במקור: ${from}`);
  const b = src.indexOf(to, a);
  if (b < 0) throw new Error(`לא נמצא סוף הבלוק אחרי: ${from}`);
  return src.slice(a, b);
}

const helpers = slice('const esc =', 'const when=');
const block = slice('const PLAN_HE =', '(async function()');
const { esc, planHe, nameCell, phoneCell, planCell } = new Function(
  `${helpers}\n${block}\nreturn { esc, planHe, nameCell, phoneCell, planCell };`,
)();

ok('חמש הפונקציות נחלצו מהעמוד ורצות',
  [esc, planHe, nameCell, phoneCell, planCell].every((f) => typeof f === 'function'));

// העמוד והעותק שנפרס חייבים להיות אותו קובץ. פיצול ביניהם הוא בדיוק המצב
// שבו בדיקה ירוקה מתארת קובץ שאיש אינו מגיש. portal/dist הוא תוצר בנייה
// מקומי ואינו בגיט — בשיבוט נקי הוא פשוט אינו קיים, וזה נאמר ולא נבלע.
const dist = (() => { try { return readFileSync(DIST, 'utf8'); } catch { return null; } })();
if (dist === null) {
  results.push({ check: 'העותק ב-portal/dist זהה למקור', pass: null, detail: 'אין עותק בנייה מקומי' });
  console.log('  SKIP  העותק ב-portal/dist זהה למקור  << אין עותק בנייה מקומי');
} else {
  ok('העותק ב-portal/dist זהה למקור', dist === src);
}

// ── 2. הכותרות שהטבלה מציירת ───────────────────────────────────────────────
const head = slice('<thead><tr>', '</tr></thead>');
for (const col of ['שם', 'אימייל', 'טלפון', 'תפקיד', 'מסלול', 'הצטרף', 'פעילות אחרונה', 'אומת']) {
  ok(`הטבלה מצהירה עמודת ${col}`, head.includes(`<th>${col}</th>`));
}
ok('הטבלה עטופה במיכל גלילה אופקית', src.includes('class="tbl"') && src.includes('.tbl { overflow-x:auto; }'));

// ── 3. הפונקציות מול המטען האמיתי ──────────────────────────────────────────
const apps = Object.keys(snap.apps);
const all = apps.flatMap((a) => snap.apps[a]);
const named = all.filter((c) => c.full_name);
const phones = all.filter((c) => c.phone);
const requested = all.filter((c) => c.plan_requested);
const active = all.filter((c) => c.plan_status === 'active');

console.log(`\n=== ${apps.length} מערכות · ${all.length} שורות · ${named.length} עם שם · ${phones.length} עם טלפון ===`);

ok('המטען מכסה כל מערכת שיש בה רשומים', apps.length === 22, `apps=${apps.length}`);
ok('המטען מחזיק את כל שורות החברות', all.length === 110, `rows=${all.length}`);
ok('כל שורה נושאת את שלושת השדות ש-0043 הוסיפה',
  all.every((c) => 'full_name' in c && 'phone' in c && 'plan_requested' in c));

// שם
ok('כל שורה עם שם מציירת אותו, ולא את מציין הריק',
  named.every((c) => nameCell(c) !== '<span class="muted">ללא שם</span>' && nameCell(c).length > 0),
  `named=${named.length}`);
ok('שורה בלי שם אומרת זאת במילים ואינה מציירת null',
  all.filter((c) => !c.full_name).every((c) => nameCell(c) === '<span class="muted">ללא שם</span>'));
ok('63 השמות שהפונקציה מחזירה מגיעים לתא',
  named.length === 63 && named.every((c) => nameCell(c).includes(esc(c.full_name))),
  `named=${named.length}`);
ok('שם עם תו HTML היה נמלט',
  nameCell({ full_name: '<b>דני</b>' }) === '&lt;b&gt;דני&lt;/b&gt;');

// טלפון
ok('כל טלפון הופך לקישור חיוג',
  phones.every((c) => phoneCell(c).startsWith('<a dir="ltr" href="tel:')),
  `with_phone=${phones.length}`);
ok('קישור החיוג נושא ספרות בלבד',
  phones.every((c) => /href="tel:\+?\d+"/.test(phoneCell(c))));
ok('שורה בלי טלפון אומרת "לא נמסר" ולא נשארת ריקה',
  all.filter((c) => !c.phone).every((c) => phoneCell(c) === '<span class="muted">לא נמסר</span>'));
ok('7 הטלפונים שהפונקציה מחזירה מגיעים לתא', phones.length === 7, `with_phone=${phones.length}`);

// מסלול
ok('המסלול נאמר בעברית ולא בקוד', all.every((c) => planCell(c).startsWith('חינמי')),
  [...new Set(all.map((c) => c.plan))].join(', '));
ok('אף שורה אינה מוצגת כמסלול בתשלום כל עוד אין מנוי פעיל',
  all.filter((c) => c.plan !== 'free').length === active.length,
  `non_free=${all.filter((c) => c.plan !== 'free').length} active=${active.length}`);
ok('בקשה שטרם נגבתה נאמרת בשורה משלה',
  requested.length === 1 && requested.every((c) => planCell(c).includes('טרם נגבה')),
  `requested=${requested.length}`);
ok('שורה בלי בקשה אינה מקבלת את הכיתוב הזה',
  all.filter((c) => !c.plan_requested).every((c) => !planCell(c).includes('טרם נגבה')));
ok('מנוי פעיל היה מוצג כמסלול, ובלי כיתוב הבקשה',
  planCell({ plan: 'premium', plan_requested: 'premium', plan_status: 'active' }) === 'פרימיום');
ok('קוד מסלול בלי תרגום נופל לקוד עצמו ולא לריק',
  planCell({ plan: 'enterprise' }) === 'enterprise');

// ── 4. מה שכבר היה על המסך לא זז ────────────────────────────────────────────
for (const f of ['email', 'role', 'joined_at', 'last_seen_at', 'confirmed', 'is_test']) {
  ok(`השדה ${f} עדיין מגיע בכל שורה`, all.every((c) => f in c));
}

const summary = {
  page: PAGE, payload: PAYLOAD, apps: apps.length, rows: all.length,
  named: named.length, blank: all.length - named.length, with_phone: phones.length,
  plan_requested: requested.length, plan_active: active.length,
  distinct_plans: [...new Set(all.map((c) => c.plan))],
  pass, fail,
};

mkdirSync(DIR, { recursive: true });
writeFileSync(`${DIR}/_results.json`, JSON.stringify({ summary, results }, null, 2) + '\n', 'utf8');

// ── 5. תצוגה מקדימה לצילום ─────────────────────────────────────────────────
// העמוד עצמו דורש סשן סופר-אדמין בדפדפן. כדי שיהיה מה לצלם בלי להתחבר,
// אותן פונקציות מצוירות על אותו מטען, עם ה-<style> של העמוד עצמו. זה מה
// שהדפדפן יראה — לא ציור חדש של מישהו אחר.
const css = slice('<style>', '</style>');
const when = (ts) => (ts ? new Date(ts).toLocaleDateString('he-IL') : '<span class="muted">—</span>');
const table = (app) => {
  const rows = snap.apps[app];
  return `<h2 style="font-size:16px;font-weight:800;margin:18px 0 6px">${app} — ${rows.length} רשומים</h2>
  <div class="tbl"><table><thead><tr>
    <th>שם</th><th>אימייל</th><th>טלפון</th><th>תפקיד</th><th>מסלול</th>
    <th>הצטרף</th><th>פעילות אחרונה</th><th>אומת</th>
  </tr></thead><tbody>${rows.map((c) => `<tr>
    <td>${nameCell(c)}</td>
    <td dir="ltr">${esc(c.email)}</td>
    <td>${phoneCell(c)}</td>
    <td>${c.is_test ? '<span class="muted">חשבון בדיקה</span>' : (c.role === 'admin' ? 'אדמין אתר' : 'לקוח')}</td>
    <td>${planCell(c)}</td>
    <td>${when(c.joined_at)}</td>
    <td>${when(c.last_seen_at)}</td>
    <td>${c.confirmed ? 'כן' : '<span class="muted">לא</span>'}</td>
  </tr>`).join('')}</tbody></table></div>
  <p class="muted" style="font-size:12.5px;margin-top:8px">${rows.length} רשומים · ${rows.filter((c) => c.full_name).length} עם שם · ${rows.filter((c) => c.phone).length} עם טלפון.</p>`;
};
writeFileSync(`${DIR}/_preview.html`,
  `<!doctype html><html lang="he" dir="rtl"><head><meta charset="UTF-8">
<title>לקוחות — תצוגה מקדימה</title>${css}</style></head><body><div class="wrap">
<h1>לקוחות</h1>
<p class="sub">אותן פונקציות של /admin/customers, על המטען האמיתי של ההאב (אימייל · שם · טלפון מוסווים).</p>
<section class="panel">${table('bkalot')}</section>
<section class="panel">${table('torah')}</section>
</div></body></html>\n`, 'utf8');

console.log('\n' + JSON.stringify(summary, null, 2));
console.log(`\n${pass} עברו / ${fail} נכשלו  →  ${DIR}/_results.json`);
process.exit(fail ? 1 : 0);
