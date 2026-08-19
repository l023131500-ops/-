// מדידה מדפדפן אמיתי: אותה פנייה, אותו מסד, אותו edge (v9) — וההפרש היחיד בין
// שתי הריצות הוא admin.html עצמו. 8138 מגיש את גרסת HEAD ו-8137 את עץ העבודה.
//
// שלוש פתיחות ולא אחת, מפני שהטענה היא על שלושה מצבים שונים של אותו מסך:
//   «מסמכים» — המונח בשניים משלושת הנימוקים;
//   «אברהם»  — המונח בשם ולא באף נימוק, ואפס הוא תשובה ולא שתיקה;
//   בלי מונח — אין שאלה, ולכן אין שורה כלל.
//
// מה נמדד ולא הוצהר: כותרת «רצף ההכרעות» (שסופרת מעברים), הטקסט שמתחתיה
// וה-title שלו, מספר הסימנים «זה הנימוק שהתאים» בטבלה, ומיקום הכותרת על המסך
// ברגע הצילום — screenshot-evidence-below-the-fold. הבקרה הצמודה ביותר היא
// כותרת המעברים עצמה: היא אומרת 4 בכל שש המדידות ואינה אמורה לזוז.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const EMAIL = "tally0816@more30.test";
const PASS = "Tally0816!pass";
const CASE = Number(process.argv[2]);
const DIR = new URL("./", import.meta.url);

const out = { case_id: CASE, runs: [] };

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

// הרצף נקרא כארבעה דברים ולא כאחד: הכותרת שסופרת מעברים, מה שמצויר בין
// הכותרת לטבלה, ה-title של אותו דבר, וכמה שורות בטבלה נושאות את הסימן.
// שורה שאין לה טקסט אינה נבדלת משורה שאין לה קיום, ולכן נשמר גם הסוג של
// האלמנט שיושב שם בפועל.
const readHistory = () => page.evaluate(() => {
  const h3 = [...document.querySelectorAll("#case-body h3")].find((h) => h.textContent.startsWith("רצף ההכרעות"));
  if (!h3) return { heading: null };
  const next = h3.nextElementSibling;
  const isTally = next && next.tagName === "P";
  const s = isTally ? next.querySelector("span.stale") : null;
  return {
    heading: h3.textContent,
    next_tag: next ? next.tagName : null,
    tally: s ? s.textContent : null,
    tally_title: s ? s.title : null,
    row_marks: [...document.querySelectorAll("#case-body table td.why span.stale")].map((x) => x.textContent),
    rows: document.querySelectorAll("#case-body table tbody tr").length,
  };
});

async function search(q) {
  await page.fill("#f-q", q);
  await page.click("#f-go");
  await settled();
  return (await page.textContent("#count")).trim();
}

async function openCase(shot) {
  await page.click(`#rows button:has(.row-meta span:text-is("#${CASE}"))`);
  await page.waitForSelector("#screen-case:not([hidden])", { timeout: 20000 });
  await page.waitForTimeout(300);
  // ⚠️ מה שהשתנה יושב באמצע הגוף ולא בראשו. גלילה אליו לפני הצילום, ומיקומו
  //    נשמר לצד הטקסט — צילום שאינו כולל את מה שהוא אמור להוכיח אינו ראיה.
  await page.evaluate(() => {
    const h3 = [...document.querySelectorAll("#case-body h3")].find((h) => h.textContent.startsWith("רצף ההכרעות"));
    if (h3) h3.scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(200);
  const hist = await readHistory();
  hist.heading_top_px = await page.evaluate(() => {
    const h3 = [...document.querySelectorAll("#case-body h3")].find((h) => h.textContent.startsWith("רצף ההכרעות"));
    return h3 ? Math.round(h3.getBoundingClientRect().top) : null;
  });
  await page.screenshot({ path: fileURLToPath(new URL(shot, DIR)), fullPage: false });
  return hist;
}

async function back() {
  await page.click("#back");
  await page.waitForSelector("#screen-list:not([hidden])", { timeout: 20000 });
  await settled();
}

async function run(port, label, prefix) {
  await login(port);
  const probes = [];
  for (const [q, tag] of [["מסמכים", "docs"], ["אברהם", "name"], ["", "noq"]]) {
    const count = await search(q);
    const hist = await openCase(`${prefix}-${tag}.png`);
    probes.push({ q, count, ...hist });
    await back();
  }
  out.runs.push({ port, label, probes });
  console.log(label, JSON.stringify(probes.map((p) => [p.q, p.heading, p.tally, p.row_marks.length])));
}

// לפני: גרסת HEAD. הסימן יושב על השורות ואיש אינו סופר אותם.
await run(8138, "before_head", "01-before");
// אחרי: עץ העבודה. אותה טבלה בדיוק, ומעליה כמה מתוך כמה.
await run(8137, "after_worktree", "02-after");

await browser.close();
writeFileSync(new URL("./dom.json", DIR), JSON.stringify(out, null, 2), "utf8");
console.log("written");
