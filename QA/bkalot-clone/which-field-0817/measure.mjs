// הטענה שנמדדת כאן אינה «ההודעה נכונה» — היא כבר הייתה נכונה. הטענה היא
// **היכן**: כשהשרת פוסל פנייה על שדה מסוים, האם השדה הזה מסומן aria-invalid
// ומקבל את המיקוד, או שהמסך אומר מה לא בסדר ומשאיר את המבקר לחפש בעצמו בטופס
// בן שלושה fieldset-ים.
//
// שני שרתים סטטיים באותה ריצה, מול אותו endpoint חי ואותו מסד: 8148 מגיש את
// HEAD (93ad034) ו-8147 את עץ העבודה. ENDPOINT ב-index.html הוא כתובת מוחלטת,
// ולכן ההבדל היחיד בין שתי הריצות הוא index.html עצמו.
//
// ⚠️ שום פנייה אינה נוצרת כאן, ונאמר ולא הונח: כל חמשת הקודים שנמדדים נבדקים
// ב-0058/0080 **לפני** ה-insert הראשון — הם `return jsonb_build_object('ok',
// false, …)` שיושבים מעל יצירת ה-contact ומעל יצירת ה-case. מצב טסט נשמר:
// אפס שורות, אפס הודעות יוצאות. הבקרה על כך היא ש-body.case_id אינו מוגדר
// באף אחת מהתשובות, והיא נכתבת ל-_measured.json.
//
// חמישה מקרים ולא אחד, וכל אחד מהם קוד אחר של 0058:
//   full_name_required · phone_invalid · email_invalid ·
//   email_required_for_treatment · situation_required_for_treatment
// ובנוסף בקרה: topic_no_invalid — הקוד היחיד שכבר סימן שדה ב-HEAD. אם הוא
// משתנה בין הריצות, הפעימה שברה מה שכבר עבד.
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
  { code: "full_name_required",               kind: "info",      fill: {} },
  { code: "phone_invalid",                    kind: "info",      fill: { full_name: "בדיקת QA", phone: "123" } },
  { code: "email_invalid",                    kind: "info",      fill: { full_name: "בדיקת QA", phone: PHONE, email: "abc" } },
  { code: "email_required_for_treatment",     kind: "treatment", fill: { full_name: "בדיקת QA", phone: PHONE } },
  { code: "situation_required_for_treatment", kind: "treatment", fill: { full_name: "בדיקת QA", phone: PHONE, email: "qa@more30.com" } },
  { code: "topic_no_invalid",                 kind: "treatment", fill: { full_name: "בדיקת QA", phone: PHONE, email: "qa@more30.com" }, situation: 1, topic_no: "1e3" },
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
// המסך אומר. בלי activeElement אפשר לטעון רק «יש תכונה», ולא שהמבקר באמת הוגש
// אל השדה.
const readState = (page) => page.evaluate(() => ({
  invalid: [...document.querySelectorAll("[aria-invalid]")].map((e) => e.id || e.tagName),
  focused: document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : null,
  title: document.querySelector("#result h2")?.textContent ?? null,
  lines: [...document.querySelectorAll("#result p")].map((p) => p.textContent),
  hidden: document.getElementById("result").hidden,
}));

