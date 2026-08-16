// מדידה מדפדפן אמיתי על הייצור עצמו — https://more30.com/bkalot-studio/admin —
// ולא מול שרת מקומי. ההתחברות היא דרך המסך עם חשבון שנוצר ב-SQL, ואין ולו הזרקה
// אחת ואף לא קריאת cases אחת מסקריפט: מה שנמדד הוא מה שמנהל רואה.
//
// שתי הפניות יושבות באותה רשימה — 380 שאיש הקשר שלה נמחק, ו-381 שלא — ולכן
// הבקרה נמצאת באותו צילום ולא בצילום שני שאי אפשר להניח על הראשון.
//
// ⚠️ הצילום הוא של הכותרת ולכן הוא נשאר בראש הדף. הריצה של e2ea093 החזירה שני
// PNG זהים בייט-בייט על שני מצבים שונים מפני שהיא גללה למטה —
// screenshot-evidence-below-the-fold. מיקום הכותרת נמדד ונשמר לצד הטקסט.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const EMAIL = "livedel0816@more30.test";
const PASS = "Livedel0816!pass";
const GONE = Number(process.argv[2]);  // הפנייה שאיש הקשר שלה נמחק
const KEPT = Number(process.argv[3]);  // הבקרה
const DIR = new URL("./", import.meta.url);
const URL_LIVE = "https://more30.com/bkalot-studio/admin";

const out = { url: URL_LIVE, case_gone: GONE, case_kept: KEPT, console: [] };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("console", (m) => out.console.push(`${m.type()}: ${m.text()}`));
// playwright-blank-screenshot-until-resize: שינוי מידה אחד לפני הכל.
await page.setViewportSize({ width: 1280, height: 901 });
await page.setViewportSize({ width: 1280, height: 900 });

// cachebuster: מיד אחרי פריסה הכתובת החשופה עדיין מגישה את הישן לדפדפן חדש.
await page.goto(URL_LIVE + "?cb=live" + Math.random().toString(36).slice(2), { waitUntil: "networkidle" });
await page.fill("#email", EMAIL);
await page.fill("#password", PASS);
await page.click("#login-submit");
await page.waitForSelector("#screen-list:not([hidden])", { timeout: 30000 });
await page.waitForFunction(() => !document.getElementById("count").textContent.includes("טוען"), null, { timeout: 30000 });

// השורה נקראת כשלושה דברים ולא כאחד: הטקסט, הסימן, וה-title שלו.
out.count = (await page.textContent("#count")).trim();
out.rows = await page.evaluate(() => [...document.querySelectorAll("#rows button")].map((b) => {
  const n = b.querySelector(".row-name");
  const s = n.querySelector("span.stale");
  return {
    id: b.querySelector(".row-meta span")?.textContent ?? null,
    name: n.textContent,
    sign: s ? s.textContent : null,
    sign_title: s ? s.title : null,
    sign_top_px: s ? Math.round(s.getBoundingClientRect().top) : null,
  };
}));
await page.screenshot({ path: fileURLToPath(new URL("01-live-list.png", DIR)), fullPage: false });

async function openCase(id, shot) {
  await page.click(`#rows button:has(.row-meta span:text-is("#${id}"))`);
  await page.waitForSelector("#screen-case:not([hidden])", { timeout: 30000 });
  await page.waitForTimeout(300);
  const title = await page.textContent("#case-title");
  const title_top_px = await page.evaluate(() => Math.round(document.getElementById("case-title").getBoundingClientRect().top));
  await page.screenshot({ path: fileURLToPath(new URL(shot, DIR)), fullPage: false });
  // גוף המסך אמר את זה כבר לפני הפעימה — הוא נקרא כדי שהראיה תראה שהכותרת והגוף
  // אומרים עכשיו את אותו הדבר, ולא כל אחד את שלו.
  const contact_section = await page.evaluate(() => {
    const h3 = [...document.querySelectorAll("#case-body h3")].find((h) => h.textContent === "איש הקשר");
    return h3?.nextElementSibling?.textContent ?? null;
  });
  return { title, title_top_px, contact_section };
}

out.case_gone_screen = await openCase(GONE, "02-live-case-gone.png");
await page.click("#back");
await page.waitForSelector("#screen-list:not([hidden])", { timeout: 30000 });
await page.waitForFunction(() => !document.getElementById("count").textContent.includes("טוען"), null, { timeout: 30000 });
out.case_kept_screen = await openCase(KEPT, "03-live-case-kept.png");

await browser.close();
writeFileSync(new URL("./dom.json", DIR), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
