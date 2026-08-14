// דפדפן אמיתי, 1280x900, שתי גרסאות באותה ריצה מול אותו edge חי ואותו מסד:
// 8154 = הגרסה שבייצור (git show HEAD, אחרי 5e867c7), 8155 = הקובץ המתוקן.
//
// מה שקונה את הפעימה כאן אינו הניסוח — הוא כבר עברי ומדויק מאז 1bd2ff5 — אלא
// *מי* אמר אותו ו*מתי*: בייצור «999999999999» יוצא ברשת, ממתין ל-0080, וחוזר;
// במתוקן הוא נעצר במסך, אפס בקשות. לכן המדד המכריע הוא intake_requests, ולא
// טקסט השורה. השורה נמדדת גם היא, כדי שהמעבר לא ישנה ניסוח בשקט.
//
// «2147483647» היא הבקרה שקונה את הכיוון השני: זה הערך הגדול ביותר ש-0080
// עדיין מקבלת (התנאי שם הוא `> 2147483647` ב-numeric), ולכן חסימה מוקדמת
// שנוסחה ב-`>=` או שנשענת על מספר צף לא מדויק הייתה עוצרת פנייה תקינה. היא
// חייבת לצאת ברשת ולהיקלט.
//
// «1-5» מוכיח שהחסימה המוקדמת הקודמת לא זזה.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

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
  await $("full_name").fill("בדיקת גבול מספר נושא");
  await $("phone").fill("050-1234567");
  await $("email").fill("test@more30.com");
  await $("situation").selectOption("single_parent");
  await $("topic_no").click();
  if (topic) await $("topic_no").pressSequentially(topic, { delay: 30 });  // הקשות מקלדת, לא השמה ל-value
  await $("consent").check();
}

async function run(port, topic, id) {
  intakeCalls = [];
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "load" });
  await fillForm(topic);

  // האימות הילידי אינו חוסם — זו הסיבה שערך כזה מגיע לשליחה בכלל.
  const native = await page.evaluate(() => {
    const t = document.getElementById("topic_no");
    return {
      value: t.value,
      badInput: t.validity.badInput,
      field_checkValidity: t.checkValidity(),
      form_checkValidity: document.getElementById("intake").checkValidity(),
    };
  });

  const t0 = Number(process.hrtime.bigint() / 1000000n);
  await $("submit").click();
  await page.waitForSelector("#result:not([hidden])", { timeout: 20000 });
  const ms_to_answer = Number(process.hrtime.bigint() / 1000000n) - t0;
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
  const shot = join(HERE, `${id}.png`);
  await page.screenshot({ path: shot });

  out.measurements.push({
    id, server: port, topic_no_typed: topic === "" ? "(לא הוקלד כלום)" : topic,
    native_before_submit: native,
    intake_requests: intakeCalls.length,
    request_left_the_page: intakeCalls.length > 0,
    ms_to_answer,
    ...after,
    result_top_px: box && Math.round(box.y),
    field_top_px: fieldBox && Math.round(fieldBox.y),
    screenshot: `${id}.png`,
    screenshot_md5: createHash("md5").update(readFileSync(shot)).digest("hex").toUpperCase(),
  });
}

await run(8154, "999999999999", "01-prev-goes-to-the-server");
await run(8155, "999999999999", "02-fixed-stopped-in-the-screen");
await run(8155, "2147483647",   "03-fixed-control-boundary-accepted");
await run(8155, "1-5",          "04-fixed-control-preflight-unchanged");

await browser.close();
writeFileSync(join(HERE, "measure-out.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
