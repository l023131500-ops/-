// מדידה מדפדפן אמיתי מהכתובת החיה — more30.com/bkalot-studio/admin — ולא משרת
// מקומי. זו ההוכחה שהפעימה הגיעה אל מי שמשתמש במסך, ולא רק אל הקובץ שבמקור.
//
// cachebuster: מיד אחרי פריסה הכתובת החשופה מגישה לדפדפן חדש את ה-HTML הישן,
// ומדידה בלעדיו הייתה מצלמת את הגרסה הקודמת ומדווחת שהפריסה נכשלה.
//
// הטענה נמדדת בפריים אחד ולא בשניים: התווית שמעל התיבה והשורה שחזרה יושבות על
// אותו מסך. המונח «בדואר רשום» נמדד קודם במסד כמי שאינו נמצא באף אחד מארבעת
// השדות שהתווית הישנה מנתה (m_name/m_phone/m_email/m_id כולם false), ובכל זאת
// admin_cases מחזירה total 1, id 385, matched_in_note true.
//
// מה נמדד ולא הוצהר: טקסט התווית, ה-title של התיבה, שורת המניין, הסימנים שעל
// השורה, וארבע תוויות הבקרה שלצדה — סטטוס, סוג, הכרעה ידנית ומיון — שאינן
// אמורות לזוז. וגם הפריסה בשני רוחבים, מפני שתווית ארוכה יותר דוחקת שכנות.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const EMAIL = "deploy0816@more30.test";
const PASS = "Deploy0816!pass";
const CASE = 385;
const TERM = "בדואר רשום";
const URL_LIVE = "https://more30.com/bkalot-studio/admin?cachebust=search-label-shot";
const DIR = new URL("./", import.meta.url);

const out = { case_id: CASE, term: TERM, url: URL_LIVE, runs: [], console: [], bad_responses: [] };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
// playwright-blank-screenshot-until-resize: שינוי מידה אחד לפני הכל.
await page.setViewportSize({ width: 1280, height: 901 });
await page.setViewportSize({ width: 1280, height: 900 });

// «500 בלי מקור» אינו ראיה אלא חשד — כתובת כל תגובה כושלת נרשמת.
page.on("console", (m) => out.console.push({ type: m.type(), text: m.text() }));
page.on("response", (r) => {
  if (r.status() >= 400) out.bad_responses.push({ url: r.url(), status: r.status() });
});

const settled = () => page.waitForFunction(
  () => !document.getElementById("count").textContent.includes("טוען"), null, { timeout: 30000 });

await page.goto(URL_LIVE, { waitUntil: "networkidle" });
await page.fill("#email", EMAIL);
await page.fill("#password", PASS);
await page.click("#login-submit");
await page.waitForSelector("#screen-list:not([hidden])", { timeout: 30000 });
await settled();

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

const labels = await readLabels();
await page.fill("#f-q", TERM);
await page.click("#f-go");
await settled();
const count = (await page.textContent("#count")).trim();
const row = await readRow();

// הפריסה נמדדת ולא מונחת: התווית החדשה ארוכה יותר, ושורת הסינון היא flex.
async function geom(w, h, shot) {
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(300);
  const g = await page.evaluate(() => ({
    form_height: Math.round(document.getElementById("filters").getBoundingClientRect().height),
    label_top_px: Math.round(document.querySelector('label[for="f-q"]').getBoundingClientRect().top),
    label_lines: Math.round(
      document.querySelector('label[for="f-q"]').getBoundingClientRect().height /
      parseFloat(getComputedStyle(document.querySelector('label[for="f-q"]')).lineHeight)),
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  }));
  // התווית והשורה בפריים אחד: הגלילה אל הטופס ולא אל ראש הדף.
  await page.evaluate(() => document.getElementById("filters").scrollIntoView({ block: "start" }));
  await page.waitForTimeout(200);
  await page.screenshot({ path: fileURLToPath(new URL(shot, DIR)), fullPage: false });
  out.runs.push({ viewport: `${w}x${h}`, ...g, shot });
  return g;
}

await geom(1280, 900, "01-live-900.png");
await geom(390, 844, "02-live-390.png");

out.labels = labels;
out.count = count;
out.row = row;

await browser.close();
writeFileSync(new URL("./dom.json", DIR), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify({ labels, count, row, runs: out.runs, console: out.console, bad_responses: out.bad_responses }, null, 2));
