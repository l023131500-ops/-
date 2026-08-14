// המדידה שקונה את הפעימה אינה טקסט על המסך אלא **מפתח שיוצא ברשת** — ואחריו
// הרשימה שהשתנתה בגללו. 0081 כבר יודעת לענות על «מי לא נלקח»; עד הפעימה הזו
// איש אינו שואל אותה, ולכן התשובה קיימת ואינה נגישה לאיש.
//
// שני שרתים סטטיים באותה ריצה מול אותו edge ואותו מסד: 8170 מגיש את הגרסה
// שבייצור (git show HEAD, 90,920 בתים) ו-8171 את המתוקן. BASE ב-admin.html הוא
// כתובת מוחלטת, ולכן ההבדל בין שתי הריצות יכול להיות רק בין שתי גרסאות של
// המסך.
//
// גוף כל בקשת cases נלכד כפי שיצא (r.postData) ולא משוחזר מהמסך: השאלה כאן היא
// מה נשלח, ומסך שמציג תיבה ואינו שולח את ערכה הוא בדיוק התקלה שנבדקת.
//
// ההכרעה על B נעשית פעם אחת, לפני שתי המדידות ועל הגרסה שבייצור, כדי ששתיהן
// יראו מסד זהה בדיוק: אילו הוכרעה בתוך אחת הריצות, ההבדל בין הרשימות היה יכול
// להיות הבדל בין שני מצבי מסד ולא בין שתי גרסאות של המסך.
import { writeFileSync, readFileSync } from "node:fs";
import { chromium } from "playwright";

const BASE = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-admin";
const EMAIL = "qa.undecided.0814@more30.com";
const PW = "Qa-Undecided-0814!";
const seed = JSON.parse(readFileSync(new URL("./seed.json", import.meta.url), "utf8"));
const A = seed.case_a.id; // איש לא נגע בה — new, decided_at null
const B = seed.case_b.id; // תוכרע מהמסך — decided_at יימלא
const C = seed.case_c.id; // הטריגר קידם אותה — in_progress, decided_at null

const action = (url) => (url.startsWith(BASE) ? url.slice(BASE.length + 1) : null);
const shot = (p, n) => p.screenshot({ path: new URL(`./${n}.png`, import.meta.url).pathname.slice(1) });

async function login(port) {
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
  await page.waitForSelector("#screen-list:not([hidden])", { timeout: 20000 });
  await page.waitForFunction(() => !/טוען/.test(document.getElementById("count").textContent), null, { timeout: 20000 });
  return { browser, page, calls, console_msgs };
}

// מה שעל המסך: המזהים בסדר שבו הם מוצגים, ושורת המונה כלשונה.
//
// המזהה נקרא מה-span הראשון ב-.row-meta ולא מ-textContent של השורה: כל פריט
// במטא הוא span משלו והמפריד « · » הוא CSS בלבד, ולכן /#(\d+)/ על טקסט השורה
// בולע את התאריך שאחריו ומחזיר 17614 במקום 176. הריצה הראשונה נפלה בדיוק כאן,
// והמספרים היו עקביים מספיק כדי להיראות נכונים.
const listState = (page) => page.evaluate(() => ({
  ids: [...document.querySelectorAll("#rows button .row-meta span:first-child")]
    .map((s) => (s.textContent.match(/^#(\d+)$/) || [])[1])
    .filter(Boolean).map(Number),
  count: document.getElementById("count").textContent.trim(),
  empty_hidden: document.getElementById("empty").hidden,
  error_hidden: document.getElementById("list-error").hidden,
  pager_hidden: document.getElementById("pager").hidden,
}));

// ההכרעה על B — לחיצה אמיתית על המסך שבייצור, לא עדכון במסד.
async function decideB(port) {
  const { browser, page } = await login(port);
  await page.getByRole("button", { name: new RegExp(`#${B}\\b`) }).first().click();
  await page.waitForSelector("#screen-case:not([hidden])", { timeout: 20000 });
  await page.getByRole("button", { name: "בטיפול", exact: true }).click();
  await page.waitForFunction(() => /הסטטוס שונה|כבר הייתה/.test(document.body.innerText), null, { timeout: 30000 });
  const note = await page.evaluate(() => {
    const el = [...document.querySelectorAll("p,div,span")].find((e) => /הסטטוס שונה|כבר הייתה/.test(e.textContent) && e.children.length === 0);
    return el ? el.textContent.trim() : null;
  });
  await browser.close();
  return { case_id: B, note };
}

async function run(port, tag) {
  const { browser, page, calls, console_msgs } = await login(port);

  // (א) התיבה עצמה — קיימת או לא, ואילו ערכים היא מציעה.
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

  // (ב) ברירת המחדל — מה נשלח ומה חוזר כשאיש לא נגע בתיבות.
  const bodyOf = (i) => { const c = calls.filter((x) => x.a === "cases"); return c[i] ? JSON.parse(c[i].body) : null; };
  const steps = [{ step: "default", sent: bodyOf(0), got: await listState(page) }];
  await shot(page, `${tag}-01-default`);

  // (ג) הסינון עצמו. בגרסה שבייצור אין מה לבחור, ולכן אין צעד — וזו התשובה.
  const pick = async (v, name) => {
    const before = calls.filter((x) => x.a === "cases").length;
    await page.selectOption("#f-decided", v);
    await page.click("#f-go");
    await page.waitForFunction(() => !/טוען/.test(document.getElementById("count").textContent), null, { timeout: 20000 });
    await page.waitForTimeout(600);
    const cs = calls.filter((x) => x.a === "cases");
    steps.push({ step: name, sent: JSON.parse(cs[before].body), got: await listState(page) });
    await shot(page, `${tag}-${name}`);
  };
  if (control.present) {
    await pick("no", "02-decided-no");
    await pick("yes", "03-decided-yes");
    await pick("", "04-back-to-all");
  }

  // decided_unknown אינו נמדד כאן ונאמר במפורש ולא נבלע: התיבה סגורה ואין
  // ממנה דרך לשלוח ערך שלישי, וה-token יושב בסגור של המסך ואינו נגיש להזרקה
  // מהדף. מה שנמדד עליו הוא נוכחות המשפט בעברית בקובץ המוגש — ב-marker-check
  // ולא כאן — ולכן זו מדידת טקסט ולא מדידת מסך.

  await browser.close();
  return { tag, port, control, steps, console: console_msgs };
}

// --skip-decide: B כבר הוכרעה בריצה קודמת. לחיצה שנייה עליה הייתה מחזירה
// «כבר הייתה בטיפול» ומחליפה את שורת האישור שנמדדה — כלומר משנה את הראיה כדי
// להריץ מחדש מדידה אחרת. ההכרעה נשמרת כפי שנרשמה ומועברת פנימה.
const decided = process.argv.includes("--skip-decide")
  ? JSON.parse(readFileSync(new URL("./measure-out.json", import.meta.url), "utf8")).decided
  : await decideB(8170);
const prev = await run(8170, "prev");
const next = await run(8171, "next");
const out = { cases: { A, B, C }, decided, prev, next };
writeFileSync(new URL("./measure-out.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
