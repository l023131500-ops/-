/**
 * Does the browser's print pipeline actually render CSS Paged Media margin
 * boxes (@top-center / @bottom-right)?
 *
 * imud (04-imud-torani) advertises "מספור עברי, כותרות רצות" on its home page
 * and implements both with @page margin boxes in client/src/lib/pagedRender.ts.
 * Its "ייצא PDF" button just opens the browser print dialog, and there is no
 * Paged.js in the project despite a source comment naming one. So the home
 * page makes a promise that rests entirely on the print engine honouring
 * margin boxes.
 *
 * ANSWER: it does. This Chromium paints both boxes. The promise holds, and
 * this probe exists to keep it honest if the pinned browser ever moves.
 *
 * ⚠️ Getting to that answer took three instruments, and the first two both
 * lied — in opposite directions:
 *
 *   1. CSSOM. The margin rules survive parsing and CSSMarginRule exists, so
 *      this said "supported". Worthless: parser support ships ahead of render
 *      support, and parsing is not painting.
 *   2. Byte-length A/B, and a text search for the header string. The A/B said
 *      "something changed" (true, but font subsets move bytes too) while the
 *      text search said "header absent" (false — the glyphs are written
 *      through a subset encoding, so a latin1 search cannot see them).
 *   3. Fill operators in the inflated content stream. Paint the margin box a
 *      colour nothing else uses and look for that colour. This one observes
 *      the thing actually in question, and it decides the verdict.
 *
 * Route 3 also failed once, comparing colours by string equality: a PDF stores
 * #008040 as `0 0.502 0.251`, not `0 0.501961 0.25`, so an exact match reported
 * "not painted" for a box that plainly was. See paintedColor() in
 * lib/pdf-content.mjs — compare with a tolerance.
 *
 * Routes 1 and 2 are kept in the output because the contrast between the three
 * is the point: a cheap signal that agrees with your hypothesis is not evidence.
 *
 * Run: node scripts/qa/paged-margin-box-probe.mjs
 */
import { chromium } from "playwright-core";
import { pdfContentOps, fillColors, paintedColor } from "./lib/pdf-content.mjs";

const EXE =
  "C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe";

const HEAD = "ZZHEADERZZ";

// The shape pagedRender.ts emits, verbatim in structure.
const CSS = `
@page { size: 148mm 210mm; margin: 18mm 15mm; }
@page {
  @top-center { content: "${HEAD}"; font-size: 10pt; color: #6b5a4a; }
  @bottom-right { content: counter(page, hebrew); font-size: 12pt; color: #3a2a1a; }
}
@page :first { @top-center { content: ""; } @bottom-right { content: ""; } }
`;

const HTML = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">
<style>${CSS}
.pg { break-after: page; }</style></head>
<body><div class="pg">עמוד ראשון</div><div class="pg">עמוד שני</div><div>עמוד שלישי</div></body></html>`;

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const page = await browser.newPage();
await page.setContent(HTML, { waitUntil: "load" });

// -- route 1: what did the CSS parser keep? (not an answer) ----------------
const cssom = await page.evaluate(() => {
  const sheet = document.styleSheets[0];
  const pageRules = [];
  for (const r of sheet.cssRules) {
    // CSSRule.PAGE_RULE === 6
    if (r.constructor.name === "CSSPageRule" || r.type === 6) {
      pageRules.push({
        text: r.cssText,
        childCount: r.cssRules ? r.cssRules.length : null,
      });
    }
  }
  return { pageRules, marginRuleCtorExists: typeof window.CSSMarginRule !== "undefined" };
});

console.log("-- CSSOM (parser support only) --");
console.log("CSSMarginRule interface exists:", cssom.marginRuleCtorExists);
for (const [i, r] of cssom.pageRules.entries()) {
  console.log(`@page rule ${i}: nested rules kept = ${r.childCount}`);
}
const keptInCssom = cssom.pageRules.some((r) => r.text.includes("top-center"));
console.log("margin box survived parsing:", keptInCssom);

// -- route 2: byte A/B and text search (both misleading) -------------------
const PDF_OPTS = {
  width: "148mm",
  height: "210mm",
  printBackground: true,
  preferCSSPageSize: true,
};

const withBoxes = await page.pdf(PDF_OPTS);

const control = await browser.newPage();
await control.setContent(
  HTML.replace(/@page \{\s*@top-center[\s\S]*?\n\}/, "").replace(
    /@page :first \{[\s\S]*?\}\s*\}/,
    "",
  ),
  { waitUntil: "load" },
);
const withoutBoxes = await control.pdf(PDF_OPTS);

console.log("\n-- printToPDF A/B (not specific to painting) --");
console.log("with margin boxes:   ", withBoxes.length, "bytes");
console.log("without margin boxes:", withoutBoxes.length, "bytes");
const identical = withBoxes.equals(withoutBoxes);
console.log("byte-identical:", identical);
console.log(
  "header token found by text search:",
  withBoxes.toString("latin1").includes(HEAD),
  "(false negative — glyphs are subset-encoded)",
);

// -- route 3: fill operators in the content stream (decides it) ------------
const MARKER_HEX = "#008040";
const NUMBER_HEX = "#3a2a1a"; // the @bottom-right page number, left as-is
const marked = await browser.newPage();
await marked.setContent(
  HTML.replace(
    "font-size: 10pt; color: #6b5a4a;",
    `font-size: 10pt; color: ${MARKER_HEX}; background-color: ${MARKER_HEX};`,
  ),
  { waitUntil: "load" },
);
const markedPdf = await marked.pdf(PDF_OPTS);
const ops = pdfContentOps(markedPdf);
const colors = fillColors(ops);
const painted = paintedColor(colors, MARKER_HEX);
const numberPainted = paintedColor(colors, NUMBER_HEX);

console.log("\n-- content stream fill operators (decisive) --");
console.log("inflated operator bytes:", ops.length);
console.log(
  "distinct fill colours:",
  [...new Set(colors.map((c) => c.join(" ")))].join("  |  ") || "(none)",
);
console.log(`@top-center running head (${MARKER_HEX}) painted:`, painted);
console.log(`@bottom-right page number (${NUMBER_HEX}) painted:`, numberPainted);

const ok = painted && numberPainted;
console.log(
  "\nVERDICT:",
  ok
    ? "margin boxes ARE rendered — imud's 'מספור עברי, כותרות רצות' holds"
    : "margin boxes are NOT rendered — the imud home page promises something the print path cannot deliver",
);

await browser.close();
process.exit(ok ? 0 : 1);
