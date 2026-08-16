// probe-browser.mjs — הטענה עצמה, מהכתובת החיה ולא מקובץ מקומי.
//
// node probe-browser.mjs <out.json> <png-prefix>
//
// שלושה מצבים על תור שיש בו ארבע פניות (שתיים info, שתיים reminder):
//   A — בלי סינון כלל.  הבקרה: queue_total הוא null, ואין «בתור» ואין title.
//   B — kind=info.      «2 פניות תואמות את הסינון · בתור 4 פניות».
//   C — status=sent.    הכשל שנסגר: אפס שורות על תור מלא אומר מעכשיו את שני
//                       הדברים, ולא רק «אין פניות שתואמות את הסינון».
//
// שלושתם באותה טעינה ובלי refresh — טעינה מחדש של הכתובת מנתקת את הסשן
// (admin.html:312), והסינון נעשה דרך הטופס ולא דרך ה-URL.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const [OUT, PREFIX] = process.argv.slice(2);
const EMAIL = "queuetotaldeploy0816@more30.test";
const PASS = "QueueTotalDeploy0816!pass";
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
await page.goto(`${URL_BASE}?cachebust=0816qtbrowser`, { waitUntil: "networkidle" });
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
  await page.$eval("#count", (el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(200);
  await page.screenshot({ path: fileURLToPath(new URL(`${PREFIX}${name}`, DIR)), fullPage: false });
}

out.A_no_filter = await read();
await shoot("A-no-filter.png");

await page.selectOption("#f-kind", "info");
await page.click("#f-go");
await settled();
out.B_kind_info = await read();
await shoot("B-kind-info.png");

await page.selectOption("#f-kind", "");
await page.selectOption("#f-status", "sent");
await page.click("#f-go");
await settled();
out.C_status_sent = await read();
await shoot("C-status-sent.png");

await browser.close();
writeFileSync(new URL(`./${OUT}`, DIR), JSON.stringify(out, null, 2), "utf8");
console.log("written");
