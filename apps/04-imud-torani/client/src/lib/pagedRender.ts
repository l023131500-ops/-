import type { Book, BookSettings, ContentBlock, LayerKind } from "@shared/schema";
import { DEFAULT_SETTINGS, getTemplate } from "@shared/templates";

/* ═══════════════ מספור ═══════════════ */

/** גימטריה — המרת מספר לאותיות עבריות (למספור עמודים תורני, "בלשון נקייה"). */
export function toGematria(n: number): string {
  if (n <= 0) return "";
  const ones = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
  const tens = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
  const huns = ["", "ק", "ר", "ש", "ת", "תק", "תר", "תש", "תת", "תתק"];
  let out = "";
  let rem = n;
  while (rem >= 1000) {
    const th = Math.floor(rem / 1000);
    out += ones[th] + "׳";
    rem = rem % 1000;
  }
  out += huns[Math.floor(rem / 100)];
  rem = rem % 100;
  // "לשון נקייה": ט"ו במקום י"ה, ט"ז במקום י"ו
  if (rem === 15) out += "טו";
  else if (rem === 16) out += "טז";
  else {
    out += tens[Math.floor(rem / 10)];
    out += ones[rem % 10];
  }
  if (out.length > 1) {
    out = out.slice(0, -1) + '"' + out.slice(-1);
  } else if (out.length === 1) {
    out = out + "׳";
  }
  return out;
}

/** אות עברית פשוטה למספור (א,ב,ג ... כ,כא) — עבור "letters". */
export function toHebLetter(n: number): string {
  // כמו גימטריה אך פשוט יותר; משתמשים באותה פונקציה
  return toGematria(n);
}

/** מחזיר מחרוזת מספר לפי סגנון. */
function pageNumStr(n: number, style: BookSettings["pageNumbering"]): string {
  switch (style) {
    case "gematria": return toGematria(n);
    case "letters": return toHebLetter(n);
    case "decimal": return String(n);
    case "none": return "";
    default: return toGematria(n);
  }
}

/* ═══════════════ עזרי טקסט ═══════════════ */

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** עוטף סוגריים בתגית להקטנה (smallParens). */
function wrapParens(html: string): string {
  // מזהה סוגריים עגולות/מרובעות עם תוכן ומקטין
  return html.replace(/([([])([^)\]]{0,120}?)([)\]])/g, '<span class="paren">$1$2$3</span>');
}

/** המרת טקסט חופשי לפסקאות HTML. */
function toParas(text: string, smallParens: boolean): string {
  return text
    .split(/\n{2,}/)
    .map((p) => {
      let inner = esc(p).replace(/\n/g, "<br>");
      if (smallParens) inner = wrapParens(inner);
      return `<p>${inner}</p>`;
    })
    .join("\n");
}

export function mergedSettings(book: Book): BookSettings {
  const tpl = getTemplate(book.templateKey);
  let s: Partial<BookSettings> = {};
  try {
    s = JSON.parse(book.settings || "{}");
  } catch {
    s = {};
  }
  return { ...DEFAULT_SETTINGS, ...tpl.defaults, ...s };
}

