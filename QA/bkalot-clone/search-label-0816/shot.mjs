// מדידה מדפדפן אמיתי: אותה פנייה, אותו מסד, אותו edge (v9) — וההפרש היחיד בין
// שתי הריצות הוא admin.html עצמו. 8138 מגיש את בייטי HEAD (אותם 158,095 בייט
// ו-MD5 9499888E שנפרסו לייצור ב-bfb5573) ו-8137 את עץ העבודה.
//
// הטענה נמדדת בפריים אחד ולא בשניים: התווית שמעל התיבה והשורה שחזרה יושבות על
// אותו מסך, ולכן «התווית מונה ארבעה שדות» ו«השורה עלתה בזכות חמישי» נראים יחד.
// המונח «בדואר רשום» נמדד לפני כן במסד כמי שאינו נמצא באף אחד מארבעת השדות
// שהתווית מונה.
//
// מה נמדד ולא הוצהר: טקסט התווית, ה-title של התיבה (מחרוזת ריקה כשאין), שורת
// המניין, הסימנים שעל השורה, וארבע תוויות הבקרה שלצדה — סטטוס, סוג, הכרעה
// ידנית ומיון — שאינן אמורות לזוז.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const EMAIL = "label0816@more30.test";
const PASS = "Label0816!pass";
const CASE = Number(process.argv[2]);
const TERM = "בדואר רשום";
const DIR = new URL("./", import.meta.url);

const out = { case_id: CASE, term: TERM, runs: [] };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
// playwright-blank-screenshot-until-resize: שינוי מידה אחד לפני הכל.
await page.setViewportSize({ width: 1280, height: 901 });
await page.setViewportSize({ width: 1280, height: 900 });

const settled = () => page.waitForFunction(
  () => !document.getElementById("count").textContent.includes("טוען"), null, { timeout: 20000 });

async function login(port) {
  await page.goto(`http://127.0.0.1:${port}/admin.html`, { waitUntil: "networkidle" });
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASS);
  await page.click("#login-submit");
  await page.waitForSelector("#screen-list:not([hidden])", { timeout: 20000 });
  await settled();
}

// התווית נקראת מה-DOM ולא מהקובץ: מה שנטען יכול להיות גרסה אחרת ממה שנכתב.
const readLabels = () => page.evaluate(() => {
  const t = (sel) => { const e = document.querySelector(sel); return e ? e.textContent.trim() : null; };
  return {
    q_label: t('label[for="f-q"]'),
    q_title: document.getElementById("f-q").getAttribute("title"),
    controls: ["f-status", "f-kind", "f-decided", "f-sort"].map((id) => t(`label[for="${id}"]`)),
  };
});

const readRow = () => page.evaluate((id) => {
  const btn = [...document.querySelectorAll("#rows button.row")]
    .find((b) => [...b.querySelectorAll(".row-meta span")].some((s) => s.textContent === "#" + id));
  if (!btn) return null;
  return {
    name: btn.querySelector(".row-name").textContent.trim(),
    meta: [...btn.querySelectorAll(".row-meta span")].map((s) => s.textContent.trim()),
    marks: [...btn.querySelectorAll(".row-meta span.stale")].map((s) => s.textContent.trim()),
  };
}, CASE);

async function run(port, label, shot) {
  await login(port);
  const before = await readLabels();
  await page.fill("#f-q", TERM);
  await page.click("#f-go");
  await settled();
  const count = (await page.textContent("#count")).trim();
  const row = await readRow();
  // התווית והשורה בפריים אחד: הגלילה אל הטופס ולא אל ראש הדף.
  await page.evaluate(() => document.getElementById("filters").scrollIntoView({ block: "start" }));
  await page.waitForTimeout(200);
  const label_top_px = await page.evaluate(() =>
    Math.round(document.querySelector('label[for="f-q"]').getBoundingClientRect().top));
  await page.screenshot({ path: fileURLToPath(new URL(shot, DIR)), fullPage: false });
  out.runs.push({ port, label, ...before, count, row, label_top_px, shot });
  console.log(label, JSON.stringify([before.q_label, count, row && row.marks]));
}

// לפני: בייטי HEAD — מה שמנהל רואה בייצור ברגע הזה.
await run(8138, "before_head", "01-before-head.png");
// אחרי: עץ העבודה. אותה שורה בדיוק, ותווית שמונה גם את השדה שבזכותו היא עלתה.
await run(8137, "after_worktree", "02-after-worktree.png");

await browser.close();
writeFileSync(new URL("./dom.json", DIR), JSON.stringify(out, null, 2), "utf8");
console.log("written");
