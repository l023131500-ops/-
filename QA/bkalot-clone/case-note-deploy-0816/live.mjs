// מדידה מדפדפן אמיתי מול הכתובת החיה — לא מול שרת מקומי ולא מול preview.
// זו הטענה של הצעד: מנהל שנכנס ל-more30.com/bkalot-studio/admin, מחפש מילה
// מתוך נימוק, ולוחץ על השורה שנמצאה — רואה בתוך הרצף איזו שורה נשאה אותה.
//
// ההתחברות דרך המסך עצמו ולא בהזרקת סשן, והחיפוש בהקלדה תו-תו ולחיצה על «הצג»
// ולא בקריאה מסקריפט — כך שמה שנמדד הוא הנתיב שהמנהל עובר.
//
// ⚠️ טעינה מחדש של הכתובת מנתקת את הסשן (הכרעה מוצהרת ב-admin.html), ולכן כל
// ריצה נפתחת בהתחברות מחדש. זו התנהגות קיימת ולא תקלה של הצעד הזה.
//
// ⚠️ הכתובת נטענת עם cachebuster: שניות אחרי פריסה, הכתובת החשופה עדיין הגישה
// לדפדפן את ה-HTML הישן בעוד Invoke-WebRequest קיבל את החדש.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const BASE = "https://more30.com/bkalot-studio/admin";
const EMAIL = "casenotedeploy@more30.test";
const PASS = "Casenote0816!pass";
const CASE_ID = Number(process.argv[2]);
const DIR = new URL("./", import.meta.url);

const out = { base: BASE, case_id: CASE_ID, console: [], runs: [] };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("console", (m) => out.console.push({ type: m.type(), text: m.text() }));
// playwright-blank-screenshot-until-resize: שינוי מידה אחד לפני הכל.
await page.setViewportSize({ width: 1280, height: 901 });
await page.setViewportSize({ width: 1280, height: 900 });

async function login(tag) {
  await page.goto(`${BASE}?cb=${tag}${Math.random().toString(36).slice(2)}`, { waitUntil: "networkidle" });
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASS);
  await page.click("#login-submit");
  await page.waitForSelector("#screen-list:not([hidden])", { timeout: 30000 });
}

// הרצף נקרא כטבלה: שלוש שורות, ובכל אחת הנימוק והסימן — או היעדרו.
async function readHistory() {
  return page.evaluate(() => {
    const h3 = [...document.querySelectorAll("#case-body h3")].find((h) => h.textContent.startsWith("רצף ההכרעות"));
    const t = h3?.nextElementSibling;
    if (!t || t.tagName !== "TABLE") return { heading: h3?.textContent ?? null, rows: null };
    return {
      heading: h3.textContent,
      rows: [...t.querySelectorAll("tbody tr")].map((tr) => {
        const why = tr.children[4];
        const sign = why.querySelector("span.stale");
        return {
          to: tr.children[1].textContent,
          note: why.firstChild?.textContent ?? null,
          sign: sign ? sign.textContent : null,
          sign_title: sign ? sign.title : null,
        };
      }),
    };
  });
}

async function run(label, q, shot) {
  await login(label);
  if (q) await page.locator("#f-q").pressSequentially(q, { delay: 25 });
  await page.click("#filters button[type=submit]");
  await page.waitForFunction(() => !document.getElementById("count").textContent.includes("טוען"), null, { timeout: 30000 });
  const count = await page.textContent("#count");
  await page.click("#rows button >> nth=0");
  await page.waitForSelector("#screen-case:not([hidden])", { timeout: 30000 });
  await page.waitForTimeout(400);
  const title = await page.textContent("#case-title");
  // הטבלה יושבת מתחת לקיפול ב-1280x900 — screenshot-evidence-below-the-fold.
  // הגלילה היא אל אותה כותרת בכל הריצות, ולכן ההפרש בין הקבצים הוא הסימן עצמו.
  const box = await page.evaluate(() => {
    const h3 = [...document.querySelectorAll("#case-body h3")].find((h) => h.textContent.startsWith("רצף ההכרעות"));
    h3?.scrollIntoView({ block: "start" });
    const s = [...document.querySelectorAll("#case-body table span.stale")].find((x) => x.textContent === "זה הנימוק שהתאים");
    return { scrolled_to: h3?.textContent ?? null, sign_top_px: s ? Math.round(s.getBoundingClientRect().top) : null };
  });
  await page.waitForTimeout(200);
  const hist = await readHistory();
  if (shot) await page.screenshot({ path: fileURLToPath(new URL(shot, DIR)), fullPage: false });
  out.runs.push({ label, q, count: count.trim(), title, ...hist, ...box, shot: shot ?? null });
  console.log(label, JSON.stringify(hist.rows));
}

// התאמה יחידה: המונח יושב בשורה השנייה בלבד.
await run("one_match", "המס הקודמת", "01-live-one-sign.png");
// התאמה כפולה: «מסמכים» בשתי שורות — השדה מתאר ואינו בוחר אחת.
await run("two_matches", "מסמכים", "02-live-two-signs.png");
// בקרה: אותה פנייה בלי מונח חיפוש כלל — המסך שותק.
await run("control_no_q", "", "03-live-control-no-q.png");
// בקרה שנייה: מונח שנמצא בשם ולא בנימוק — הסימן חייב לא להופיע.
await run("control_by_name", "אברהם", "04-live-control-by-name.png");

await browser.close();
writeFileSync(new URL("./dom.json", DIR), JSON.stringify(out, null, 2), "utf8");
console.log("written; console messages:", out.console.length);