export function parseContent(book: Book): ContentBlock[] {
  try {
    const arr = JSON.parse(book.content || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

const PAGE_DIMS: Record<string, { w: string; h: string }> = {
  a4: { w: "210mm", h: "297mm" },
  a5: { w: "148mm", h: "210mm" },
  b5: { w: "176mm", h: "250mm" },
  letter: { w: "216mm", h: "279mm" },
};

/* ═══════════════ תוכן עניינים ═══════════════ */

export interface TocEntry { id: string; text: string; level: number; }

export function buildToc(book: Book): TocEntry[] {
  const blocks = parseContent(book);
  const out: TocEntry[] = [];
  blocks.forEach((b) => {
    if (b.layer === "heading") {
      out.push({ id: `h-${b.id}`, text: b.text, level: b.meta?.level ?? 1 });
    } else if (b.layer === "subheading") {
      out.push({ id: `h-${b.id}`, text: b.text, level: (b.meta?.level ?? 2) + 1 });
    }
  });
  return out;
}

/* ═══════════════ CSS ═══════════════ */

/** בונה את מקטע ה-CSS לפי הגדרות הספר. */
export function buildCss(book: Book): string {
  const s = mergedSettings(book);
  const dim = PAGE_DIMS[s.pageSize] || PAGE_DIMS.a5;

  // יישור שורה אחרונה בכל פסקה
  const lastLine =
    s.lastLineAlign === "center" ? "center"
    : s.lastLineAlign === "right" ? "right"
    : s.lastLineAlign === "start" ? "start"
    : "justify";

  // עמודות
  const colCount = s.columns === 2 ? 2 : 1;
  const colCss = colCount === 2
    ? `column-count: 2; column-gap: ${s.columnGap}mm; column-rule: 0.5px solid #cbb89e;`
    : "";

  // מניעת יתומים/אלמנות
  const widowCss = s.preventWidows ? "orphans: 2; widows: 2;" : "orphans: 1; widows: 1;";

  return `
:root { --imud-fs: ${s.fontSize}px; --imud-lh: ${s.lineHeight}; }
@page {
  size: ${dim.w} ${dim.h};
  margin: ${s.marginTop}mm ${s.marginOuter}mm ${s.marginBottom}mm ${s.marginInner}mm;
}
.imud-doc {
  direction: rtl; text-align: justify; ${widowCss}
  font-family: ${s.fontFamily};
  font-size: var(--imud-fs); line-height: var(--imud-lh);
  color: #1c140c;
}
.imud-doc p { margin: 0 0 0.4em; text-indent: ${s.paragraphIndent}em; text-align-last: ${lastLine}; }
.imud-doc p.no-indent { text-indent: 0; }
.imud-doc .paren { font-size: 0.82em; }

/* כותרות */
.imud-doc .heading {
  font-family: ${s.headingFont || s.fontFamily}; font-weight: 700;
  text-align: ${s.headingAlign};
  font-size: ${s.headingSizeH2}em; margin: 1.1em 0 0.5em; color: #7a1f34;
  break-after: avoid; page-break-after: avoid;
}
.imud-doc .heading.h1 { font-size: ${s.headingSizeH1}em; }
.imud-doc .subheading {
  font-family: ${s.headingFont || s.fontFamily}; font-weight: 700;
  text-align: ${s.headingAlign}; font-size: ${Math.max(1, s.headingSizeH2 - 0.15)}em;
  margin: 0.8em 0 0.4em; color: #5a2030; break-after: avoid; page-break-after: avoid;
}

/* מילת פתיחה */
.imud-doc .dropcap {
  font-size: 3em; font-weight: 900; float: right; line-height: 0.8;
  margin: 0.02em 0 0 0.12em; color: #7a1f34; font-family: ${s.headingFont || s.fontFamily};
}
.imud-doc .bold-word { font-weight: 900; font-size: 1.12em; color: #7a1f34; }
.imud-doc .small-caps { font-variant: small-caps; font-weight: 700; letter-spacing: 0.03em; }

/* שכבות ייחודיות */
.imud-doc .source { font-weight: 600; color: #5a2030; }
.imud-doc .source p { text-indent: 0; }
.imud-doc .question { font-weight: 700; }
.imud-doc .question::before { content: "שאלה: "; color: #7a1f34; }
.imud-doc .answer::before { content: "תשובה: "; color: #7a1f34; font-weight: 700; }
.imud-doc .poem { text-align: center; }
.imud-doc .poem p { text-indent: 0; text-align: center; text-align-last: center; margin-bottom: 0.7em; }

/* הערות שוליים */
.imud-doc .footnotes {
  border-top: 0.5px solid #cbb89e; margin-top: 1.2em; padding-top: 0.5em;
  font-size: 0.78em; line-height: 1.4;
  ${s.footnoteColumns === 2 ? `column-count: 2; column-gap: ${s.columnGap}mm;` : ""}
}
.imud-doc .footnotes .fn { margin-bottom: 0.3em; break-inside: avoid; }
.imud-doc .footnotes .fn-num { font-weight: 700; color: #7a1f34; }
.imud-doc sup.fn-ref { font-size: 0.7em; color: #7a1f34; font-weight: 700; }
.imud-doc .sidenote { font-size: 0.72em; color: #5a4636; line-height: 1.3; }

/* מעברים */
.imud-doc .break-page { break-before: page; page-break-before: always; }
.imud-doc .break-col { break-before: column; }
.imud-doc .keep-next { break-after: avoid; page-break-after: avoid; }

/* מעטפת עמודות */
${colCount === 2 ? `.imud-cols { ${colCss} }` : ".imud-cols {}"}

/* השוואת טורים */
.imud-parallel { display: grid; grid-template-columns: 1fr 1fr; gap: ${s.columnGap}mm; }
.imud-parallel > div { border-inline-start: 0.5px solid #cbb89e; padding-inline-start: ${s.columnGap}mm; }
.imud-parallel > div:first-child { border: 0; padding: 0; }

/* צורת הדף / מקראות גדולות */
.imud-framed { display: grid; grid-template-columns: 1fr; gap: 3mm; }
.imud-framed .band { display: grid; grid-template-columns: 1fr 1.6fr 1fr; gap: 3mm; align-items: start; }
.imud-framed .center { font-size: 1.12em; text-align: justify; }
.imud-framed .inner, .imud-framed .outer {
  font-family: 'Noto Rashi Hebrew', serif; font-size: 0.82em; line-height: 1.35; text-align: justify;
}
.imud-framed .layer-label {
  display: block; text-align: center; font-family: 'Frank Ruhl Libre', serif;
  font-size: 0.7em; color: #9a7f5f; margin-bottom: 0.3em; font-weight: 600;
}

/* תוכן עניינים */
.imud-toc { break-after: page; page-break-after: always; }
.imud-toc h2 { text-align: center; color: #7a1f34; font-size: ${s.headingSizeH1}em; margin-bottom: 0.8em; }
.imud-toc .toc-line { display: flex; justify-content: space-between; align-items: baseline; margin: 0.3em 0; gap: 0.5em; }
.imud-toc .toc-line.lvl-2 { padding-inline-start: 1.2em; font-size: 0.92em; }
.imud-toc .toc-line.lvl-3 { padding-inline-start: 2.4em; font-size: 0.88em; color: #5a4636; }
.imud-toc .toc-title { position: relative; }
.imud-toc .toc-dots { flex: 1; border-bottom: 1px dotted #b8a582; margin: 0 0.4em; transform: translateY(-0.25em); }

/* עמוד שער */
.imud-title-page {
  break-after: page; page-break-after: always; text-align: center;
  display: flex; flex-direction: column; justify-content: center; min-height: 80vh;
}
.imud-title-page .tp-title { font-size: 3em; font-weight: 900; color: #7a1f34; margin-bottom: 0.3em; font-family: ${s.headingFont || s.fontFamily}; }
.imud-title-page .tp-sub { font-size: 1.3em; color: #5a4636; margin-bottom: 1.5em; }
.imud-title-page .tp-author { font-size: 1.4em; color: #3a2a1a; }
`;
}

/* ═══════════════ גוף HTML ═══════════════ */

const OPENING_LABEL: Partial<Record<LayerKind, string>> = {};

/** מרנדר מילת פתיחה בפסקה הראשונה של בלוק main לפי סגנון. */
function renderOpeningWord(text: string, style: BookSettings["openingWord"], smallParens: boolean): string {
  const trimmed = text.trim();
  if (!trimmed || style === "none") return toParas(text, smallParens);

  if (style === "dropcap") {
    const first = trimmed.charAt(0);
    const rest = trimmed.slice(1);
    let restHtml = esc(rest).replace(/\n/g, "<br>");
    if (smallParens) restHtml = wrapParens(restHtml);
    return `<p class="no-indent"><span class="dropcap">${esc(first)}</span>${restHtml}</p>`;
  }

  // bold-word / small-caps: מדגישים את המילה הראשונה
  const m = trimmed.match(/^(\S+)([\s\S]*)$/);
  if (!m) return toParas(text, smallParens);
  const word = m[1];
  const rest = m[2];
  const cls = style === "small-caps" ? "small-caps" : "bold-word";
  let restHtml = esc(rest).replace(/\n/g, "<br>");
  if (smallParens) restHtml = wrapParens(restHtml);
  return `<p class="no-indent"><span class="${cls}">${esc(word)}</span>${restHtml}</p>`;
}

/** מחזיר את class-ים של מעברים לבלוק. */
function breakClasses(b: ContentBlock): string {
  const cls: string[] = [];
  if (b.meta?.pageBreakBefore) cls.push("break-page");
  if (b.meta?.columnBreakBefore) cls.push("break-col");
  if (b.meta?.keepWithNext) cls.push("keep-next");
  return cls.join(" ");
}

/** סגנון inline לכותרת מותאמת אישית. */
function headingInlineStyle(b: ContentBlock): string {
  const st: string[] = [];
  if (b.meta?.headingFont) st.push(`font-family:${b.meta.headingFont}`);
  if (b.meta?.headingSize) st.push(`font-size:${b.meta.headingSize}em`);
  if (b.meta?.headingBold === false) st.push("font-weight:400");
  if (b.meta?.headingAlign) st.push(`text-align:${b.meta.headingAlign}`);
  return st.length ? ` style="${st.join(";")}"` : "";
}

/** בונה את גוף ה-HTML לפי התבנית. */
export function buildBodyHtml(book: Book): string {
  const tpl = getTemplate(book.templateKey);
  const s = mergedSettings(book);
  const blocks = parseContent(book);
  const by = (layer: string) => blocks.filter((b) => b.layer === layer);

  const heading = (b: ContentBlock) => {
    const lvl = b.meta?.level === 1 ? "h1" : "";
    return `<h2 id="h-${b.id}" class="heading ${lvl} ${breakClasses(b)}"${headingInlineStyle(b)}>${esc(b.text)}</h2>`;
  };
  const subheading = (b: ContentBlock) =>
    `<h3 id="h-${b.id}" class="subheading ${breakClasses(b)}"${headingInlineStyle(b)}>${esc(b.text)}</h3>`;

  /* ── מבנה צורת הדף (framed) ── */
  if (tpl.kind === "framed") {
    const center = by("main").map((b) => toParas(b.text, s.smallParens)).join("\n");
    const innerBlocks = by("rashi");
    const outerBlocks = by("tosafot").length ? by("tosafot") : by("commentaryA");
    const innerLabel = 'רש"י';
    const outerLabel = tpl.key === "daf-gemara" ? "תוספות" : "פירוש";
    const inner = innerBlocks.map((b) => toParas(b.text, false)).join("\n");
    const outer = outerBlocks.map((b) => toParas(b.text, false)).join("\n");
    const headings = by("heading").map(heading).join("\n");
    return `<div class="imud-doc">${headings}<div class="imud-framed"><div class="band">
      <div class="outer"><span class="layer-label">${outerLabel}</span>${outer}</div>
      <div class="center">${center}</div>
      <div class="inner"><span class="layer-label">${innerLabel}</span>${inner}</div>
    </div></div></div>`;
  }

  /* ── השוואת טורים (parallel) ── */
  if (tpl.key === "parshanut-parallel") {
    const a = by("commentaryA").map((b) => toParas(b.text, s.smallParens)).join("\n");
    const b = by("commentaryB").map((x) => toParas(x.text, s.smallParens)).join("\n");
    const headings = by("heading").map(heading).join("\n");
    return `<div class="imud-doc">${headings}<div class="imud-parallel"><div>${a}</div><div>${b}</div></div></div>`;
  }

  /* ── ליניארי / טורים ── */
  const parts: string[] = [];
  const footnotes: ContentBlock[] = [];
  let seenMain = false;

  for (const b of blocks) {
    const bc = breakClasses(b);
    const wrap = (html: string) => (bc ? `<div class="${bc}">${html}</div>` : html);

    switch (b.layer) {
      case "heading": parts.push(heading(b)); break;
      case "subheading": parts.push(subheading(b)); break;
      case "openingWord":
        parts.push(wrap(renderOpeningWord(b.text, s.openingWord === "none" ? "bold-word" : s.openingWord, s.smallParens)));
        seenMain = true;
        break;
      case "main": {
        if (!seenMain && s.openingWord !== "none") {
          parts.push(wrap(renderOpeningWord(b.text, s.openingWord, s.smallParens)));
        } else {
          parts.push(wrap(toParas(b.text, s.smallParens)));
        }
        seenMain = true;
        break;
      }
      case "source":
        parts.push(wrap(`<div class="source">${toParas(b.text, s.smallParens)}</div>`));
        break;
      case "question":
        parts.push(wrap(`<div class="question">${toParas(b.text, s.smallParens)}</div>`));
        break;
      case "answer":
        parts.push(wrap(`<div class="answer">${toParas(b.text, s.smallParens)}</div>`));
        break;
      case "poem":
        parts.push(wrap(`<div class="poem">${toParas(b.text, false)}</div>`));
        break;
      case "sidenote":
        parts.push(`<aside class="sidenote">${esc(b.text)}</aside>`);
        break;
      case "footnote":
        footnotes.push(b);
        break;
      default:
        parts.push(wrap(toParas(b.text, s.smallParens)));
    }
  }

  // בלוק הערות שוליים בסוף
  let footHtml = "";
  if (footnotes.length) {
    const items = footnotes
      .map((b, i) => {
        const num = b.meta?.marker || pageNumStr(i + 1, "gematria") || String(i + 1);
        return `<div class="fn"><span class="fn-num">${esc(num)})</span> ${esc(b.text).replace(/\n/g, "<br>")}</div>`;
      })
      .join("\n");
    footHtml = `<div class="footnotes">${items}</div>`;
  }

  const inner = parts.join("\n");
  const wrapClass = s.columns === 2 && tpl.kind !== "framed" ? "imud-cols" : "";
  return `<div class="imud-doc"><div class="${wrapClass}">${inner}</div>${footHtml}</div>`;
}

/* ═══════════════ עמוד שער + תוכן עניינים ═══════════════ */

function titlePageHtml(book: Book, s: BookSettings): string {
  if (!s.titlePage) return "";
  const sub = s.titlePageSubtitle ? `<div class="tp-sub">${esc(s.titlePageSubtitle)}</div>` : "";
  const author = book.author ? `<div class="tp-author">${esc(book.author)}</div>` : "";
  return `<div class="imud-title-page">
    <div class="tp-title">${esc(book.title)}</div>
    ${sub}
    ${author}
  </div>`;
}

function tocHtml(book: Book, s: BookSettings): string {
  if (!s.tableOfContents) return "";
  const entries = buildToc(book);
  if (!entries.length) return "";
  const lines = entries
    .map(
      (e) =>
        `<div class="toc-line lvl-${e.level}"><span class="toc-title">${esc(e.text)}</span><span class="toc-dots"></span><span class="toc-page"></span></div>`
    )
    .join("\n");
  return `<div class="imud-toc"><h2>תוכן העניינים</h2>${lines}</div>`;
}

/* ═══════════════ מסמך HTML מלא ═══════════════ */

const FONT_LINK = `<link href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@300;400;500;700;900&family=David+Libre:wght@400;500;700&family=Noto+Serif+Hebrew:wght@300;400;500;700&family=Noto+Rashi+Hebrew:wght@400;500;700&family=Suez+One&family=Cardo:wght@400;700&family=Assistant:wght@400;600;700&family=Heebo:wght@400;600;700;800&family=Rubik:wght@400;500;700&family=Alef:wght@400;700&family=Miriam+Libre:wght@400;700&family=Bellefair&display=swap" rel="stylesheet">`;

/**
 * מסמך HTML מלא.
 * forPrint=true  → מנוע ההדפסה של הדפדפן (CSS Paged Media) — כותרות רצות, מספור, מעברים. עובד גם לאחר פרסום.
 * forPrint=false → תצוגה מקדימה: כל התוכן זורם, מדמה גודל עמוד ושוליים.
 */
export function buildFullHtml(book: Book, forPrint: boolean): string {
  const css = buildCss(book);
  const s = mergedSettings(book);
  const dim = PAGE_DIMS[s.pageSize] || PAGE_DIMS.a5;
  const body = buildBodyHtml(book);
  const tp = titlePageHtml(book, s);
  const toc = tocHtml(book, s);

  if (forPrint) {
    const headText = s.runningHead ? (s.runningHeadText || book.title).replace(/"/g, "") : "";
    // מספור לפי סגנון (גימטריה/אותיות → counter hebrew; ספרות → decimal; ללא → ריק)
    let pageCounter = "counter(page)";
    if (s.pageNumbering === "gematria" || s.pageNumbering === "letters") pageCounter = "counter(page, hebrew)";
    else if (s.pageNumbering === "decimal") pageCounter = "counter(page)";
    const showNum = s.pageNumbering !== "none";
    // מיקום מספור
    const side = s.pageNumberSide;
    const numBox =
      side === "center" ? "@bottom-center"
      : side === "right" ? "@bottom-right"
      : side === "left" ? "@bottom-left"
      : side === "inner" ? "@bottom-left"   // בעמודים RTL הפנימי משתנה; ברירת מחדל שמאל
      : "@bottom-right";                     // outer
    const marginBoxes = `
  @page {
    ${headText ? `@top-center { content: "${headText}"; font-family: 'Frank Ruhl Libre', serif; font-size: 10pt; color: #6b5a4a; }` : ""}
    ${showNum ? `${numBox} { content: ${pageCounter}; font-family: 'Frank Ruhl Libre', serif; font-size: 12pt; color: #3a2a1a; }` : ""}
  }
  @page :first { @top-center { content: ""; } ${numBox} { content: ""; } }`;

    return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">
<title>${esc(book.title)}</title>
${FONT_LINK}
<style>
  html,body{margin:0;background:#e8e2d5;}
  .imud-print-page{ background:#fff; box-shadow:0 2px 14px rgba(0,0,0,.15); margin:10mm auto; padding:${s.marginTop}mm ${s.marginOuter}mm ${s.marginBottom}mm ${s.marginInner}mm; width:${dim.w}; }
  ${css}
  ${marginBoxes}
  @media print {
    html,body{background:#fff;}
    .imud-print-page{ box-shadow:none; margin:0; padding:0; width:auto; }
    #imud-print-bar{ display:none !important; }
  }
  #imud-print-bar{ position:fixed; top:14px; left:14px; z-index:99999; font-family:'Frank Ruhl Libre',serif; display:flex; gap:8px; }
  #imud-print-bar button{ background:#7a1f34; color:#fbf8f1; border:0; border-radius:8px; padding:10px 20px; font-size:15px; cursor:pointer; box-shadow:0 2px 10px rgba(0,0,0,.25); }
  #imud-print-bar button:hover{ background:#8f2a41; }
  #imud-print-bar .hint{ background:#fbf8f1; color:#5a4636; border-radius:8px; padding:10px 14px; font-size:12px; max-width:260px; box-shadow:0 2px 10px rgba(0,0,0,.12); }
</style></head>
<body>
<div id="imud-print-bar">
  <button onclick="window.print()">הדפס / שמור כ-PDF</button>
  <div class="hint">בחלון ההדפסה בחר יעד: “שמור כ-PDF”, וודא שגודל הנייר תואם לתבנית.</div>
</div>
<div class="imud-print-page">${tp}${toc}${body}</div>
</body></html>`;
  }

  // תצוגה מקדימה
  const pageNum = pageNumStr(1, s.pageNumbering);
  const headText = s.runningHead ? (s.runningHeadText || book.title) : "";
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">
<title>${esc(book.title)}</title>
${FONT_LINK}
<style>
  *{box-sizing:border-box;}
  html,body{margin:0;background:#e8e2d5;padding:10mm 0;font-family:'Frank Ruhl Libre',serif;}
  .preview-page{
    width:${dim.w}; min-height:${dim.h}; background:#fbf8f1;
    box-shadow:0 3px 18px rgba(0,0,0,.18); margin:0 auto 10mm;
    padding:${s.marginTop}mm ${s.marginOuter}mm ${s.marginBottom}mm ${s.marginInner}mm;
    display:flex; flex-direction:column;
  }
  .preview-head{ text-align:center; font-size:10pt; color:#6b5a4a; margin-bottom:4mm; min-height:1em; }
  .preview-foot{ text-align:center; font-size:11pt; color:#3a2a1a; margin-top:auto; padding-top:4mm; }
  .preview-body{ flex:1; }
  ${css}
</style></head>
<body><div class="preview-page">
  <div class="preview-head">${esc(headText)}</div>
  <div class="preview-body">${tp}${toc}${body}</div>
  <div class="preview-foot">${esc(pageNum)}</div>
</div></body></html>`;
}
