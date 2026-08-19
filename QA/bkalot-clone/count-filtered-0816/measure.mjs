// מדידה משני צדדיה: שני שרתים סטטיים באותה ריצה, מול אותו edge (v9) ואותו מסד,
// וההפרש היחיד ביניהם הוא admin.html עצמו. 8138 מגיש את בייטי HEAD — מה שמנהל
// רואה בייצור ברגע הזה — ו-8137 את עץ העבודה.
//
// שלושה מצבים בכל ריצה, ובשלושתם הפנייה יושבת במסד ואינה נמחקת:
//   queue    — בלי סינון כלל. המשפט על התור, והוא נכון בשתי הגרסאות.
//   match    — סינון «חדשה», שהפנייה עונה עליו. המספר זהה למצב הראשון, ולכן
//              שני מצבים שונים לגמרי נראו על המסך אותו הדבר בדיוק.
//   nomatch  — סינון «נשלחה», שאיש אינו עונה עליו. כאן המסך אמר «אין פניות»
//              על תור שיש בו פנייה.
//
// מה נקרא מה-DOM ולא מהקובץ: טקסט המונה, ה-title שלו (null כשאין), גלוי/מוסתר
// של תיבת ה-empty וטקסטה, ומספר השורות בפועל. מספר השורות הוא הבקרה: הוא זה
// שאומר שהמונה מדבר על אותה רשימה שנטענה ולא על טעינה קודמת.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const EMAIL = "count0816@more30.test";
const PASS = "Count0816!pass";
const DIR = new URL("./", import.meta.url);
const out = { runs: [], console: [], bad_responses: [] };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
// playwright-blank-screenshot-until-resize: שינוי מידה אחד לפני הכל.
await page.setViewportSize({ width: 1280, height: 901 });
await page.setViewportSize({ width: 1280, height: 900 });
page.on("console", (m) => out.console.push({ type: m.type(), text: m.text() }));
page.on("response", (r) => { if (r.status() >= 400) out.bad_responses.push({ url: r.url(), status: r.status() }); });

const settled = () => page.waitForFunction(
  () => !document.getElementById("count").textContent.includes("טוען"), null, { timeout: 20000 });

async function login(port) {
  await page.goto(`http://127.0.0.1:${port}/admin.html`, { waitUntil: "networkidle" });
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASS);
  await page.click("#login-submit");
  await page.waitForSelector("#screen-list:not([hidden])", { timeout: 20000 });
  await settled();
}

const readCount = () => page.evaluate(() => {
  const c = document.getElementById("count");
  const e = document.getElementById("empty");
  return {
    count: c.textContent.trim(),
    count_title: c.getAttribute("title"),
    empty_hidden: e.hidden,
    empty_text: e.textContent.trim(),
    rows: document.querySelectorAll("#rows button.row").length,
    status_value: document.getElementById("f-status").value,
  };
});

async function state(status) {
  await page.selectOption("#f-status", status);
  await page.click("#f-go");
  await settled();
  return readCount();
}

async function run(port, label, shots) {
  await login(port);
  const queue = await readCount();
  const match = await state("new");
  const nomatch = await state("sent");
  // הגלילה אל הטופס ולא אל ראש הדף — screenshot-evidence-below-the-fold:
  // מה שהשתנה הוא המונה, והוא יושב מתחת לתיבות הסינון.
  await page.evaluate(() => document.getElementById("filters").scrollIntoView({ block: "start" }));
  await page.waitForTimeout(200);
  await page.screenshot({ path: fileURLToPath(new URL(shots[0], DIR)), fullPage: false });
  const back = await state("new");
  await page.evaluate(() => document.getElementById("filters").scrollIntoView({ block: "start" }));
  await page.waitForTimeout(200);
  await page.screenshot({ path: fileURLToPath(new URL(shots[1], DIR)), fullPage: false });
  out.runs.push({ port, label, queue, match, nomatch, back });
  console.log(label, JSON.stringify([queue.count, match.count, nomatch.count]));
}

await run(8138, "before_head", ["01-before-nomatch.png", "02-before-match.png"]);
await run(8137, "after_worktree", ["03-after-nomatch.png", "04-after-match.png"]);

await browser.close();
writeFileSync(new URL("./dom.json", DIR), JSON.stringify(out, null, 2), "utf8");
console.log("written");
