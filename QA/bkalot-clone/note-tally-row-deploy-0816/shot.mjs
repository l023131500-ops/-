// מדידה מדפדפן אמיתי מהכתובת החיה — more30.com/bkalot-studio/admin — ולא משרת
// מקומי. זו ההוכחה שהפעימה הגיעה אל מי שמשתמש במסך, ולא רק אל הקובץ שבמקור.
//
// cachebuster: מיד אחרי פריסה הכתובת החשופה מגישה לדפדפן חדש את ה-HTML הישן,
// ומדידה בלעדיו הייתה מצלמת את הגרסה הקודמת ומדווחת שהפריסה נכשלה.
//
// ארבעה מונחים על אותה פנייה אחת (#390), וכל אחד מודד דבר אחר:
//   מסמכים     — שני הסימנים זה לצד זה: «נמצאה לפי הנימוק» ואז «המונח ב-2 מתוך
//                4 הנימוקים». האחד עונה «למה נמצאה» והשני «כמה».
//   אברהם      — הסימן החדש לבדו. המונח בשם, ולכן matched_in_note false והסימן
//                הישן שותק; זהו כשל (ב), והוא נראה בייצור רק אחרי הפריסה הזו.
//   0501230013 — הבקרה הצמודה: note_match_count 0, ולכן אין ולו סימן אחד.
//                המונה אינו נדלק על כל שורה בחיפוש.
//   (בלי מונח) — null, שקט, והרשימה הרגילה לא זזה.
//
// מה נקרא מה-DOM ולא מהקובץ: כל טקסטי ה-span בשורת ה-meta, לפי הסדר, וה-title
// של הסימן החדש. שורת המניין ומספר השורות הם הבקרה — הם אומרים שהסימן נקרא
// מאותה טעינה שציירה את השורה.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const EMAIL = "deploynote0816@more30.test";
const PASS = "DeployNote0816!pass";
const URL_LIVE = "https://more30.com/bkalot-studio/admin?cachebust=note-tally-shot";
const DIR = new URL("./", import.meta.url);
const out = { url: URL_LIVE, console: [], bad_responses: [] };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
// playwright-blank-screenshot-until-resize: שינוי מידה אחד לפני הכל.
await page.setViewportSize({ width: 1280, height: 901 });
await page.setViewportSize({ width: 1280, height: 900 });
page.on("console", (m) => out.console.push({ type: m.type(), text: m.text() }));
page.on("response", (r) => { if (r.status() >= 400) out.bad_responses.push({ url: r.url(), status: r.status() }); });

const settled = () => page.waitForFunction(
  () => !document.getElementById("count").textContent.includes("טוען"), null, { timeout: 30000 });

await page.goto(URL_LIVE, { waitUntil: "networkidle" });
await page.fill("#email", EMAIL);
await page.fill("#password", PASS);
await page.click("#login-submit");
await page.waitForSelector("#screen-list:not([hidden])", { timeout: 30000 });
await settled();

const readRow = () => page.evaluate(() => {
  const row = document.querySelector("#rows button.row");
  const meta = row ? row.querySelector(".row-meta") : null;
  const spans = meta ? [...meta.querySelectorAll("span")] : [];
  const tally = spans.find((s) => s.textContent.includes("הנימוקים") || s.textContent.includes("בנימוק היחיד"));
  return {
    count: document.getElementById("count").textContent.trim(),
    rows: document.querySelectorAll("#rows button.row").length,
    row_head: row ? row.querySelector(".row-head")?.textContent.trim() ?? null : null,
    meta_spans: spans.map((s) => s.textContent.trim()),
    tally_text: tally ? tally.textContent.trim() : null,
    tally_title: tally ? tally.getAttribute("title") : null,
    row_height: row ? Math.round(row.getBoundingClientRect().height) : null,
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  };
});

async function search(q) {
  await page.fill("#f-q", q);
  await page.click("#f-go");
  await settled();
  return readRow();
}

// הגלילה אל השורה ולא אל ראש הדף — screenshot-evidence-below-the-fold.
async function shoot(name) {
  const row = await page.$("#rows button.row");
  if (row) await row.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await page.screenshot({ path: fileURLToPath(new URL(name, DIR)), fullPage: false });
}

out.no_query = await readRow();
out.mismachim = await search("מסמכים");
await shoot("01-live-mismachim.png");
out.avraham = await search("אברהם");
await shoot("02-live-avraham.png");
out.phone = await search("0501230013");
await shoot("03-live-phone.png");

// נייד: span נוסף בשורת ה-meta הוא שינוי בפריסה ולא רק בטקסט.
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
out.avraham_mobile = await search("אברהם");
await shoot("04-live-avraham-mobile.png");

await browser.close();
writeFileSync(new URL("./dom.json", DIR), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
