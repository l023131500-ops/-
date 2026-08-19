// המדידה של הפעימה הזו היא **שורה אחת מעל טבלת ההכרעות**, ומולה מספר הסימנים
// שהטבלה עצמה מציירת. הטענה אינה «הקוד סופר נכון» אלא «המספר שנאמר שווה למה
// שאפשר לספור בעיניים באותו מסך», ולכן שניהם נקראים מה-DOM באותה קריאה.
//
// שני שרתים סטטיים באותה ריצה מול אותו edge ואותו מסד: 8138 מגיש את HEAD
// (6348c24 — אותו קובץ בדיוק שנפרס לייצור, 188,257 בתים) ו-8137 את עץ העבודה.
// BASE ב-admin.html הוא כתובת מוחלטת, ולכן ההבדל היחיד בין שתי הריצות הוא
// admin.html עצמו.
//
// חמישה מונחים ולא אחד: «טופס» (שלוש הופעות בנימוק אחד), «email» (שתיים, ובשתי
// צורות אותיות), «נשלח» (שני נימוקים והופעה אחת בכל אחד — הבקרה שבה שני
// המספרים שווים), «המס הקודמת» (אחת — הניסוח העברי) ו«אברהם» (אפס — הבקרה
// שבה אין תוספת כלל). בלי «נשלח» אי אפשר להבחין בין «1 מתוך 3 — 3 פעמים» לבין
// «2 מתוך 3 — 2 פעמים», ובלי «אברהם» אי אפשר לדעת שהאפס נשאר כפי שהיה.
import { writeFileSync, readFileSync, createReadStream, existsSync } from "node:fs";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const EMAIL = "qa.case.hit.0816@more30.com";
const PW = "Qa-CaseHit-0816!";
const CASE_ID = 414;
const TERMS = ["טופס", "email", "נשלח", "המס הקודמת", "אברהם"];

const here = fileURLToPath(new URL(".", import.meta.url));
const WORK = join(here, "..", "..", "..", "apps", "37-bkalot-clone");
const HEAD = join(here, "head");

const TYPES = { ".html": "text/html; charset=utf-8", ".json": "application/json; charset=utf-8" };
function serve(dir, port) {
  const s = createServer((req, res) => {
    const name = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "") || "index.html";
    const p = join(dir, name);
    if (!p.startsWith(dir) || !existsSync(p)) { res.writeHead(404); res.end("no"); return; }
    res.writeHead(200, { "content-type": TYPES[extname(p)] || "application/octet-stream" });
    createReadStream(p).pipe(res);
  });
  return new Promise((ok) => s.listen(port, "127.0.0.1", () => ok(s)));
}

const md5 = (p) => createHash("md5").update(readFileSync(p)).digest("hex").toUpperCase().slice(0, 8);

