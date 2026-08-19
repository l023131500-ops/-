// הטענה שנמדדת כאן אינה «איזה שדה נפסל» — זה כבר נסגר ב-309c995 ונפרס ב-3cff166.
// הטענה היא **שרואים אותו**: ל-aria-invalid לא היה בקובץ שום כלל CSS, ולכן מה
// שהעין ראתה על שדה שנפסל היה טבעת המיקוד הירוקה של input:focus — markInvalid
// ממקד את השדה מיד אחרי שהוא מסמן אותו — כלומר בדיוק מראה של שדה תקין שנוגעים
// בו, על שדה שנפסל. הסימן הגיע לקורא-מסך ולא לעין. זה נרשם כ-POLISH ב-3cff166
// ונאמר שם שהוא פעימה נפרדת עם מדידת ניגודיות משלה; זו הפעימה.
//
// שני שרתים סטטיים באותה ריצה, מול אותו endpoint חי ואותו מסד: 8148 מגיש את
// HEAD (3cff166) ו-8147 את עץ העבודה. ENDPOINT ב-index.html הוא כתובת מוחלטת,
// ולכן ההבדל היחיד בין שתי הריצות הוא index.html עצמו.
//
// ⚠️ שום פנייה אינה נוצרת כאן, ונאמר ולא הונח: שני הקודים שנמדדים דרך השרת
// (phone_invalid, situation_required_for_treatment) הם `return jsonb_build_object
// ('ok', false, …)` שיושבים ב-0058 **מעל** יצירת ה-contact ומעל יצירת ה-case,
// והמקרה השלישי (topic_no) נעצר בחסימה המוקדמת ואינו יוצא לרשת כלל. מצב טסט:
// אפס שורות, אפס הודעות יוצאות; הבקרה נכתבת ל-_measured.json (any_case_id).
//
// ⚠️ הצבעים אינם נקראים מתוך ה-CSS אלא מ-getComputedStyle על השדה שנמדד באמת,
// והניגודיות מחושבת מהם — אחרת מה שנמדד הוא מה שנכתב ולא מה שצויר. שתי הערכות
// נמדדות בשתי הסכמות (light/dark), מפני שלכל אחת יש --danger משלה.
import { writeFileSync, readFileSync, createReadStream, existsSync } from "node:fs";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = fileURLToPath(new URL(".", import.meta.url));
const WORK = join(here, "..", "..", "..", "apps", "37-bkalot-clone");
const HEAD = join(here, "head");

const PHONE = "0500000000";   // תבנית חוקית ל-0058, ומספר שאינו של אדם

const CASES = [
  // שדה טקסט, נתיב שרת
  { id: "phone_invalid", field: "phone", kind: "info",
    fill: { full_name: "בדיקת QA", phone: "123" }, server: true },
  // בורר, נתיב שרת — select הוא אלמנט אחר ולכן הכלל חייב לכלול אותו במפורש
  { id: "situation_required_for_treatment", field: "situation", kind: "treatment",
    fill: { full_name: "בדיקת QA", phone: PHONE, email: "qa@more30.com" }, server: true },
  // נתיב הלקוח — החסימה המוקדמת, שאינה יוצאת לרשת כלל
  { id: "preflight_topic_no", field: "topic_no", kind: "treatment",
    fill: { full_name: "בדיקת QA", phone: PHONE, email: "qa@more30.com" },
    situation: 1, topic_no: "1e3", server: false },
];

const TYPES = { ".html": "text/html; charset=utf-8" };
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

// ⚠️ שלושת הסימנים נקראים מאותו DOM ובאותה קריאה: מי מסומן, מי ממוקד, ומה
// נצבע עליו בפועל. הרקע שמאחורי השדה נקרא מהכרטיס העוטף ולא מונח, מפני שהוא
// הצד השני של חישוב הניגודיות.
const readState = (page, field) => page.evaluate((id) => {
  const el = document.getElementById(id);
  const cs = getComputedStyle(el);
  const card = el.closest(".card");
  return {
    invalid: [...document.querySelectorAll("[aria-invalid]")].map((e) => e.id || e.tagName),
    focused: document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : null,
    hidden: document.getElementById("result").hidden,
    lines: [...document.querySelectorAll("#result p")].map((p) => p.textContent),
    style: {
      border_color: cs.borderTopColor,
      border_width: cs.borderTopWidth,
      background: cs.backgroundColor,
      box_shadow: cs.boxShadow,
    },
    behind: getComputedStyle(card).backgroundColor,
    // גלישה אופקית — נמדדת ולא מונחת, מפני שרקע חדש על שדה יכול להרחיב אותו
    overflow_x: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  };
}, field);

