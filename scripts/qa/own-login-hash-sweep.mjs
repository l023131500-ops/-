// own-login-hash-sweep — §1א: "נרשמתי, ואז ההתחברות אומרת סיסמה שגויה"
//
// §1א מייחס את הבאג לאי-התאמה בין ההצפנה בהרשמה לבדיקה בהתחברות
// (hash/salt). ההתחברות המשותפת (portal /login) נבדקה מקצה לקצה ב-12/08
// ואינה משחזרת את הבאג — אבל מערכת שיש לה **טופס כניסה משלה** לא נבדקה
// מעולם, וזה בדיוק המקום שבו אי-התאמה כזו יכולה לחיות.
//
// מה הסקריפט עושה: לכל מערכת חיה, מוצא בקוד המקור שלה כל מסך שיש בו שדה
// סיסמה, ומסווג את **נתיב האישורים** שמאחוריו:
//
//   supabase-auth   — signInWithPassword / signUp. ההצפנה נעשית בשרת של
//                     Supabase, אותו אלגוריתם לשני הכיוונים. אי-התאמה
//                     כזו לא יכולה לקרות מבנית.
//   custom-hash     — הקוד עצמו מגבב סיסמה (bcrypt/sha256/pbkdf2/scrypt/
//                     argon2). כאן, ורק כאן, §1א יכול לחיות: צריך לוודא
//                     שנתיב היצירה ונתיב האימות משתמשים באותו אלגוריתם.
//   plain-compare   — השוואה מול ערך גלוי (env/קבוע). אין hash בכלל.
//   unclassified    — יש שדה סיסמה ולא נמצא נתיב אישורים בקובץ עצמו.
//
// הסיווג הוא על **תיקיית האפליקציה כולה**, לא על הקובץ הבודד: מסך כניסה
// כמעט תמיד קורא ל-hook או ל-lib שיושב בקובץ אחר.
//
// מה זה לא: זו קריאה בקוד המקור, לא הרצה. "supabase-auth" אומר שאין
// אי-התאמת hash — הוא לא אומר שההתחברות עובדת (אישור מייל, RLS, ומסך
// שנוחת במקום הלא נכון הם באגים אחרים, ולא נמדדים כאן).
//
// שימוש:  node scripts/qa/own-login-hash-sweep.mjs
// פלט:    QA/platform/own-login-hash-0812/_results.json

import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const APPS = join(ROOT, 'apps');
const OUT = join(ROOT, 'QA', 'platform', 'own-login-hash-0812');

// המערכות החיות לפי core.projects ב-12/08, ממופות לתיקיית המקור שלהן.
// 08/09 מוגנות ואינן ברשימה — לא נקראות כאן כלל.
const LIVE = [
  ['01', 'torah', '01-torah-platform'],
  ['02', 'tamlul', '02-igud-transcribe'],
  ['03', 'modaot', '03-igud-ads'],
  ['04', 'imud', '04-imud-torani'],
  ['06', 'briut', '06-kupot-holim'],
  ['10', 'bkalot', '10-bkalot-rights'],
  ['12', 'smel', '12-smel-ndln'],
  ['14', 'smachot', '14-bsmachot-plus'],
  ['15', 'egod', '15-egod'],
  ['16', 'chatzor', '16-chatzor-connect'],
  ['17', 'chizukim', '17-chizukim-transcribe'],
  ['18', 'orech', '18-torah-editor-mvp'],
  ['21', 'mthbram', '21-mthbram'],
  ['22', 'zchuyot', '22-get-your-rights'],
  ['24', 'galil', '24-galilee-connect-hub'],
  ['26', 'studio', '26-modaot-studio'],
  ['27', 'mechiron', '27-bkalut-price'],
  ['28', 'kupot', '28-kupot-health-funds'],
  ['30', 'crm', '30-zchuyotpro-crm'],
  ['31', 'gesher', '31-hebrew-bridge-crm'],
  ['32', 'nadlan', '32-nadlan-berega'],
  ['34', 'kesef', '34-kesef'],
  ['35', 'kiosk', '35-kioskfleet'],
  ['40', 'gannenet', '40-gannenet'],
];

