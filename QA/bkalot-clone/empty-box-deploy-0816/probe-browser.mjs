// probe-browser.mjs — הטענה עצמה, מהכתובת החיה ולא מקובץ מקומי.
//
// node probe-browser.mjs <out.json> <png-prefix>
//
// שני המצבים ששניהם רצים על תור ריק, ולכן אינם דורשים זריעה כלל — הבסיס
// עצמו (cases 0) הוא מצב A:
//   A — בלי סינון כלל.  זהו הכשל: עד הפריסה הזו התיבה אמרה «אין פניות
//       שתואמות את הסינון.» בזמן שהמונה שמעליה אמר «אין פניות».
//   B — q=zzzz.        הבקרה הצמודה: המשפט המסנן נכון כאן, ואסור לו להיעלם.
//
// A ו-B נקראים באותה טעינה ובלי refresh — טעינה מחדש של הכתובת מנתקת את
// הסשן (admin.html:312), והחיפוש נעשה דרך הטופס ולא דרך ה-URL.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const [OUT, PREFIX] = process.argv.slice(2);
const EMAIL = "emptyboxdeploy0816@more30.test";
const PASS = "EmptyBoxDeploy0816!pass";
const URL_BASE = "https://more30.com/bkalot-studio/admin";
const DIR = new URL("./", import.meta.url);
const out = { url: URL_BASE, console: [], bad_responses: [] };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
// playwright-blank-screenshot-until-resize: שינוי מידה אחד לפני הכל.
await page.setViewportSize({ width: 1280, height: 901 });
await page.setViewportSize({ width: 1280, height: 900 });
page.on("console", (m) => out.console.push({ type: m.type(), text: m.text() }));
page.on("response", (r) => { if (r.status() >= 400) out.bad_responses.push({ url: r.url(), status: r.status() }); });

const settled = () => page.waitForFunction(
  () => !document.getElementById("count").textContent.includes("טוען"), null, { timeout: 30000 });

// cachebust על הטעינה עצמה — הכתובת החשופה מגישה HTML ישן שניות אחרי פריסה.
await page.goto(`${URL_BASE}?cachebust=0816browser`, { waitUntil: "networkidle" });
await page.fill("#email", EMAIL);
await page.fill("#password", PASS);
await page.click("#login-submit");
await page.waitForSelector("#screen-list:not([hidden])", { timeout: 30000 });
await settled();

const read = () => page.evaluate(() => {
  const box = document.getElementById("empty");
  return {
    count: document.getElementById("count").textContent.trim(),
    count_title: document.getElementById("count").getAttribute("title"),
    empty_hidden: box.hidden,
    empty_text: box.textContent.trim(),
    rows: document.querySelectorAll("#rows button.row").length,
    pager_hidden: document.getElementById("pager").hidden,
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  };
});

async function shoot(name) {
  const box = await page.$("#empty:not([hidden])");
  const target = box || (await page.$("#rows"));
  if (target) await target.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await page.screenshot({ path: fileURLToPath(new URL(`${PREFIX}${name}`, DIR)), fullPage: false });
}

out.A_empty_noquery = await read();
await shoot("A-empty-noquery.png");

await page.fill("#f-q", "zzzz");
await page.click("#f-go");
await settled();
out.B_empty_query = await read();
await shoot("B-empty-query.png");

await browser.close();
writeFileSync(new URL(`./${OUT}`, DIR), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
