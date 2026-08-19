// measure-live.mjs — אותה מדידה של d99e2d3, הפעם מהכתובת החיה ולא משרת מקומי.
//
// הטענה אינה «הקוד סופר נכון» אלא «המספר שנאמר בייצור שווה בדיוק למספר הסימנים
// שהטבלה שמתחתיו מציירת», ולכן שניהם נקראים מה-DOM באותה קריאה.
//
// ⚠️ מצבי «לפני» אינם נמדדים כאן מדפדפן — הפריסה כבר קרתה. שהייצור הריץ את הקוד
// הישן נמדד מ-62 הסימנים ב-live-before.json ולא מקריאת DOM.
//
// ⚠️ הקובץ הזה נכתב בכלי כתיבה ולא ב-Set-Content: round-trip של
// Get-Content -Raw | Set-Content קרא אותו כ-cp1255 והפך כל מילה עברית
// לג'יבריש — ps1-without-bom-parsed-as-cp1255, והריצה שאחריה לא מצאה דבר
// ונראתה כמו מסך ריק.
//
// gannenet-dev-served-by-stale-sw — cachebust על הטעינה.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const EMAIL = "qa136@more30.test";
const PW = "Qa!136deploy";
const CASE_ID = 415;
const TERMS = ["טופס", "email", "נשלח", "המס הקודמת", "אברהם"];
const PAGE_URL = "https://more30.com/bkalot-studio/admin";

const here = fileURLToPath(new URL(".", import.meta.url));

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
    notes: cells.map((td) => td.textContent),
    matched: cells.filter((td) => /זה הנימוק שהתאים/.test(td.textContent)).length,
    changes: ([...document.querySelectorAll("#screen-case h3")]
      .find((h) => /^רצף ההכרעות/.test(h.textContent))?.textContent || "").trim(),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
});

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

const SHOTS = {
  "טופס": "live-tofes-3-times",
  "נשלח": "live-nishlach-2-of-3-twice",
  "אברהם": "live-avraham-silent",
};
const out = {};
for (const q of TERMS) {
  await page.fill("#f-q", q);
  await page.click("#f-go");
  await page.waitForFunction(() => !/טוען/.test(document.getElementById("count").textContent), null, { timeout: 60000 });
  const btn = page.getByRole("button", { name: new RegExp(`#${CASE_ID}\\b`) }).first();
  if (await btn.count() === 0) { out[q] = { row_in_list: false }; continue; }
  await btn.click();
  await page.waitForSelector("#screen-case:not([hidden])", { timeout: 60000 });
  await page.waitForFunction(() => document.querySelectorAll("#screen-case table tbody tr").length > 0, null, { timeout: 60000 });
  out[q] = { row_in_list: true, ...(await readCase(page)) };
  if (SHOTS[q]) {
    const el = await page.$("#screen-case p.note span.stale");
    if (el) await el.scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(here, `${SHOTS[q]}.png`) });
  }
  await page.click("#back");
  await page.waitForSelector("#screen-list:not([hidden])", { timeout: 60000 });
}
await browser.close();

writeFileSync(join(here, "live-dom.json"), JSON.stringify({ step: "case-hit-total-deploy-0816", url: PAGE_URL, case_id: CASE_ID, live: out, console: msgs }, null, 2));
for (const q of TERMS) {
  const r = out[q] || {};
  console.log(`${q}\n  tally : ${JSON.stringify(r.tally)}\n  marks : ${r.marks?.length} ${JSON.stringify(r.marks)}  matched=${r.matched}  overflow=${r.overflow}`);
}
console.log("console:", JSON.stringify(msgs));
