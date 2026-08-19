// מדידה מדפדפן אמיתי מהכתובת החיה — more30.com/bkalot-studio/admin — ולא משרת
// מקומי. זו ההוכחה שהפעימה הגיעה אל מי שמשתמש במסך, ולא רק אל הקובץ שבמקור.
//
// cachebuster: מיד אחרי פריסה הכתובת החשופה מגישה לדפדפן חדש את ה-HTML הישן,
// ומדידה בלעדיו הייתה מצלמת את הגרסה הקודמת ומדווחת שהפריסה נכשלה.
//
// שלושה מצבים, ואותה פנייה יושבת במסד בשלושתם:
//   queue    — בלי סינון כלל. המשפט על התור, והוא לא אמור לזוז מהפעימה.
//   match    — סינון «חדשה», שהפנייה עונה עליו.
//   nomatch  — סינון «נשלחה», שאיש אינו עונה עליו. כאן המסך אמר בייצור «אין
//              פניות» על תור שיש בו פנייה, וזה מה שהפריסה הזו מחליפה.
//
// מה נקרא מה-DOM ולא מהקובץ: טקסט המונה, ה-title שלו (null כשאין), גלוי/מוסתר
// של תיבת ה-empty, ומספר השורות בפועל. מספר השורות הוא הבקרה — הוא זה שאומר
// שהמונה מדבר על אותה רשימה שנטענה ולא על טעינה קודמת.
//
// ומצב רביעי, «back»: nomatch → match מחזיר את המשפט של match, כלומר המצב
// מתהפך חזרה ואינו נדבק.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const EMAIL = "deploycount0816@more30.test";
const PASS = "DeployCount0816!pass";
const URL_LIVE = "https://more30.com/bkalot-studio/admin?cachebust=count-filtered-shot";
const DIR = new URL("./", import.meta.url);
const out = { url: URL_LIVE, console: [], bad_responses: [] };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
// playwright-blank-screenshot-until-resize: שינוי מידה אחד לפני הכל.
await page.setViewportSize({ width: 1280, height: 901 });
await page.setViewportSize({ width: 1280, height: 900 });
page.on("console", (m) => out.console.push({ type: m.type(), text: m.text() }));
page.on("response", (r) => { if (r.status() >= 400) out.bad_responses.push({ url: r.url(), status: r.status() }); });

const settled = () => page.waitForFunction(
  () => !document.getElementById("count").textContent.includes("טוען"), null, { timeout: 30000 });

await page.goto(URL_LIVE, { waitUntil: "networkidle" });
await page.fill("#email", EMAIL);
await page.fill("#password", PASS);
await page.click("#login-submit");
await page.waitForSelector("#screen-list:not([hidden])", { timeout: 30000 });
await settled();

const readCount = () => page.evaluate(() => {
  const c = document.getElementById("count");
  const e = document.getElementById("empty");
  return {
    count: c.textContent.trim(),
    count_title: c.getAttribute("title"),
    empty_hidden: e.hidden,
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

// הגלילה אל הטופס ולא אל ראש הדף — screenshot-evidence-below-the-fold:
// מה שהשתנה הוא המונה, והוא יושב מתחת לתיבות הסינון.
async function shoot(name) {
  await page.evaluate(() => document.getElementById("filters").scrollIntoView({ block: "start" }));
  await page.waitForTimeout(200);
  await page.screenshot({ path: fileURLToPath(new URL(name, DIR)), fullPage: false });
}

out.queue = await readCount();
out.match = await state("new");
await shoot("01-live-match.png");
out.nomatch = await state("sent");
await shoot("02-live-nomatch.png");
out.back = await state("new");

await browser.close();
writeFileSync(new URL("./dom.json", DIR), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
