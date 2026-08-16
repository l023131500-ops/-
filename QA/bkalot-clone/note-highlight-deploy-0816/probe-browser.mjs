// probe-browser.mjs — הטענה עצמה, מהכתובת החיה ולא מקובץ מקומי.
//
// node probe-browser.mjs <out.json> <png-prefix>
//
// חמישה מצבים על פנייה אחת (407) ושלוש שורות יומן, בדיוק התוכן ש-0100 נמדדה
// עליו. בכל מצב מוקלד מונח בתיבת החיפוש, נפתחת הפנייה, ונקראים תשעת התאים:
//   1 «המס הקודמת» — ההתאמה בסוף המחרוזת (135, pos 28)
//   2 «email»       — פותחת את המחרוזת, ומוקלדת קטן על «Email» (136, pos 1);
//                     המונח יושב שם פעמיים ורק הראשונה מסומנת — 0100 הכרעה (4)
//   3 «בדואר רשום»  — באמצע (137, pos 12)
//   4 בקרה: בלי מונח כלל — שלוש שורות ואפס mark
//   5 בקרה: zzzz — אפס שורות ברשימה, ולכן אין מסך פנייה
//
// טעינה מחדש של הכתובת מנתקת את הסשן (admin.html:312), ולכן כל המצבים רצים
// באותה טעינה ובלי refresh, והחזרה לרשימה נעשית בכפתור ולא ב-goto.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const [OUT, PREFIX] = process.argv.slice(2);
const EMAIL = "notehighlightdeploy0816@more30.test";
const PASS = "NoteHiDeploy0816!pass";
const URL_BASE = "https://more30.com/bkalot-studio/admin";
const DIR = new URL("./", import.meta.url);
const out = { url: URL_BASE, case_id: 407, console: [], bad_responses: [], states: {} };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
// playwright-blank-screenshot-until-resize: שינוי מידה אחד לפני הכל.
await page.setViewportSize({ width: 1280, height: 901 });
await page.setViewportSize({ width: 1280, height: 900 });
page.on("console", (m) => out.console.push({ type: m.type(), text: m.text() }));
page.on("response", (r) => { if (r.status() >= 400) out.bad_responses.push({ url: r.url(), status: r.status() }); });

const settled = () => page.waitForFunction(
  () => !document.getElementById("count").textContent.includes("טוען"), null, { timeout: 30000 });

// cachebust על הטעינה עצמה — no-git-deploy-via-vercel-cli: הכתובת החשופה
// מגישה HTML ישן שניות אחרי פריסה.
await page.goto(`${URL_BASE}?cachebust=0816nhbrowser`, { waitUntil: "networkidle" });
await page.fill("#email", EMAIL);
await page.fill("#password", PASS);
await page.click("#login-submit");
await page.waitForSelector("#screen-list:not([hidden])", { timeout: 30000 });
await settled();

// קריאת התאים מה-DOM: רצף הצמתים ולא רק הטקסט, כדי שפיצול לשלושה צמתים
// ייראה כפי שהוא. mark נקרא מתוך התא ולא מהמסמך — «אחד בדיוק בכל מסך».
const readCase = () => page.evaluate(() => {
  const cells = [...document.querySelectorAll("#screen-case td.why")];
  return {
    rows: cells.length,
    marks_in_page: document.querySelectorAll("#screen-case mark").length,
    cells: cells.map((td) => {
      const m = td.querySelector("mark");
      return {
        text: td.textContent,
        mark: m ? m.textContent : null,
        mark_cls: m ? m.className : null,
        mark_title: m ? m.getAttribute("title") : null,
        nodes: [...td.childNodes].map((n) => n.nodeType === 3 ? "T:" + n.nodeValue : n.nodeName),
        td_title: td.getAttribute("title"),
        stale: !!td.querySelector("span.stale"),
      };
    }),
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  };
});

async function search(term) {
  await page.fill("#f-q", term);
  await page.click("#f-go");
  await settled();
  return page.evaluate(() => document.querySelectorAll("#rows button.row").length);
}

async function openFirstCase() {
  await page.click("#rows button.row");
  await page.waitForSelector("#screen-case:not([hidden])", { timeout: 30000 });
  await page.waitForFunction(
    () => document.querySelectorAll("#screen-case td.why").length > 0, null, { timeout: 30000 });
}

async function shoot(name) {
  const el = await page.$("#screen-case td.why");
  if (el) await el.evaluate((n) => n.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(250);
  await page.screenshot({ path: fileURLToPath(new URL(`${PREFIX}${name}`, DIR)), fullPage: false });
}

async function back() {
  await page.click("#back");
  await page.waitForSelector("#screen-list:not([hidden])", { timeout: 30000 });
  await settled();
}

for (const [key, term, png] of [
  ["term1_end",   "המס הקודמת", "term1-end.png"],
  ["term2_start", "email",       "term2-start-first-only.png"],
  ["term3_mid",   "בדואר רשום",  "term3-mid.png"],
  ["ctl_no_term", "",            "ctl-no-term.png"],
]) {
  const rows = await search(term);
  if (rows === 0) { out.states[key] = { term, rows_in_list: 0 }; continue; }
  await openFirstCase();
  out.states[key] = { term, rows_in_list: rows, ...(await readCase()) };
  await shoot(png);
  await back();
}

// בקרה אחרונה: מונח שאינו קיים — אין שורה, ולכן אין מסך פנייה כלל.
out.states.ctl_zzzz = { term: "zzzz", rows_in_list: await search("zzzz") };

await browser.close();
writeFileSync(new URL(`./${OUT}`, DIR), JSON.stringify(out, null, 2), "utf8");
console.log("written");
