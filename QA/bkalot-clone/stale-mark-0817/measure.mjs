// הטענה שנמדדת כאן אינה «איזה שדה נפסל» ואינה «האם הוא נצבע» — שתיהן נסגרו
// ונפרסו (309c995/3cff166, 8ef394c/56bac47). הטענה היא **שהסימן יורד**: markInvalid
// מסירה סימון קודם לפני שהיא מסמנת, אבל יש נפילות שאין להן שדה כלל, ובהן היא
// אינה נקראת ואין מי שיסיר. אז הסימן של השליחה הקודמת נשאר עומד — ומאז שהכלל
// שב-8ef394c צובע את aria-invalid, השדה הקודם גם **אדום** ליד הודעה שאינה
// מדברת עליו. זו לא הערת נגישות: זה שדה תקין שהמסך מסמן כשגוי.
//
// שני שרתים סטטיים באותה ריצה, מול אותו endpoint חי ואותו מסד: 8148 מגיש את
// HEAD (56bac47 — head/index.html, 36,127 בייט, MD5 30B03F39, בדיוק הקובץ שיושב
// היום בייצור) ו-8147 את עץ העבודה עצמו מ-apps/37-bkalot-clone ולא עותק שלו.
// ENDPOINT ב-index.html הוא כתובת מוחלטת, ולכן ההבדל היחיד בין שתי הריצות הוא
// index.html.
//
// שלושה תרחישים, וכולם בשני שלבים — כי טענה על «הסימן הקודם» אי אפשר למדוד
// בשליחה אחת:
//   A  נפילה שנייה בלי שדה, מהשרת   — phone_invalid ואז body_too_large (413)
//   B  בקרה: נפילה שנייה **עם** שדה — phone_invalid ואז full_name_required
//   C  נפילה שנייה בלי שדה, מהלקוח  — phone_invalid ואז fail("network") מה-catch,
//      שיוצא ב-return לפני שהבדיקה על CODE_FIELD בכלל מגיעה
// B היא הבקרה שמכריעה שהתיקון לא שינה התנהגות היכן שיש שדה: שם הסימן חייב
// לעבור אל full_name בשתי הגרסאות, זהה.
//
// ⚠️ שום פנייה אינה נוצרת, ונמדד ולא הונח: phone_invalid ו-full_name_required הם
// `return` שיושבים ב-0080 מעל `insert into bkalot_auto.contacts` (שורות 99 ו-108
// מול 162); body_too_large חוזר מה-edge function בשורה 58, לפני ה-fetch אל ה-RPC
// בשורה 73; ו-C אינו יוצא לרשת כלל. כל גוף תשובה שנקלט נכתב לקובץ, ו-any_ok /
// any_case_id הן הבקרה.
//
// ⚠️ הצבע נקרא מ-getComputedStyle על השדה עצמו ולא מתוך ה-CSS, וההמתנה היא עד
// שהערך מפסיק לזוז ולא זמן קבוע — computed-style-measures-a-transition.
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = fileURLToPath(new URL(".", import.meta.url));
const WORK = join(here, "..", "..", "..", "apps", "37-bkalot-clone");
const HEAD = join(here, "head");

const out = (s) => process.stdout.write(s + "\n");

function serve(dir, port) {
  const srv = createServer((req, res) => {
    const p = join(dir, "index.html");
    if (!existsSync(p)) { res.writeHead(404).end("no"); return; }
    const buf = readFileSync(p);
    res.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",   // gannenet-dev-served-by-stale-sw
    });
    res.end(buf);
  });
  return new Promise((ok) => srv.listen(port, "127.0.0.1", () => ok(srv)));
}

function md5(p) { return createHash("md5").update(readFileSync(p)).digest("hex").toUpperCase().slice(0, 8); }

const PHONE_BAD  = "123";           // נופל על ^0[0-9]{8,9}$ ב-0080
const PHONE_GOOD = "0500000000";    // תבנית חוקית, ומספר שאינו של אדם
const BIG_NOTE   = "x".repeat(20000);  // > MAX_BODY (16*1024) של ה-edge function

// מה נמדד על הדף אחרי כל שלב. הקריאה היא של המצב שהמסך באמת מציג.
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

// ההמתנה היא עד שהצבע מפסיק לזוז (transition .18s), ולא זמן שהומצא.
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

// שליחה, והמתנה עד שהמסך באמת התחלף — לא זמן קצוב
async function submitAndWait(page, prevText) {
  await page.click("#submit");
  await page.waitForFunction((prev) => {
    const r = document.getElementById("result");
    const b = document.getElementById("submit");
    if (b.disabled) return false;
    if (r.hidden) return false;
    return r.textContent.trim().replace(/\s+/g, " ") !== prev;
  }, prevText, { timeout: 20000 });
  await settle(page);
}

async function run(port, label, shot) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ colorScheme: "light", viewport: { width: 1280, height: 901 } });
  const bodies = [];
  const errors = [];
  const rows = {};

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

    await page.goto(`http://127.0.0.1:${port}/?cb=${label}-${scenario}`, { waitUntil: "load" });
    await page.setViewportSize({ width: 1280, height: 901 });  // playwright-blank-screenshot-until-resize

    // ── שלב 1: זהה בשלושת התרחישים — phone_invalid מהשרת
    await page.fill("#full_name", "בדיקת QA");
    await page.fill("#phone", PHONE_BAD);
    await submitAndWait(page, "");
    const step1 = await snap(page);

    // ── שלב 2: הטלפון מתוקן, והנפילה הבאה היא של משהו אחר
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

    if (shot && scenario === "A") {
      await page.locator("#phone").scrollIntoViewIfNeeded();
      await page.screenshot({ path: join(here, shot), fullPage: false });
    }
    await page.close();
  }

  await browser.close();
  return { rows, bodies, errors };
}