// WCAG 1.4.11: גבול של רכיב ממשק מול הצבע שצמוד לו — הסף הוא 3:1.
const rgb = (s) => s.match(/[\d.]+/g).slice(0, 3).map(Number);
const lum = (c) => {
  const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((p, q) => q - p);
  return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100;
};

async function run(port, tag, scheme, shots) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: scheme });
  // playwright-blank-screenshot-until-resize — החלון משתנה פעם אחת לפני הכל.
  await page.setViewportSize({ width: 1280, height: 901 });
  const msgs = [];
  const bodies = [];
  page.on("console", (m) => msgs.push(`${m.type()}: ${m.text()}`));
  page.on("response", async (r) => {
    if (!r.url().includes("bkalot-clone-intake")) return;
    try { bodies.push({ status: r.status(), body: await r.json() }); } catch { /* לא JSON */ }
  });

  const fill = async (c) => {
    await page.goto(`http://127.0.0.1:${port}/index.html?cb=${Date.now()}`, { waitUntil: "load" });
    await page.check(`input[name="kind"][value="${c.kind}"]`);
    for (const [k, v] of Object.entries(c.fill)) await page.fill(`#${k}`, v);
    if (c.situation != null) await page.selectOption("#situation", { index: c.situation });
    if (c.topic_no != null) await page.fill("#topic_no", c.topic_no);
    const seen = bodies.length;
    await page.click("#submit");
    await page.waitForFunction(() => !document.getElementById("result").hidden, null, { timeout: 30000 });
    // ⚠️ ‏border-color ו-box-shadow על השדות עוברים transition של 180ms (הכלל
    // input{transition:border-color .18s, box-shadow .18s}), ו-background אינו
    // עובר אותו. קריאה מיידית תופסת מצב ביניים — הריצה הראשונה כאן החזירה רוחב
    // צל של 0.97px וגבול בצבע שאינו לא זה ולא זה, כלומר מדדה אנימציה ולא מצב.
    // ההמתנה היא עד שהערך מפסיק לזוז ולא זמן קבוע שהומצא.
    await page.waitForFunction((id) => {
      const el = document.getElementById(id);
      const now = getComputedStyle(el).borderTopColor + "|" + getComputedStyle(el).boxShadow;
      const stable = el.dataset.qaPrev === now;
      el.dataset.qaPrev = now;
      return stable;
    }, c.field, { timeout: 5000, polling: 250 });
    // ⚠️ ה-handler של response הוא async (await r.json()), ולכן הדחיפה למערך
    // עלולה להגיע אחרי הקריאה. הספירה נלקחת רק אחרי שהתשובה נקלטה.
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

  // ⚠️ הצילום אינו רק צילום: המצב נקרא שוב בכל רוחב שבו צולם, ולכן 390x844
  // נמדד ולא רק מצולם — זו שורה פתוחה מ-3cff166.
  const at = {};
  for (const [id, name] of Object.entries(shots || {})) {
    const c = CASES.find((x) => x.id === id);
    if (name.width) await page.setViewportSize({ width: name.width, height: name.height });
    await fill(c);
    const st = await readState(page, c.field);
    at[`${name.file}`] = {
      viewport: `${name.width}x${name.height}`, ...st,
      contrast: {
        border_vs_behind: contrast(st.style.border_color, st.behind),
        border_vs_fill: contrast(st.style.border_color, st.style.background),
      },
    };
    // ⚠️ הצילום מכוון אל השדה עצמו ולא אל תיבת התוצאה — מה שנטען כאן יושב על
    // השדה, ותיבת התוצאה כבר צולמה בפעימות קודמות.
    await page.locator(`#${c.field}`).scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(here, `${name.file}.png`) });
  }

  await browser.close();
  return { [tag]: out, [`${tag}_console`]: msgs, [`${tag}_server`]: bodies, [`${tag}_shots`]: at };
}

const a = await serve(HEAD, 8148);
const b = await serve(WORK, 8147);
const beforeLight = await run(8148, "before_light", "light", { phone_invalid: { file: "before-light-phone", width: 1280, height: 901 } });
const beforeDark  = await run(8148, "before_dark", "dark");
const afterLight  = await run(8147, "after_light", "light", { phone_invalid: { file: "after-light-phone", width: 1280, height: 901 } });
const afterDark   = await run(8147, "after_dark", "dark", {
  situation_required_for_treatment: { file: "after-dark-situation", width: 1280, height: 901 },
  preflight_topic_no: { file: "after-mobile-topic-390", width: 390, height: 844 },
});
a.close(); b.close();

