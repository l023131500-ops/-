// דפדפן אמיתי, 1280x900, על הכתובת החיה more30.com/bkalot-studio — לא על שרת
// סטטי מקומי. זה כל ההבדל בין הפעימה הזו ל-1bd2ff5: שם נמדד הקוד, כאן המוצר,
// דרך ה-rewrite של vercel.json ומעל 236 הבייטים ש-NetFree מזריק.
//
// שלוש זרימות, ואף אחת מהן אינה כותבת שורה אלא אחת: «999999999999» נפסל
// ב-0080 לפני ה-insert, «1-5» אינו יוצא מהדפדפן כלל, ורק «7» יוצר פנייה —
// והיא נמחקת בסוף.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const LIVE = "https://more30.com/bkalot-studio/";
const ENDPOINT = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-intake";
const out = { url: LIVE, measurements: [], console_messages: [] };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("console", (m) => out.console_messages.push(m.type() + ": " + m.text()));

let intakeCalls = [];
let intakeBodies = [];
page.on("request", (r) => { if (r.url() === ENDPOINT) intakeCalls.push(r.method()); });
page.on("response", async (r) => {
  if (r.url() !== ENDPOINT) return;
  try { intakeBodies.push({ status: r.status(), body: await r.text() }); } catch { /* לא נקרא */ }
});

const $ = (id) => page.locator("#" + id);

async function fillForm(topic, name) {
  await page.locator('input[name="kind"][value="treatment"]').check();
  await $("full_name").fill(name);
  await $("phone").fill("050-1234567");
  // email הוא required. אילו נשאר ריק, אפס הבקשות היה יכול להיות אימות ילידי
  // ולא ה-preflight — המלכודת שנתפסה ב-69ed468.
  await $("email").fill("test@more30.com");
  await $("situation").selectOption("single_parent");
  await $("topic_no").click();
  if (topic) await $("topic_no").pressSequentially(topic, { delay: 30 });  // הקשות מקלדת, לא השמה ל-value
  await $("consent").check();
}

async function run(topic, id, name) {
  intakeCalls = [];
  intakeBodies = [];
  await page.goto(LIVE, { waitUntil: "load" });
  // צילום ריק מ-DOM בריא — ההתקלות שנרשמה ב-playwright-blank-screenshot;
  // שינוי גודל אחד לפני הצילום מונע אותה.
  await page.setViewportSize({ width: 1280, height: 901 });
  await page.setViewportSize({ width: 1280, height: 900 });
  await fillForm(topic, name);

  // נמדד לפני השליחה: מה שהוקלד עומד ב-value, והאימות הילידי אינו חוסם —
  // זו הסיבה שהערך מגיע לשרת בכלל.
  const native = await page.evaluate(() => {
    const t = document.getElementById("topic_no");
    return {
      value: t.value,
      badInput: t.validity.badInput,
      field_checkValidity: t.checkValidity(),
      form_checkValidity: document.getElementById("intake").checkValidity(),
      form_has_novalidate: document.getElementById("intake").hasAttribute("novalidate"),
    };
  });

  await $("submit").click();
  await page.waitForSelector("#result:not([hidden])", { timeout: 20000 });
  await page.waitForTimeout(800);

  const after = await page.evaluate(() => {
    const r = document.getElementById("result");
    const t = document.getElementById("topic_no");
    return {
      title: r.querySelector("h2")?.textContent ?? null,
      result_class: r.className,
      lines: [...r.querySelectorAll("p")].map((p) => p.textContent),
      case_row: [...r.querySelectorAll("dt")].map((d, i) =>
        d.textContent + "=" + r.querySelectorAll("dd")[i].textContent),
      focused_id: document.activeElement?.id ?? "",
      focused_tag: document.activeElement?.tagName ?? "",
      topic_value: t.value,
      topic_aria_invalid: t.getAttribute("aria-invalid"),
      aria_invalid_count: document.querySelectorAll("[aria-invalid]").length,
      kind: document.getElementById("intake").elements.kind.value,
      full_name: document.getElementById("full_name").value,
      phone: document.getElementById("phone").value,
      situation: document.getElementById("situation").value,
      consent: document.getElementById("consent").checked,
    };
  });

  const el = page.locator("#result");
  await el.scrollIntoViewIfNeeded();
  const box = await el.boundingBox();
  const fieldBox = await $("topic_no").boundingBox();
  await page.screenshot({ path: join(HERE, `${id}.png`) });

  out.measurements.push({
    id, topic_no_typed: topic === "" ? "(לא הוקלד כלום)" : topic,
    native_before_submit: native,
    intake_requests: intakeCalls.length,
    request_left_the_page: intakeCalls.length > 0,
    server_responses: intakeBodies,
    ...after,
    result_top_px: box && Math.round(box.y),
    field_top_px: fieldBox && Math.round(fieldBox.y),
    screenshot: `${id}.png`,
  });
}

await run("999999999999", "01-live-topic-no-invalid", "בדיקת מספר נושא גדול בייצור");
await run("1-5",          "02-live-control-preflight", "בקרת חסימה מוקדמת בייצור");
await run("7",            "03-live-control-7",         "בקרת מסלול תקין בייצור");

await browser.close();
writeFileSync(join(HERE, "measure-out.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
