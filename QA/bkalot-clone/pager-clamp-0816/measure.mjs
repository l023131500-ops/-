// המדידה. שני שרתים סטטיים באותה ריצה מול אותו edge ואותו מסד: 8180 מגיש את
// הגרסה שבייצור (git show HEAD, 134,160 בייט) ו-8181 את המתוקן. BASE ב-admin.html
// הוא כתובת מוחלטת, ולכן ההבדל היחיד בין שתי הריצות הוא admin.html עצמו.
//
// הרצף בכל ריצה הוא רצף עבודה רגיל ולא הזרקה: סינון לפי «חדשה», «הבא» אל
// העמוד השני (שורה אחת בדיוק, מתוך 21), פתיחת אותה פנייה, «בטיפול», וחזרה
// לרשימה. החזרה היא load() עם אותו offset — «חזרה לרשימה מרעננת אותה» —
// והפנייה שטופלה כבר אינה עונה על הסינון.
//
// ⚠️ בין שתי הריצות נזרעת פנייה אחת נוספת דרך הקליטה החיה, כי הראשונה כבר
//    יצאה מהסינון ב-run 1 ובלעדיה יש 20 «חדשות» ואין עמוד שני כלל.
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { chromium } from "playwright";

const BASE = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-admin";
const EMAIL = "qa.pager.0816@more30.com";
const PW = "Qa-Pager-0816!";

const action = (url) => (url.startsWith(BASE) ? url.slice(BASE.length + 1) : null);
const shot = (p, n) => p.screenshot({ path: new URL(`./${n}.png`, import.meta.url).pathname.slice(1) });
const settled = (page) => page.waitForFunction(
  () => !/טוען/.test(document.getElementById("count").textContent), null, { timeout: 30000 });

// מה שעל המסך. המזהה נקרא מה-span הראשון ב-.row-meta ולא מ-textContent של
// השורה: /#(\d+)/ על טקסט השורה בולע את התאריך שאחריו.
const listState = (page) => page.evaluate(() => {
  const box = (id) => { const e = document.getElementById(id); const r = e.getBoundingClientRect(); return { hidden: e.hidden, top: Math.round(r.top), height: Math.round(r.height) }; };
  return {
    ids: [...document.querySelectorAll("#rows button .row-meta span:first-child")]
      .map((s) => (s.textContent.match(/^#(\d+)$/) || [])[1]).filter(Boolean).map(Number),
    count: document.getElementById("count").textContent.trim(),
    page_label: document.getElementById("page-label").textContent.trim(),
    empty: box("empty"),
    pager: box("pager"),
    list_error: box("list-error"),
    prev_disabled: document.getElementById("prev").disabled,
    next_disabled: document.getElementById("next").disabled,
  };
});

async function run(port, tag) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const console_msgs = [];
  page.on("console", (m) => console_msgs.push(`${m.type()}: ${m.text()}`));
  const calls = [];
  page.on("request", (r) => { const a = action(r.url()); if (a) calls.push({ a, body: r.postData() }); });

  await page.goto(`http://127.0.0.1:${port}/admin.html`, { waitUntil: "load" });
  await page.fill("#email", EMAIL);
  await page.fill("#password", PW);
  await page.click("#login-submit");
  await page.waitForSelector("#screen-list:not([hidden])", { timeout: 30000 });
  await settled(page);

  const casesBodies = () => calls.filter((x) => x.a === "cases").map((x) => JSON.parse(x.body));
  const steps = {};

  // (א) סינון «חדשה» — 21 פניות, עמוד ראשון.
  await page.selectOption("#f-status", "new");
  await page.click("#f-go");
  await settled(page);
  await page.waitForTimeout(400);
  steps.filtered = await listState(page);
  await shot(page, `${tag}-01-filtered`);

  // (ב) «הבא» — העמוד השני, שורה אחת בדיוק.
  await page.click("#next");
  await settled(page);
  await page.waitForTimeout(400);
  steps.page2 = await listState(page);
  await shot(page, `${tag}-02-page2`);
  const target = steps.page2.ids[0] ?? null;
  if (target === null) throw new Error("אין שורה בעמוד השני — הזריעה או הסינון אינם כפי שהונח");

  // (ג) הפנייה האחרונה בתור מטופלת — לחיצה אמיתית על «בטיפול».
  await page.getByRole("button", { name: new RegExp(`#${target}\\b`) }).first().click();
  await page.waitForSelector("#screen-case:not([hidden])", { timeout: 30000 });
  await page.getByRole("button", { name: "בטיפול", exact: true }).click();
  await page.waitForFunction(() => /הסטטוס שונה|כבר הייתה/.test(document.body.innerText), null, { timeout: 30000 });

  // (ד) חזרה לרשימה — load() עם אותו offset. זה הרגע הנמדד.
  await page.click("#back");
  await page.waitForSelector("#screen-list:not([hidden])", { timeout: 30000 });
  await settled(page);
  await page.waitForTimeout(600);
  steps.back = await listState(page);
  await shot(page, `${tag}-03-back`);

  await browser.close();
  return { tag, port, target, steps, cases_sent: casesBodies(), console: console_msgs };
}

const port = Number(process.argv[2]);
const tag = process.argv[3];
const out = await run(port, tag);
const file = new URL("./measure-out.json", import.meta.url);
const prev = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
prev[tag] = out;
writeFileSync(file, JSON.stringify(prev, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
