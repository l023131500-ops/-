/**
 * §4 — "לא-עובדות → מוסתרות". מה עונה הכתובת של מערכת שאינה מורכבת?
 *
 * הרקע: הצעד הקודם (portal-deploy-drift) מצא שבנייה בת שבוע הגישה 12 מתוך 15
 * עמודים, וכל 15 החזירו 200 לפני ואחרי — ולכן בדיקת סטטוס לבדה עברה עליה
 * בשקט. כאן נמדד למה: השורה האחרונה ב-portal/vercel.dist.json היא
 *
 *   { "source": "/(.*)", "destination": "/index.html" }
 *
 * ולכן **כל** כתובת שלא נתפסה ברשימה שמעליה מקבלת את דף הבית של הפורטל,
 * עם 200. אין נתיב תחת more30.com שיכול להיכשל.
 *
 * מה זה שובר בפועל, ולמה זה §4 ולא רק ניקיון:
 *  · שש מערכות מוכרזות ב-core.projects עם path ובלי live (bkalot-studio,
 *    events, financial, igud, shiurim, zol). הכתובת שלהן עונה 200 ומציירת
 *    את דף הבית — כלומר "מערכת שאינה עובדת" נראית עובדת לכל מי ששואל.
 *  · §8א נוקב במפורש ב"פורטל שיעורים 01/19". 19 = shiurim, והוא אחד מהשש.
 *  · כל קישור שבור בפלטפורמה — טעות הקלדה, מערכת שירדה, נתיב שהשתנה —
 *    מחזיר את דף הבית במקום להיכשל, ולכן אף בדיקה אוטומטית לא תראה אותו.
 *
 * מה הבדיקה עושה:
 *  1. מביאה פעם אחת את גוף דף הבית — זה חתום הזיהוי של ה-fallback.
 *  2. לכל נתיב חי (live=true ב-core.projects) — דורשת שהגוף **שונה** מדף
 *     הבית. זו הרגרסיה שנשמרת: מערכת שתרד מהניתוב תיתפס כאן ולא תיראה 200.
 *  3. לכל נתיב מוכרז-ולא-חי, ולשלוש כתובות בדויות — מדווחת מה חזר בפועל.
 *     כשלון כאן אינו "האתר שבור" אלא "הכתובת משקרת", והוא נספר בנפרד.
 *
 * הרשימה נמדדה מ-core.projects ב-08/08/2026 (30 שורות עם path), ומוצלבת
 * מול מקור ה-rewrites כדי שנתיב שיתווסף לאחד ולא לשני ייתפס.
 *
 *   node scripts/qa/unknown-path-serves-home.mjs
 */
import { readFile } from 'node:fs/promises';

const HOME = 'https://more30.com';
const CONFIG = 'portal/vercel.dist.json';

// core.projects, 08/08/2026 — כל שורה שיש לה path.
const DECLARED = [
  { path: 'bkalot', live: true }, { path: 'bkalot-studio', live: false },
  { path: 'briut', live: true }, { path: 'chatzor', live: true },
  { path: 'chizukim', live: true }, { path: 'crm', live: true },
  { path: 'egod', live: true }, { path: 'events', live: false },
  { path: 'financial', live: false }, { path: 'galil', live: true },
  { path: 'gesher', live: true }, { path: 'igud', live: false },
  { path: 'imud', live: true }, { path: 'kesef', live: true },
  { path: 'kiosk', live: true }, { path: 'kupot', live: true },
  { path: 'mechiron', live: true }, { path: 'modaot', live: true },
  { path: 'mthbram', live: true }, { path: 'nadlan', live: true },
  { path: 'orech', live: true }, { path: 'shiurim', live: false },
  { path: 'smachot', live: true }, { path: 'smel', live: true },
  { path: 'studio', live: true }, { path: 'tamlul', live: true },
  { path: 'tivuch', live: true }, { path: 'torah', live: true },
  { path: 'zchuyot', live: true }, { path: 'zol', live: false },
];

// כתובות שאיש לא הכריז עליהן. אם גם הן מקבלות 200, זה לא במקרה.
const INVENTED = ['zmanim', 'no-such-system-at-all', 'admin-pricing'];

let pass = 0, fail = 0, soft = 0;
const ok = (n, c, d) => {
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? `  << ${d}` : '')); }
};

async function body(path) {
  const url = HOME + '/' + path + (path ? '/' : '');
  const r = await fetch(url, { redirect: 'follow' });
  return { status: r.status, text: await r.text(), url };
}

const home = await body('');
console.log(`=== §4 · מה עונה כתובת שאינה מורכבת ===`);
console.log(`    דף הבית: ${home.status}, ${home.text.length} בייט — זה חתום ה-fallback\n`);

// ── 1. הניתוב עצמו: מי מוכרז, ומי באמת מורכב
const cfg = JSON.parse(await readFile(CONFIG, 'utf8'));
const mounted = new Set(
  cfg.rewrites
    .map((r) => (r.source.match(/^\/([a-z0-9-]+)(\/|$)/) || [])[1])
    .filter(Boolean),
);
console.log('— הצלבה: core.projects מול ' + CONFIG + ' —\n');
for (const d of DECLARED.filter((d) => d.live)) {
  ok(`/${d.path} חי ב-core.projects ויש לו rewrite`, mounted.has(d.path),
     'אין שורת rewrite — הכתובת תיפול ל-catch-all');
}
const declaredDead = DECLARED.filter((d) => !d.live);
console.log(`\n  ${declaredDead.length} נתיבים מוכרזים ולא חיים: ` +
            declaredDead.map((d) => d.path).join(' · '));
console.log(`  מהם עם rewrite: ` +
            (declaredDead.filter((d) => mounted.has(d.path)).map((d) => d.path).join(' · ') || 'אף אחד'));

// ── 2. הרגרסיה: מערכת חיה חייבת להגיש את עצמה, לא את דף הבית
console.log('\n— מערכת חיה מגישה את עצמה —\n');
for (const d of DECLARED.filter((d) => d.live)) {
  const r = await body(d.path);
  ok(`/${d.path} אינו דף הבית (${r.status}, ${r.text.length} בייט)`,
     r.status === 200 && r.text !== home.text,
     r.text === home.text ? 'בייט-בבייט דף הבית — המערכת אינה מוגשת' : `סטטוס ${r.status}`);
}

// ── 3. הכתובת שמשקרת: 200 + דף הבית, במקום לא-נמצא
console.log('\n— כתובת שאין מאחוריה מערכת —\n');
for (const p of [...declaredDead.map((d) => d.path), ...INVENTED]) {
  const r = await body(p);
  const isHome = r.text === home.text;
  if (isHome) soft++;
  const label = declaredDead.some((d) => d.path === p) ? 'מוכרז, לא חי' : 'בדוי';
  console.log(`  ${isHome ? 'SOFT-404' : '  ok    '}  /${p}  (${label})  ${r.status}, ${r.text.length} בייט` +
              (isHome ? '  << דף הבית, עם 200' : ''));
}

console.log(`\n${pass} passed · ${fail} failed`);
console.log(`${soft} כתובות ללא מערכת החזירו את דף הבית עם 200 ` +
            `מתוך ${declaredDead.length + INVENTED.length} שנבדקו.`);
if (soft) {
  console.log('הסיבה: השורה האחרונה ב-' + CONFIG + ' — { "source": "/(.*)", "destination": "/index.html" }.');
}
process.exit(fail ? 1 : 0);
