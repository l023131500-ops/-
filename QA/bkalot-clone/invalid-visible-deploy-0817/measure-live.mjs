// measure-live.mjs — מה שהעין רואה על שדה שנפסל, נקרא מהכתובת החיה ולא מקובץ.
//
// ‏_verify.mjs כבר הכריע שהגוף שהכתובת מחזירה הוא הקובץ שבמקור — 33 סימנים
// בשתי כתובות. מה שהוא **אינו** יכול להכריע הוא שהדפדפן באמת מחיל את הכלל:
// ספירת מחרוזת ב-HTML אומרת שה-CSS נשלח, לא שהוא צויר. הצבעים כאן נקראים
// מ-getComputedStyle על השדה שנמדד באמת, בכתובת https://more30.com, והניגודיות
// מחושבת מהערכים שנמדדו — לא מתוך ה-CSS.
//
// ⚠️ ההשוואה כאן היא מול מספרים שנמדדו בפעימה הקודמת ולא מול «לפני» חי: ברגע
// שהפריסה עברה, אין יותר ייצור-לפני להצביע עליו. ה-HEAD-של-אז נמדד ב-8ef394c
// (‏QA/bkalot-clone/invalid-visible-0817/_measured.json), ומה שנטען כאן הוא
// שהערכים החיים שווים ל-after שנמדד שם — קובץ מקומי מול ייצור, אותם צבעים.
//
// ⚠️ שום פנייה אינה נוצרת. שני הקודים שיוצאים לרשת הם `return … 'ok', false`
// שיושבים ב-0058 מעל יצירת ה-contact ומעל יצירת ה-case, והשלישי נעצר בחסימה
// המוקדמת בצד הלקוח ואינו נשלח כלל. מצב טסט; הבקרה נכתבת ל-_measured-live.json.
import { writeFileSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = fileURLToPath(new URL(".", import.meta.url));
const LIVE = "https://more30.com/bkalot-studio/";
const PREV = JSON.parse(readFileSync(join(here, "..", "invalid-visible-0817", "_measured.json"), "utf8"));

const PHONE = "0500000000";   // תבנית חוקית ל-0058, ומספר שאינו של אדם

const CASES = [
  { id: "phone_invalid", field: "phone", kind: "info",
    fill: { full_name: "בדיקת QA", phone: "123" }, server: true },
  { id: "situation_required_for_treatment", field: "situation", kind: "treatment",
    fill: { full_name: "בדיקת QA", phone: PHONE, email: "qa@more30.com" }, server: true },
  { id: "preflight_topic_no", field: "topic_no", kind: "treatment",
    fill: { full_name: "בדיקת QA", phone: PHONE, email: "qa@more30.com" },
    situation: 1, topic_no: "1e3", server: false },
];

const md5 = (p) => createHash("md5").update(readFileSync(p)).digest("hex").toUpperCase().slice(0, 8);

const readState = (page, field) => page.evaluate((id) => {
  const el = document.getElementById(id);
  const cs = getComputedStyle(el);
  const card = el.closest(".card");
  return {
    invalid: [...document.querySelectorAll("[aria-invalid]")].map((e) => e.id || e.tagName),
    focused: document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : null,
    lines: [...document.querySelectorAll("#result p")].map((p) => p.textContent),
    style: {
      border_color: cs.borderTopColor,
      border_width: cs.borderTopWidth,
      background: cs.backgroundColor,
      box_shadow: cs.boxShadow,
    },
    behind: getComputedStyle(card).backgroundColor,
    overflow_x: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  };
}, field);

// WCAG 1.4.11 — גבול של רכיב ממשק מול הצבע שצמוד לו, סף 3:1.
const rgb = (s) => s.match(/[\d.]+/g).slice(0, 3).map(Number);
const lum = (c) => {
  const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((p, q) => q - p);
  return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100;
};

async function run(tag, scheme, shots) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: scheme });
  // playwright-blank-screenshot-until-resize — החלון משתנה פעם אחת לפני הכל.
  await page.setViewportSize({ width: 1280, height: 901 });
  const msgs = [], bodies = [];
  page.on("console", (m) => msgs.push(`${m.type()}: ${m.text()}`));
  page.on("pageerror", (e) => msgs.push(`pageerror: ${e.message}`));
  page.on("response", async (r) => {
    if (!r.url().includes("bkalot-clone-intake")) return;
    try { bodies.push({ status: r.status(), body: await r.json() }); } catch { /* לא JSON */ }
  });

  const fill = async (c) => {
    // cachebust — gannenet-dev-served-by-stale-sw.
    await page.goto(`${LIVE}?cb=${process.hrtime.bigint()}`, { waitUntil: "load" });
    await page.check(`input[name="kind"][value="${c.kind}"]`);
    for (const [k, v] of Object.entries(c.fill)) await page.fill(`#${k}`, v);
    if (c.situation != null) await page.selectOption("#situation", { index: c.situation });
    if (c.topic_no != null) await page.fill("#topic_no", c.topic_no);
    const seen = bodies.length;
    await page.click("#submit");
    await page.waitForFunction(() => !document.getElementById("result").hidden, null, { timeout: 30000 });
    // computed-style-measures-a-transition — על השדות transition של 180ms על
    // border-color ועל box-shadow. ההמתנה היא עד שהערך מפסיק לזוז, ולא זמן קבוע.
    await page.waitForFunction((id) => {
      const el = document.getElementById(id);
      const now = getComputedStyle(el).borderTopColor + "|" + getComputedStyle(el).boxShadow;
      const stable = el.dataset.qaPrev === now;
      el.dataset.qaPrev = now;
      return stable;
    }, c.field, { timeout: 5000, polling: 250 });
    await page.waitForTimeout(300);
    return bodies.length > seen;
  };

  const out = {};
  for (const c of CASES) {
    const reached = await fill(c);
    const st = await readState(page, c.field);
    out[c.id] = { ...st, reached_server: reached };
    out[c.id].contrast = {
      border_vs_behind: contrast(st.style.border_color, st.behind),
      border_vs_fill: contrast(st.style.border_color, st.style.background),
    };
  }

  const at = {};
  for (const [id, name] of Object.entries(shots || {})) {
    const c = CASES.find((x) => x.id === id);
    if (name.width) await page.setViewportSize({ width: name.width, height: name.height });
    await fill(c);
    const st = await readState(page, c.field);
    at[name.file] = {
      viewport: `${name.width}x${name.height}`, ...st,
      contrast: {
        border_vs_behind: contrast(st.style.border_color, st.behind),
        border_vs_fill: contrast(st.style.border_color, st.style.background),
      },
    };
    // screenshot-evidence-below-the-fold — הגלילה אל השדה עצמו, שעליו הטענה.
    await page.locator(`#${c.field}`).scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(here, `${name.file}.png`) });
  }

  await browser.close();
  return { [tag]: out, [`${tag}_console`]: msgs, [`${tag}_server`]: bodies, [`${tag}_shots`]: at };
}

