// credit-destination.mjs — §7: לאן שורת הקרדיט מובילה, ולא רק איפה היא יושבת.
//
// credit-placement.mjs שואל "האם הקרדיט בתחתית העמוד" ועונה 26/26.
// brand-audit.mjs שואל "האם הקרדיט קיים ב-DOM" ועונה 25/25. שתיהן עוברות
// גם כשהקישור מוביל למקום הלא נכון, כי אף אחת מהן אינה קוראת את ה-href.
//
// §7 מנסח יעד ולא רק נוכחות: "קישור בפוטר: 'פותח ע״י עולם הסטארטאפים'
// **שמוביל לאתר התדמית שלנו**". שני עמודים ציבוריים נושאים את השם:
// more30.com/ הוא קטלוג המערכות, ו-more30.com/showcase הוא אתר התדמית —
// ה-title, ה-h1 והפוטר שלו הם "עולם הסטארטאפים" (core.issues #117).
//
// שלוש טענות:
//   1. בכל הרכבה חיה, ה-href של הקרדיט הוא בדיוק אתר התדמית.
//   2. אתר התדמית עצמו אינו ריק — אין טעם לכוון 26 אתרים לעמוד ריק.
//   3. בדף הבית ובאתר התדמית עצמו אין קרדיט: "פותח ע״י" שמוביל לעצמו
//      אינו אמירה.
//
// Usage:  node credit-destination.mjs [routeKey ...]

import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'node:fs';
import { settle } from './lib/settle.mjs';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const ORIGIN = 'https://more30.com';
const BRAND = ORIGIN + '/showcase';
const ONLY = process.argv.slice(2);

// אותן 26 הרכבות ש-credit-placement.mjs מודד, כדי ששתי הבדיקות יאמרו
// משהו על אותה קבוצה בדיוק.
const ROUTES = [
  ['kesef', '/kesef'], ['kiosk', '/kiosk/'],
  ['torah', '/torah'], ['tamlul', '/tamlul'], ['modaot', '/modaot'],
  ['imud', '/imud'], ['briut', '/briut'], ['bkalot', '/bkalot'], ['smel', '/smel'],
  ['smachot', '/smachot'], ['egod', '/egod'], ['chatzor', '/chatzor'], ['chatzor-app', '/chatzor/'],
  ['chizukim', '/chizukim'], ['chizukim-app', '/chizukim/'], ['orech', '/orech'],
  ['mthbram', '/mthbram'], ['zchuyot', '/zchuyot'], ['galil', '/galil'], ['studio', '/studio'],
  ['mechiron', '/mechiron'], ['kupot', '/kupot'], ['crm', '/crm'], ['gesher', '/gesher'],
  ['nadlan', '/nadlan'], ['tivuch', '/tivuch'],
];

// ה-href נקרא מהמאפיין ולא מהתכונה, כדי שכתובת יחסית תיפתר מול העמוד
// ותיראה כאן כמו שהדפדפן באמת ילך אליה.
const READ = () => {
  const a = document.querySelector('.more30-credit');
  if (!a) return null;
  return { href: a.href, text: (a.textContent || '').trim() };
};

const BRAND_PROBE = () => ({
  h1: (document.querySelector('h1')?.textContent || '').trim(),
  // הכרטיסים ב-/showcase הם קישורים אל הרכבות; סופרים אותם ולא <article>,
  // כי המבנה של העמוד יכול להשתנות והקישור הוא מה שהופך אותו לשימושי.
  cards: document.querySelectorAll('a[href*="more30.com/"], main a[href^="/"]').length,
  credit: !!document.querySelector('.more30-credit'),
});

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const ctxOpts = { viewport: { width: 1280, height: 900 }, locale: 'he-IL' };
const results = [];
let pass = 0, fail = 0;

const ok = (label, good, detail) => {
  console.log(`  ${good ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
  good ? pass++ : fail++;
  results.push({ label, ok: good, detail: detail ?? null });
};

console.log('=== §7 · the footer credit leads to the brand site ===');
console.log(`    brand site: ${BRAND}\n`);

// ── 2 ו-3 קודם: אם אתר התדמית ריק, אין טעם למדוד 26 קישורים אליו.
{
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  await page.goto(BRAND, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await settle(page, { minChars: 40 });
  const b = await page.evaluate(BRAND_PROBE);
  ok('the brand site names the brand', b.h1.includes('עולם הסטארטאפים'), `h1="${b.h1}"`);
  ok('the brand site is not empty', b.cards > 0, `${b.cards} links`);
  ok('the brand site carries no credit to itself', !b.credit);
  await ctx.close();
}
{
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  await page.goto(ORIGIN + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await settle(page, { minChars: 40 });
  ok('the home page carries no credit to itself', !(await page.evaluate(READ)));
  await ctx.close();
}

console.log('');
const targets = ONLY.length ? ROUTES.filter(([k]) => ONLY.includes(k)) : ROUTES;
let bad = 0;

for (const [key, p] of targets) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  let line, good = false;
  try {
    await page.goto(ORIGIN + p, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await settle(page, { minChars: 40 });
    const c = await page.evaluate(READ);
    if (!c) line = 'NO CREDIT';
    else if (c.href.replace(/\/$/, '') !== BRAND) line = `points at ${c.href}`;
    else if (!c.text.includes('עולם הסטארטאפים')) line = `wrong text "${c.text}"`;
    else { good = true; line = `→ ${c.href}`; }
  } catch (e) {
    line = `ERR ${String(e.message).slice(0, 50)}`;
  }
  if (!good) bad++;
  results.push({ route: key, path: p, ok: good, line });
  console.log(`  ${good ? 'PASS' : 'FAIL'}  ${key.padEnd(13)} ${line}`);
  await ctx.close();
}

pass += targets.length - bad;
fail += bad;
console.log(`\n${targets.length - bad}/${targets.length} mounts link the credit to the brand site`);
console.log(`${pass} passed · ${fail} failed`);
await browser.close();

// הפלט נשמר רק כשמודדים את כל הקבוצה — קובץ תוצאות שנכתב מריצה חלקית
// נראה אחר כך כמו סקר מלא.
if (!ONLY.length) {
  const dir = 'C:\\Users\\USER\\Downloads\\more30\\QA\\platform\\credit-destination-0809';
  mkdirSync(dir, { recursive: true });
  writeFileSync(dir + '\\_results.json', JSON.stringify({
    brand: BRAND, mounts: targets.length, linked: targets.length - bad, pass, fail, results,
  }, null, 2), 'utf8');
  console.log(`\nwrote ${dir}\\_results.json`);
}

if (fail) process.exitCode = 1;
