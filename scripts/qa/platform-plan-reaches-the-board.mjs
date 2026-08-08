/**
 * ‏המסלול של הפלטפורמה עצמה — עכשיו יש לו כרטיס בלוח.
 *
 * ‏הכותרת של ‎/admin/systems‎ ספרה 90 מנויי בדיקה, ותשעה-עשר הכרטיסים שמתחתיה
 * ספרו 79. ההפרש הוא ‎app_key='more30'‎: הוא קיים ב-core.plans (חינמי ופרימיום
 * 10 ₪, ‎§8א‎), ב-core.app_memberships וב-core.subscriptions, ואין ב-core.projects
 * שורה שה-path שלה 'more30'. ‏`totals` נספר ישירות על הטבלאות ולכן כולל אותו;
 * ‏`systems` נבנה מ-core.projects ולכן אינו. מיגרציה 0051 מוציאה את ההפרש
 * למפתח `platform`, וכאן הוא מצויר ככרטיס ראשון.
 *
 * מה שנבדק, אנונימית מול הייצור:
 *
 *  1. **הקוד באמת בייצור.** הכתובת מגישה 200, וה-HTML נושא את `data.platform`
 *     ואת הכרטיס שמצייר אותו. בלי זה "עשיתי" הוא טענה על הדיסק.
 *  2. **הכרטיס נבנה מהדוח ולא מקבוע.** הוא נגזר מ-`pf.users`,
 *     ‏`pf.subscriptions`, ‏`pf.tiers` ו-`pf.mrr_estimate_ils` — ואם המפתח חסר
 *     הוא מחזיר מחרוזת ריקה ולא כרטיס ריק.
 *  3. **הוא לא נכנס ל-systems.** הכרטיס משורשר לפני ‎data.systems‎ ואינו
 *     מוסיף שורה לרשימת המערכות — הפלטפורמה אינה מערכת עשרים.
 *  4. **השער לא זז.** ‏more30_admin_systems_report עדיין מחזיר 42501 לאנונימי.
 *
 * מה שהבדיקה **אינה** מודדת: הציור בפועל לסופר-אדמין. לזה דרוש session של
 * l023131500@gmail.com, ואין כזה בסקריפט. המספרים שהכרטיס יצייר נמדדו
 * בשאילתה ישירה על המסד באותה דקה ונרשמים ב-_results.json.
 *
 *   node scripts/qa/platform-plan-reaches-the-board.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const PAGE = 'https://more30.com/admin/systems';
const SUPABASE_URL = 'https://uhnrgujbdxhhmoxcjria.supabase.co';
// מפתח anon — ציבורי במכוון, אותו אחד ש-portal/public/login.html נושא.
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw';

const OUT = 'QA/platform/platform-plan-board-0809';

// ‏נמדד בשאילתה ישירה על המסד ב-09/08 בזמן ההרצה, ונרשם כאן כדי שיהיה ברור
// מה בדיוק הכרטיס מצייר עכשיו — ולא כדי לשמש מקור לנתון.
const MEASURED = {
  totals_subs_test: 90,
  sum_over_system_cards_test: 79,
  platform_subs_test: 11,
  platform_subs_active: 0,
  platform_members_real: 6,
  platform_members_test: 1,
  platform_active_7d: 4,
  platform_tiers: ['free', 'premium 10 ₪'],
};

let pass = 0,
  fail = 0;
const results = [];
const ok = (n, c, d) => {
  results.push({ check: n, pass: !!c, detail: d ?? null });
  if (c) {
    pass++;
    console.log('  PASS  ' + n);
  } else {
    fail++;
    console.log('  FAIL  ' + n + (d ? `  << ${d}` : ''));
  }
};

(async function () {
  console.log('\n‏המסלול של הפלטפורמה הגיע ללוח\n');

  const res = await fetch(PAGE, { redirect: 'follow' });
  const html = await res.text();
  ok('הכתובת מגישה 200', res.status === 200, `status=${res.status}`);

  ok(
    'ה-HTML קורא את data.platform',
    html.includes('const pf = data.platform;'),
    'המפתח החדש אינו נקרא בעמוד שהייצור מגיש',
  );

  ok(
    'מפתח חסר מחזיר כלום ולא כרטיס ריק',
    html.includes("if (!pf) return '';"),
    'אין נפילה רכה',
  );

  for (const [field, needle] of [
    ['users', 'pf.users'],
    ['subscriptions', 'pf.subscriptions?.active'],
    ['tiers', 'pf.tiers'],
    ['mrr_estimate_ils', 'money(pf.mrr_estimate_ils)'],
  ]) {
    ok(`הכרטיס נגזר מ-${field} של הדוח`, html.includes(needle), `${needle} אינו ב-HTML`);
  }

  ok(
    'הכרטיס משורשר לפני systems ואינו נספר בתוכו',
    html.includes("$('grid').innerHTML = platformCard() + (data.systems || [])"),
    'הכרטיס נדחף לתוך רשימת המערכות',
  );

  ok(
    'הכרטיס מסומן "פלטפורמה" ובלי מספר מערכת',
    html.includes('>פלטפורמה<') && html.includes('<span class="num">—</span>'),
    'הסימון חסר, והכרטיס נקרא כמערכת',
  );

  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/more30_admin_systems_report`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'content-type': 'application/json' },
    body: '{}',
  });
  const body = await r.json().catch(() => null);
  ok(
    'more30_admin_systems_report עדיין חסום לאנונימי',
    r.status >= 400 && body?.code === '42501',
    `status=${r.status} body=${JSON.stringify(body)}`,
  );

  mkdirSync(OUT, { recursive: true });
  writeFileSync(
    path.join(OUT, '_results.json'),
    JSON.stringify({ at: new Date().toISOString(), page: PAGE, measured: MEASURED, pass, fail, results }, null, 2),
  );

  console.log(`\n  ${pass} passed · ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})();
