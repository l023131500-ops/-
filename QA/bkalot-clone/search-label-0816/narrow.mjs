// תווית ארוכה יותר היא שינוי בפריסה ולא רק בטקסט, ולכן היא נמדדת ולא מונחת:
// שורת הסינון היא flex, והתיבה שגדלה דוחקת את ארבע התיבות שלצדה. 1280 כבר נמדד
// (label_top_px 154 בשתי הגרסאות, כלומר שום דבר לא נדחף למטה); כאן נמדדים שני
// רוחבים צרים — טאבלט ונייד — ובשתי הגרסאות, כדי שההפרש יהיה של התווית ולא של
// המסך. מה שנמדד: גובה הטופס, מספר השורות שאליהן נשברה התווית עצמה, והאם
// התיבה או התווית גולשות מעבר לרוחב החלון.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const EMAIL = "label0816@more30.test";
const PASS = "Label0816!pass";
const DIR = new URL("./", import.meta.url);
const out = [];

const browser = await chromium.launch();

for (const [w, h, tag] of [[900, 900, "900"], [390, 844, "390"]]) {
  for (const [port, label, prefix] of [[8138, "before_head", "03-before"], [8137, "after_worktree", "04-after"]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.setViewportSize({ width: w, height: h + 1 });
    await page.setViewportSize({ width: w, height: h });
    await page.goto(`http://127.0.0.1:${port}/admin.html`, { waitUntil: "networkidle" });
    await page.fill("#email", EMAIL);
    await page.fill("#password", PASS);
    await page.click("#login-submit");
    await page.waitForSelector("#screen-list:not([hidden])", { timeout: 20000 });
    await page.waitForFunction(
      () => !document.getElementById("count").textContent.includes("טוען"), null, { timeout: 20000 });
    const m = await page.evaluate((vw) => {
      const lab = document.querySelector('label[for="f-q"]');
      const inp = document.getElementById("f-q");
      const form = document.getElementById("filters");
      const lr = lab.getBoundingClientRect(), ir = inp.getBoundingClientRect(), fr = form.getBoundingClientRect();
      const lineH = parseFloat(getComputedStyle(lab).lineHeight) || 16;
      return {
        form_height: Math.round(fr.height),
        label_lines: Math.round(lr.height / lineH),
        label_overflows: lr.left < -0.5 || lr.right > vw + 0.5,
        input_overflows: ir.left < -0.5 || ir.right > vw + 0.5,
        doc_scroll_w: document.documentElement.scrollWidth,
      };
    }, w);
    const shot = `${prefix}-${tag}.png`;
    await page.screenshot({ path: fileURLToPath(new URL(shot, DIR)), fullPage: false });
    out.push({ viewport: `${w}x${h}`, port, label, ...m, shot });
    console.log(`${w} ${label}`, JSON.stringify(m));
    await page.close();
  }
}

await browser.close();
writeFileSync(new URL("./narrow.json", DIR), JSON.stringify(out, null, 2), "utf8");
console.log("written");
