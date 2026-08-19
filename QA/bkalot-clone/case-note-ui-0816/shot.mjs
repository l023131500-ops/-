// מדידה מדפדפן אמיתי: אותה פנייה, אותו מסד, אותו edge (v9) — וההפרש היחיד בין
// שתי הריצות הוא admin.html עצמו. 8138 מגיש את גרסת HEAD ו-8137 את עץ העבודה.
//
// מה נמדד ולא הוצהר: הטקסט של תא «למה» בכל אחת משלוש שורות היומן, נוכחות הסימן
// ב-DOM, וה-title שלו. צילום שנשמר בלי הטקסט שלצידו אינו ראיה — screenshot-
// evidence-below-the-fold; ולכן ה-PNG וגם המחרוזות נשמרים באותה ריצה.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const EMAIL = "uicase0098@more30.test";
const PASS = "Uicase0098!pass";
const CASE_ID = Number(process.argv[2]);
const DIR = new URL("./", import.meta.url);

const out = { case_id: CASE_ID, runs: [] };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
// playwright-blank-screenshot-until-resize: שינוי מידה אחד לפני הכל.
await page.setViewportSize({ width: 1280, height: 901 });
await page.setViewportSize({ width: 1280, height: 900 });

async function login(port) {
  await page.goto(`http://127.0.0.1:${port}/admin.html`, { waitUntil: "networkidle" });
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASS);
  await page.click("#login-submit");
  await page.waitForSelector("#screen-list:not([hidden])", { timeout: 20000 });
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

async function run(port, label, q, shot) {
  await login(port);
  await page.fill("#f-q", q);
  await page.click("#filters button[type=submit]");
  await page.waitForFunction(() => !document.getElementById("count").textContent.includes("טוען"), null, { timeout: 20000 });
  const count = await page.textContent("#count");
  // «הצג» של השורה שנזרעה, ולא הראשונה שנמצאה: כך המדידה היא על פנייה ידועה.
  await page.click("#rows button >> nth=0");
  await page.waitForSelector("#screen-case:not([hidden])", { timeout: 20000 });
  await page.waitForTimeout(300);
  const title = await page.textContent("#case-title");
  // הטבלה יושבת מתחת לקיפול ב-1280x900, וצילום מראש הדף החזיר חמישה קבצים
  // זהים בייט-בייט על חמישה מצבים שונים — screenshot-evidence-below-the-fold.
  // הגלילה היא אל אותה כותרת בכל הריצות, ולכן ההפרש בין הקבצים הוא הסימן עצמו.
  const box = await page.evaluate(() => {
    const h3 = [...document.querySelectorAll("#case-body h3")].find((h) => h.textContent.startsWith("רצף ההכרעות"));
    h3?.scrollIntoView({ block: "start" });
    const s = [...document.querySelectorAll("#case-body table span.stale")].find((x) => x.textContent === "זה הנימוק שהתאים");
    return { scrolled_to: h3?.textContent ?? null, sign_top_px: s ? Math.round(s.getBoundingClientRect().top) : null };
  });
  await page.waitForTimeout(150);
  const hist = await readHistory();
  if (shot) await page.screenshot({ path: fileURLToPath(new URL(shot, DIR)), fullPage: false });
  out.runs.push({ port, label, q, count: count.trim(), title, ...hist, ...box, shot: shot ?? null });
  console.log(label, JSON.stringify(hist.rows));
}

// לפני: גרסת HEAD, אותו חיפוש בדיוק — הרצף חוזר בלי ולו סימן אחד.
await run(8138, "before_head", "המס הקודמת", "01-before-no-sign.png");
// אחרי: עץ העבודה. התאמה יחידה, ואז התאמה כפולה שמראה שהשדה מתאר ואינו בוחר.
await run(8137, "after_one_match", "המס הקודמת", "02-after-marks-the-row.png");
await run(8137, "after_two_matches", "מסמכים", "03-after-two-rows.png");
// בקרה: אותה פנייה בלי מונח חיפוש כלל — המסך שותק.
await run(8137, "control_no_q", "", "04-control-no-q.png");
// בקרה שנייה: מונח שנמצא בשם ולא בנימוק — הסימן חייב לא להופיע.
await run(8137, "control_by_name", "אברהם", "05-control-found-by-name.png");

await browser.close();
writeFileSync(new URL("./dom.json", DIR), JSON.stringify(out, null, 2), "utf8");
console.log("written");
