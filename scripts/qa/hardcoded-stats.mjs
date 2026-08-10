#!/usr/bin/env node
// hardcoded-stats.mjs — מוצא מספרים שמפורסמים בעמוד ואינם נמדדים.
//
// הרקע: ב-15-egod רצועת המונים החזיקה מערך קבוע בקוד — «350+ מגידי שיעור»,
// «1,200+ שיעורים» — מול 4 ו-10 במסד. הליקוי הזה הוא תבנית ולא מקרה, ולכן
// הכלי הזה מחפש את אותה **צורה** בכל שאר המערכות במקום להעריך אותה.
//
// מה נחשב מועמד: ליטרל מספרי (במחרוזת בקוד או בין תגיות ב-HTML) שיושב ליד
// טקסט עברי, ובחלון שסביבו יש סימן שזו רצועת נתון — שם שדה כמו value/label,
// מחלקה שמכילה stat/counter, או שהמספר עצמו נושא «+» או פסיק אלפים.
//
// הכלי מסמן מועמדים בלבד. מספר קבוע שמתאר עובדה קבועה (מחיר, שנת ייסוד,
// «24/7») אינו ליקוי — ההכרעה היא קריאה של השורה, לא של הכלי.
//
//   node scripts/qa/hardcoded-stats.mjs              # כל האפליקציות
//   node scripts/qa/hardcoded-stats.mjs 15-egod      # אחת (אימות הכלי)
//   node scripts/qa/hardcoded-stats.mjs --json       # פלט גולמי

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const APPS = join(ROOT, 'apps');

// מוגן — לא נקרא ולא נדווח.
const PROTECTED = ['08-bkalut-app', '09-bkalot-admin', 'bkalut-app', 'bkalot-admin', 'zr_', 'NEDARIM3873'];
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'out', '.next', '.vercel', '.git', '_deploy', '_archive', 'coverage', 'public']);
const EXTS = ['.tsx', '.jsx', '.ts', '.js', '.html', '.vue'];

const HEBREW = /[֐-׿]{2,}/;
// שם שדה או מחלקה שמעידים על רצועת נתון ולא על מספר מקרי בקוד.
const STAT_CTX = /\b(value|label|stat|stats|counter|count|number|metric|suffix|kpi|figure|amount)\b/i;

const WINDOW = 220;

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    const full = join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      walk(full, out);
    } else if (EXTS.some((e) => name.endsWith(e))) {
      out.push(full);
    }
  }
  return out;
}

