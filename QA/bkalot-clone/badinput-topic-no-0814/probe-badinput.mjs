// לפני שקובעים מהי ההקלדה שמייצרת את הנתיב, מודדים אילו הקלשות באמת מגיעות
// אליו. הניחוש הראשון ("אבג") נפל: Chromium אינו מכניס אותיות עבריות לשדה
// type=number כלל, ולכן value ריק ו-badInput false — שדה ריק באמת ולא קלט
// שלא נקלט. הבדיקה כאן מודדת מועמדים ואינה מניחה.
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<input id="t" type="number" min="1" step="1">');

const rows = [];
for (const s of ["אבג", "abc", "e", "-", ".", "1e", "1-", "1.2.3", "--", "+", "1e3"]) {
  const r = await page.evaluate(async (str) => {
    const t = document.getElementById("t");
    t.value = ""; t.focus();
    return { str };
  }, s);
  await page.locator("#t").fill("");
  await page.locator("#t").click();
  await page.locator("#t").pressSequentially(s, { delay: 20 });
  const m = await page.evaluate(() => {
    const t = document.getElementById("t");
    return { value: t.value, badInput: t.validity.badInput, valid: t.checkValidity() };
  });
  rows.push({ typed: r.str, ...m });
}
await browser.close();
console.log(JSON.stringify(rows, null, 2));