// ‏public/ אינו מדולג בכוונה: באתרים סטטיים (קיוסק, בריאות) מסך הכניסה
// עצמו יושב שם כ-HTML, ודילוג עליו היה מסתיר בדיוק את המסכים שנמדדים כאן.
const SKIP_DIR = /^(node_modules|dist|build|\.next|\.output|\.git|_deploy|_archive|coverage|out|\.vercel|\.turbo)$/;
const CODE = /\.(js|jsx|ts|tsx|mjs|cjs|html|vue|svelte)$/;

// שדה סיסמה: הטיפוס הגולמי, או רכיב ה-PasswordInput המשותף שהוחדר בסבבים
// הקודמים (הוא מרנדר type=password מאחורי הקלעים, ולכן חייב להיספר).
const PASSWORD_FIELD = /type\s*=\s*["'{]?\s*["']?password["']?|<PasswordInput\b|<password-input\b/;

const SIGNALS = {
  supabase_auth: /signInWithPassword\s*\(|auth\.signUp\s*\(|\bsignUp\s*\(\s*\{[^}]*password/,
  custom_hash: /\bbcrypt\b|\bbcryptjs\b|pbkdf2|scrypt|argon2|createHash\s*\(\s*["'](?:sha\d+|md5)|crypto\.subtle\.digest/i,
  plain_compare: /ADMIN_PASSWORD|process\.env\.[A-Z_]*PASSWORD|import\.meta\.env\.[A-Z_]*PASSWORD/,
};

function walk(dir, acc = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return acc; }
  for (const name of entries) {
    const full = join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) {
      if (SKIP_DIR.test(name)) continue;
      walk(full, acc);
    } else if (CODE.test(name) && !/\.min\.js$/.test(name) && st.size < 2_000_000) {
      acc.push(full);
    }
  }
  return acc;
}

// מה שקריאה ידנית מצאה במסכים שהסיווג האוטומטי סימן לבדיקה (12/08/2026).
// הסיווג מסתמך על ביטויים; הביטוי לבדו לא יודע להבדיל בין גיבוב סיסמה
// לגיבוב מפתח API, ולכן ארבעת אלה נקראו בעיניים והמסקנה נרשמת כאן.
const MANUAL_VERDICTS = {
  zchuyot: {
    read_on: '2026-08-12',
    hash_mismatch: false,
    finding:
      'הגיבוב בקוד אינו של סיסמה אלא של מפתח API: AdminSettings.tsx מגבב את המפתח שנוצר ' +
      '(crypto.subtle.digest) לתוך api_keys.key_hash, ופונקציית leads-api מגבבת את המפתח הנכנס ' +
      'באותו אלגוריתם. ההתחברות עצמה (AdminLogin.tsx) היא supabase.auth.signInWithPassword — ' +
      'ההצפנה בצד Supabase, ולכן אי-התאמת hash אינה אפשרית.',
  },
  kiosk: {
    read_on: '2026-08-12',
    hash_mismatch: false,
    finding:
      'server/src/auth.js מייצא hashPassword=bcrypt.hashSync(plain,12) ו-verifyPassword=' +
      'bcrypt.compareSync — אותו אלגוריתם לשני הכיוונים. כל נתיבי הכתיבה עוברים דרכן: ' +
      'seedadmin.js מקבל אותן כפרמטרים מ-seed.js, ו-routes/admin.js מייבא hashPassword ' +
      'ליצירת משתמש. אין נתיב שכותב סיסמה בדרך אחרת.',
  },
  briut: {
    read_on: '2026-08-12',
    hash_mismatch: false,
    finding:
      'אין נתיב אישורים כלל, בכוונה: site/admin.js דוחה כל התחברות ' +
      '("התחברות לניהול אינה מוגדרת בסביבה זו"), החלטה מ-07/08/2026, כי כל סיסמה בקובץ סטטי ' +
      'הייתה גלויה לכל מבקר. יש שדה סיסמה ואין מה להשוות אליו.',
  },
  galil: {
    read_on: '2026-08-12',
    hash_mismatch: false,
    finding:
      'אין גיבוב בכלל: GabaiPortal.tsx כותב ל-gabai_accounts.password_hash את המחרוזת שהוקלדה ' +
      'כפי שהיא, מציג אותה חזרה במסך הניהול, וההתחברות משווה בצד הלקוח. אין שתי שיטות ולכן ' +
      'אין אי-התאמה — הבעיה כאן אחרת ומתועדת כבר: אנונימי מקבל 401/42501 על הטבלה, ולכן ' +
      'שום התחברות אינה יכולה להצליח (NEEDS_USER, SYSTEMS_STATUS, QA/galil/admin-bypass-0812).',
  },
};

const results = [];

for (const [number, slug, dirName] of LIVE) {
  const dir = join(APPS, dirName);
  if (!existsSync(dir)) {
    results.push({ number, slug, dir: dirName, present: false });
    continue;
  }

  const files = walk(dir);
  const screens = [];
  const evidence = { supabase_auth: [], custom_hash: [], plain_compare: [] };

  for (const full of files) {
    let text;
    try { text = readFileSync(full, 'utf8'); } catch { continue; }
    const rel = relative(APPS, full).split(sep).join('/');

    if (PASSWORD_FIELD.test(text)) screens.push(rel);
    for (const [kind, re] of Object.entries(SIGNALS)) {
      const m = text.match(re);
      if (m) evidence[kind].push({ file: rel, hit: m[0].trim().slice(0, 60) });
    }
  }

  // הסיווג: custom_hash גובר, כי הוא היחיד שבו §1א יכול לחיות ולכן היחיד
  // שמחייב קריאה ידנית. אחריו supabase-auth, ואז השוואה גלויה.
  let credential_path = 'none';
  if (files.length === 0) credential_path = 'source-not-in-repo';
  else if (screens.length === 0) credential_path = 'shared-login-only';
  else if (evidence.custom_hash.length) credential_path = 'custom-hash';
  else if (evidence.supabase_auth.length) credential_path = 'supabase-auth';
  else if (evidence.plain_compare.length) credential_path = 'plain-compare';
  else credential_path = 'unclassified';

  results.push({
    number,
    slug,
    dir: dirName,
    present: true,
    // ‏0 קבצים אינו "אין מסך כניסה" אלא "המקור אינו כאן" — כסף (34) מחזיק
    // בריפו קובץ app.json בלבד. בלי ההבחנה הזו הסריקה הייתה מדווחת שקט.
    source_in_repo: files.length > 0,
    files_scanned: files.length,
    own_password_screens: screens.length,
    screens: screens.slice(0, 12),
    credential_path,
    // ‏§1א יכול לחיות רק כאן. כל השאר הם שלילה מבנית, לא ניחוש.
    needs_manual_read: credential_path === 'custom-hash' || credential_path === 'unclassified',
    manual_verdict: MANUAL_VERDICTS[slug] || null,
    evidence: {
      supabase_auth: evidence.supabase_auth.slice(0, 4),
      custom_hash: evidence.custom_hash.slice(0, 6),
      plain_compare: evidence.plain_compare.slice(0, 4),
    },
  });
}

const summary = {
  scanned_at_utc: new Date().toISOString(),
  live_systems: results.length,
  with_own_password_screen: results.filter((r) => r.own_password_screens > 0).length,
  shared_login_only: results.filter((r) => r.credential_path === 'shared-login-only').length,
  supabase_auth: results.filter((r) => r.credential_path === 'supabase-auth').length,
  custom_hash: results.filter((r) => r.credential_path === 'custom-hash').map((r) => r.slug),
  plain_compare: results.filter((r) => r.credential_path === 'plain-compare').map((r) => r.slug),
  unclassified: results.filter((r) => r.credential_path === 'unclassified').map((r) => r.slug),
  source_not_in_repo: results.filter((r) => r.credential_path === 'source-not-in-repo').map((r) => r.slug),
  needs_manual_read: results.filter((r) => r.needs_manual_read).map((r) => r.slug),
  // מסומן לבדיקה ידנית ועדיין אין לו מסקנה כתובה — זה, ורק זה, נשאר פתוח.
  manual_read_still_missing: results
    .filter((r) => r.needs_manual_read && !r.manual_verdict)
    .map((r) => r.slug),
  hash_mismatch_found: results
    .filter((r) => r.manual_verdict && r.manual_verdict.hash_mismatch)
    .map((r) => r.slug),
};

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, '_results.json'), JSON.stringify({ summary, results }, null, 2), 'utf8');

console.log(JSON.stringify(summary, null, 2));
for (const r of results) {
  if (!r.present) { console.log(`  ${r.number} ${r.slug}: source dir missing`); continue; }
  console.log(`  ${r.number} ${r.slug}: ${r.credential_path} (${r.own_password_screens} password screens, ${r.files_scanned} files)`);
}
