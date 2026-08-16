// measure-live.mjs — אותם שישה מקרים של which-field-0817, והפעם מהכתובת החיה
// ולא משרת סטטי מקומי. 39 הסימנים של probe-live מודדים מה נפרס; זה מודד מה
// המסך עושה בייצור.
//
// ⚠️ שום פנייה אינה נוצרת כאן, ונאמר ולא הונח: כל חמשת הקודים נבדקים ב-0058/0080
// **לפני** ה-insert הראשון — הם `return jsonb_build_object('ok', false, …)`
// שיושבים מעל יצירת ה-contact ומעל יצירת ה-case. הבקרה היא ש-body.case_id אינו
// מוגדר באף אחת מהתשובות, והיא נכתבת ל-_measured-live.json.
//
// ⚠️ ה-endpoint ב-index.html הוא כתובת מוחלטת לפרויקט Supabase החי — כלומר גם
// המדידה שקדמה לפריסה וגם זו פנו לאותו מסד בדיוק, וההבדל היחיד הוא הקובץ.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = fileURLToPath(new URL(".", import.meta.url));
const LIVE = "https://more30.com/bkalot-studio/";
const stamp = process.argv[2] || String(process.hrtime.bigint());

const PHONE = "0500000000";   // תבנית חוקית ל-0058, ומספר שאינו של אדם

const CASES = [
  { code: "full_name_required",               kind: "info",      fill: {} },
  { code: "phone_invalid",                    kind: "info",      fill: { full_name: "בדיקת QA", phone: "123" } },
  { code: "email_invalid",                    kind: "info",      fill: { full_name: "בדיקת QA", phone: PHONE, email: "abc" } },
  { code: "email_required_for_treatment",     kind: "treatment", fill: { full_name: "בדיקת QA", phone: PHONE } },
  { code: "situation_required_for_treatment", kind: "treatment", fill: { full_name: "בדיקת QA", phone: PHONE, email: "qa@more30.com" } },
  { code: "topic_no_invalid",                 kind: "treatment", fill: { full_name: "בדיקת QA", phone: PHONE, email: "qa@more30.com" }, situation: 1, topic_no: "1e3" },
];

const EXPECT = {
  full_name_required: "full_name",
  phone_invalid: "phone",
  email_invalid: "email",
  email_required_for_treatment: "email",
  situation_required_for_treatment: "situation",
  topic_no_invalid: "topic_no",
};

// ⚠️ שלושת הסימנים נקראים מאותו DOM ובאותה קריאה: מי מסומן, מי ממוקד, ומה
// המסך אומר. בלי activeElement אפשר לטעון רק «יש תכונה», ולא שהמבקר הוגש אל
// השדה. ובנוסף — האם השדה נראה בכלל, כי סימון על שדה ב-fieldset מוסתר הוא
// בדיוק מה שהתנאי offsetParent נועד למנוע.
const readState = (page) => page.evaluate(() => ({
  invalid: [...document.querySelectorAll("[aria-invalid]")].map((e) => e.id || e.tagName),
  invalid_visible: [...document.querySelectorAll("[aria-invalid]")].map((e) => e.offsetParent !== null),
  focused: document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : null,
  title: document.querySelector("#result h2")?.textContent ?? null,
  lines: [...document.querySelectorAll("#result p")].map((p) => p.textContent),
  hidden: document.getElementById("result").hidden,
}));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
// playwright-blank-screenshot-until-resize — החלון משתנה פעם אחת לפני הכל.
await page.setViewportSize({ width: 1280, height: 901 });

const msgs = [], bodies = [];
page.on("console", (m) => msgs.push(`${m.type()}: ${m.text()}`));
page.on("pageerror", (e) => msgs.push(`pageerror: ${e.message}`));
page.on("response", async (r) => {
  if (!r.url().includes("bkalot-clone-intake")) return;
  try { bodies.push({ status: r.status(), body: await r.json() }); } catch { /* לא JSON */ }
});

// gannenet-dev-served-by-stale-sw — cachebust על כל טעינה.
const load = async () => page.goto(`${LIVE}?cachebust=${stamp}`, { waitUntil: "load" });

const live = {};
for (const c of CASES) {
  await load();
  await page.check(`input[name="kind"][value="${c.kind}"]`);
  for (const [k, v] of Object.entries(c.fill)) await page.fill(`#${k}`, v);
  if (c.situation != null) await page.selectOption("#situation", { index: c.situation });
  if (c.topic_no != null) await page.fill("#topic_no", c.topic_no);
  const seen = bodies.length;
  await page.click("#submit");
  await page.waitForFunction(() => !document.getElementById("result").hidden, null, { timeout: 30000 });
  live[c.code] = { ...(await readState(page)), reached_server: bodies.length > seen };
}

// ⚠️ הצילום מכוון אל השדה המסומן ולא אל תיבת התוצאה — screenshot-evidence-
// below-the-fold: התיבה כבר צולמה בפעימות קודמות, ומה שנטען כאן יושב על השדה.
const SHOTS = {
  phone_invalid: "live-phone-marked",
  situation_required_for_treatment: "live-situation-marked",
  topic_no_invalid: "live-topic-no-control",
};
for (const [code, name] of Object.entries(SHOTS)) {
  const c = CASES.find((x) => x.code === code);
  await load();
  await page.check(`input[name="kind"][value="${c.kind}"]`);
  for (const [k, v] of Object.entries(c.fill)) await page.fill(`#${k}`, v);
  if (c.situation != null) await page.selectOption("#situation", { index: c.situation });
  if (c.topic_no != null) await page.fill("#topic_no", c.topic_no);
  await page.click("#submit");
  await page.waitForFunction(() => !document.getElementById("result").hidden, null, { timeout: 30000 });
  await page.evaluate(() => document.querySelector("[aria-invalid]")?.scrollIntoView({ block: "center" }));
  await page.screenshot({ path: join(here, `${name}.png`), fullPage: false });
}

const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
await browser.close();

const result = { step: "which-field-deploy-0817", url: LIVE, live, console: msgs, server: bodies, overflow_px: overflow };

result.claims = {};
for (const c of CASES) {
  const s = live[c.code];
  result.claims[c.code] = {
    field: EXPECT[c.code],
    invalid: s.invalid, focused: s.focused, invalid_visible: s.invalid_visible,
    marks_the_field: s.invalid.length === 1 && s.invalid[0] === EXPECT[c.code],
    focuses_the_field: s.focused === EXPECT[c.code],
    only_visible_marked: s.invalid_visible.every(Boolean),
  };
}
// מצב טסט: אף תשובה לא נשאה case_id, כלומר אף פנייה לא נוצרה.
result.test_mode = {
  responses: bodies.length,
  any_ok: bodies.some((r) => r.body?.ok === true),
  any_case_id: bodies.some((r) => r.body?.case_id != null),
  codes: [...new Set(bodies.map((r) => r.body?.error))],
};
writeFileSync(join(here, "_measured-live.json"), JSON.stringify(result, null, 2));

for (const c of CASES) {
  const k = result.claims[c.code];
  console.log(`${c.code}  →  ${k.field}`);
  console.log(`  invalid=${JSON.stringify(k.invalid)} visible=${JSON.stringify(k.invalid_visible)} focused=${k.focused}`);
  console.log(`  marks=${k.marks_the_field} focuses=${k.focuses_the_field}`);
  console.log(`  says : ${JSON.stringify(live[c.code].lines)}`);
}
console.log(`test_mode: ${JSON.stringify(result.test_mode)}`);
console.log(`console=${msgs.length} overflow_px=${overflow}`);
