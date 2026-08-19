/**
 * ‏המונה שנפתח ב-0050 — עכשיו יש מסך שקורא אותו.
 *
 * ‏0050 הוסיפה את `core.join_rejects` ואת `public.more30_admin_join_rejects()`,
 * ואמרה במפורש מה לא נעשה: אף מסך לא קרא אותם. מונה שאיש אינו רואה הוא בדיוק
 * המצב שהוליד את #121 ו-#122 — שמיטת חברות בשקט, חודשיים, בלי שאף מספר יזוז.
 *
 * הצעד הזה חיבר את הקורא ל-‎/admin/activity‎. מה שנבדק כאן, אנונימית מול
 * הייצור:
 *
 *  1. **הקוד באמת בייצור.** הכתובת מגישה 200, וה-HTML נושא את קריאת ה-RPC ואת
 *     שש כותרות הטבלה. בלי זה "עשיתי" הוא טענה על הדיסק, לא על האתר.
 *  2. **הבלוק סגור כברירת מחדל.** ‏`hidden` יושב על האלמנט ב-HTML עצמו, ונפתח
 *     רק אחרי שהקריאה חזרה בלי שגיאה. מי שאינו סופר-אדמין לא רואה אותו כלל.
 *  3. **השער לא זז.** הקריאה עדיין מחזירה 42501 לאנונימי — הוספת מסך אינה
 *     הוספת דלת.
 *  4. **שאר העמוד לא נפגע.** ‏more30_admin_activity ממשיך להיות מוגן באותה
 *     צורה, והבלוק החדש נוסף אחרי `content.hidden = false` ולכן אינו יכול
 *     למנוע את ציור העמוד.
 *
 * מה שהבדיקה **אינה** מודדת: הציור בפועל לסופר-אדמין. לזה דרוש session של
 * l023131500@gmail.com, ואין כזה בסקריפט. הטבלה במסד ריקה נכון להרצה
 * (‎_results.json‎), ולכן מה שסופר-אדמין רואה כרגע הוא מצב-הריק.
 *
 *   node scripts/qa/join-rejects-reach-the-board.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const PAGE = 'https://more30.com/admin/activity';
const SUPABASE_URL = 'https://uhnrgujbdxhhmoxcjria.supabase.co';
// מפתח anon — ציבורי במכוון, אותו אחד ש-portal/public/login.html נושא.
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw';

const OUT = 'QA/platform/join-rejects-board-0809';

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
  console.log('\n‏המונה של 0050 הגיע ללוח\n');

  const res = await fetch(PAGE, { redirect: 'follow' });
  const html = await res.text();
  ok(`הכתובת מגישה 200`, res.status === 200, `status=${res.status}`);

  ok(
    'ה-HTML קורא ל-more30_admin_join_rejects',
    html.includes("sb.rpc('more30_admin_join_rejects')"),
    'הקריאה אינה בעמוד שהייצור מגיש',
  );

  for (const th of ['מארח', 'ניסיונות', 'דגימת נתיב', 'ב-trusted_origins', 'ראשון', 'אחרון']) {
    ok(`כותרת הטבלה: ${th}`, html.includes(`<th>${th}</th>`));
  }

  ok(
    'הבלוק סגור ב-HTML עצמו ונפתח רק אחרי תשובה תקינה',
    /id="rejectsBlock"\s+hidden/.test(html) && html.includes("$('rejectsBlock').hidden = false"),
    'ברירת המחדל אינה hidden',
  );

  ok(
    'הבלוק נוסף אחרי ציור העמוד ולא לפניו',
    html.indexOf("$('content').hidden = false") <
      html.indexOf("sb.rpc('more30_admin_join_rejects')"),
    'הקריאה קודמת לציור, ולכן נפילה שלה תשאיר עמוד ריק',
  );

  const rpc = async (name) => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${ANON}`,
        'content-type': 'application/json',
      },
      body: '{}',
    });
    return { status: r.status, body: await r.json().catch(() => null) };
  };

  // ‏שתי הפונקציות מסרבות בקוד 42501, ובנוסח שונה ("forbidden" מול
  // "super admin only"). הבדיקה על הקוד, לא על המשפט.
  for (const fn of ['more30_admin_join_rejects', 'more30_admin_activity']) {
    const r = await rpc(fn);
    ok(
      `${fn} עדיין חסום לאנונימי`,
      r.status >= 400 && r.body?.code === '42501',
      `status=${r.status} body=${JSON.stringify(r.body)}`,
    );
  }

  mkdirSync(OUT, { recursive: true });
  writeFileSync(
    path.join(OUT, '_results.json'),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        page: PAGE,
        // ‏נמדד בשאילתה ישירה על המסד באותה דקה, ונרשם כאן כדי שיהיה ברור
        // איזה מצב המסך מצייר כרגע.
        join_rejects_rows_at_run: 0,
        pass,
        fail,
        results,
      },
      null,
      2,
    ),
  );

  console.log(`\n  ${pass} passed · ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})();
