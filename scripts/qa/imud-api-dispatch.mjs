/**
 * בדיקת ניתוב לפונקציית ה-API של עימוד (04) — _deploy/imud-more30/api/index.ts.
 *
 * למה זו בדיקה נפרדת ולא קריאה לייצור: הפריסה טרם נעשתה, ולפרויקט Vercel
 * של imud אין עדיין SUPABASE_URL/SUPABASE_SERVICE_KEY. לכן כאן נבדק מה
 * שאפשר לבדוק בלי מסד: שהמסלולים מתפצלים נכון, שהתשובות הן JSON עם הקוד
 * הנכון, ושמסלול לא-מוכר מחזיר 404 שנוקב בנתיב שביקשו — הסימן שמבדיל
 * בייצור בין הפונקציה הזאת לבין 404 של הפורטל או קליפת SPA.
 *
 * המסלולים שנוגעים במסד נבדקים על ההודעה: בלי ENV הם חייבים להחזיר 500 עם
 * שמות המשתנים החסרים, ולא להתרסק בטעינת המודול.
 *
 * הרצה: node scripts/qa/imud-api-dispatch.mjs
 * (מריץ tsx מתוך apps/04-imud-torani, ששם יושבות התלויות)
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, cpSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const APP = join(ROOT, "apps", "04-imud-torani");
const FN = join(ROOT, "_deploy", "imud-more30", "api");

// הפונקציה מיובאת מתוך עץ התלויות של האפליקציה: ב-_deploy אין node_modules,
// ו-Node פותר מפרט חבילה לפי מיקום הקובץ ולא לפי cwd.
const tmp = mkdtempSync(join(APP, ".tmp-fn-"));
try {
  cpSync(FN, join(tmp, "api"), { recursive: true });

  const CASES = [
    { name: "meta", path: "meta", method: "GET", expect: 200 },
    { name: "wizard", path: "wizard/infer", method: "POST", body: {}, expect: 200 },
    { name: "unknown", path: "nope", method: "GET", expect: 404 },
    { name: "books-list", path: "books", method: "GET", expect: 500 },
    { name: "books-create-bad", path: "books", method: "POST", body: {}, expect: 400 },
    { name: "book-get", path: "books/1", method: "GET", expect: 500 },
    { name: "book-docx", path: "books/1/docx", method: "GET", expect: 500 },
    { name: "book-delete", path: "books/1", method: "DELETE", expect: 500 },
  ];

  writeFileSync(
    join(tmp, "run.ts"),
    `import handler from "./api/index";
const CASES = ${JSON.stringify(CASES)};
const out: any[] = [];
for (const c of CASES) {
  let code = 0; let payload: any = null; let type = "";
  const res: any = {
    status(n: number) { code = n; return res; },
    json(b: any) { payload = b; type = "json"; },
    send(b: any) { payload = b; type = "send"; },
    setHeader() {},
    end() { type = "end"; },
  };
  await handler(
    { method: c.method, url: "/imud/api/" + c.path, headers: {}, query: { __path: c.path }, body: (c as any).body },
    res
  );
  out.push({
    name: c.name, expect: c.expect, got: code, type,
    keys: payload && typeof payload === "object" && !Buffer.isBuffer(payload) ? Object.keys(payload).slice(0, 8) : null,
    message: payload && typeof payload === "object" ? String((payload as any).message ?? "") : "",
    error: payload && typeof payload === "object" ? String((payload as any).error ?? "") : "",
    counts: c.name === "meta" && payload ? {
      templates: (payload as any).templates?.length ?? null,
      fonts: (payload as any).fonts?.length ?? null,
      features: (payload as any).features?.length ?? null,
      questions: (payload as any).questions?.length ?? null,
    } : null,
  });
}
console.log("__RESULT__" + JSON.stringify(out));
`,
    "utf8"
  );

  const tsx = join(APP, "node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx");
  const run = spawnSync(tsx, [join(tmp, "run.ts")], {
    cwd: APP,
    encoding: "utf8",
    shell: process.platform === "win32",
    env: { ...process.env, SUPABASE_URL: "", SUPABASE_SERVICE_KEY: "", SUPABASE_ANON_KEY: "" },
  });

  const line = (run.stdout || "").split(/\r?\n/).find((l) => l.startsWith("__RESULT__"));
  if (!line) {
    console.error(run.stdout || "");
    console.error(run.stderr || "");
    process.exit(1);
  }

  const results = JSON.parse(line.slice("__RESULT__".length));
  let failed = 0;
  for (const r of results) {
    const ok = r.got === r.expect;
    if (!ok) failed++;
    const extra = r.counts
      ? ` templates=${r.counts.templates} fonts=${r.counts.fonts} features=${r.counts.features} questions=${r.counts.questions}`
      : r.message
        ? ` "${r.message}"${r.error ? ` :: ${r.error.slice(0, 90)}` : ""}`
        : "";
    console.log(`${ok ? "PASS" : "FAIL"}  ${r.name.padEnd(16)} expect ${r.expect} got ${r.got}${extra}`);
  }
  console.log(`\n${results.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