async function run(port, tag, shots) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  // playwright-blank-screenshot-until-resize — החלון משתנה פעם אחת לפני הכל.
  await page.setViewportSize({ width: 1280, height: 901 });
  const msgs = [];
  // ⚠️ מפתח רץ ולא ה-URL: כל הקריאות הולכות לאותה כתובת בדיוק, ומפה לפי URL
  // הייתה משאירה תשובה אחת ומוחקת את השאר — כלומר בדיוק הראיה שמצב טסט נשמר.
  const bodies = [];
  page.on("console", (m) => msgs.push(`${m.type()}: ${m.text()}`));
  page.on("response", async (r) => {
    if (!r.url().includes("bkalot-clone-intake")) return;
    try { bodies.push({ status: r.status(), body: await r.json() }); } catch { /* לא JSON */ }
  });

  const out = {};
  for (const c of CASES) {
    await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: "load" });
    await page.check(`input[name="kind"][value="${c.kind}"]`);
    for (const [k, v] of Object.entries(c.fill)) await page.fill(`#${k}`, v);
    if (c.situation != null) await page.selectOption("#situation", { index: c.situation });
    if (c.topic_no != null) await page.fill("#topic_no", c.topic_no);
    const seen = bodies.length;
    await page.click("#submit");
    await page.waitForFunction(() => !document.getElementById("result").hidden, null, { timeout: 30000 });
    out[c.code] = { ...(await readState(page)), reached_server: bodies.length > seen };
  }
  if (shots) {
    // ⚠️ לא צילום של כל המקרים: מה שנטען כאן הוא הסימון על השדה, ולכן הצילום
    // מכוון אל השדה עצמו ולא אל תיבת התוצאה שכבר צולמה בפעימות קודמות.
    for (const [code, name] of Object.entries(shots)) {
      const c = CASES.find((x) => x.code === code);
      await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: "load" });
      await page.check(`input[name="kind"][value="${c.kind}"]`);
      for (const [k, v] of Object.entries(c.fill)) await page.fill(`#${k}`, v);
      if (c.situation != null) await page.selectOption("#situation", { index: c.situation });
      await page.click("#submit");
      await page.waitForFunction(() => !document.getElementById("result").hidden, null, { timeout: 30000 });
      await page.screenshot({ path: join(here, `${name}.png`), fullPage: true });
    }
  }
  await browser.close();
  return { [tag]: out, [`${tag}_console`]: msgs, [`${tag}_server`]: bodies };
}

const a = await serve(HEAD, 8148);
const b = await serve(WORK, 8147);
const before = await run(8148, "before");
const after = await run(8147, "after", {
  phone_invalid: "after-phone-marked",
  situation_required_for_treatment: "after-situation-marked",
});
a.close(); b.close();

const result = {
  step: "which-field-0817",
  servers: {
    8148: { serves: "HEAD 93ad034", bytes: readFileSync(join(HEAD, "index.html")).length, md5: md5(join(HEAD, "index.html")) },
    8147: { serves: "עץ העבודה", bytes: readFileSync(join(WORK, "index.html")).length, md5: md5(join(WORK, "index.html")) },
  },
  ...before, ...after,
};

// הטענות נגזרות כאן מהמדידה ואינן נכתבות ביד.
const EXPECT = {
  full_name_required: "full_name",
  phone_invalid: "phone",
  email_invalid: "email",
  email_required_for_treatment: "email",
  situation_required_for_treatment: "situation",
  topic_no_invalid: "topic_no",
};
result.claims = {};
for (const c of CASES) {
  const bf = result.before[c.code], af = result.after[c.code];
  result.claims[c.code] = {
    field: EXPECT[c.code],
    before_invalid: bf.invalid, before_focused: bf.focused,
    after_invalid: af.invalid, after_focused: af.focused,
    after_marks_the_field: af.invalid.length === 1 && af.invalid[0] === EXPECT[c.code],
    after_focuses_the_field: af.focused === EXPECT[c.code],
    same_message: JSON.stringify(bf.lines) === JSON.stringify(af.lines),
  };
}
// מצב טסט: אף תשובה לא נשאה case_id, כלומר אף פנייה לא נוצרה.
const all = [...result.before_server, ...result.after_server];
result.test_mode = {
  responses: all.length,
  any_ok: all.some((r) => r.body?.ok === true),
  any_case_id: all.some((r) => r.body?.case_id != null),
  codes: [...new Set(all.map((r) => r.body?.error))],
};
writeFileSync(join(here, "_measured.json"), JSON.stringify(result, null, 2));

for (const c of CASES) {
  const k = result.claims[c.code];
  console.log(c.code);
  console.log(`  before: invalid=${JSON.stringify(k.before_invalid)} focused=${k.before_focused}`);
  console.log(`  after : invalid=${JSON.stringify(k.after_invalid)} focused=${k.after_focused}  marks=${k.after_marks_the_field} focuses=${k.after_focuses_the_field} same_msg=${k.same_message}`);
  console.log(`  says  : ${JSON.stringify(result.after[c.code].lines)}`);
}
console.log(`test_mode: ${JSON.stringify(result.test_mode)}`);
console.log(`console before=${result.before_console.length} after=${result.after_console.length}`);
