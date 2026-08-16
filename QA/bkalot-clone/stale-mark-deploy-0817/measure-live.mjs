// measure-live.mjs — אותם שלושה תרחישים של stale-mark-0817, אבל לא מול שרת
// סטטי מקומי: מול https://more30.com/bkalot-studio/ עצמה, אחרי הפריסה.
//
// ⚠️ למה בכלל למדוד שוב מה שכבר נמדד: ‏_verify.mjs מכריע שה-HTML שהכתובת החיה
// מגישה הוא הקובץ שבמקור — 29 סימנים, שתי כתובות. הוא אינו יכול להכריע
// ש**ההתנהגות** שהקובץ הזה מייצר בייצור היא זו שנמדדה מקומית: ה-CSS מגיע
// מאותו קובץ אבל auth-button.js אינו, וה-endpoint נקרא כאן מ-origin אחר
// (more30.com ולא 127.0.0.1) ולכן גם ה-CORS הוא אחר. שתי אלה יכולות להפיל את
// המסלול בייצור בלי שאף סימן טקסטואלי יזוז.
//
//   A  נפילה שנייה בלי שדה, מהשרת   — phone_invalid ואז body_too_large (413)
//   B  בקרה: נפילה שנייה **עם** שדה — phone_invalid ואז full_name_required
//   C  נפילה שנייה בלי שדה, מהלקוח  — phone_invalid ואז fail("network") מה-catch
//
// ⚠️ הטענה הנמדדת היא של אחרי בלבד, ולכן היא נכתבת כערך מוחלט ולא כהפרש:
// ב-A וב-C ‏marked חייב לצאת **ריק** והטלפון חייב להיות בצבע הגבול הרגיל, ולא
// «שונה מקודם». «לפני» כאן הוא live-before.json — הספירה clear=0/other=1
// שנמדדה מאותה כתובת דקות קודם, ושהיא בדיוק ה-dist שנמדד ב-56bac47.
//
// ⚠️ שום פנייה אינה נוצרת, ונמדד ולא הונח: phone_invalid ו-full_name_required
// הם `return` שב-0080 מעל ה-insert, body_too_large חוזר לפני ה-fetch אל ה-RPC,
// ו-C אינו יוצא לרשת כלל. כל גוף תשובה נכתב לקובץ ו-any_ok/any_case_id הן
// הבקרה.
//
// ⚠️ הצבע נקרא מ-getComputedStyle על השדה עצמו וההמתנה היא עד שהערך מפסיק לזוז
// ולא זמן קבוע — computed-style-measures-a-transition.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = fileURLToPath(new URL(".", import.meta.url));
const BASE = "https://more30.com/bkalot-studio/";
const out = (s) => process.stdout.write(s + "\n");

const PHONE_BAD  = "123";
const PHONE_GOOD = "0500000000";
const BIG_NOTE   = "x".repeat(20000);

async function snap(page) {
  return await page.evaluate(() => {
    const form = document.getElementById("intake");
    const marked = [...form.querySelectorAll('[aria-invalid="true"]')].map((e) => e.id);
    const phone = document.getElementById("phone");
    const cs = getComputedStyle(phone);
    const result = document.getElementById("result");
    return {
      marked,
      focused: document.activeElement ? document.activeElement.id : null,
      result_hidden: result.hidden,
      result_text: result.textContent.trim().replace(/\s+/g, " "),
      phone_value: phone.value,
      phone_border: cs.borderTopColor,
      phone_bg: cs.backgroundColor,
    };
  });
}

async function settle(page) {
  await page.evaluate(() => new Promise((ok) => {
    const el = document.getElementById("phone");
    let last = null, still = 0;
    const tick = () => {
      const now = getComputedStyle(el).borderTopColor;
      still = now === last ? still + 1 : 0;
      last = now;
      if (still >= 5) return ok();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }));
}

async function submitAndWait(page, prevText) {
  await page.click("#submit");
  await page.waitForFunction((prev) => {
    const r = document.getElementById("result");
    const b = document.getElementById("submit");
    if (b.disabled) return false;
    if (r.hidden) return false;
    return r.textContent.trim().replace(/\s+/g, " ") !== prev;
  }, prevText, { timeout: 30000 });
  await settle(page);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ colorScheme: "light", viewport: { width: 1280, height: 901 } });
const bodies = [], errors = [], rows = {}, docs = {};