const light = await run("live_light", "light", {
  phone_invalid: { file: "live-light-phone", width: 1280, height: 901 },
});
const dark = await run("live_dark", "dark", {
  situation_required_for_treatment: { file: "live-dark-situation", width: 1280, height: 901 },
  preflight_topic_no: { file: "live-mobile-topic-390", width: 390, height: 844 },
});

const result = { step: "invalid-visible-deploy-0817", url: LIVE, ...light, ...dark };

// הטענות נגזרות מהמדידה: הייצור החי מול ה-after שנמדד מקובץ ב-8ef394c.
result.claims = {};
for (const scheme of ["light", "dark"]) {
  for (const c of CASES) {
    const localAfter = PREV[`after_${scheme}`][c.id];
    const localBefore = PREV[`before_${scheme}`][c.id];
    const live = result[`live_${scheme}`][c.id];
    result.claims[`${c.id}__${scheme}`] = {
      field: c.field,
      live_border: live.style.border_color, local_after_border: localAfter.style.border_color,
      live_fill: live.style.background, local_after_fill: localAfter.style.background,
      live_shadow: live.style.box_shadow, local_after_shadow: localAfter.style.box_shadow,
      // (א) הייצור צובע בדיוק כפי שהקובץ נמדד לפני הפריסה
      live_equals_local_after:
        live.style.border_color === localAfter.style.border_color &&
        live.style.background === localAfter.style.background &&
        live.style.box_shadow === localAfter.style.box_shadow,
      // (ב) והוא כבר אינו מה שהייצור צבע לפני הפריסה — הירוק של שדה תקין
      prev_live_border: localBefore.style.border_color,
      live_differs_from_old: live.style.border_color !== localBefore.style.border_color,
      // (ג) הסימן ל-aria לא זז: אותו שדה מסומן, אותו שדה ממוקד, אותה הודעה
      marks_same_field: live.invalid.length === 1 && live.invalid[0] === c.field &&
                        live.focused === localAfter.focused &&
                        JSON.stringify(live.invalid) === JSON.stringify(localAfter.invalid),
      same_message: JSON.stringify(live.lines) === JSON.stringify(localAfter.lines),
      contrast: live.contrast,
      meets_3to1: live.contrast.border_vs_behind >= 3 && live.contrast.border_vs_fill >= 3,
      overflow_x: live.overflow_x,
      reached_server: live.reached_server,
    };
  }
}