function lineOf(text, index) {
  let line = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

function snippet(text, index, len) {
  const from = text.lastIndexOf('\n', index) + 1;
  let to = text.indexOf('\n', index + len);
  if (to === -1) to = text.length;
  return text.slice(from, to).trim().replace(/\s+/g, ' ').slice(0, 160);
}

// מספר שנושא «+» או פסיק אלפים הוא כמעט תמיד ספירה מוצגת, ולא קבוע טכני.
function isLoudNumber(raw) {
  return /\+\s*$/.test(raw) || /\d,\d{3}/.test(raw);
}

// שורת הערה, או ליטרל שיושב בתוך רשימת אפשרויות של פקד טופס: «10+» ב-
// options של «מספר ילדים» הוא ערך לבחירה, לא ספירה שהאתר מפרסם.
function isNoise(codeLine) {
  if (/^\s*(\/\/|\/\*|\*|#)/.test(codeLine)) return true;
  return /\b(options|SelectItem|<option|placeholder|enum)\b/i.test(codeLine);
}

// בתוך `/* ... */`: התיעוד של סבב egod מצטט את המספרים הישנים, וציטוט אינו
// פרסום. נבדק מול הטקסט ולא מול השורה, כי הערת בלוק נמשכת על פני שורות.
// מספר «מפורסם» הוא מספר שמוצג עם שם לידו. שתי צורות:
// בקוד — האובייקט שסביבו נושא מפתח תווית וטקסט עברי (`{ value: 350, label: … }`);
// ב-HTML — התווית העברית יושבת מיד אחרי המספר, בלי אובייקט שיעטוף אותה.
function isLabeledStat(text, index, len, kind) {
  // ב-HTML אין אובייקט שיעטוף — התווית יושבת מיד אחרי המספר.
  if (kind === 'tile') return HEBREW.test(text.slice(index + len, index + len + 140));
  const open = text.lastIndexOf('{', index);
  const close = text.indexOf('}', index);
  if (open === -1 || close === -1 || index - open > 300 || close - index > 300) return false;
  const obj = text.slice(open, close);
  return /\b(label|title|text|name|caption|suffix)\s*:/i.test(obj) && HEBREW.test(obj);
}

function inBlockComment(text, index) {
  const open = text.lastIndexOf('/*', index);
  if (open === -1) return false;
  return text.lastIndexOf('*/', index) < open;
}

function scanFile(file) {
  const text = readFileSync(file, 'utf8');
  const hits = [];
  const seen = new Set();

  const push = (index, raw, len, kind) => {
    const key = index + ':' + raw;
    if (seen.has(key)) return;
    const around = text.slice(Math.max(0, index - WINDOW), index + len + WINDOW);
    if (!HEBREW.test(around)) return;
    // ליטרל חשוף על `count`/`value` הוא ברוב הקוד אתחול מצב (`{ done: 0 }`),
    // לא ספירה מפורסמת. מה שמפריד: האובייקט שסביבו נושא גם **תווית עברית**,
    // כלומר המספר מוצג עם שם לידו — הצורה של egod.
    const loud = isLoudNumber(raw) || ((kind === 'field' || kind === 'tile') && isLabeledStat(text, index, len, kind));
    if (!loud && !STAT_CTX.test(around)) return;
    const code = snippet(text, index, len);
    if (isNoise(code) || inBlockComment(text, index)) return;
    seen.add(key);
    hits.push({ line: lineOf(text, index), num: raw.trim(), kind, loud, code });
  };

  // ליטרל על שדה שמשמעותו ספירה: value: 350 · value: "8" · count: 1200.
  // זו הצורה שנמצאה ב-15-egod (חשופה) וב-01/21 (במרכאות). ה-(?<![\w-])
  // מונע התאמה בתוך `column-count:` — שם `count` הוא מאפיין CSS ולא ספירה.
  for (const m of text.matchAll(/(?<![\w-])(value|count|number|stat|metric|amount|total|figure|kpi)\s*:\s*(["'`]?)(\d{1,3}(?:,\d{3})+|\d+)\2(?![\w-])/gi)) {
    push(m.index, m[3], m[0].length, 'field');
  }
  // אריח סטטיסטיקה ב-HTML סטטי: data-count="888" עם תווית לידו, או span
  // שמחלקתו num/stat/counter. זו הצורה של 10-bkalot-rights, והיא נעדרת «+»
  // ולכן לא נתפסה בסריקה הראשונה.
  for (const m of text.matchAll(/data-(?:count|value|target|to)\s*=\s*["'](\d{1,3}(?:,\d{3})+|\d+)["']/gi)) {
    push(m.index, m[1], m[0].length, 'tile');
  }
  // ‏`step-num` ו-`feature-num` הם **סידוריים** — «שלב 1», «שלב 2» — ולא
  // ספירות. הם נשללים לפי שם המחלקה, לא לפי הערך, כי «3» תקף בשני התפקידים.
  for (const m of text.matchAll(/class\s*=\s*["'][^"']*\b(?:num|stat|stat-num|counter|count)\b[^"']*["'][^>]*>\s*(\d{1,3}(?:,\d{3})+|\d+)\s*</gi)) {
    // הסידורי מסומן לפעמים על המחלקה עצמה (`step-num`) ולפעמים על העוטף
    // (`<div class="step"><div class="num">1</div>`), ולכן נבדקות שתיהן.
    const before = text.slice(Math.max(0, m.index - 80), m.index);
    if (/\b(step|feature|item|index|order|rank|slide)[-_]?num/i.test(m[0])) continue;
    if (/class\s*=\s*["'][^"']*\b(step|feature|item|order|rank|slide)\b/i.test(before)) continue;
    // אותו אריח כבר נתפס דרך data-count; ה-0 כאן הוא נקודת הפתיחה של האנימציה.
    if (/data-(count|value|target|to)\s*=/i.test(m[0])) continue;
    push(m.index, m[1], m[0].length, 'tile');
  }
  // מחרוזת בקוד: "350+" · '1,200+' · `85`
  for (const m of text.matchAll(/(["'`])\s*(\d[\d,.]*\s*[+%]?)\s*\1/g)) {
    push(m.index, m[2], m[0].length, 'string');
  }
  // בין תגיות ב-HTML/JSX: >1,200+<
  for (const m of text.matchAll(/>\s*(\d[\d,.]*\s*\+)\s*</g)) {
    push(m.index, m[1], m[0].length, 'markup');
  }
  return hits;
}

const args = process.argv.slice(2);
const wantJson = args.includes('--json');

// --file <path>: מריץ את הגלאי על קובץ בודד, גם מחוץ ל-apps. קיים כדי לאמת
// את הכלי מול הגרסה של CounterSection.tsx **לפני** התיקון (git show 9e6bce7^):
// גלאי שאינו מסמן את המקרה שממנו נולד אינו ראיה לכלום.
const fileFlag = args.indexOf('--file');
if (fileFlag !== -1) {
  const target = args[fileFlag + 1];
  const hits = scanFile(target);
  console.log(target + ' — ' + hits.length + ' מועמדים');
  for (const h of hits) console.log(`  :${h.line}  ${h.num}  [${h.kind}${h.loud ? ' loud' : ''}]   ${h.code}`);
  process.exit(hits.length ? 0 : 1);
}

const only = args.filter((a) => !a.startsWith('--'));

const apps = readdirSync(APPS)
  .filter((n) => statSync(join(APPS, n)).isDirectory())
  .filter((n) => !PROTECTED.some((p) => n.startsWith(p) || n.includes(p)))
  .filter((n) => n !== '_archive')
  .filter((n) => (only.length ? only.some((o) => n.includes(o)) : true));

const report = [];
for (const app of apps) {
  const files = walk(join(APPS, app)).filter((f) => !PROTECTED.some((p) => f.includes(p)));
  const found = [];
  for (const f of files) {
    let hits;
    try { hits = scanFile(f); } catch { continue; }
    if (hits.length) found.push({ file: relative(ROOT, f).split(sep).join('/'), hits });
  }
  const loud = found.reduce((n, f) => n + f.hits.filter((h) => h.loud).length, 0);
  const total = found.reduce((n, f) => n + f.hits.length, 0);
  report.push({ app, files: found.length, total, loud, found });
}

report.sort((a, b) => b.loud - a.loud || b.total - a.total);

const outJson = join(ROOT, 'QA', 'platform', '_hardcoded-stats.json');
writeFileSync(outJson, JSON.stringify({ apps: report }, null, 2), 'utf8');

if (wantJson) {
  console.log(JSON.stringify({ apps: report }, null, 2));
} else {
  console.log('app                          files  hits  loud');
  for (const r of report) {
    if (!r.total) continue;
    console.log(r.app.padEnd(28) + String(r.files).padStart(5) + String(r.total).padStart(6) + String(r.loud).padStart(6));
  }
  console.log('\n— "loud" = מספר שנושא + או פסיק אלפים, כלומר כמעט ודאי ספירה מוצגת —\n');
  for (const r of report) {
    if (!r.loud) continue;
    console.log('### ' + r.app);
    for (const f of r.found) {
      const loudHits = f.hits.filter((h) => h.loud);
      if (!loudHits.length) continue;
      for (const h of loudHits) console.log(`  ${f.file}:${h.line}  ${h.num}   ${h.code}`);
    }
    console.log('');
  }
}
console.log('נכתב: ' + relative(ROOT, outJson).split(sep).join('/'));