// כל מה שנקרא מהמסך נקרא כאן, בקריאה אחת, ומהאלמנטים עצמם:
//   tally     — המשפט שמעל הטבלה, כלשונו.
//   marks     — כמה mark.hit מצוירים בתאי «למה», ומה כתוב בכל אחד.
//   notes     — הטקסט המלא של כל תא «למה», כדי שיימדד שהפיצול אינו מוסיף ואינו גורע.
//   matched   — כמה תאים נושאים «זה הנימוק שהתאים» (הבקרה של 0097, שאינה אמורה לזוז).
//   changes   — כותרת הרצף, שסופרת מעברים ולא נימוקים (הכרעה (2)).
// ⚠️ הטבלה נבחרת לפי הכותרת «למה» ולא לפי «הראשונה»: במסך הפנייה יש שלוש
// טבלאות (הרצף, הזכויות והמסמכים), ו-#screen-case table tbody tr היה סופר את
// שלושתן ומחזיר מספר נימוקים שאינו קיים.
const readCase = (page) => page.evaluate(() => {
  const table = [...document.querySelectorAll("#screen-case table")]
    .find((t) => [...t.querySelectorAll("thead th")].some((th) => th.textContent.trim() === "למה"));
  const rows = table ? [...table.querySelectorAll("tbody tr")] : [];
  const cells = rows.map((tr) => tr.cells[tr.cells.length - 1]);
  const tallyEl = [...document.querySelectorAll("#screen-case p.note span.stale")]
    .find((e) => /מונח החיפוש/.test(e.textContent));
  return {
    tally: tallyEl ? tallyEl.textContent.trim() : null,
    tally_title: tallyEl ? tallyEl.title : null,
    marks: [...document.querySelectorAll("#screen-case mark.hit")].map((m) => m.textContent),
    mark_titles: [...new Set([...document.querySelectorAll("#screen-case mark.hit")].map((m) => m.title))],
    notes: cells.map((td) => td.textContent),
    matched: cells.filter((td) => /זה הנימוק שהתאים/.test(td.textContent)).length,
    changes: ([...document.querySelectorAll("#screen-case h3")]
      .find((h) => /^רצף ההכרעות/.test(h.textContent))?.textContent || "").trim(),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
});

async function run(port, tag, shots) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  // playwright-blank-screenshot-until-resize — החלון משתנה פעם אחת לפני הכל.
  await page.setViewportSize({ width: 1280, height: 901 });
  const msgs = [];
  page.on("console", (m) => msgs.push(`${m.type()}: ${m.text()}`));
  await page.goto(`http://127.0.0.1:${port}/admin.html`, { waitUntil: "load" });
  await page.fill("#email", EMAIL);
  await page.fill("#password", PW);
  await page.click("#login-submit");
  await page.waitForSelector("#screen-list:not([hidden])", { timeout: 30000 });

  const out = {};
  for (const q of TERMS) {
    await page.fill("#f-q", q);
    await page.click("#f-go");
    await page.waitForFunction(() => !/טוען/.test(document.getElementById("count").textContent), null, { timeout: 30000 });
    // השורה נפתחת בלחיצה אמיתית ולא בקריאה ישירה ל-openCase: מונח החיפוש נוסע
    // פנימה מ-lastFilters, וקריאה ישירה הייתה עוקפת בדיוק את הנתיב שנבדק.
    const btn = page.getByRole("button", { name: new RegExp(`#${CASE_ID}\\b`) }).first();
    if (await btn.count() === 0) { out[q] = { row_in_list: false }; continue; }
    await btn.click();
    await page.waitForSelector("#screen-case:not([hidden])", { timeout: 30000 });
    await page.waitForFunction(() => document.querySelectorAll("#screen-case table tbody tr").length > 0, null, { timeout: 30000 });
    out[q] = { row_in_list: true, ...(await readCase(page)) };
    if (shots && shots[q]) {
      const el = await page.$("#screen-case p.note span.stale");
      if (el) await el.scrollIntoViewIfNeeded();
      await page.screenshot({ path: join(here, `${shots[q]}.png`) });
    }
    await page.click("#back");
    await page.waitForSelector("#screen-list:not([hidden])", { timeout: 30000 });
  }
  await browser.close();
  return { [tag]: out, [`${tag}_console`]: msgs };
}

const a = await serve(HEAD, 8138);
const b = await serve(WORK, 8137);
const before = await run(8138, "before");
const after = await run(8137, "after", {
  "טופס": "after-tofes-3-times",
  "נשלח": "after-nishlach-2-of-3-twice",
  "אברהם": "after-avraham-silent",
});
a.close(); b.close();

const result = {
  step: "case-hit-total-0816",
  servers: {
    8138: { serves: "HEAD 6348c24", bytes: readFileSync(join(HEAD, "admin.html")).length, md5: md5(join(HEAD, "admin.html")) },
    8137: { serves: "עץ העבודה", bytes: readFileSync(join(WORK, "admin.html")).length, md5: md5(join(WORK, "admin.html")) },
  },
  ...before, ...after,
};
writeFileSync(join(here, "_measured.json"), JSON.stringify(result, null, 2));
for (const q of TERMS) {
  console.log(`${q}\n  before: ${JSON.stringify(result.before[q]?.tally)}  marks=${result.before[q]?.marks?.length}`);
  console.log(`  after : ${JSON.stringify(result.after[q]?.tally)}  marks=${result.after[q]?.marks?.length}`);
}
