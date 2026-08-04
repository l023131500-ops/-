/**
 * QA/<name>.md for the thirteen systems that had no record.
 *
 * Generated rather than hand-written, on purpose. Thirteen documents composed
 * from memory would read fine and be worth nothing — the value of a QA record
 * is that someone can trust the numbers in it a month from now. Every measured
 * cell here comes from QA/platform/_facts.json, which comes from a real browser
 * against production; the only prose is the per-system notes below, which state
 * what was found and what was done about it.
 *
 * The measurement was taken with the probe as corrected on 05/08/2026. An
 * earlier run of the same probe produced eleven findings that were artifacts of
 * how it computed accessible names, so every table here carries the date and
 * the caveat that a number is only as good as the instrument.
 *
 *   node scripts/qa/write-records.mjs
 */
import fs from 'node:fs';

const facts = JSON.parse(fs.readFileSync('QA/platform/_facts.json', 'utf8'));

/**
 * Per-system prose. `title` and `source` are facts about the repo; `notes` is
 * what this round actually established, in Hebrew, one bullet per real thing.
 * Where a fix is written but not yet deployed that is said explicitly — the
 * quota is finite and "fixed" must not quietly mean "fixed on my disk".
 */
const SYSTEMS = {
  tamlul: {
    title: '02 · תמלול איגוד',
    source: 'apps/02-igud-transcribe',
    notes: [
      'דף נחיתה סטטי אחרי ה-prerender: 1,327 תווים מוגשים ב-HTML הראשון, בלי המתנה ל-JS.',
      'אפס ליקויי נגישות בסבב הזה — לא נמצאו פקדים בלי שם, יעדים קטנים או שגיאות קונסולה.',
      'מצב כהה מגיב דרך `.dark` על `<html>`, כמו רוב המערכות בפלטפורמה.',
    ],
  },
  modaot: {
    title: '03 · סטודיו המודעות',
    source: 'apps/03-igud-ads',
    notes: [
      'זו המערכת עם הסליקה החיה (נדרים פלוס). הפריסה בוצעה בזהירות ואומתה בבדיקת עשן שתהליך התשלום לא נפגע.',
      'אישורי נדרים הוסרו מהמקור והועברו למשתני סביבה; `lib/nedarim.ts` זורק שגיאה מפורשת אם המפתח חסר, במקום ליפול לערך ספרותי.',
      'עדיין דורש אותך: סיבוב האישורים עצמם, כי הם פורסמו בהיסטוריית גיט.',
    ],
  },
  imud: {
    title: '04 · אימוד תורני',
    source: 'apps/04-imud-torani',
    notes: [
      'דף הנחיתה הקצר ביותר בקבוצה (575 תווים) — קצר במכוון, לא חסר.',
      'אפס ממצאים בסבב הזה.',
    ],
  },
  briut: {
    title: '28 · קופות החולים',
    source: 'apps/28-kupot-health-funds',
    notes: [
      'הדף העשיר ביותר בקבוצה: 4,800 תווים ו-12 שדות קלט, כולם עם שם נגיש תקין.',
      '`<base href="/briut/">` קיים — בלעדיו אתר שמותקן על נתיב מגיש CSS ו-JS מהשורש ומקבל HTML בתשובה, בלי אף 404 שיסגיר את זה.',
    ],
  },
  bkalot: {
    title: '10 · בקלות — מערכת הזכויות',
    source: 'apps/10-bkalot-rights',
    notes: [
      '**התקלה החמורה של הסבב, ותוקנה:** האתר רץ שבועות בלי CSS ובלי JS. חסר `<base href="/bkalot/">`, ולכן `style.css`, `engine.js`, `repo.js` ו-`app.js` נפתרו לשורש הפורטל והחזירו 200 עם HTML. שום נכס לא החזיר 404, ולכן כל בדיקות הנכסים עברו.',
      'תיקון ה-base שבר את המצב הכהה: `:root` המקומי קיבל את אותה ספציפיות כמו `.dark` של גיליון הטוקנים החוצה-מקור, והופיע אחריו במסמך. הפלטה הכהה הועברה לגיליון של בקלות עצמו, שנטען אחרון. אומת חי: `rgb(247,246,242)` ← `rgb(18,19,15)`.',
      'שלושה פקדי סינון בקטלוג הוכרזו בלי שם — חיפוש ושני `select`. תוקן ב-`aria-label`, נפרס, **ואומת חי: 0 פקדים בלי שם**.',
      'התור והתוכן של אוטומציית בקלות בנויים על המערכת הזאת; ראה `BKALOT_AUTOMATION_BUILD.md`.',
    ],
  },
  smel: {
    title: '12 · סמל נדל״ן',
    source: 'apps/12-smel-ndln',
    notes: [
      'טופס החיפוש (עיר · רחוב · מספר) הציג שלוש תוויות שנראו כמו תוויות ולא היו: `<label>` בלי `htmlFor` ליד `<Input>` בלי `id`. מי שרואה את המסך קורא "עיר" ומבין; קורא מסך הכריז על שדה בלי שם, ומה שנשאר היה ה-placeholder — שנעלם בהקלדה.',
      'תוקן בקישור מפורש, בלי שינוי בעיצוב. נפרס ואומת חי: 0 שדות ששמם רק `placeholder`.',
    ],
  },
  smachot: {
    title: '14 · שמחות פלוס',
    source: 'apps/14-bsmachot-plus/website',
    notes: [
      'המערכת היחידה בקבוצה שמצב כהה שלה עובד דרך `[data-theme="dark"]` ולא דרך `.dark` — עם מתג שמש/ירח משלה ו-`prefers-color-scheme` כברירת מחדל. סבב מדידה קודם דיווח שאין לה מצב כהה כלל; זו הייתה שגיאת מכשיר, והכלי תוקן.',
      'קישור "מאגר GitHub" נמדד 232×20 — מתחת לרצפת 24px של WCAG 2.5.8, ואינו קישור בתוך משפט ולכן אינו פטור. `min-height:24px` כבר היה במקור ומעולם לא נפרס. נפרס ואומת חי: 0 יעדים קטנים.',
      '**רגרסיה שגרמתי לה בפריסה הזאת, ותוקנה תוך דקות.** העותק המוכן ב-`_deploy` היה ישן מהאתר החי: חסר בו `<base href="/smachot/">` וחסר בו כפתור הכניסה המשותף. השוויתי מקור מול `_deploy` וראיתי שהם זהים, אבל **לא** השוויתי אף אחד מהם מול הפרודקשן — וזו בדיוק ההשוואה שהייתה חושפת את הפער. אחרי הפריסה הטקסט צנח מ-1,445 תווים ל-83 והקונסולה החזירה `Unexpected token \'<\'`: כל הנכסים היחסיים נפתרו מול שורש הפורטל וקיבלו HTML במקום CSS ו-JS. ה-base והכפתור נוספו למקור ולעותק, ונפרסו. אומת חי: 1,445 תווים, אפס שגיאות.',
    ],
  },
  egod: {
    title: '15 · איגוד',
    source: 'apps/15-egod',
    notes: [
      '22 קישורים, כולם עם שם נגיש. אפס ממצאים.',
    ],
  },
  mthbram: {
    title: '21 · מתחברים',
    source: 'apps/21-mthbram',
    notes: [
      'האתר כהה מלכתחילה לפי המותג — `rgb(9,26,32)`. הוא אינו "מתהפך" כי אין לאן, וזה לא ליקוי. הכלי מתעד אותו כ-`already-dark` במקום כ-"אין מצב כהה", כי אלה שתי עובדות שונות.',
      '`FilterSelect` נשא את שמו רק דרך האפשרות הריקה, ולכן השדה הציג "נושא" עד שבחרו בו — ומאותו רגע הוכרז רק "גמרא", בלי לומר איזה מסנן זה. תוקן בשני העותקים (`LessonsDashboard`, `FindLesson`) יחד עם שני שדות חיפוש בלי שם. נפרס ואומת חי: 0 פקדים בלי שם.',
      'אין `h1` בדף — הכותרת הראשונה היא `h2`. נרשם ולא תוקן בסבב הזה.',
      'הכותרת מציגה "0 שיעורים". אם זה מצב אמת של המאגר — זה נתון אמת ותקין; אם לא, זה טעון בדיקה מול מקור הנתונים.',
    ],
  },
  galil: {
    title: '24 · גליל קונקט',
    source: 'apps/24-galilee-connect-hub',
    notes: [
      '21 קישורים, 3 תמונות — לכולן `alt`. אפס ממצאים.',
    ],
  },
  mechiron: {
    title: '27 · המחירון',
    source: 'apps/27-bkalut-price',
    notes: [
      'טופס יצירת הקשר הוא המקום היחיד בעמוד שבו מבקר מוסר פרטים, וארבעת שדותיו הוכרזו בלי שם. מי שמילא אותו בקורא מסך שמע "עריכה, חובה" ולא ידע אם מבקשים טלפון או אימייל. תוקן בשני המסלולים שמרנדרים אותו, עם `autoComplete` ועם `aria-hidden` על הכוכבית — `required` כבר מודיע על חובה, והכוכבית הוקראה באמצע השם. נפרס ואומת חי: 0.',
      'הפריסה כאן דרשה זהירות נוספת: `/mechiron` הוא יעד prerender, וה-`index.html` המוכן הוא 34KB של HTML אפוי מול 3KB של בנייה גולמית. העתקה ישירה הייתה מוחקת את האפייה ומחזירה את ה-FCP — בדיוק הרגרסיה שגרמתי ל-torah. הבנייה הועתקה ואז `scripts/prerender-all.mjs mechiron` אפה מחדש: 3KB ← 34KB.',
      'קישור "תנאי שימוש ומדיניות פרטיות" נמדד 130×17 ודווח כיעד קטן. הוא קישור בתוך משפט, ולכן פטור לפי WCAG 2.5.8 — הגדלתו הייתה שוברת את הפסקה. הכלי תוקן להחריג אותו.',
      'הצ׳אטבוט נשאר כבוי: מקור הנתונים שלו לא אומת, והמפרט מורה לא להפעיל לפני אימות.',
    ],
  },
  crm: {
    title: '30 · זכויות פרו — CRM',
    source: 'apps/30-zchuyotpro-crm',
    notes: [
      'הנתיב `/` היה ריק והפיל את React עם שגיאה #418; תוקן בסבב הזה.',
      'מסך ההתחברות: שני שדות, שניהם עם שם נגיש תקין. סבב קודם דיווח עליהם כחסרי שם — שגיאת מכשיר, לא ליקוי.',
      '135 תווים בלבד בעמוד, וזה נכון: זהו מסך התחברות ולא דף תוכן.',
    ],
  },
  gesher: {
    title: '31 · גשר — CRM',
    source: 'apps/31-hebrew-bridge-crm',
    notes: [
      'זהה ל-30 בבנייה ובממצאים: אינדקס ריק תוקן, ושני שדות ההתחברות תקינים.',
    ],
  },
};

