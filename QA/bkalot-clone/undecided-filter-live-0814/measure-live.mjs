// הבקרה שנשארה פתוחה ב-98dbef1, מילה במילה: «הרשימה המסוננת בייצור — הבקרה
// היחידה שהפעימה הזו לא סגרה, וטעונה אישורי מנהל (bkalot_clone_admin_create
// דרך SQL). זו הפעימה הבאה אם יהיה MCP». יש MCP, ולכן יש מנהל, ולכן אפשר
// למדוד את התשובה ולא רק את קיום השאלה.
//
// מה שנמדד ב-98dbef1: שהתיבה קיימת בייצור. מה שלא נמדד שם: שהתשובה עליה נכונה
// — הסינון עצמו רץ שם מול אותו edge ואותו מסד, אבל מהמסך שישב על שרת מקומי.
// כאן המסך עצמו הוא זה שבייצור.
//
// הכתובת החיה ולא הכתובת החשופה, ועם cache-buster: שניות אחרי פריסה דפדפן טרי
// קיבל את ה-HTML הישן על הכתובת החשופה בעוד ש-fetch על אותה מכונה קיבל את
// החדש (f2001e0).
//
// גוף כל בקשת cases נלכד כפי שיצא (r.postData) ולא משוחזר מהמסך: מסך שמציג
// תיבה ואינו שולח את ערכה הוא בדיוק התקלה שנבדקה, ואין דרך להבחין ביניהן
// מהמסך בלבד.
//
// נכתב ב-node ולא ב-PowerShell בכוונה: קובץ .ps1 בלי BOM נקרא כ-cp1255 והעברית
// שבתוכו נהרסת בזמן הפירוק.
import { writeFileSync, readFileSync } from "node:fs";
import { chromium } from "playwright";

const LIVE = "https://more30.com/bkalot-studio/admin?qa=" + process.argv[2];
const BASE = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-admin";
const EMAIL = "qa.undecided.live.0814@more30.com";
const PW = "Qa-Undecided-Live-0814!";
const seed = JSON.parse(readFileSync(new URL("./seed.json", import.meta.url), "utf8"));
const A = seed.case_a.id; // איש לא נגע בה — new, decided_at null
const B = seed.case_b.id; // תוכרע מהמסך החי — decided_at יימלא
const C = seed.case_c.id; // הטריגר קידם אותה — in_progress, decided_at null

const action = (url) => (url.startsWith(BASE) ? url.slice(BASE.length + 1) : null);
const shot = (p, n) => p.screenshot({ path: new URL(`./${n}.png`, import.meta.url).pathname.slice(1) });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const console_msgs = [];
const failed = [];
page.on("console", (m) => console_msgs.push(`${m.type()}: ${m.text()}`));
page.on("requestfailed", (r) => failed.push(r.url()));
const calls = [];
page.on("request", (r) => { const a = action(r.url()); if (a) calls.push({ a, body: r.postData() }); });

await page.goto(LIVE, { waitUntil: "load" });

// הגרסה שהוגשה נמדדת מתוך הדפדפן ולא רק ב-HTTP: התיבה נבנית בזמן ריצה ואינה
// יושבת ב-HTML, ולכן נוכחות מחרוזת בקובץ אינה מוכיחה שהלולאה רצה.
const served = await page.evaluate(() => ({
  title: document.title,
  has_login: !document.getElementById("screen-login").hidden,
}));
await shot(page, "01-live-login");

await page.fill("#email", EMAIL);
await page.fill("#password", PW);
await page.click("#login-submit");
await page.waitForSelector("#screen-list:not([hidden])", { timeout: 30000 });
await page.waitForFunction(() => !/טוען/.test(document.getElementById("count").textContent), null, { timeout: 30000 });

// מה שעל המסך: המזהים בסדר שבו הם מוצגים, ושורת המונה כלשונה.
//
// המזהה נקרא מה-span הראשון ב-.row-meta ולא מ-textContent של השורה: כל פריט
// במטא הוא span משלו והמפריד « · » הוא CSS בלבד, ולכן /#(\d+)/ על טקסט השורה
// בולע את התאריך שאחריו ומחזיר 17714 במקום 177.
const listState = (page) => page.evaluate(() => ({
  ids: [...document.querySelectorAll("#rows button .row-meta span:first-child")]
    .map((s) => (s.textContent.match(/^#(\d+)$/) || [])[1])
    .filter(Boolean).map(Number),
  count: document.getElementById("count").textContent.trim(),
  empty_hidden: document.getElementById("empty").hidden,
  error_hidden: document.getElementById("list-error").hidden,
}));

// התיבה עצמה — נקראת מה-select החי, לא מה-HTML.
const control = await page.evaluate(() => {
  const el = document.getElementById("f-decided");
  if (!el) return { present: false };
  const lab = document.querySelector('label[for="f-decided"]');
  return {
    present: true,
    label: lab ? lab.textContent.trim() : null,
    options: [...el.options].map((o) => [o.value, o.textContent]),
    value: el.value,
  };
});

// ההכרעה על B — לחיצה אמיתית על המסך שבייצור, לא UPDATE במסד. זו הפעולה
// היחידה בריצה כולה שכותבת decided_at, ולכן החלוקה שנמדדת אחריה היא תוצאה של
// מה שהמסך עשה ולא של מה שהוכן לו.
await page.getByRole("button", { name: new RegExp(`#${B}\\b`) }).first().click();
await page.waitForSelector("#screen-case:not([hidden])", { timeout: 30000 });
await page.getByRole("button", { name: "בטיפול", exact: true }).click();
await page.waitForFunction(() => /הסטטוס שונה|כבר הייתה/.test(document.body.innerText), null, { timeout: 30000 });
const decided_note = await page.evaluate(() => {
  const el = [...document.querySelectorAll("p,div,span")].find((e) => /הסטטוס שונה|כבר הייתה/.test(e.textContent) && e.children.length === 0);
  return el ? el.textContent.trim() : null;
});
await page.click("#back");
await page.waitForSelector("#screen-list:not([hidden])", { timeout: 30000 });
await page.waitForFunction(() => !/טוען/.test(document.getElementById("count").textContent), null, { timeout: 30000 });

const bodyOf = (i) => { const c = calls.filter((x) => x.a === "cases"); return c[i] ? JSON.parse(c[i].body) : null; };
const steps = [{ step: "default", sent: bodyOf(calls.filter((x) => x.a === "cases").length - 1), got: await listState(page) }];
await shot(page, "02-default");

const pick = async (v, name) => {
  const before = calls.filter((x) => x.a === "cases").length;
  await page.selectOption("#f-decided", v);
  await page.click("#f-go");
  await page.waitForFunction(() => !/טוען/.test(document.getElementById("count").textContent), null, { timeout: 30000 });
  await page.waitForTimeout(600);
  const cs = calls.filter((x) => x.a === "cases");
  steps.push({ step: name, sent: JSON.parse(cs[before].body), got: await listState(page) });
  await shot(page, name);
};
await pick("no", "03-decided-no");
await pick("yes", "04-decided-yes");
await pick("", "05-back-to-all");

await browser.close();
const out = { live: LIVE, cases: { A, B, C }, served, control, decided: { case_id: B, note: decided_note }, steps, console: console_msgs, requests_failed: failed };
writeFileSync(new URL("./measure-out.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
