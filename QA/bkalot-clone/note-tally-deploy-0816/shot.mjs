// מדידה מדפדפן אמיתי מול הכתובת החיה — לא מול שרת מקומי ולא מול קובץ.
// זו הטענה של הצעד: מנהל שנכנס ל-more30.com רואה את הספירה.
//
// שלוש פתיחות ולא אחת, מפני שהטענה היא על שלושה מצבים שונים של אותו מסך:
//   «מסמכים» — המונח בשניים משלושת הנימוקים;
//   «אברהם»  — המונח בשם ולא באף נימוק, ואפס הוא תשובה ולא שתיקה;
//   בלי מונח — אין שאלה, ולכן אין שורה כלל.
//
// מה נמדד ולא הוצהר: כותרת «רצף ההכרעות» (שסופרת מעברים) — הבקרה הצמודה ביותר,
// היא אומרת 4 בכל שלוש המדידות בעוד המכנה הוא 3, ושני המספרים אינם אמורים
// להיות שווים; מספר הסימנים «זה הנימוק שהתאים» בטבלה; ומיקום הכותרת על המסך
// ברגע הצילום — screenshot-evidence-below-the-fold.
//
// ⚠️ cachebuster ולא הכתובת החשופה: מיד אחרי פריסה, more30.com מגישה לדפדפן
// חדש את ה-HTML הישן בעוד אותה כתובת עם פרמטר מחזירה את החדש.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const EMAIL = "tallydep0816@more30.test";
const PASS = "TallyDep0816!pass";
const CASE = Number(process.argv[2]);
const URL_ADMIN = "https://more30.com/bkalot-studio/admin?cachebust=note-tally-shot";
const DIR = new URL("./", import.meta.url);

const out = { case_id: CASE, url: URL_ADMIN, console: [], failed_requests: [], probes: [] };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("console", (m) => out.console.push({ type: m.type(), text: m.text() }));
// ⚠️ «500 בלי כתובת» אינו ראיה אלא חשד — כתובת כל תגובה שאינה 2xx/3xx נרשמת,
//    כדי שהזרקת NetFree תהיה ניתנת להבחנה מכשל של האפליקציה.
page.on("response", (r) => {
  if (r.status() >= 400) out.failed_requests.push({ url: r.url(), status: r.status() });
});
// playwright-blank-screenshot-until-resize: שינוי מידה אחד לפני הכל.
await page.setViewportSize({ width: 1280, height: 901 });
await page.setViewportSize({ width: 1280, height: 900 });

const settled = () => page.waitForFunction(
  () => !document.getElementById("count").textContent.includes("טוען"), null, { timeout: 30000 });

await page.goto(URL_ADMIN, { waitUntil: "networkidle" });
await page.fill("#email", EMAIL);
await page.fill("#password", PASS);
await page.click("#login-submit");
await page.waitForSelector("#screen-list:not([hidden])", { timeout: 30000 });
await settled();

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

for (const [q, tag] of [["מסמכים", "docs"], ["אברהם", "name"], ["", "noq"]]) {
  await page.fill("#f-q", q);
  await page.click("#f-go");
  await settled();
  const count = (await page.textContent("#count")).trim();
  await page.click(`#rows button:has(.row-meta span:text-is("#${CASE}"))`);
  await page.waitForSelector("#screen-case:not([hidden])", { timeout: 30000 });
  await page.waitForTimeout(400);
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
  await page.screenshot({ path: fileURLToPath(new URL(`live-${tag}.png`, DIR)), fullPage: false });
  out.probes.push({ q, count, ...hist });
  await page.click("#back");
  await page.waitForSelector("#screen-list:not([hidden])", { timeout: 30000 });
  await settled();
}

await browser.close();
writeFileSync(new URL("./dom.json", DIR), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