const yes = (b) => (b ? '✅' : '❌');
const mech = {
  class: '✅ מגיב — `.dark` על `<html>`',
  'data-theme': '✅ מגיב — `[data-theme="dark"]`, מתג משלו',
  'already-dark': '➖ כהה מלכתחילה לפי המותג',
};

let written = 0;
for (const [key, meta] of Object.entries(SYSTEMS)) {
  const f = facts[key];
  if (!f) {
    console.log(`  skip ${key} — no measurement in _facts.json`);
    continue;
  }

  const md = `# QA — ${meta.title} (\`${f.route}\`)

> נמדד 05/08/2026 מול הפרודקשן, בדפדפן אמיתי (Chromium, מובייל 390×844, \`he-IL\`).
> הכלי: \`scripts/qa/system-facts.mjs\` · הנתונים הגולמיים: \`QA/platform/_facts.json\`.
> המקור: \`${meta.source}\`.
>
> **הסתייגות שחשוב שתישאר כאן:** סבב מדידה קודם של אותו כלי הפיק אחד-עשר
> "ממצאי נגישות" שכולם היו שגיאות של הכלי עצמו — הוא חישב שם נגיש בדרך שאינה
> הדרך שבה קורא מסך מחשב אותו. הכלי תוקן לפני שנכתב המסמך הזה. מספר שווה בדיוק
> כמה שהמכשיר שהפיק אותו שווה.

---

## מה נמדד

| | תוצאה |
|---|---|
| קוד תשובה | ${f.status === 200 ? '✅ 200' : `❌ ${f.status}`} |
| \`lang\` · \`dir\` | ${f.lang === 'he' && f.dir === 'rtl' ? '✅ `he` · `rtl`' : `⚠️ \`${f.lang}\` · \`${f.dir}\``} |
| \`h1\` בדף | ${f.h1 === 1 ? '✅ אחד' : f.h1 === 0 ? '❌ אין' : `⚠️ ${f.h1}`} |
| טקסט מוגש | ${f.textLen} תווים |
| קישורים · טפסים · שדות | ${f.links} · ${f.forms} · ${f.inputs} |
| תמונות בלי \`alt\` | ${f.imagesNoAlt === 0 ? `✅ 0 מתוך ${f.images}` : `❌ ${f.imagesNoAlt} מתוך ${f.images}`} |
| \`<base href>\` | ${f.baseHref ? `✅ \`${f.baseHref}\`` : '➖ לא נדרש בנתיב הזה'} |
| כפתור הכניסה המשותף | ${yes(f.hasAuthButton)} |
| מרווח לכפתור (\`--more30-auth-inset\`) | ${f.darkVar || '❌ לא פורסם'} |
| **פקדים בלי שם נגיש** | ${f.unnamedControls.length === 0 ? '✅ 0' : `❌ ${f.unnamedControls.length} — ${f.unnamedControls.map((u) => `\`${u.tag}\``).join(', ')}`} |
| שדות ששמם רק \`placeholder\` | ${f.placeholderOnlyNames === 0 ? '✅ 0' : `⚠️ ${f.placeholderOnlyNames}`} |
| **יעדי מגע מתחת ל-24px** | ${f.smallTargets.length === 0 ? '✅ 0' : `❌ ${f.smallTargets.map((s) => `${s.name || s.tag} (${s.w}×${s.h})`).join(', ')}`}${f.inlineExemptTargets ? ` · ${f.inlineExemptTargets} פטורים (קישור בתוך משפט, WCAG 2.5.8)` : ''} |
| **מצב כהה** | ${mech[f.darkMechanism] ?? '❌ אין'} |
| רקע ברירת מחדל | \`${f.defaultBg}\` |
| שגיאות קונסולה | ${f.consoleErrors.length === 0 ? '✅ 0' : `❌ ${f.consoleErrors.length}`} |
| תשובות ≥400 | ${f.badResponses.length === 0 ? '✅ 0' : `❌ ${f.badResponses.join(' · ')}`} |

---

## מה נמצא, ומה נעשה

${meta.notes.map((n) => `- ${n}`).join('\n')}

---

## איך לשחזר

\`\`\`bash
node scripts/qa/system-facts.mjs ${key}
\`\`\`

הבדיקות הרוחביות שנוגעות גם למערכת הזאת:
\`scripts/qa/authbutton-applied.mjs\` (מרווח הכפתור המשותף),
\`scripts/qa/relative-asset-probe.mjs\` (נכס שחוזר 200 עם HTML במקום CSS),
\`scripts/qa/secret-scan.mjs\` (סוד שדלף למקור).
`;

  fs.writeFileSync(`QA/${key}.md`, md, 'utf8');
  written++;
  const flags = [
    f.unnamedControls.length ? `unnamed=${f.unnamedControls.length}` : null,
    f.smallTargets.length ? `small=${f.smallTargets.length}` : null,
    f.h1 !== 1 ? `h1=${f.h1}` : null,
    f.placeholderOnlyNames ? `ph=${f.placeholderOnlyNames}` : null,
  ].filter(Boolean);
  console.log(`  QA/${key}.md`.padEnd(22) + (flags.length ? `open: ${flags.join(' ')}` : 'clean'));
}

console.log(`\n${written} records written.`);
