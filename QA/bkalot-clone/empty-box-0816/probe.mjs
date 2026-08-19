// מדידה מדפדפן אמיתי, אותו מסד ואותו edge, ושני שרתים מקומיים שההפרש היחיד
// ביניהם הוא admin.html: 8138 מגיש את HEAD, 8137 את עץ העבודה.
//
// node probe.mjs <port> <mode:empty|seeded> <out.json> <png-prefix>
//
// ארבעה מצבים, שניים בכל מצב תור, ואחד מהם הוא הכשל עצמו:
//   A — תור ריק, בלי סינון כלל.  התיבה נדלקת ואומרת «תואמות את הסינון» על מסך
//       שאין בו ולו סינון אחד, בזמן שהמונה שמעליה אומר «אין פניות» — שני
//       משפטים סותרים זה מעל זה, באותה טעינה.
//   B — תור ריק, q=zzzz.        אותה תיבה, ושם המשפט נכון. הבקרה שהוא לא נעלם.
//   C — תור עם פנייה אחת, q=zzzz. הרשימה ריקה בזמן שהתור מלא — המצב שבגללו
//       המשפט המסנן קיים בכלל.
//   D — תור עם פנייה אחת, בלי סינון. התיבה מוסתרת. הבקרה שהיא עדיין נסגרת.
//
// מה נקרא מה-DOM ולא מהקובץ: טקסט התיבה, hidden שלה, טקסט המונה ומספר השורות
// — כולם מאותה טעינה, כך שהסתירה נמדדת ולא מורכבת משתי מדידות.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const [PORT, MODE, OUT, PREFIX] = process.argv.slice(2);
const EMAIL = "emptybox0816@more30.test";
const PASS = "EmptyBox0816!pass";
const URL_BASE = `http://127.0.0.1:${PORT}/admin.html`;
const DIR = new URL("./", import.meta.url);
const out = { url: URL_BASE, mode: MODE, console: [], bad_responses: [] };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
// playwright-blank-screenshot-until-resize: שינוי מידה אחד לפני הכל.
await page.setViewportSize({ width: 1280, height: 901 });
await page.setViewportSize({ width: 1280, height: 900 });
page.on("console", (m) => out.console.push({ type: m.type(), text: m.text() }));
page.on("response", (r) => { if (r.status() >= 400) out.bad_responses.push({ url: r.url(), status: r.status() }); });

const settled = () => page.waitForFunction(
  () => !document.getElementById("count").textContent.includes("טוען"), null, { timeout: 30000 });

await page.goto(URL_BASE, { waitUntil: "networkidle" });
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

async function search(q) {
  await page.fill("#f-q", q);
  await page.click("#f-go");
  await settled();
  return read();
}

// הגלילה אל התיבה עצמה ולא אל ראש הדף — screenshot-evidence-below-the-fold.
// כשהתיבה מוסתרת (מצב D) אין לאן לגלול אליה, והגלילה אל אלמנט נסתר תולה את
// הריצה; אז המקום שצריך להיראות הוא הרשימה שבאה במקומה.
async function shoot(name) {
  const box = await page.$("#empty:not([hidden])");
  const target = box || (await page.$("#rows"));
  if (target) await target.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await page.screenshot({ path: fileURLToPath(new URL(`${PREFIX}${name}`, DIR)), fullPage: false });
}

if (MODE === "empty") {
  out.A_empty_noquery = await read();
  await shoot("A-empty-noquery.png");
  out.B_empty_query = await search("zzzz");
  await shoot("B-empty-query.png");
} else {
  out.C_seeded_query = await search("zzzz");
  await shoot("C-seeded-query.png");
  out.D_seeded_noquery = await search("");
  await shoot("D-seeded-noquery.png");
}

await browser.close();
writeFileSync(new URL(`./${OUT}`, DIR), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
