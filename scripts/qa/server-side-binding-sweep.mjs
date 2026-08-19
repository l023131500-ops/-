#!/usr/bin/env node
// server-side-binding-sweep.mjs — 12/08/2026
//
// שאלה: 12 מערכות חיות אינן מגישות מפתח Supabase לדפדפן
// (QA/platform/multi-project-0812). הרישום ב-core.projects עבורן
// לא אושר ולא נסתר. הסריקה הזו שואלת את ה-**סביבה של הייצור ב-Vercel**:
// האם למערכת יש חיבור Supabase בצד השרת בכלל, ולאיזה פרויקט.
//
// קריאה בלבד: vercel link (יוצר תיקיית .vercel זמנית ב-TEMP בלבד)
// + vercel env pull. שום דבר לא נכתב ל-Vercel, ל-Supabase או לאתר.
//
// ⚠️ מגבלה שנמדדה: Vercel מסמן משתני סביבה שנוצרו כ-"sensitive",
// ואת הערך שלהם ה-CLI מחזיר כ-"[SENSITIVE]" — לא ניתן לקריאה מכאן
// בשום דרך (לא CLI, לא API). לכן עבור רוב המערכות אפשר למדוד
// **נוכחות** של חיבור, לא את זהות הפרויקט.
//
// שימוש:  node scripts/qa/server-side-binding-sweep.mjs
// פלט:    QA/platform/server-side-binding-0812/_results.json

import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, existsSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const TEAM = "team_NLONMgS3DlFsznzcrz0j3OMs";
// ב-Windows ה-CLI מותקן כ-vercel.cmd; execFile לא פותר סיומות בעצמו.
const VERCEL = process.platform === "win32" ? "vercel.cmd" : "vercel";

// 12 המערכות שאינן מגישות מפתח משלהן לדפדפן, ומה שרשום להן ב-core.projects.
const TARGETS = [
  { number: "02", slug: "igud-transcribe",    path: "tamlul",   vercel: "tamlul-more30",   registry: "bieebmnmkffwbqlsfozh" },
  { number: "03", slug: "igud-ads",           path: "modaot",   vercel: "modaot-more30",   registry: "bieebmnmkffwbqlsfozh" },
  { number: "04", slug: "imud-torani",        path: "imud",     vercel: "imud-more30",     registry: "uhnrgujbdxhhmoxcjria" },
  { number: "14", slug: "bsmachot-plus",      path: "smachot",  vercel: "smachot-more30",  registry: null },
  { number: "18", slug: "torah-editor-mvp",   path: "orech",    vercel: "orech-more30",    registry: "bieebmnmkffwbqlsfozh" },
  { number: "26", slug: "modaot-studio",      path: "studio",   vercel: "studio-more30",   registry: "uhnrgujbdxhhmoxcjria" },
  { number: "27", slug: "bkalut-price",       path: "mechiron", vercel: "mechiron-more30", registry: "csjekrvukbdznetsrodj" },
  { number: "28", slug: "kupot-health-funds", path: "kupot",    vercel: "kupot-more30",    registry: "uhnrgujbdxhhmoxcjria" },
  { number: "32", slug: "nadlan-berega",      path: "nadlan",   vercel: "nadlan-more30",   registry: "uhnrgujbdxhhmoxcjria" },
  { number: "34", slug: "kesef",              path: "kesef",    vercel: "kesef-more30",    registry: "uhnrgujbdxhhmoxcjria" },
  { number: "40", slug: "gannenet",           path: "gannenet", vercel: "gannenet-more30", registry: null },
  // 35 kioskfleet יושבת על Railway, לא על Vercel — נמדדת בנפרד.
];

// משתני סביבה שמעידים על חיבור Supabase בצד השרת.
const SUPABASE_VAR = /SUPABASE/i;
// משתנים שמזריק Vercel עצמו לכל פרויקט — לא מעידים על כלום.
const PLATFORM_VAR = /^(VERCEL|TURBO|NX_DAEMON)/;

function run(cmd, args, cwd) {
  // shell:true — Node חוסם הרצה ישירה של .cmd מאז 20.12; בלעדיו הקריאה
  // נכשלת בשקט עם stdout/stderr ריקים.
  try {
    return { ok: true, out: execFileSync(cmd, args, { cwd, encoding: "utf8", shell: true, stdio: ["ignore", "pipe", "pipe"] }) };
  } catch (e) {
    return { ok: false, out: [e.message, e.stdout, e.stderr].filter(Boolean).join(" | ") };
  }
}

function parseEnvFile(text) {
  const vars = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    vars[m[1]] = v;
  }
  return vars;
}

const root = mkdtempSync(join(tmpdir(), "m30-binding-"));
const results = [];

for (const t of TARGETS) {
  const dir = join(root, t.vercel);
  mkdirSync(dir, { recursive: true });

  const linked = run(VERCEL, ["link", "--yes", "--project", t.vercel, "--scope", TEAM], dir);
  const pulled = run(VERCEL, ["env", "pull", "prod.env", "--environment=production", "--yes"], dir);
  const file = join(dir, "prod.env");

  const row = { ...t, linked: linked.ok, pulled: pulled.ok && existsSync(file) };

  if (!row.pulled) {
    row.error = (pulled.out || linked.out).split(/\r?\n/).filter(Boolean).slice(-3).join(" | ");
    results.push(row);
    continue;
  }

  const vars = parseEnvFile(readFileSync(file, "utf8"));
  const own = Object.keys(vars).filter((k) => !PLATFORM_VAR.test(k)).sort();
  const supa = own.filter((k) => SUPABASE_VAR.test(k));

  row.own_var_count = own.length;
  row.supabase_vars = supa;
  // ערך קריא = לא מסומן sensitive. רק ממנו אפשר לגזור זהות פרויקט.
  row.readable = {};
  row.sensitive = [];
  for (const k of supa) {
    if (vars[k] === "[SENSITIVE]") row.sensitive.push(k);
    else if (/KEY|SECRET|TOKEN|PASSWORD/i.test(k)) row.readable[k] = `<${vars[k].length} chars>`;
    else row.readable[k] = vars[k];
  }
  const refs = new Set();
  for (const v of Object.values(row.readable)) {
    const m = String(v).match(/([a-z0-9]{20})\.supabase\.co/);
    if (m) refs.add(m[1]);
  }
  row.measured_project = refs.size === 1 ? [...refs][0] : refs.size ? [...refs] : null;

  if (supa.length === 0) row.verdict = "NO_SERVER_BINDING";
  else if (row.measured_project === null) row.verdict = "BOUND_BUT_UNREADABLE";
  else if (t.registry === null) row.verdict = "REGISTRY_NULL_BUT_BOUND";
  else if (row.measured_project === t.registry) row.verdict = "MATCH";
  else row.verdict = "MISMATCH";

  results.push(row);
}

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "..", "QA", "platform", "server-side-binding-0812");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "_results.json"), JSON.stringify({ measured_at_utc: new Date().toISOString(), source: "vercel env pull --environment=production", results }, null, 2), "utf8");

// ניקוי — best effort. ב-Windows הקבצים עדיין נעולים לפעמים ע"י ה-CLI.
try { rmSync(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }); } catch { /* נשאר ב-TEMP */ }

for (const r of results) {
  console.log(`${r.number} ${r.slug.padEnd(20)} ${String(r.verdict).padEnd(24)} ${r.measured_project || ""} ${r.sensitive?.length ? "sensitive:" + r.sensitive.join(",") : ""}`);
}
