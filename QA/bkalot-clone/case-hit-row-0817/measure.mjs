// המדידה של הפעימה הזו היא **הסימן שעל השורה עצמה**, ומולו מספר הסימנים שהתא
// שמעליו מצייר. הטענה אינה «הקוד סופר נכון» אלא שתי טענות שנקראות מה-DOM באותה
// קריאה: (א) המספר שנאמר על כל שורה שווה למספר ה-mark שמצוירים באותה שורה
// בדיוק, ו-(ב) סכום המספרים שעל השורות שווה למספר שבמשפט שמעל הטבלה.
//
// שני שרתים סטטיים באותה ריצה מול אותו edge ואותו מסד: 8138 מגיש את HEAD
// (063501a — אותו קובץ בדיוק שנפרס לייצור, 193,914 בתים, MD5 36AFA137) ו-8137
// את עץ העבודה. BASE ב-admin.html הוא כתובת מוחלטת, ולכן ההבדל היחיד בין שתי
// הריצות הוא admin.html עצמו.
//
// חמישה מונחים ולא אחד: «טופס» (שלוש הופעות בשורה אחת), «email» (שתיים בשורה
// אחת, ובשתי צורות אותיות), «נשלח» (שתי שורות והופעה אחת בכל אחת — הבקרה שבה
// שני המספרים על השורות שווים זה לזה ולסכום), «המס הקודמת» (אחת — הניסוח
// העברי «הופעה אחת») ו«אברהם» (אפס — הבקרה שבה אין ולו סימן שורה אחד).
// בלי «נשלח» אי אפשר להבחין בין «שורה אחת עם שלוש» ל«שתי שורות עם אחת»,
// וזה בדיוק הפער שהפעימה הזו סוגרת: על HEAD שני המצבים מצוירים אות באות זהה.
import { writeFileSync, readFileSync, createReadStream, existsSync } from "node:fs";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const EMAIL = "qa.case.hit.row.0817@more30.com";
const PW = "Qa-CaseHitRow-0817!";
const CASE_ID = 416;
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

// ⚠️ הכל נקרא **לפי שורה** ולא לרוחב המסך: rows[i].marks ו-rows[i].badge מגיעים
// מאותו תא בדיוק, ובלי זה אי אפשר לטעון «המספר שעל השורה שווה לסימנים שבה» —
// אפשר לטעון רק על הסכום, וזה בדיוק מה שכבר נמדד ב-063501a.
// הטבלה נבחרת לפי הכותרת «למה» ולא לפי «הראשונה»: במסך הפנייה יש שלוש טבלאות
// (הרצף, הזכויות והמסמכים), ו-#screen-case table tbody tr היה סופר את שלושתן.
const readCase = (page) => page.evaluate(() => {
  const table = [...document.querySelectorAll("#screen-case table")]
    .find((t) => [...t.querySelectorAll("thead th")].some((th) => th.textContent.trim() === "למה"));
  const trs = table ? [...table.querySelectorAll("tbody tr")] : [];
  const rows = trs.map((tr) => {
    const td = tr.cells[tr.cells.length - 1];
    const badgeEl = [...td.querySelectorAll("span.stale")]
      .find((e) => /זה הנימוק שהתאים/.test(e.textContent));
    return {
      text: td.textContent,
      marks: [...td.querySelectorAll("mark.hit")].map((m) => m.textContent),
      badge: badgeEl ? badgeEl.textContent.trim() : null,
      badge_title: badgeEl ? badgeEl.title : null,
    };
  });
  const tallyEl = [...document.querySelectorAll("#screen-case p.note span.stale")]
    .find((e) => /מונח החיפוש/.test(e.textContent));
  return {
    tally: tallyEl ? tallyEl.textContent.trim() : null,
    rows,
    matched: rows.filter((r) => r.badge != null).length,
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
      // ⚠️ הגלילה כאן היא אל **הטבלה** ולא אל המשפט: מה שנטען כאן יושב על
      // השורות, ותצלום שמכוון אל המשפט היה מראה בדיוק את מה שכבר צולם ב-063501a.
      const el = await page.$("#screen-case table tbody tr:last-child");
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
  "טופס": "after-tofes-row-3",
  "נשלח": "after-nishlach-two-rows-one-each",
  "אברהם": "after-avraham-no-badge",
});
a.close(); b.close();

const result = {
  step: "case-hit-row-0817",
  servers: {
    8138: { serves: "HEAD 063501a", bytes: readFileSync(join(HEAD, "admin.html")).length, md5: md5(join(HEAD, "admin.html")) },
    8137: { serves: "עץ העבודה", bytes: readFileSync(join(WORK, "admin.html")).length, md5: md5(join(WORK, "admin.html")) },
  },
  ...before, ...after,
};

// שתי הטענות נגזרות כאן מהמדידה ואינן נכתבות ביד.
const num = (s) => {
  if (s == null) return null;
  if (/הופעה אחת/.test(s)) return 1;
  const m = s.match(/—\s*(\d+)\s*הופעות/);
  return m ? Number(m[1]) : null;
};
const tallyNum = (s) => {
  if (s == null) return null;
  if (/פעם אחת בסך הכול/.test(s)) return 1;
  const m = s.match(/—\s*(\d+)\s*פעמים בסך הכול/);
  return m ? Number(m[1]) : null;
};
result.claims = {};
for (const q of TERMS) {
  const rows = result.after[q]?.rows || [];
  const per = rows.map((r) => ({ badge: num(r.badge), marks: r.marks.length }));
  const said = per.filter((p) => p.badge != null);
  result.claims[q] = {
    per_row_equals_marks_in_that_row: said.every((p) => p.badge === p.marks),
    rows_said: said.map((p) => p.badge),
    rows_marks: per.map((p) => p.marks),
    sum_of_rows: said.reduce((n, p) => n + p.badge, 0),
    tally_total: tallyNum(result.after[q]?.tally),
    badges_before: (result.before[q]?.rows || []).map((r) => r.badge),
    badges_after: rows.map((r) => r.badge),
  };
  const c = result.claims[q];
  c.sum_equals_tally = c.tally_total == null ? null : c.sum_of_rows === c.tally_total;
}
writeFileSync(join(here, "_measured.json"), JSON.stringify(result, null, 2));
for (const q of TERMS) {
  const c = result.claims[q];
  console.log(`${q}`);
  console.log(`  before badges: ${JSON.stringify(c.badges_before)}`);
  console.log(`  after  badges: ${JSON.stringify(c.badges_after)}`);
  console.log(`  marks/row=${JSON.stringify(c.rows_marks)} per_row_ok=${c.per_row_equals_marks_in_that_row} sum=${c.sum_of_rows} tally=${c.tally_total} sum_ok=${c.sum_equals_tally}`);
  console.log(`  tally: ${JSON.stringify(result.after[q]?.tally)}`);
}
console.log(`overflow after: ${TERMS.map((q) => result.after[q]?.overflow).join(",")}`);
console.log(`console before=${result.before_console.length} after=${result.after_console.length}`);