const all = ["live_light", "live_dark"].flatMap((t) => result[`${t}_server`]);
result.test_mode = {
  responses: all.length,
  any_ok: all.some((r) => r.body?.ok === true),
  any_case_id: all.some((r) => r.body?.case_id != null),
  codes: [...new Set(all.map((r) => r.body?.error))],
  statuses: [...new Set(all.map((r) => r.status))],
};
result.shots = {};
for (const f of ["live-light-phone", "live-dark-situation", "live-mobile-topic-390"]) {
  const p = join(here, `${f}.png`);
  result.shots[f] = { bytes: readFileSync(p).length, md5: md5(p) };
}
result.shots_distinct = new Set(Object.values(result.shots).map((s) => s.md5)).size === 3;
const m = result.live_dark_shots["live-mobile-topic-390"];
result.mobile_390 = {
  viewport: m.viewport, invalid: m.invalid, focused: m.focused,
  border: m.style.border_color, fill: m.style.background,
  contrast: m.contrast, overflow_x: m.overflow_x,
};
result.verdict = Object.values(result.claims).every((v) =>
  v.live_equals_local_after && v.live_differs_from_old && v.marks_same_field &&
  v.same_message && v.meets_3to1 && !v.overflow_x) ? "PASS" : "FAIL";
writeFileSync(join(here, "_measured-live.json"), JSON.stringify(result, null, 2));

for (const [k, v] of Object.entries(result.claims)) {
  console.log(k);
  console.log(`  live  : border=${v.live_border} fill=${v.live_fill} shadow=${v.live_shadow}`);
  console.log(`  local : border=${v.local_after_border} fill=${v.local_after_fill}  equal=${v.live_equals_local_after}`);
  console.log(`  old   : border=${v.prev_live_border}  differs=${v.live_differs_from_old}`);
  console.log(`  aria  : same_field=${v.marks_same_field} same_msg=${v.same_message} reached_server=${v.reached_server}`);
  console.log(`  a11y  : ${JSON.stringify(v.contrast)} meets3=${v.meets_3to1} overflow_x=${v.overflow_x}`);
}
console.log(`mobile_390: ${JSON.stringify(result.mobile_390)}`);
console.log(`shots: ${JSON.stringify(result.shots)} distinct=${result.shots_distinct}`);
console.log(`test_mode: ${JSON.stringify(result.test_mode)}`);
console.log(`console light=${result.live_light_console.length} dark=${result.live_dark_console.length}`);
console.log(`VERDICT ${result.verdict}`);
