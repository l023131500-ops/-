// בקרה על הכרעה (3): total=0 עם אפס שורות הוא «אין פניות שתואמות את הסינון»
// עצמו, ואסור לו להשתנות. סינון «נשלחה» — סטטוס שאין בו ולו פנייה אחת.
//
// ⚠️ מה שנמדד כאן הוא total=0 עם offset=0, שכן «הצג» מאפס את הדפדוף; המצב
//    total=0 עם offset>0 אינו ניתן להגעה מהמסך בזריעה הזו, והוא נמנע ממילא
//    בתנאי total>0. זה נאמר ולא נבלע.
import { chromium } from "playwright";
import { writeFileSync, readFileSync, existsSync } from "node:fs";

const BASE = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-admin";
const port = Number(process.argv[2]);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const calls = [];
const console_msgs = [];
page.on("console", (m) => console_msgs.push(`${m.type()}: ${m.text()}`));
page.on("request", (r) => { if (r.url().startsWith(BASE + "/cases")) calls.push(JSON.parse(r.postData())); });
await page.goto(`http://127.0.0.1:${port}/admin.html`, { waitUntil: "load" });
await page.fill("#email", "qa.pager.0816@more30.com");
await page.fill("#password", "Qa-Pager-0816!");
await page.click("#login-submit");
await page.waitForSelector("#screen-list:not([hidden])", { timeout: 30000 });
await page.waitForFunction(() => !/טוען/.test(document.getElementById("count").textContent), null, { timeout: 30000 });
await page.selectOption("#f-status", "sent");
await page.click("#f-go");
await page.waitForFunction(() => !/טוען/.test(document.getElementById("count").textContent), null, { timeout: 30000 });
await page.waitForTimeout(600);
const state = await page.evaluate(() => ({
  rows: document.querySelectorAll("#rows button").length,
  count: document.getElementById("count").textContent.trim(),
  empty_hidden: document.getElementById("empty").hidden,
  empty_text: document.getElementById("empty").textContent.trim(),
  empty_top: Math.round(document.getElementById("empty").getBoundingClientRect().top),
  pager_hidden: document.getElementById("pager").hidden,
  error_hidden: document.getElementById("list-error").hidden,
}));
await page.screenshot({ path: new URL("./ctl-01-true-empty.png", import.meta.url).pathname.slice(1) });
await browser.close();
const out = { port, state, cases_sent: calls, console: console_msgs };
const file = new URL("./measure-out.json", import.meta.url);
const prev = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
prev.control = out;
writeFileSync(file, JSON.stringify(prev, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
