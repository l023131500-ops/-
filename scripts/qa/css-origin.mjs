/**
 * Which stylesheet actually wins a given property on a given element?
 *
 * Why this exists. On /bkalot the shipped style.css demonstrably contains the
 * `--more30-auth-inset` rule, and the computed padding is still 0. The bar is
 * 94px tall where the source says 64, and `.nav` computes `display:block`
 * where the source says `flex`. Reading the source harder does not answer
 * that. Something else is winning and the page can be asked directly.
 *
 * It enumerates every stylesheet the document loaded — linked, inline,
 * cross-origin, and injected after load — then for each target element walks
 * every rule that matches it, in cascade order, and reports which declaration
 * of the property is last standing and which sheet it came from.
 *
 *   node scripts/qa/css-origin.mjs /bkalot ".header-inner" padding-inline-end
 *   node scripts/qa/css-origin.mjs /bkalot ".nav" display
 *
 * With no property it dumps the sheet inventory only, which is usually enough
 * to spot an unexpected vendored file.
 */
import { chromium } from 'playwright-core';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const ORIGIN = 'https://more30.com';

const [route, selector, prop] = process.argv.slice(2);
if (!route) {
  console.error('usage: node scripts/qa/css-origin.mjs <route> [selector] [property]');
  process.exit(2);
}

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 }, locale: 'he-IL', isMobile: true, hasTouch: true,
});
await page.goto(ORIGIN + route, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(5000);

const report = await page.evaluate(([selector, prop]) => {
  const sheets = [];
  for (let i = 0; i < document.styleSheets.length; i++) {
    const s = document.styleSheets[i];
    let rules = null;
    let readable = true;
    try { rules = s.cssRules; } catch { readable = false; }
    sheets.push({
      index: i,
      href: s.href || '(inline <style>)',
      // An injected sheet has no ownerNode in the original HTML order; naming
      // the node is how a runtime-injected theme becomes visible.
      owner: s.ownerNode ? s.ownerNode.tagName.toLowerCase() : '(none)',
      ownerId: s.ownerNode?.id || null,
      media: String(s.media?.mediaText || ''),
      readable,
      ruleCount: readable && rules ? rules.length : null,
    });
  }

  if (!selector || !prop) return { sheets, matches: null };

  const el = document.querySelector(selector);
  if (!el) return { sheets, matches: null, error: `selector not found: ${selector}` };

  const matches = [];
  const visit = (ruleList, sheetIdx, href, mediaChain) => {
    for (const rule of ruleList) {
      // Nested contexts (@media, @supports, @layer) carry their own rules.
      if (rule.cssRules && !rule.selectorText) {
        const cond = rule.conditionText || rule.media?.mediaText || rule.name || '';
        const applies = rule.media ? window.matchMedia(rule.media.mediaText).matches : true;
        visit(rule.cssRules, sheetIdx, href, mediaChain.concat(`${cond}${applies ? '' : ' [NOT matching]'}`));
        continue;
      }
      if (!rule.selectorText) continue;
      let hit = false;
      try { hit = el.matches(rule.selectorText); } catch { hit = false; }
      if (!hit) continue;
      const value = rule.style.getPropertyValue(prop);
      if (!value) continue;
      matches.push({
        sheet: sheetIdx,
        href,
        selector: rule.selectorText.slice(0, 90),
        value: value.slice(0, 90),
        important: rule.style.getPropertyPriority(prop) === 'important',
        media: mediaChain.join(' / ') || null,
        mediaApplies: !mediaChain.some((m) => m.includes('[NOT matching]')),
      });
    }
  };

  for (let i = 0; i < document.styleSheets.length; i++) {
    const s = document.styleSheets[i];
    let rules = null;
    try { rules = s.cssRules; } catch { continue; }
    if (rules) visit(rules, i, s.href || '(inline)', []);
  }

  const inline = el.style.getPropertyValue(prop);
  return {
    sheets,
    element: { tag: el.tagName.toLowerCase(), cls: el.className?.toString?.().slice(0, 80) },
    inlineValue: inline || null,
    inlineImportant: el.style.getPropertyPriority(prop) === 'important',
    computed: getComputedStyle(el).getPropertyValue(prop),
    matches,
  };
}, [selector, prop]);

console.log(`\n=== stylesheets on ${route} (${report.sheets.length}) ===`);
for (const s of report.sheets) {
  console.log(
    `  [${String(s.index).padStart(2)}] ${s.readable ? 'readable  ' : 'CROSS-ORIGIN'} ` +
      `${String(s.ruleCount ?? '?').padStart(5)} rules  <${s.owner}${s.ownerId ? '#' + s.ownerId : ''}>  ` +
      `${s.media ? `@${s.media} ` : ''}${s.href}`,
  );
}

if (report.error) console.log('\n' + report.error);
if (report.matches) {
  console.log(`\n=== ${selector} · ${prop} ===`);
  console.log(`  element  : <${report.element.tag} class="${report.element.cls}">`);
  console.log(`  computed : ${report.computed}`);
  console.log(`  inline   : ${report.inlineValue ?? '(none)'}${report.inlineImportant ? ' !important' : ''}`);
  console.log(`  ${report.matches.length} matching declaration(s), in cascade order:`);
  for (const m of report.matches) {
    console.log(
      `    sheet[${m.sheet}] ${m.important ? '!IMPORTANT ' : ''}${m.mediaApplies ? '' : '(media off) '}` +
        `${m.selector}  ->  ${m.value}`,
    );
    if (m.media) console.log(`             within: ${m.media}`);
    console.log(`             from: ${m.href}`);
  }
}

await browser.close();
