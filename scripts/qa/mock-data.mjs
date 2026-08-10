#!/usr/bin/env node
// mock-data.mjs — מוצא נתונים בדויים שיושבים בקוד ומגיעים למסך.
//
// הרקע: `hardcoded-stats.mjs` סופר מספרים, וב-01-torah-platform הוא סימן שבעה.
// מה שהיה שם באמת גדול משבעה מספרים: `mockSeekers` — ארבעה אנשים בשמות מלאים,
// עם עיר, טלפון ו«התאמה 95%», שהוצגו כלידים אמיתיים בעמוד ציבורי חי. ולא מספר
// אחד תפס את זה, כי הליקוי לא היה מספר. הסימן שהיה חסר הוא **שם המשתנה**.
//
// מה נחשב מועמד: הצהרה בשם `mock*`/`dummy*`/`fake*`/`sample*`/`seed*`/`stub*`
// שערכה ליטרל (מערך או אובייקט) — ובקובץ ש**מגיעים אליו** מנקודת הכניסה של
// האפליקציה. נתון בדוי בקובץ שאיש אינו מייבא הוא קוד מת; אותו נתון בקובץ
// שמנותב הוא הבטחה לקורא.
//
// הכלי מסמן מועמדים בלבד. `mockResolvedValue` בטסט, או `sampleRate` בהגדרות,
// אינם ליקוי — ההכרעה היא קריאה של השורה.
//
//   node scripts/qa/mock-data.mjs                  # כל האפליקציות
//   node scripts/qa/mock-data.mjs 01-torah         # אחת
//   node scripts/qa/mock-data.mjs --json           # פלט גולמי
//   node scripts/qa/mock-data.mjs --file <path>    # קובץ בודד (אימות הגלאי)

import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { join, relative, dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const APPS = join(ROOT, 'apps');

// מוגן — לא נקרא ולא נדווח.
const PROTECTED = ['08-bkalut-app', '09-bkalot-admin', 'bkalut-app', 'bkalot-admin', 'zr_', 'NEDARIM3873'];
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'out', '.next', '.vercel', '.git', '_deploy', '_archive', 'coverage']);
const EXTS = ['.tsx', '.jsx', '.ts', '.js', '.mjs', '.vue', '.html'];

// קובץ בדיקה, סטורי או שרת-mock: שם בדוי שם הוא **התפקיד**, לא ליקוי.
// נספר ומדווח כמספר, כדי שהשקט לא ייראה כמו «אין ממצאים».
const TEST_FILE = /(\.test\.|\.spec\.|\.stories\.|[\\/]__tests__[\\/]|[\\/]__mocks__[\\/]|[\\/]tests?[\\/]|[\\/]e2e[\\/]|[\\/]cypress[\\/]|[\\/]msw[\\/]|setupTests)/i;

// שם שמצהיר על עצמו כבדוי. `MOCK_USERS` ו-`mockSeekers` — אותה כוונה, שתי צורות.
const FAKE_NAME = /^(mock|dummy|fake|sample|placeholder|stub|seed|example|fixture)([_A-Z0-9]|$)/;

const HEBREW = /[֐-׿]{2,}/;
// מפתחות שהופכים רשומה ל**אדם**: זה מה שהפריד את mockSeekers ממערך הגדרות.
const PERSON_KEY = /\b(name|fullName|full_name|firstName|lastName|phone|mobile|email|city|address|avatar|initials)\s*:/i;

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

// סורק סוגריים מאוזנים מנקודת הפתיחה, ומדלג על מחרוזות כדי ש-`"}"` בתוך טקסט
// לא יסגור את הליטרל. מוגבל ב-20K תווים — מעבר לזה זו כבר לא רשומה על מסך.
function literalBody(text, open) {
  const pairs = { '[': ']', '{': '}' };
  const closeCh = pairs[text[open]];
  if (!closeCh) return null;
  let depth = 0;
  let quote = null;
  const limit = Math.min(text.length, open + 20000);
  for (let i = open; i < limit; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === '\\') { i++; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '[' || ch === '{') depth++;
    else if (ch === ']' || ch === '}') {
      depth--;
      if (depth === 0) return text.slice(open, i + 1);
    }
  }
  return null;
}

// כמה רשומות יש בליטרל: `{` בעומק 1 של מערך. אובייקט בודד = רשומה אחת.
function countRecords(body) {
  if (body[0] === '{') return 1;
  let depth = 0;
  let quote = null;
  let n = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (quote) {
      if (ch === '\\') { i++; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '[' || ch === '{') { if (depth === 1 && ch === '{') n++; depth++; }
    else if (ch === ']' || ch === '}') depth--;
  }
  return n;
}