const srvHead = await serve(HEAD, 8148);
const srvWork = await serve(WORK, 8147);

const before = await run(8148, "head", "before-stale-phone-red.png");
const after  = await run(8147, "work", "after-no-stale-mark.png");

srvHead.close(); srvWork.close();

// ── ההכרעה ────────────────────────────────────────────────────────────────────
const checks = [];
const add = (name, pass, detail) => checks.push({ name, pass, detail });

// שלב 1 חייב להיות זהה בשתי הגרסאות — אחרת מה שנמדד בשלב 2 אינו על אותו בסיס
for (const s of ["A", "B", "C"]) {
  add(`step1_same_${s}`,
      JSON.stringify(before.rows[s].step1.marked) === JSON.stringify(after.rows[s].step1.marked) &&
      before.rows[s].step1.marked.join() === "phone",
      `${before.rows[s].step1.marked} | ${after.rows[s].step1.marked}`);
  add(`step1_phone_red_${s}`,
      before.rows[s].step1.phone_border === after.rows[s].step1.phone_border &&
      before.rows[s].step1.phone_border !== "rgb(15, 95, 76)",
      before.rows[s].step1.phone_border);
}

// A ו-C: הבאג. לפני — הטלפון עדיין מסומן ואדום; אחרי — אף שדה אינו מסומן.
for (const s of ["A", "C"]) {
  add(`bug_present_before_${s}`, before.rows[s].step2.marked.join() === "phone",
      `marked=${before.rows[s].step2.marked} border=${before.rows[s].step2.phone_border}`);
  add(`bug_gone_after_${s}`, after.rows[s].step2.marked.length === 0,
      `marked=${after.rows[s].step2.marked}`);
  add(`stale_field_was_valid_${s}`, before.rows[s].step2.phone_value === PHONE_GOOD,
      before.rows[s].step2.phone_value);
  add(`after_phone_not_red_${s}`,
      after.rows[s].step2.phone_border !== before.rows[s].step2.phone_border,
      `${before.rows[s].step2.phone_border} -> ${after.rows[s].step2.phone_border}`);
  add(`message_same_${s}`, before.rows[s].step2.result_text === after.rows[s].step2.result_text,
      before.rows[s].step2.result_text);
}

// B: הבקרה. היכן שיש שדה — שום דבר לא זז.
add("control_B_before", before.rows.B.step2.marked.join() === "full_name", `${before.rows.B.step2.marked}`);
add("control_B_after",  after.rows.B.step2.marked.join()  === "full_name", `${after.rows.B.step2.marked}`);
add("control_B_focus_same", before.rows.B.step2.focused === after.rows.B.step2.focused,
    `${before.rows.B.step2.focused} | ${after.rows.B.step2.focused}`);
add("control_B_message_same", before.rows.B.step2.result_text === after.rows.B.step2.result_text,
    before.rows.B.step2.result_text);

// מצב טסט — נמדד, לא מוצהר
const allBodies = [...before.bodies, ...after.bodies];
add("any_ok_false", !allBodies.some((b) => b.body && b.body.ok === true), `${allBodies.length} responses`);
add("any_case_id_false", !allBodies.some((b) => b.body && b.body.case_id != null), "no case_id in any body");
add("codes_expected",
    allBodies.every((b) => ["phone_invalid", "full_name_required", "body_too_large"].includes(b.body && b.body.error)),
    [...new Set(allBodies.map((b) => `${b.status}:${b.body && b.body.error}`))].join(" "));
// ⚠️ הקונסולה **אינה** ריקה כאן, וזה נמדד ולא נבלע: A מפילה 413 ו-C מבטלת את
// הבקשה, והדפדפן רושם על כל אחת שורת רשת משלו. אלה התרחישים עצמם ולא תקלה, ולכן
// הבדיקה אינה «אפס הודעות» אלא שלוש טענות: אין אף pageerror (חריג JS שלא נתפס),
// כל שורה שנרשמה היא אחת משתי שורות הרשת המושרות, והרשימה זהה מילה במילה בשתי
// הגרסאות — התיקון לא הוסיף ולא הסתיר ולו שורה אחת.
const INDUCED = [/status of 413 \(Payload Too Large\)/, /net::ERR_FAILED/];
const induced = (e) => INDUCED.some((r) => r.test(e));
add("no_uncaught_js", ![...before.errors, ...after.errors].some((e) => e.includes("pageerror")),
    [...before.errors, ...after.errors].filter((e) => e.includes("pageerror")).join(" | ") || "none");
add("console_only_induced", [...before.errors, ...after.errors].every(induced),
    [...before.errors, ...after.errors].filter((e) => !induced(e)).join(" | ") || "all induced");
add("console_same", JSON.stringify(before.errors) === JSON.stringify(after.errors),
    `${before.errors.length} | ${after.errors.length}`);

const fails = checks.filter((c) => !c.pass);
const results = {
  head_file: { path: "head/index.html", md5: md5(join(HEAD, "index.html")) },
  work_file: { path: "apps/37-bkalot-clone/index.html", md5: md5(join(WORK, "index.html")) },
  before: before.rows, after: after.rows,
  bodies: allBodies,
  checks,
  verdict: fails.length === 0 ? "PASS" : "FAIL",
  fails: fails.length,
};
writeFileSync(join(here, "_measured.json"), JSON.stringify(results, null, 2));

for (const c of checks) out(`${c.pass ? "PASS" : "FAIL"}  ${c.name}  ${c.detail}`);
out(`--- ${results.verdict}  checks=${checks.length}  fails=${fails.length}`);
out(`head md5=${results.head_file.md5}  work md5=${results.work_file.md5}`);