for (const scenario of ["A", "B", "C"]) {
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error") errors.push(`${scenario}:${m.text()}`); });
  page.on("pageerror", (e) => errors.push(`${scenario}:pageerror:${e.message}`));
  page.on("response", async (r) => {
    if (!r.url().includes("bkalot-clone-intake")) return;
    let body = null;
    try { body = await r.json(); } catch { body = "<not-json>"; }
    bodies.push({ scenario, status: r.status(), body });
  });

  // cachebust — no-git-deploy-via-vercel-cli: שניות אחרי פריסה הכתובת החיה
  // עדיין מגישה לדפדפן את ה-HTML הקודם.
  const resp = await page.goto(`${BASE}?cachebust=0817stale-${scenario}`, { waitUntil: "load" });
  docs[scenario] = { status: resp.status(), url: resp.url() };
  await page.setViewportSize({ width: 1280, height: 901 });  // playwright-blank-screenshot-until-resize

  // ⚠️ הבקרה שהדפדפן קיבל את הגרסה החדשה ולא עותק שמור: clearInvalid חייבת
  // להיות מוגדרת בדף שנטען. בלעדיה כל מה שנמדד למטה הוא של הקובץ הקודם.
  const hasFix = await page.evaluate(() => document.documentElement.innerHTML.includes("function clearInvalid()"));
  docs[scenario].has_fix = hasFix;

  await page.fill("#full_name", "בדיקת QA");
  await page.fill("#phone", PHONE_BAD);
  await submitAndWait(page, "");
  const step1 = await snap(page);

  await page.fill("#phone", PHONE_GOOD);
  if (scenario === "A") {
    await page.fill("#note", BIG_NOTE);
  } else if (scenario === "B") {
    await page.fill("#full_name", "");
  } else {
    await page.route("**/functions/v1/bkalot-clone-intake", (route) => route.abort());
  }
  await submitAndWait(page, step1.result_text);
  const step2 = await snap(page);

  rows[scenario] = { step1, step2 };

  if (scenario === "A" || scenario === "B") {
    await page.locator("#phone").scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(here, `live-${scenario}-step2.png`), fullPage: false });
  }
  await page.close();
}

await browser.close();

const checks = [];
const add = (name, pass, detail) => checks.push({ name, pass, detail });

for (const s of ["A", "B", "C"]) {
  add(`live_200_${s}`, docs[s].status === 200, `${docs[s].status}`);
  add(`browser_got_fix_${s}`, docs[s].has_fix === true, `clearInvalid in DOM: ${docs[s].has_fix}`);
  // הבסיס: שלב 1 חייב לסמן את הטלפון ולצבוע אותו באדום, אחרת שלב 2 אינו מודד דבר
  add(`step1_marks_phone_${s}`, rows[s].step1.marked.join() === "phone", `${rows[s].step1.marked}`);
  add(`step1_phone_red_${s}`, rows[s].step1.phone_border === "rgb(155, 28, 28)", rows[s].step1.phone_border);
}

// A ו-C: הטענה עצמה, כערך מוחלט. הסימן ירד, והשדה חזר לגבול הרגיל --line.
for (const s of ["A", "C"]) {
  add(`no_stale_mark_${s}`, rows[s].step2.marked.length === 0, `marked=${JSON.stringify(rows[s].step2.marked)}`);
  add(`phone_not_red_${s}`, rows[s].step2.phone_border === "rgb(220, 218, 209)", rows[s].step2.phone_border);
  add(`field_was_valid_${s}`, rows[s].step2.phone_value === PHONE_GOOD, rows[s].step2.phone_value);
  add(`message_shown_${s}`, rows[s].step2.result_hidden === false && rows[s].step2.result_text.length > 0,
      rows[s].step2.result_text);
}

// B: הבקרה — היכן שיש שדה, הסימן עובר אליו ושום דבר לא נשבר.
add("control_B_marks_full_name", rows.B.step2.marked.join() === "full_name", `${rows.B.step2.marked}`);
add("control_B_focus_full_name", rows.B.step2.focused === "full_name", `${rows.B.step2.focused}`);
add("control_B_phone_not_red", rows.B.step2.phone_border === "rgb(220, 218, 209)", rows.B.step2.phone_border);

// מצב טסט — נמדד, לא מוצהר
add("any_ok_false", !bodies.some((b) => b.body && b.body.ok === true), `${bodies.length} responses`);
add("any_case_id_false", !bodies.some((b) => b.body && b.body.case_id != null), "no case_id in any body");
add("codes_expected",
    bodies.every((b) => ["phone_invalid", "full_name_required", "body_too_large"].includes(b.body && b.body.error)),
    [...new Set(bodies.map((b) => `${b.status}:${b.body && b.body.error}`))].join(" "));

// ⚠️ הקונסולה אינה ריקה, וזה נמדד ולא נבלע: A מפילה 413 ו-C מבטלת בקשה.
const INDUCED = [/status of 413 \(Payload Too Large\)/, /net::ERR_FAILED/];
const induced = (e) => INDUCED.some((r) => r.test(e));
add("no_uncaught_js", !errors.some((e) => e.includes("pageerror")),
    errors.filter((e) => e.includes("pageerror")).join(" | ") || "none");
add("console_only_induced", errors.every(induced),
    errors.filter((e) => !induced(e)).join(" | ") || "all induced");

const fails = checks.filter((c) => !c.pass);
const results = { base: BASE, docs, rows, bodies, errors, checks,
  verdict: fails.length === 0 ? "PASS" : "FAIL", fails: fails.length };
writeFileSync(join(here, "_measured-live.json"), JSON.stringify(results, null, 2));

for (const c of checks) out(`${c.pass ? "PASS" : "FAIL"}  ${c.name}  ${c.detail}`);
out(`--- ${results.verdict}  checks=${checks.length}  fails=${fails.length}`);