function scanFile(file, text) {
  const hits = [];
  // `const mockSeekers: Seeker[] = [` · `export const MOCK_STATS = {` · `let dummyRows = [`
  const decl = /(?:^|[\n;])\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=\n]{0,200})?=\s*([[{])/g;
  for (const m of text.matchAll(decl)) {
    const name = m[1];
    if (!FAKE_NAME.test(name)) continue;
    const open = m.index + m[0].lastIndexOf(m[2]);
    const body = literalBody(text, open);
    if (!body) continue;
    const records = countRecords(body);
    const hebrew = HEBREW.test(body);
    const person = PERSON_KEY.test(body) && hebrew;
    hits.push({
      name,
      line: lineOf(text, m.index + 1),
      records,
      chars: body.length,
      hebrew,
      person,
      preview: body.slice(0, 120).replace(/\s+/g, ' '),
    });
  }
  return hits;
}

// ---- גרף הייבוא: מה מגיעים אליו מנקודת הכניסה ----

const RESOLVE_EXTS = ['', '.tsx', '.ts', '.jsx', '.js', '.mjs', '/index.tsx', '/index.ts', '/index.jsx', '/index.js'];

function resolveImport(fromFile, spec, appDir) {
  let base;
  if (spec.startsWith('.')) base = resolve(dirname(fromFile), spec);
  else if (spec.startsWith('@/')) base = join(appDir, 'src', spec.slice(2));
  else if (spec.startsWith('~/')) base = join(appDir, 'src', spec.slice(2));
  else return null; // חבילה מ-node_modules — מחוץ לעץ המקור
  for (const e of RESOLVE_EXTS) {
    const cand = base + e;
    try { if (statSync(cand).isFile()) return cand; } catch { /* המשך */ }
  }
  return null;
}

function importsOf(file, text, appDir) {
  const out = [];
  const specs = [
    /\bfrom\s+["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
    /<script[^>]+src\s*=\s*["']([^"']+)["']/gi,
  ];
  for (const re of specs) {
    for (const m of text.matchAll(re)) {
      const r = resolveImport(file, m[1].replace(/^\//, './'), appDir);
      if (r) out.push(r);
    }
  }
  return out;
}

// שלוש מוסכמות ניתוב חיות בעץ הזה, ולכל אחת נקודת כניסה אחרת. הרשימה הזאת
// נבנתה מהאבחון: הגרף הכיר רק את Vite, ולכן החזיר «אפס מגיעים» על 03 (Next
// App Router) ועל 30/31 (TanStack Start) — שלוש אפליקציות שנראו נקיות ולא נסרקו.
function entryFiles(appDir) {
  const cands = [
    // Vite / CRA
    'src/main.tsx', 'src/main.ts', 'src/main.jsx', 'src/main.js',
    'src/index.tsx', 'src/index.ts', 'src/index.jsx', 'src/index.js',
    'src/App.tsx', 'src/app.tsx',
    // Next.js — Pages Router, ו-middleware שרץ על כל בקשה
    'pages/_app.tsx', 'middleware.ts', 'middleware.js',
    // TanStack Start — ניתוב לפי קבצים דרך routeTree.gen.ts
    'src/router.tsx', 'src/router.ts', 'src/start.ts', 'src/server.ts', 'src/routeTree.gen.ts',
  ].map((p) => join(appDir, p)).filter((p) => existsSync(p));

  for (const f of walk(appDir)) {
    const rel = relative(appDir, f).split(sep).join('/');
    // אתר סטטי: כל HTML הוא נקודת כניסה בפני עצמה.
    if (f.endsWith('.html')) { cands.push(f); continue; }
    // Next App Router: כל page/layout/route הוא כתובת, ואין קובץ אחד שמייבא אותם.
    if (/^app\/.*\/?(page|layout|template|route|error|not-found|loading)\.(tsx|ts|jsx|js)$/.test(rel)) cands.push(f);
    // TanStack Start: קבצי src/routes/** נאספים ע"י המחולל, לא ע"י import ידני.
    if (/^src\/routes\//.test(rel)) cands.push(f);
  }
  return [...new Set(cands)];
}

function reachableSet(appDir, textOf) {
  const seen = new Set();
  const queue = entryFiles(appDir);
  for (const q of queue) seen.add(q);
  while (queue.length) {
    const f = queue.shift();
    const text = textOf(f);
    if (text == null) continue;
    for (const next of importsOf(f, text, appDir)) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return seen;
}

// ---- הרצה ----

const args = process.argv.slice(2);
const wantJson = args.includes('--json');

// --file: מריץ את הגלאי על קובץ בודד, גם מחוץ ל-apps. קיים כדי לאמת אותו מול
// TeacherDashboard.tsx **לפני** המחיקה (git show 17c042a^) — גלאי שאינו מסמן
// את המקרה שממנו נולד אינו ראיה לכלום. ב-`--file` אין גרף, ולכן אין reachable.
const fileFlag = args.indexOf('--file');
if (fileFlag !== -1) {
  const target = args[fileFlag + 1];
  const hits = scanFile(target, readFileSync(target, 'utf8'));
  console.log(target + ' — ' + hits.length + ' מועמדים');
  for (const h of hits) {
    const tags = [h.person ? 'person' : null, h.hebrew ? 'he' : null].filter(Boolean).join(' ');
    console.log(`  :${h.line}  ${h.name}  ${h.records} רשומות  [${tags}]   ${h.preview}`);
  }
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
  const appDir = join(APPS, app);
  const files = walk(appDir).filter((f) => !PROTECTED.some((p) => f.includes(p)));
  const cache = new Map();
  const textOf = (f) => {
    if (cache.has(f)) return cache.get(f);
    let t = null;
    try { t = readFileSync(f, 'utf8'); } catch { /* לא ניתן לקריאה */ }
    cache.set(f, t);
    return t;
  };
  const reachable = reachableSet(appDir, textOf);

  const found = [];
  let testSkipped = 0;
  for (const f of files) {
    if (TEST_FILE.test(f)) { testSkipped++; continue; }
    const text = textOf(f);
    if (text == null) continue;
    const hits = scanFile(f, text);
    if (!hits.length) continue;
    found.push({
      file: relative(ROOT, f).split(sep).join('/'),
      reachable: reachable.has(f),
      hits,
    });
  }
  const live = found.filter((f) => f.reachable);
  report.push({
    app,
    // גרף שאינו מוצא נקודת כניסה יחזיר «אפס מגיעים» על כל האפליקציה, וזה נראה
    // בדיוק כמו «אין ליקוי». שתי המידות האלה נשמרות כדי שהכשל הזה יהיה גלוי.
    sourceFiles: files.length,
    reachableTotal: [...reachable].filter((f) => EXTS.some((e) => f.endsWith(e))).length,
    entries: entryFiles(appDir).length,
    files: found.length,
    reachableFiles: live.length,
    records: live.reduce((n, f) => n + f.hits.reduce((k, h) => k + h.records, 0), 0),
    people: live.reduce((n, f) => n + f.hits.filter((h) => h.person).length, 0),
    testSkipped,
    found,
  });
}

report.sort((a, b) => b.people - a.people || b.reachableFiles - a.reachableFiles || b.records - a.records);

const outJson = join(ROOT, 'QA', 'platform', '_mock-data.json');
writeFileSync(outJson, JSON.stringify({ apps: report }, null, 2), 'utf8');

if (wantJson) {
  console.log(JSON.stringify({ apps: report }, null, 2));
} else {
  console.log('app                          files  reachable  records  person');
  for (const r of report) {
    if (!r.files) continue;
    console.log(
      r.app.padEnd(28) +
      String(r.files).padStart(5) +
      String(r.reachableFiles).padStart(11) +
      String(r.records).padStart(9) +
      String(r.people).padStart(8),
    );
  }
  console.log('\n— reachable = הקובץ מגיע אליו מנקודת הכניסה. person = לרשומות יש שם/טלפון/עיר בעברית —\n');
  for (const r of report) {
    const live = r.found.filter((f) => f.reachable);
    if (!live.length) continue;
    console.log('### ' + r.app);
    for (const f of live) {
      for (const h of f.hits) {
        const tags = [h.person ? 'person' : null, h.hebrew ? 'he' : null].filter(Boolean).join(' ');
        console.log(`  ${f.file}:${h.line}  ${h.name}  ${h.records} רשומות  [${tags}]`);
      }
    }
    console.log('');
  }
  const skipped = report.reduce((n, r) => n + r.testSkipped, 0);
  console.log(`(${skipped} קבצי בדיקה/סטוריז/mocks לא נסרקו — שם בדוי שם הוא התפקיד.)`);

  // אפליקציה שהגרף לא הצליח לפרוש עליה מדווחת «אפס מגיעים» — וזה נראה כמו
  // תוצאה נקייה. מודפס במפורש כדי שלא ייחשב כך.
  const blind = report.filter((r) => r.sourceFiles > 5 && r.reachableTotal <= 1);
  if (blind.length) {
    console.log('\n⚠ הגרף לא פרש על האפליקציות האלה — «אפס» בהן אינו ראיה:');
    for (const r of blind) {
      console.log(`  ${r.app.padEnd(28)} ${r.sourceFiles} קבצים, ${r.entries} נקודות כניסה, ${r.reachableTotal} מגיעים`);
    }
  }
}
console.log('נכתב: ' + relative(ROOT, outJson).split(sep).join('/'));
