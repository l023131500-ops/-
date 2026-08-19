// הודעת הקונסולה של live.mjs נרשמה בלי כתובת («Failed to load resource: 500»),
// ו-500 בלי מקור אינו ראיה אלא חשד: הוא יכול להיות האפליקציה עצמה או הזרקה של
// NetFree. הריצה הזו חוזרת על אותו מסלול בדיוק ורושמת את הכתובת של כל תגובה
// שאינה 2xx/3xx, כדי שהטענה תהיה על מה שקרה ולא על מה שנראה.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const URL_LIVE = "https://more30.com/bkalot-studio/admin";
const out = { failed: [], console: [] };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("console", (m) => out.console.push(`${m.type()}: ${m.text()}`));
page.on("response", (r) => { if (r.status() >= 400) out.failed.push({ status: r.status(), url: r.url() }); });
page.on("requestfailed", (r) => out.failed.push({ status: "requestfailed", url: r.url(), err: r.failure()?.errorText }));

await page.goto(URL_LIVE + "?cb=cons" + Math.random().toString(36).slice(2), { waitUntil: "networkidle" });
await page.fill("#email", "livedel0816@more30.test");
await page.fill("#password", "Livedel0816!pass");
await page.click("#login-submit");
await page.waitForSelector("#screen-list:not([hidden])", { timeout: 30000 });
await page.waitForFunction(() => !document.getElementById("count").textContent.includes("טוען"), null, { timeout: 30000 });
await page.waitForTimeout(1500);

await browser.close();
writeFileSync(new URL("./console-url.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
