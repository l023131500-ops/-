// zchuyot-flow.mjs — האם המערכת עצמה עדיין עובדת אחרי סבב העיצוב.
//
// DESIGN_STANDARD סוגר את הצד הנמדד; MORE30_MASTER_BUILD §2.2 שואל שאלה אחרת —
// האם הפעולה המרכזית זמינה ונכונה. במערכת 22 הפעולה המרכזית היא **הסוכן
// שעונה על מאגר הזכויות**, ולכן כאן נשאלת שאלה אמיתית ונמדדת התשובה.
//
// ⚠️ צילום ‎fullPage‎ בעמוד הזה משקר אם לא גוללים קודם: כל המקטעים מונפשים
// ב-‎whileInView‎ ומתחילים ב-‎opacity: 0‎. בלי גלילה, החצי התחתון של הצילום
// יוצא לבן — וזה בדיוק מה שקרה בצילומי הסבב הקודם.
//
// צילומים: QA/zchuyot/.

import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { settle } from './lib/settle.mjs';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const OUT = 'C:\\Users\\USER\\Downloads\\more30\\QA\\zchuyot';
const URL = 'https://more30.com/zchuyot';
const QUESTION = 'אני שכיר עם שלושה ילדים ואחוזי נכות. מה מגיע לי?';

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: EXE, headless: true });
const results = {};

// גלילה איטית עד הסוף וחזרה, כדי ש-IntersectionObserver יפעיל כל מקטע.
const revealAll = async (page) => {
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.8);
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 220));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 600));
  });
};

for (const mode of ['light', 'dark', 'mobile']) {
  const ctx = await browser.newContext({
    viewport: mode === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    locale: 'he-IL',
    colorScheme: mode === 'dark' ? 'dark' : 'light',
    isMobile: mode === 'mobile', hasTouch: mode === 'mobile',
    deviceScaleFactor: mode === 'mobile' ? 2 : 1,
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 160)));
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));

  const rec = { mode, errors: errs };
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await settle(page, { minChars: 50 }).catch(() => {});
  // ⚠️ ה-hero קשור לגלילה (‎opacity‎ יורדת ל-0 עד 400px). צילום ‎fullPage‎
  // גולל בעצמו, ולכן הכותרת יוצאת דהויה בו. הצילום שמעיד על ה-hero חייב
  // להילקח לפני כל גלילה ובלי fullPage.
  await page.screenshot({ path: path.join(OUT, `00-hero-${mode}.png`), fullPage: false });
  await revealAll(page);
  await page.screenshot({ path: path.join(OUT, `01-home-${mode}.png`), fullPage: true });

  rec.bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  rec.dark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  rec.textLen = await page.evaluate(() => (document.body.innerText || '').length);
  rec.overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

  // כפתור הכניסה המשותף מול פקדי הנווט — הבדיקה שתפסה את ההסתרה
  rec.navClearance = await page.evaluate(() => {
    const host = document.querySelector('more30-auth');
    const pill = host?.shadowRoot?.querySelector('.pill');
    if (!pill) return 'auth pill not found';
    const p = pill.getBoundingClientRect();
    const ctrl = [...document.querySelectorAll('nav a, nav button')]
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width && r.top < 80)
      .sort((a, b) => a.left - b.left)[0];
    if (!ctrl) return 'no nav control';
    const gap = Math.round(ctrl.left - p.right);
    return { pill: `${Math.round(p.left)}..${Math.round(p.right)}`, nearestControlLeft: Math.round(ctrl.left), gapPx: gap };
  });

  // הפעולה המרכזית: שאלה אמיתית לסוכן
  const launcher = page.locator('button:has-text("יש לכם משהו שמעניין אותכם")').first();
  if (await launcher.count()) {
    await launcher.click();
    await page.waitForTimeout(1200);
    const input = page.locator('input[placeholder], textarea').last();
    await input.fill(QUESTION);
    await page.keyboard.press('Enter');
    // ⚠️ ההמתנה הזו נשארת קבועה במכוון, ואינה מהסוג ש-settle() מתקן.
    // settle() מזהה "העמוד הפסיק להשתנות" — וסוכן שחושב לפני שהוא מתחיל
    // לכתוב משאיר את הפאנל דומם בדיוק כך. שלוש דגימות יציבות בתוך ההמתנה
    // לתשובה ייקראו כתשובה ריקה. 20 שניות הן תקציב זמן-תגובה של המודל,
    // לא ניחוש של זמן רינדור.
    await page.waitForTimeout(20000);
    rec.agentReply = await page.evaluate(() => {
      const panel = document.querySelector('.fixed.bottom-6.right-6');
      const t = panel ? panel.innerText : '';
      return { len: t.length, tail: t.slice(-260) };
    });
    await page.screenshot({ path: path.join(OUT, `02-agent-${mode}.png`), fullPage: false });
  } else {
    rec.agentReply = 'launcher not found';
  }

  results[mode] = rec;
  console.log(
    `${mode}: bg ${rec.bodyBg} · dark ${rec.dark} · text ${rec.textLen} · overflow ${rec.overflow} · ` +
    `nav ${JSON.stringify(rec.navClearance)} · agent ${JSON.stringify(rec.agentReply?.len ?? rec.agentReply)} · errors ${errs.length}`
  );
  await ctx.close();
}

fs.writeFileSync(path.join(OUT, '_flow.json'), JSON.stringify(results, null, 2), 'utf8');
await browser.close();
