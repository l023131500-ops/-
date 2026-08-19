// measure-live.mjs — אותה מדידה של 9699a3d, הפעם מהכתובת החיה ולא משרת מקומי.
//
// הטענה אינה «הקוד סופר נכון» אלא שתיים, ושתיהן נקראות מה-DOM באותה קריאה
// ומאותו תא: (א) המספר שנאמר על כל שורה שווה בדיוק למספר ה-mark שמצוירים
// באותה שורה, ו-(ב) סכום המספרים שעל השורות שווה למספר שבמשפט שמעל הטבלה.
//
// ⚠️ מצבי «לפני» אינם נמדדים כאן מדפדפן — הפריסה כבר קרתה. שהייצור הריץ את הקוד
// הישן נמדד מ-42 הסימנים ב-live-before.json ולא מקריאת DOM.
//
// ⚠️ הקובץ הזה נכתב בכלי כתיבה ולא ב-Set-Content: round-trip של
// Get-Content -Raw | Set-Content קרא אותו כ-cp1255 והפך כל מילה עברית
// לג'יבריש — ps1-without-bom-parsed-as-cp1255, והריצה שאחריה לא נפלה אלא
// החזירה מצבים ריקים ונראתה כמו מסך שאינו מצייר דבר.
//
// gannenet-dev-served-by-stale-sw — cachebust על הטעינה.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const EMAIL = "qa138@more30.test";
const PW = "Qa!138deploy";
const CASE_ID = 417;
const TERMS = ["טופס", "email", "נשלח", "המס הקודמת", "אברהם"];
const PAGE_URL = "https://more30.com/bkalot-studio/admin";

const here = fileURLToPath(new URL(".", import.meta.url));

// ⚠️ הכל נקרא **לפי שורה** ולא לרוחב המסך: rows[i].marks ו-rows[i].badge מגיעים
// מאותו תא בדיוק, ובלי זה אפשר לטעון רק על הסכום — וזה כבר נמדד ב-063501a.
// הטבלה נבחרת לפי הכותרת «למה» ולא לפי «הראשונה»: במסך הפנייה יש שלוש טבלאות.
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

const SHOTS = {
  "טופס": "live-tofes-row-3",
  "נשלח": "live-nishlach-two-rows-one-each",
  "אברהם": "live-avraham-no-badge",
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
// playwright-blank-screenshot-until-resize — החלון משתנה פעם אחת לפני הכל.
await page.setViewportSize({ width: 1280, height: 901 });
const msgs = [];
page.on("console", (m) => msgs.push(`${m.type()}: ${m.text()}`));
await page.goto(`${PAGE_URL}?cachebust=${process.argv[2] || "live"}`, { waitUntil: "load" });
await page.fill("#email", EMAIL);
await page.fill("#password", PW);
await page.click("#login-submit");
await page.waitForSelector("#screen-list:not([hidden])", { timeout: 60000 });

const out = {};
for (const q of TERMS) {
  await page.fill("#f-q", q);
  await page.click("#f-go");
  await page.waitForFunction(() => !/טוען/.test(document.getElementById("count").textContent), null, { timeout: 60000 });
  // השורה נפתחת בלחיצה אמיתית: מונח החיפוש נוסע פנימה מ-lastFilters, וקריאה
  // ישירה ל-openCase הייתה עוקפת בדיוק את הנתיב שנבדק.
  const btn = page.getByRole("button", { name: new RegExp(`#${CASE_ID}\\b`) }).first();
  if (await btn.count() === 0) { out[q] = { row_in_list: false }; continue; }
  await btn.click();
  await page.waitForSelector("#screen-case:not([hidden])", { timeout: 60000 });
  await page.waitForFunction(() => document.querySelectorAll("#screen-case table tbody tr").length > 0, null, { timeout: 60000 });
  out[q] = { row_in_list: true, ...(await readCase(page)) };
  if (SHOTS[q]) {
    // ⚠️ הגלילה אל **הטבלה** ולא אל המשפט: מה שנטען כאן יושב על השורות.
    const el = await page.$("#screen-case table tbody tr:last-child");
    if (el) await el.scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(here, `${SHOTS[q]}.png`) });
  }
  await page.click("#back");
  await page.waitForSelector("#screen-list:not([hidden])", { timeout: 60000 });
}
await browser.close();

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
const claims = {};
for (const q of TERMS) {
  const rows = out[q]?.rows || [];
  const per = rows.map((r) => ({ badge: num(r.badge), marks: r.marks.length }));
  const said = per.filter((p) => p.badge != null);
  const c = {
    per_row_equals_marks_in_that_row: said.every((p) => p.badge === p.marks),
    rows_said: said.map((p) => p.badge),
    rows_marks: per.map((p) => p.marks),
    badges: rows.map((r) => r.badge),
    sum_of_rows: said.reduce((n, p) => n + p.badge, 0),
    tally_total: tallyNum(out[q]?.tally),
  };
  c.sum_equals_tally = c.tally_total == null ? null : c.sum_of_rows === c.tally_total;
  claims[q] = c;
}

writeFileSync(join(here, "live-dom.json"), JSON.stringify(
  { step: "case-hit-row-deploy-0817", url: PAGE_URL, case_id: CASE_ID, live: out, claims, console: msgs }, null, 2));
for (const q of TERMS) {
  const c = claims[q];
  console.log(`${q}`);
  console.log(`  badges: ${JSON.stringify(c.badges)}`);
  console.log(`  marks/row=${JSON.stringify(c.rows_marks)} per_row_ok=${c.per_row_equals_marks_in_that_row} sum=${c.sum_of_rows} tally=${c.tally_total} sum_ok=${c.sum_equals_tally}`);
  console.log(`  tally: ${JSON.stringify(out[q]?.tally)}  changes: ${JSON.stringify(out[q]?.changes)}  overflow=${out[q]?.overflow}`);
}
console.log("console:", JSON.stringify(msgs));
