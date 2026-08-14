// דפדפן אמיתי, 1280x900, שתי גרסאות באותה ריצה מול אותו edge חי ואותו מסד:
// 8150 = הגרסה שבייצור (git show HEAD), 8151 = הקובץ המתוקן.
//
// מה שקונה את הפעימה כאן אינו טקסט על המסך אלא בקשה שלא יצאה: כל בקשה אל
// ENDPOINT נספרת ב-page.on("request"), ולכן «נעצר לפני השליחה» נמדד ולא מוצהר.
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
  await $("full_name").fill("בדיקת חסימה מוקדמת");
  await $("phone").fill("050-1234567");
  await $("email").fill("test@more30.com");
  await $("situation").selectOption("single_parent");
  await $("topic_no").click();
  await $("topic_no").pressSequentially(topic, { delay: 40 });   // הקשות מקלדת, לא השמה ל-value
  await $("consent").check();
}

async function shoot(name, anchor) {
  const el = page.locator(anchor);
  await el.scrollIntoViewIfNeeded();
  const box = await el.boundingBox();
  await page.screenshot({ path: join(HERE, name) });
  return box;
}

async function run(port, topic, id) {
  intakeCalls = [];
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "load" });
  await fillForm(topic);

  const native = await page.evaluate(() => ({
    field: document.getElementById("topic_no").checkValidity(),
    form: document.getElementById("intake").checkValidity(),
    value: document.getElementById("topic_no").value,
  }));

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

  const box = await shoot(`${id}.png`, "#result");
  const fieldBox = await $("topic_no").boundingBox();
  out.measurements.push({
    id, server: port, topic_no_typed: topic,
    native_checkValidity: native, value_in_field_before_submit: native.value,
    intake_requests: intakeCalls.length,
    request_left_the_page: intakeCalls.length > 0,
    ...after,
    result_top_px: box && Math.round(box.y),
    field_top_px: fieldBox && Math.round(fieldBox.y),
    screenshot: `${id}.png`,
  });
}

await run(8150, "1e3", "01-prev-1e3-sent-and-lost");
await run(8151, "1e3", "02-fixed-1e3-blocked");
await run(8151, "7",   "03-fixed-control-7");

await browser.close();
writeFileSync(join(HERE, "measure-out.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
