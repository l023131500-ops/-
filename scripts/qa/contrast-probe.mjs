// contrast-probe.mjs — name the text that fails the contrast threshold.
//
// Lighthouse says "colors do not have a sufficient contrast ratio" and stops
// there. DESIGN_STANDARD §2 sets the thresholds (4.5:1 body, 3:1 for text
// >= 24px or bold >= 18.66px), so this reports the actual ratio per element
// and which threshold it missed — enough to fix a variable instead of guessing.
//
// ⚠️ Lighthouse scores on the mobile profile, so a page can pass at 1440 and
// still fail its audit — a nav that collapses at 390 renders different
// elements. Check both widths before calling a contrast failure resolved.
//
// Usage:  node contrast-probe.mjs <url> [width] [light|dark]

import { chromium } from 'playwright-core';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const url = process.argv[2];
const width = Number(process.argv[3] || 1440);
const scheme = process.argv[4] === 'dark' ? 'dark' : 'light';
if (!url) { console.error('usage: node contrast-probe.mjs <url> [width] [light|dark]'); process.exit(1); }

const mobile = width <= 500;
const browser = await chromium.launch({ executablePath: EXE, headless: true });
const ctx = await browser.newContext({
  viewport: { width, height: mobile ? 844 : 1000 },
  locale: 'he-IL', colorScheme: scheme,
  isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1,
});
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(3500);

const bad = await page.evaluate(() => {
  const rgb = (s) => {
    const m = String(s).match(/-?[\d.]+/g);
    if (!m) return null;
    const [r, g, b, a] = m.map(Number);
    return { r, g, b, a: a === undefined ? 1 : a };
  };
  const lum = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  // The colour actually painted behind an element.
  //
  // ⚠️ Walking up to the first *opaque* ancestor is wrong, and it hid a real
  // failure: a status badge painted with a translucent tint over a light card
  // reads as the card's colour, when what the eye sees is the two blended.
  // Lighthouse blends; so does this now. Collect every layer from the element
  // up to the first opaque one, then composite them back down in paint order.
  const backdrop = (el) => {
    const layers = [];
    let base = { r: 255, g: 255, b: 255, a: 1 };
    for (let n = el; n; n = n.parentElement) {
      const c = rgb(getComputedStyle(n).backgroundColor);
      if (!c || c.a === 0) continue;
      if (c.a === 1) { base = c; break; }
      layers.push(c);
    }
    // nearest layer is painted last, so composite from the far end inward
    let out = base;
    for (let i = layers.length - 1; i >= 0; i--) {
      const t = layers[i];
      out = {
        r: t.r * t.a + out.r * (1 - t.a),
        g: t.g * t.a + out.g * (1 - t.a),
        b: t.b * t.a + out.b * (1 - t.a),
        a: 1,
      };
    }
    return { r: Math.round(out.r), g: Math.round(out.g), b: Math.round(out.b), a: 1 };
  };

  const out = [];
  for (const el of document.querySelectorAll('*')) {
    const t = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(' ');
    if (!t) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || s.opacity === '0') continue;
    // WCAG 1.4.3 מחריג במפורש "טקסט שהוא חלק מפקד ממשק **שאינו פעיל**"
    // (Incidental), ו-axe מיישם את זה. בלי ההחרגה הזו הבודק דורש מכפתור
    // מושבת להיראות פעיל — כלומר דורש לשבור את הסימן היחיד שאומר שאי אפשר
    // ללחוץ עליו. נתפס ב-26 סטודיו, שם שלושה כפתורי "(בקרוב)" נספרו ככשל
    // בעוד ש-Lighthouse נתן 100.
    if (el.closest('[disabled], [aria-disabled="true"], fieldset[disabled]')) continue;
    let fg = rgb(s.color);
    if (!fg) continue;
    // ⚠️ ‎opacity‎ ברמת האלמנט אינה מופיעה ב-‎color‎ המחושב: הוא נשאר
    // ‎rgb(255,255,255)‎ גם כשהאלמנט מצויר ב-80%. כך עבר בשקט מונה שנמדד
    // ב-axe כ-3.68:1. הוא נספר עכשיו כשקיפות לכל דבר, מצטבר על ההורים.
    //
    // 🪤 ומיד נדרשה כאן הסתייגות: עמוד עם ‎whileInView‎ מחזיק מקטעים שלמים
    // ב-‎opacity: 0‎ עד שגוללים אליהם, ובלי הסף למטה כל 22 ‎/zchuyot‎ חזרה
    // פתאום כ-"1:1" — כלומר הבודק דיווח על טקסט שכלל אינו מצויר כרגע.
    // אלמנט שאינו נראה אינו נמדד; אלמנט דהוי-אך-נראה כן.
    let opacity = 1;
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const o = parseFloat(getComputedStyle(n).opacity);
      if (!Number.isNaN(o) && o < 1) opacity *= o;
    }
    if (opacity < 0.05) continue;
    if (opacity < 1) fg = { ...fg, a: fg.a * opacity };
    // ⚠️ טקסט שקוף-חלקית **נדלג** כאן קודם, ולכן הבדיקה עברה בשקט על שש
    // כיתוביות ב-‎text-background/40‎ בכותרת התחתונה של 22 — 3.47:1, ו-axe
    // שמאחורי Lighthouse כן תפס אותן. שקיפות בטקסט אינה סיבה לא למדוד: היא
    // בדיוק מה שמוריד את הניגודיות. הצבע ממוזג אל הרקע שכבר חושב.
    if (fg.a < 1) {
      const b = backdrop(el);
      fg = {
        r: Math.round(fg.r * fg.a + b.r * (1 - fg.a)),
        g: Math.round(fg.g * fg.a + b.g * (1 - fg.a)),
        b: Math.round(fg.b * fg.a + b.b * (1 - fg.a)),
        a: 1,
      };
    }
    const size = parseFloat(s.fontSize);
    const weight = Number(s.fontWeight) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3 : 4.5;
    const got = ratio(fg, backdrop(el));
    if (got < need) {
      out.push({
        text: t.slice(0, 42), tag: el.tagName.toLowerCase(),
        cls: (el.className || '').toString().slice(0, 34),
        color: s.color, bg: `rgb(${Object.values(backdrop(el)).slice(0, 3).join(', ')})`,
        size: Math.round(size), weight, need, got: +got.toFixed(2),
      });
    }
  }
  return out;
});

if (!bad.length) console.log('no contrast failures');
for (const b of bad) {
  console.log(`${b.got}:1 (needs ${b.need}) — ${b.tag}.${b.cls} ${b.size}px/${b.weight} ${b.color} on ${b.bg}\n   "${b.text}"`);
}

await browser.close();
