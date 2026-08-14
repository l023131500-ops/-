// המדידה שקונה את הפעימה אינה טקסט על המסך אלא **בקשה שלא יצאה** — ואחריה
// בקרה שמראה שהיא לא אבדה אלא זזה למקום שבו רואים אותה.
//
// שני שרתים סטטיים באותה ריצה מול אותו edge ואותו מסד: 8160 מגיש את הגרסה
// שבייצור (git show HEAD) ו-8161 את המתוקן. BASE ב-admin.html הוא כתובת
// מוחלטת, ולכן ההבדל בין שתי הריצות יכול להיות רק בין שתי גרסאות של המסך.
//
// כל בקשה אל BASE נספרת לפי הפעולה (cases / case / set-status), ולא נספר רק
// המספר הכולל: «סיבוב מיותר» הוא בקשת cases אחת ספציפית, ולא עומס כללי.
import { writeFileSync, readFileSync } from "node:fs";
import { chromium } from "playwright";

const BASE = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-admin";
const EMAIL = "qa.refresh.0814@more30.com";
const PW = "Qa-Refresh-0814!";
const seed = JSON.parse(readFileSync(new URL("./seed.json", import.meta.url), "utf8"));
// פנייה נפרדת לכל גרסה, ולא אותה פנייה פעמיים: set-status על פנייה שכבר
// «בטיפול» מחזירה changed=false ומסך אחר, ואז ההבדל בין שתי הריצות היה יכול
// להיות הבדל בין שני מצבי פנייה ולא בין שתי גרסאות של המסך. B אינה נלחצת
// באף אחת מהריצות והיא הבקרה על כך שהרשימה לא זזה מעצמה.
const CASE_A = seed.case_a.id; // הגרסה שבייצור
const CASE_C = seed.case_c.id; // הקובץ המתוקן
const CASE_B = seed.case_b.id; // בקרה

const action = (url) => (url.startsWith(BASE) ? url.slice(BASE.length + 1) : null);

async function run(port, tag, CASE_A) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const console_msgs = [];
  page.on("console", (m) => console_msgs.push(`${m.type()}: ${m.text()}`));

  let calls = [];
  page.on("request", (r) => { const a = action(r.url()); if (a) calls.push(a); });

  await page.goto(`http://127.0.0.1:${port}/admin.html`, { waitUntil: "load" });
  await page.fill("#email", EMAIL);
  await page.fill("#password", PW);
  await page.click("#login-submit");
  await page.waitForSelector("#screen-list:not([hidden])", { timeout: 20000 });
  await page.waitForFunction(() => !/טוען/.test(document.getElementById("count").textContent), null, { timeout: 20000 });

  // פתיחת הפנייה מהרשימה — בלחיצה על השורה, כמו אדם, ולא בקריאה ל-openCase.
  await page.getByRole("button", { name: new RegExp(`#${CASE_A}\\b`) }).first().click();
  await page.waitForSelector("#screen-case:not([hidden])", { timeout: 20000 });
  await page.waitForSelector("text=שינוי סטטוס", { timeout: 20000 });

  // מכאן ואילך נספרות רק הבקשות של לחיצת הסטטוס עצמה.
  calls = [];
  const t0 = Date.now();
  await page.getByRole("button", { name: "בטיפול", exact: true }).click();
  await page.waitForFunction(() => /הסטטוס שונה|כבר הייתה/.test(document.body.innerText), null, { timeout: 30000 });
  // חלון שקט: בקשה שיוצאת אחרי שהשורה כבר על המסך עדיין נספרת.
  await page.waitForTimeout(2500);
  const ms = Date.now() - t0;
  const onClick = calls.slice();

  const noteText = await page.evaluate(() => {
    const el = [...document.querySelectorAll("p,div,span")].find((e) => /הסטטוס שונה|כבר הייתה/.test(e.textContent) && e.children.length === 0);
    return el ? el.textContent.trim() : null;
  });
  await page.screenshot({ path: new URL(`./${tag}-case-after-status.png`, import.meta.url).pathname.slice(1) });

  // הבקרה: «חזרה לרשימה» — כאן הרענון כן נראה. הרשימה חייבת להראות את הסטטוס
  // החדש בשתי הגרסאות, אחרת מה שהוסר לא זז אלא אבד.
  calls = [];
  await page.click("#back");
  await page.waitForSelector("#screen-list:not([hidden])", { timeout: 20000 });
  await page.waitForFunction(() => !/טוען/.test(document.getElementById("count").textContent), null, { timeout: 20000 });
  await page.waitForTimeout(800);
  const onBack = calls.slice();
  const rowA = await page.evaluate((id) => {
    const b = [...document.querySelectorAll("#rows button")].find((x) => x.textContent.includes("#" + id));
    return b ? b.textContent.replace(/\s+/g, " ").trim() : null;
  }, CASE_A);
  const rowB = await page.evaluate((id) => {
    const b = [...document.querySelectorAll("#rows button")].find((x) => x.textContent.includes("#" + id));
    return b ? b.textContent.replace(/\s+/g, " ").trim() : null;
  }, CASE_B);
  await page.screenshot({ path: new URL(`./${tag}-list-after-back.png`, import.meta.url).pathname.slice(1) });

  await browser.close();
  const tally = (arr) => arr.reduce((m, a) => ((m[a] = (m[a] || 0) + 1), m), {});
  return {
    tag, port,
    on_status_click: { total: onClick.length, by_action: tally(onClick), ms },
    on_back: { total: onBack.length, by_action: tally(onBack) },
    note: noteText, row_a: rowA, row_b: rowB, console: console_msgs,
  };
}

const prev = await run(8160, "prev", CASE_A);
const next = await run(8161, "next", CASE_C);
const out = { case_prev: CASE_A, case_next: CASE_C, case_control: CASE_B, prev, next };
writeFileSync(new URL("./measure-out.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
