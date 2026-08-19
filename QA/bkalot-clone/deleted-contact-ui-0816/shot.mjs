// מדידה מדפדפן אמיתי: אותן שתי פניות, אותו מסד, אותו edge (v9) — וההפרש היחיד
// בין שתי הריצות הוא admin.html עצמו. 8138 מגיש את גרסת HEAD ו-8137 את עץ
// העבודה.
//
// מה נמדד ולא הוצהר: הטקסט של שתי שורות הרשימה, נוכחות הסימן ב-DOM ו-title שלו,
// וכותרת מסך הפנייה בשתי הפניות — זו שאיש הקשר שלה נמחק וזו שלא. צילום שנשמר
// בלי הטקסט שלצידו אינו ראיה — screenshot-evidence-below-the-fold; ולכן ה-PNG
// וגם המחרוזות נשמרים באותה ריצה, ובקרה אחת היא פנייה שלא נגעו בה כלל.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const EMAIL = "uidel0816@more30.test";
const PASS = "Uidel0816!pass";
const GONE = Number(process.argv[2]);  // הפנייה שאיש הקשר שלה נמחק
const KEPT = Number(process.argv[3]);  // הבקרה
const DIR = new URL("./", import.meta.url);

const out = { case_gone: GONE, case_kept: KEPT, runs: [] };

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
  await page.waitForFunction(() => !document.getElementById("count").textContent.includes("טוען"), null, { timeout: 20000 });
}

// השורה נקראת כשלושה דברים ולא כאחד: הטקסט, הסימן, וה-title שלו. סימן שאין לו
// טקסט אינו נבדל מסימן שיש לו, ולכן שלושתם נשמרים.
const readRows = () => page.evaluate(() => [...document.querySelectorAll("#rows button")].map((b) => {
  const n = b.querySelector(".row-name");
  const s = n.querySelector("span.stale");
  return {
    id: b.querySelector(".row-meta span")?.textContent ?? null,
    name: n.textContent,
    sign: s ? s.textContent : null,
    sign_title: s ? s.title : null,
    meta: [...b.querySelectorAll(".row-meta span")].map((x) => x.textContent).join(" · "),
  };
}));

// ⚠️ הצילום הוא של הכותרת ולכן הוא נשאר בראש הדף. הריצה הראשונה גללה אל מקטע
// «איש הקשר» לפני הצילום, ושני ה-PNG של לפני ואחרי יצאו זהים בייט-בייט על שני
// מצבים שונים — screenshot-evidence-below-the-fold. ה-hash הוא שגילה זאת, ולכן
// מיקום הכותרת על המסך נמדד ונשמר לצד הטקסט.
async function openCase(id, shot) {
  await page.click(`#rows button:has(.row-meta span:text-is("#${id}"))`);
  await page.waitForSelector("#screen-case:not([hidden])", { timeout: 20000 });
  await page.waitForTimeout(300);
  const title = await page.textContent("#case-title");
  const title_top_px = await page.evaluate(() => Math.round(document.getElementById("case-title").getBoundingClientRect().top));
  if (shot) await page.screenshot({ path: fileURLToPath(new URL(shot, DIR)), fullPage: false });
  // גוף המסך כבר אמר את זה לפני הפעימה הזו — הוא נקרא כאן כדי שהראיה תראה
  // שהכותרת והגוף אומרים עכשיו את אותו הדבר, ולא כל אחד את שלו.
  const contact_section = await page.evaluate(() => {
    const h3 = [...document.querySelectorAll("#case-body h3")].find((h) => h.textContent === "איש הקשר");
    return h3?.nextElementSibling?.textContent ?? null;
  });
  return { title, title_top_px, contact_section };
}

async function run(port, label, prefix) {
  await login(port);
  const count = (await page.textContent("#count")).trim();
  const rows = await readRows();
  await page.screenshot({ path: fileURLToPath(new URL(`${prefix}-list.png`, DIR)), fullPage: false });
  const gone = await openCase(GONE, `${prefix}-case-gone.png`);
  await page.click("#back");
  await page.waitForSelector("#screen-list:not([hidden])", { timeout: 20000 });
  await page.waitForFunction(() => !document.getElementById("count").textContent.includes("טוען"), null, { timeout: 20000 });
  const kept = await openCase(KEPT, `${prefix}-case-kept.png`);
  out.runs.push({ port, label, count, rows, case_gone: gone, case_kept: kept });
  console.log(label, JSON.stringify(rows), JSON.stringify(gone));
}

// לפני: גרסת HEAD. השורה בלי זהות אומרת «— ללא איש קשר —» ולא למה.
await run(8138, "before_head", "01-before");
// אחרי: עץ העבודה. אותה שורה בדיוק אומרת את הסיבה, והבקרה לא זזה.
await run(8137, "after_worktree", "02-after");

await browser.close();
writeFileSync(new URL("./dom.json", DIR), JSON.stringify(out, null, 2), "utf8");
console.log("written");
