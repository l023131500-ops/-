// דפדפן אמיתי, 1280x900, שתי גרסאות באותה ריצה מול אותו edge חי ואותו מסד:
// 8152 = הגרסה שבייצור (git show HEAD), 8153 = הקובץ המתוקן.
//
// מה שקונה את הפעימה כאן אינו טקסט על המסך אלא בקשה שלא יצאה, ומולה בקשה
// שכן יצאה ולא אמרה כלום: כל בקשה אל ENDPOINT נספרת ב-page.on("request").
//
// שתי בקרות ולא אחת. "7" מוכיח שהחסימה אינה נדבקת לערך תקין; שדה שלא הוקלד
// בו כלום מוכיח שהיא אינה חוסמת שדה רשות ריק — זה בדיוק ההבדל ש-badInput
// אמור להבחין בו, ובלי הבקרה הזו התיקון היה יכול לסגור פנייה תקינה.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ENDPOINT = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-intake";
const out = { measurements: [], console_messages: [] };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("console", (m) => out.console_messages.push(m.type() + ": " + m.text()));

let intakeCalls = [];
page.on("request", (r) => { if (r.url() === ENDPOINT) intakeCalls.push(r.method()); });

const $ = (id) => page.locator("#" + id);

async function fillForm(topic) {
  await page.locator('input[name="kind"][value="treatment"]').check();
  await $("full_name").fill("בדיקת קלט לא-מספרי");
  await $("phone").fill("050-1234567");
  await $("email").fill("test@more30.com");
  await $("situation").selectOption("single_parent");
  await $("topic_no").click();
  if (topic) await $("topic_no").pressSequentially(topic, { delay: 40 });  // הקשות מקלדת, לא השמה ל-value
  await $("consent").check();
}

async function run(port, topic, id) {
  intakeCalls = [];
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "load" });
  await fillForm(topic);

  // הסימן שכל הפעימה נשענת עליו, נמדד לפני השליחה: מה שהוקלד עומד על המסך
  // ו-value ריק. אילו value היה מחזיק את הטקסט, זה היה הנתיב של ac6e523 ולא
  // נתיב חדש.
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
  await page.waitForSelector("#result:not([hidden])", { timeout: 15000 });
  await page.waitForTimeout(600);

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
    id, server: port, topic_no_typed: topic === "" ? "(לא הוקלד כלום)" : topic,
    native_before_submit: native,
    intake_requests: intakeCalls.length,
    request_left_the_page: intakeCalls.length > 0,
    ...after,
    result_top_px: box && Math.round(box.y),
    field_top_px: fieldBox && Math.round(fieldBox.y),
    screenshot: `${id}.png`,
  });
}

// «1-5» ולא «אבג»: probe-badinput.mjs מדד שאותיות (עבריות ולטיניות כאחת)
// אינן נכנסות ל-type=number בכלל — value ריק ו-badInput false, כלומר שדה ריק
// באמת ולא קלט שלא נקלט, ואין שם תקלה. ההקלדות שכן מגיעות לנתיב הן e - . +
// 1e 1- 1.2.3 --, ו-«1-5» היא הטבעית שבהן: מי שמבקש טווח נושאים.
await run(8152, "1-5", "01-prev-nonnumeric-vanished-silently");
await run(8153, "1-5", "02-fixed-nonnumeric-blocked");
await run(8153, "",    "03-fixed-control-empty-optional");
await run(8153, "7",   "04-fixed-control-7");

await browser.close();
writeFileSync(join(HERE, "measure-out.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