const result = {
  step: "invalid-visible-0817",
  servers: {
    8148: { serves: "HEAD 3cff166", bytes: readFileSync(join(HEAD, "index.html")).length, md5: md5(join(HEAD, "index.html")) },
    8147: { serves: "עץ העבודה", bytes: readFileSync(join(WORK, "index.html")).length, md5: md5(join(WORK, "index.html")) },
  },
  ...beforeLight, ...beforeDark, ...afterLight, ...afterDark,
};

// הטענות נגזרות מהמדידה ואינן נכתבות ביד.
result.claims = {};
for (const scheme of ["light", "dark"]) {
  for (const c of CASES) {
    const bf = result[`before_${scheme}`][c.id], af = result[`after_${scheme}`][c.id];
    result.claims[`${c.id}__${scheme}`] = {
      field: c.field,
      // הסימן ל-aria לא זז: אותו שדה מסומן ואותו שדה ממוקד, לפני ואחרי
      marks_same_field: JSON.stringify(bf.invalid) === JSON.stringify(af.invalid) &&
                        bf.focused === af.focused && af.invalid.length === 1 && af.invalid[0] === c.field,
      same_message: JSON.stringify(bf.lines) === JSON.stringify(af.lines),
      // מה שהעין רואה — לפני מול אחרי
      before_border: bf.style.border_color, after_border: af.style.border_color,
      before_fill: bf.style.background, after_fill: af.style.background,
      before_shadow: bf.style.box_shadow, after_shadow: af.style.box_shadow,
      border_changed: bf.style.border_color !== af.style.border_color,
      fill_changed: bf.style.background !== af.style.background,
      shadow_changed: bf.style.box_shadow !== af.style.box_shadow,
      before_contrast: bf.contrast, after_contrast: af.contrast,
      // 1.4.11 — גבול רכיב ממשק מול שני הצבעים שצמודים לו
      after_meets_3to1: af.contrast.border_vs_behind >= 3 && af.contrast.border_vs_fill >= 3,
      overflow_x: af.overflow_x,
      reached_server: af.reached_server,
    };
  }
}
// מצב טסט: אף תשובה לא נשאה case_id, כלומר אף פנייה לא נוצרה.
const all = ["before_light", "before_dark", "after_light", "after_dark"].flatMap((t) => result[`${t}_server`]);
result.test_mode = {
  responses: all.length,
  any_ok: all.some((r) => r.body?.ok === true),
  any_case_id: all.some((r) => r.body?.case_id != null),
  codes: [...new Set(all.map((r) => r.body?.error))],
  statuses: [...new Set(all.map((r) => r.status))],
};
// ⚠️ הצילומים מומתים — screenshot-evidence-below-the-fold: שלושה מצבים שונים
// שנשמרים כשלושה קבצים זהים הם ראיה לכלום.
result.shots = {};
for (const f of ["before-light-phone", "after-light-phone", "after-dark-situation", "after-mobile-topic-390"]) {
  const p = join(here, `${f}.png`);
  result.shots[f] = { bytes: readFileSync(p).length, md5: md5(p) };
}
result.shots_distinct = new Set(Object.values(result.shots).map((s) => s.md5)).size === 4;
// 390x844 — נמדד ולא רק צולם.
const m = result.after_dark_shots["after-mobile-topic-390"];
result.mobile_390 = {
  viewport: m.viewport,
  invalid: m.invalid, focused: m.focused,
  border: m.style.border_color, fill: m.style.background,
  contrast: m.contrast, overflow_x: m.overflow_x,
};
writeFileSync(join(here, "_measured.json"), JSON.stringify(result, null, 2));

for (const [k, v] of Object.entries(result.claims)) {
  console.log(k);
  console.log(`  aria : marks_same_field=${v.marks_same_field} same_msg=${v.same_message} reached_server=${v.reached_server}`);
  console.log(`  before: border=${v.before_border} fill=${v.before_fill} shadow=${v.before_shadow}`);
  console.log(`  after : border=${v.after_border} fill=${v.after_fill} shadow=${v.after_shadow}`);
  console.log(`  contrast before=${JSON.stringify(v.before_contrast)} after=${JSON.stringify(v.after_contrast)} meets3=${v.after_meets_3to1} overflow_x=${v.overflow_x}`);
}
console.log(`mobile_390: ${JSON.stringify(result.mobile_390)}`);
console.log(`shots: ${JSON.stringify(result.shots)} distinct=${result.shots_distinct}`);
console.log(`test_mode: ${JSON.stringify(result.test_mode)}`);
for (const t of ["before_light", "before_dark", "after_light", "after_dark"]) {
  console.log(`console ${t}=${result[`${t}_console`].length}`);
}
