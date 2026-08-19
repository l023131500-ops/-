// core.issues #82 — platform-audit's dark-by-design branch asks for two things at
// once (a background darker than 0.06 luminance AND "dark" inside the *computed*
// color-scheme), so when it answers "none" you cannot tell which half failed.
// This reads the two halves separately, on whatever origin you point it at, so a
// fix can be proved on the built artifact before it reaches production.
//
// Usage: node scripts/qa/color-scheme-probe.mjs <url> [<url> ...]
import { chromium } from 'playwright';

const urls = process.argv.slice(2);
if (!urls.length) {
  console.error('usage: node scripts/qa/color-scheme-probe.mjs <url> [<url> ...]');
  process.exit(2);
}

const PROBE = () => {
  const de = document.documentElement;
  const bg = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const c = getComputedStyle(n).backgroundColor;
      if (c && c !== 'transparent' && !/rgba\(0, 0, 0, 0\)/.test(c)) return c;
    }
    return getComputedStyle(document.body).backgroundColor;
  };
  const effBg = bg(document.body);
  const m = effBg.match(/\d+(\.\d+)?/g);
  // sRGB relative luminance, same formula platform-audit uses.
  const lum = m
    ? [0.2126, 0.7152, 0.0722].reduce((a, k, i) => {
        const s = Number(m[i]) / 255;
        return a + k * (s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4);
      }, 0)
    : null;
  const meta = document.querySelector('meta[name="color-scheme"]');
  return {
    computedColorScheme: getComputedStyle(de).colorScheme || '',
    metaColorScheme: meta ? meta.getAttribute('content') : null,
    effBg,
    bgLuminance: lum === null ? null : Number(lum.toFixed(4)),
  };
};

const browser = await chromium.launch();
let allDark = true;

for (const url of urls) {
  const ctx = await browser.newContext({ colorScheme: 'light' });
  const page = await ctx.newPage();
  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  // The stylesheet is what carries the declaration; wait for it rather than for
  // the app, so a slow React tree cannot make this look like a missing rule.
  await page.waitForLoadState('load').catch(() => {});
  const r = await page.evaluate(PROBE);

  // The same pair platform-audit's dark-by-design branch evaluates.
  const darkByDesign = r.bgLuminance !== null && r.bgLuminance < 0.06 && /dark/.test(r.computedColorScheme);
  if (!darkByDesign) allDark = false;

  console.log(
    [
      `${url} -> ${resp ? resp.status() : '?'}`,
      `  computed color-scheme : ${JSON.stringify(r.computedColorScheme)}`,
      `  <meta color-scheme>   : ${JSON.stringify(r.metaColorScheme)}`,
      `  effective background  : ${r.effBg} (luminance ${r.bgLuminance})`,
      `  dark-by-design        : ${darkByDesign ? 'YES' : 'NO'}`,
    ].join('\n'),
  );
  await ctx.close();
}

await browser.close();
process.exit(allDark ? 0 : 1);
