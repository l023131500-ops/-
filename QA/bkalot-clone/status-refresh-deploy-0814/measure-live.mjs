// דפדפן אמיתי, 1280x900, על הכתובת החיה more30.com/bkalot-studio/admin — לא על
// שרת סטטי מקומי. זה כל ההבדל בין הפעימה הזו ל-643ccf2: שם נמדד הקוד, כאן
// המוצר, דרך ה-rewrite של vercel.json ומעל 236 הבייטים ש-NetFree מזריק.
//
// המדידה שקונה את הפעימה אינה טקסט על המסך אלא **בקשה שלא יצאה**: כל בקשה אל
// BASE נספרת לפי הפעולה (cases / case / set-status) ולא רק כמספר כולל —
// «סיבוב מיותר» הוא בקשת cases אחת ספציפית ולא עומס כללי.
//
// אחריה בקרה שמראה שהרענון לא אבד אלא נמצא במקום שבו רואים אותו: «חזרה
// לרשימה» חייבת להביא בקשת cases אחת ולהראות את הסטטוס החדש.
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
// cache-buster ולא הכתובת החשופה: שניות אחרי פריסה, דפדפן טרי קיבל את ה-HTML
// הישן על הכתובת החשופה בעוד ש-fetch על אותה מכונה קיבל את החדש.
const LIVE = "https://more30.com/bkalot-studio/admin?cachebust=statusrefresh0814";
const BASE = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-admin";
const EMAIL = "qa.refresh.deploy.0814@more30.com";
const PW = "Qa-Refresh-Deploy-0814!";
const seed = JSON.parse(readFileSync(new URL("./seed.json", import.meta.url), "utf8"));
const CASE_A = seed.case_a.id; // זו שנלחצת
const CASE_B = seed.case_b.id; // בקרה — לא נוגעים בה

const action = (url) => (url.startsWith(BASE) ? url.slice(BASE.length + 1) : null);
const tally = (arr) => arr.reduce((m, a) => ((m[a] = (m[a] || 0) + 1), m), {});

const out = { url: LIVE, case_clicked: CASE_A, case_control: CASE_B, console_messages: [] };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("console", (m) => out.console_messages.push(m.type() + ": " + m.text()));

let calls = [];
page.on("request", (r) => {
  const a = action(r.url());
  if (a) calls.push(a);
});

await page.goto(LIVE, { waitUntil: "load" });
// צילום ריק מ-DOM בריא — התקלה שנרשמה ב-playwright-blank-screenshot;
// שינוי גודל אחד לפני הצילום מונע אותה.
await page.setViewportSize({ width: 1280, height: 901 });
await page.setViewportSize({ width: 1280, height: 900 });

// המסך החי הוא זה שנפרס עכשיו, ולא גרסה מהמטמון — נמדד מתוך הדפדפן עצמו.
out.served_version = await page.evaluate(() => ({
  has_new_comment: document.documentElement.innerHTML.includes("הרשימה מתרעננת בחזרה ולא כאן"),
  html_bytes: new Blob([document.documentElement.outerHTML]).size,
}));

await page.fill("#email", EMAIL);
await page.fill("#password", PW);
await page.click("#login-submit");
await page.waitForSelector("#screen-list:not([hidden])", { timeout: 30000 });
await page.waitForFunction(() => !/טוען/.test(document.getElementById("count").textContent), null, { timeout: 30000 });

// פתיחת הפנייה מהרשימה — בלחיצה על השורה, כמו אדם, ולא בקריאה ל-openCase.
await page.getByRole("button", { name: new RegExp(`#${CASE_A}\\b`) }).first().click();
await page.waitForSelector("#screen-case:not([hidden])", { timeout: 30000 });
await page.waitForSelector("text=שינוי סטטוס", { timeout: 30000 });

// מכאן ואילך נספרות רק הבקשות של לחיצת הסטטוס עצמה.
calls = [];
const t0 = Date.now();
await page.getByRole("button", { name: "בטיפול", exact: true }).click();
await page.waitForFunction(() => /הסטטוס שונה|כבר הייתה/.test(document.body.innerText), null, { timeout: 30000 });
// חלון שקט: בקשה שיוצאת אחרי שהשורה כבר על המסך עדיין נספרת.
await page.waitForTimeout(2500);
const onClick = calls.slice();
const ms = Date.now() - t0;

out.on_status_click = { total: onClick.length, by_action: tally(onClick), ms };
out.note = await page.evaluate(() => {
  const el = [...document.querySelectorAll("p,div,span")].find(
    (e) => /הסטטוס שונה|כבר הייתה/.test(e.textContent) && e.children.length === 0,
  );
  return el ? el.textContent.trim() : null;
});
{
  const el = page.locator("#screen-case");
  const box = await el.boundingBox();
  out.case_screen_top_px = box && Math.round(box.y);
}
await page.screenshot({ path: join(HERE, "01-live-case-after-status.png") });

// הבקרה: «חזרה לרשימה» — כאן הרענון כן נראה.
calls = [];
await page.click("#back");
await page.waitForSelector("#screen-list:not([hidden])", { timeout: 30000 });
await page.waitForFunction(() => !/טוען/.test(document.getElementById("count").textContent), null, { timeout: 30000 });
await page.waitForTimeout(800);
out.on_back = { total: calls.length, by_action: tally(calls) };
const rowText = (id) =>
  page.evaluate((i) => {
    const b = [...document.querySelectorAll("#rows button")].find((x) => x.textContent.includes("#" + i));
    return b ? b.textContent.replace(/\s+/g, " ").trim() : null;
  }, id);
out.row_clicked = await rowText(CASE_A);
out.row_control = await rowText(CASE_B);
await page.screenshot({ path: join(HERE, "02-live-list-after-back.png") });

await browser.close();
writeFileSync(join(HERE, "measure-out.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
