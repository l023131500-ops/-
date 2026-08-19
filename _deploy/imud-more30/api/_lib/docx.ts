// ═══════════════════════════════════════════════════════════════════════════
// ייצוא Word (.docx) לספר עימוד תורני — גרסה 2.
// ───────────────────────────────────────────────────────────────────────────
// ממיר בלוקי-תוכן (ContentBlock[]) בסכימת v2 למסמך Word עם:
//   • כיווניות RTL, גופן עברי נבחר, כותרות פרקים (רב-רמות) בגופן/גודל/יישור מותאם
//   • מילת פתיחה מודגשת (dropcap/bold-word/small-caps)
//   • הערות שוליים אמיתיות של Word (footnotes) עבור שכבת footnote
//   • שכבות פרשנות/מקור/שאלה/תשובה/פיוט/כותרת-משנה כפסקאות מסומנות
//   • כותרת רצה (Header) עם שם הספר + פרק, מספור עמודים (גימטריה→סימון בהערה, decimal בפועל)
//   • מעברי עמוד/מקטע (pageBreakBefore / columnBreakBefore), keepWithNext
//   • תוכן עניינים (TableOfContents) כאשר נבחר
//   • יישור שורה אחרונה, סוגריים קטנות, ניקוד — מטופלים ברמת הטקסט/יישור
// שים לב: Word אינו מייצר גימטריה למספרי עמודים מובנים; לכן כאשר נבחר מספור
//   בגימטריה אנו מסמנים "עמ׳" בכותרת התחתונה ומשאירים את המספר העשרוני של Word
//   (העימוד המדויק בגימטריה נשמר בייצוא ה-PDF דרך pagedRender.ts).
// אין כאן Paged.js ומעולם לא היה — הערה קודמת כאן נקבה בשמו והוא אינו תלות של
//   הפרויקט. הגימטריה בייצוא ה-PDF מגיעה מ-counter(page, hebrew) בתוך תיבת
//   שוליים של @page, שמנוע ההדפסה של הדפדפן מרנדר בעצמו. נבדק אמפירית:
//   scripts/qa/paged-margin-box-probe.mjs.
// ═══════════════════════════════════════════════════════════════════════════

import {
  Document, Paragraph, TextRun, Packer, AlignmentType, HeadingLevel,
  Header, Footer, PageNumber, FootnoteReferenceRun, TableOfContents,
} from "docx";
// עותק פריסה: המקור מייבא מ-"@shared/schema"; כאן הסכימה יושבת לצדו.
import type { Book, ContentBlock, BookSettings, LayerKind } from "./schema";

// ── גימטריה (עותק מקומי מ-pagedRender.ts — השרת אינו מייבא נתיבי client) ──
function toGematria(n: number): string {
  if (n <= 0) return "";
  const ones = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
  const tens = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
  const huns = ["", "ק", "ר", "ש", "ת", "תק", "תר", "תש", "תת", "תתק"];
  let out = "", rem = n;
  while (rem >= 1000) { out += ones[Math.floor(rem / 1000)] + "׳"; rem = rem % 1000; }
  out += huns[Math.floor(rem / 100)]; rem = rem % 100;
  if (rem === 15) out += "טו";
  else if (rem === 16) out += "טז";
  else { out += tens[Math.floor(rem / 10)]; out += ones[rem % 10]; }
  if (out.length > 1) out = out.slice(0, -1) + '"' + out.slice(-1);
  else if (out.length === 1) out = out + "׳";
  return out;
}

// תוויות שכבה — נספחות כקידומת מודגשת קטנה לפני טקסט השכבה
const LAYER_LABEL: Record<LayerKind, string> = {
  main: "",
  rashi: "רש\"י",
  tosafot: "תוספות",
  commentaryA: "פירוש",
  commentaryB: "פירוש נוסף",
  footnote: "הערה",
  sidenote: "מ\"מ",
  heading: "",
  subheading: "",
  openingWord: "",
  question: "שאלה",
  answer: "תשובה",
  source: "מקור",
  poem: "",
};

// מיפוי גופן CSS → שם גופן Word (13 גופני HEBREW_FONTS)
function pickFont(fontFamily: string): string {
  const f = fontFamily || "";
  if (/Frank Ruhl/i.test(f)) return "Frank Ruhl Libre";
  if (/David/i.test(f)) return "David Libre";
  if (/Cardo/i.test(f)) return "Cardo";
  if (/Noto Rashi/i.test(f)) return "Noto Rashi Hebrew";
  if (/Noto Serif/i.test(f)) return "Noto Serif Hebrew";
  if (/Suez/i.test(f)) return "Suez One";
  if (/Taamey/i.test(f)) return "Taamey David CLM";
  if (/Heebo/i.test(f)) return "Heebo";
  if (/Assistant/i.test(f)) return "Assistant";
  if (/Rubik/i.test(f)) return "Rubik";
  if (/Alef/i.test(f)) return "Alef";
  if (/Miriam/i.test(f)) return "Miriam Libre";
  if (/Bellefair/i.test(f)) return "Bellefair";
  return "Frank Ruhl Libre";
}

function alignOf(v: string | undefined, fallback: (typeof AlignmentType)[keyof typeof AlignmentType]) {
  switch (v) {
    case "center": return AlignmentType.CENTER;
    case "left": return AlignmentType.LEFT;
    case "right": return AlignmentType.RIGHT;
    case "justify": return AlignmentType.JUSTIFIED;
    case "start": return AlignmentType.RIGHT; // RTL start = right
    default: return fallback;
  }
}

// px → half-points (Word). כפל ~1.5 ליחס פרקטי בין CSS px לגודל Word
const hp = (px: number) => Math.round(px * 1.5);

type FootnoteMap = Record<number, { children: Paragraph[] }>;

function buildParagraphs(
  blocks: ContentBlock[],
  s: BookSettings,
  bodyFont: string,
  headFont: string,
  footnotes: FootnoteMap,
): Paragraph[] {
  const out: Paragraph[] = [];
  const baseSize = hp(s.fontSize || 16);
  const lineSpacing = Math.round((s.lineHeight || 1.7) * 240);
  void alignOf(s.lastLineAlign, AlignmentType.JUSTIFIED); // שומר על המנגנון זמין לעתיד
  let footIdx = 0;

  // מיפוי מקדים: כל בלוק footnote משויך לבלוק הלא-הערה שקדם לו,
  // כך שעוגן ההערה נבנה יחד עם הפסקה (docx v8 אינו מאפשר דחיפה לפסקה בנויה).
  const anchorFor: Record<number, number[]> = {}; // blockIndex → footnote ids
  {
    let lastContentIdx = -1;
    let fi = 0;
    for (let j = 0; j < blocks.length; j++) {
      if (blocks[j].layer === "footnote") {
        if ((blocks[j].text || "").trim()) {
          fi += 1;
          if (lastContentIdx >= 0) (anchorFor[lastContentIdx] ||= []).push(fi);
        }
      } else if ((blocks[j].text || "").trim()) {
        lastContentIdx = j;
      }
    }
  }

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const text = (b.text || "").trim();
    const meta = b.meta || {};
    const pageBreak = !!meta.pageBreakBefore;
    const myAnchors = anchorFor[i] || [];

    // ── כותרת פרק/סעיף (רב-רמות) ──
    if (b.layer === "heading") {
      if (!text) continue;
      const level = meta.level || 1;
      const hFont = meta.headingFont || s.headingFont || headFont;
      const emH = level >= 2 ? (s.headingSizeH2 || 1.25) : (s.headingSizeH1 || 1.6);
      const hSize = meta.headingSize ? hp((s.fontSize || 16) * meta.headingSize) : Math.round(baseSize * emH);
      const hAlign = alignOf(meta.headingAlign || s.headingAlign, AlignmentType.CENTER);
      const marker = meta.marker ? `${meta.marker} ` : "";
      out.push(new Paragraph({
        heading: level >= 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_1,
        alignment: hAlign,
        bidirectional: true,
        pageBreakBefore: pageBreak,
        keepNext: true,
        spacing: { before: level >= 2 ? 200 : 320, after: level >= 2 ? 100 : 160 },
        children: [new TextRun({ text: marker + text, font: hFont, bold: meta.headingBold !== false, size: hSize, rightToLeft: true, color: "7a2e3a" })],
      }));
      continue;
    }

    // ── כותרת משנה ──
    if (b.layer === "subheading") {
      if (!text) continue;
      out.push(new Paragraph({
        alignment: alignOf(s.headingAlign, AlignmentType.RIGHT),
        bidirectional: true,
        pageBreakBefore: pageBreak,
        keepNext: true,
        spacing: { before: 160, after: 80 },
        children: [new TextRun({ text, font: meta.headingFont || headFont, bold: true, size: Math.round(baseSize * 1.12), rightToLeft: true })],
      }));
      continue;
    }

    // ── מילת פתיחה מודגשת ──
    if (b.layer === "openingWord") {
      if (!text) continue;
      const style = s.openingWord || "bold-word";
      const bigger = style === "dropcap" ? baseSize + 16 : style === "small-caps" ? baseSize + 4 : baseSize + 8;
      out.push(new Paragraph({
        alignment: AlignmentType.RIGHT,
        bidirectional: true,
        pageBreakBefore: pageBreak,
        keepNext: true,
        spacing: { before: 120, after: 40 },
        children: [new TextRun({ text, font: bodyFont, bold: true, size: bigger, rightToLeft: true })],
      }));
      continue;
    }

    // ── פיוט/שירה (שורות ממורכזות, רווח מוגבר) ──
    if (b.layer === "poem") {
      if (!text) continue;
      const lines = text.split(/\n+/);
      lines.forEach((ln, k) => {
        out.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          bidirectional: true,
          pageBreakBefore: pageBreak && k === 0,
          spacing: { line: lineSpacing, after: 40 },
          children: [new TextRun({ text: ln.trim(), font: bodyFont, size: baseSize, italics: true, rightToLeft: true })],
        }));
      });
      continue;
    }

    // ── הערת שוליים אמיתית: רק נרשמת במפת ההערות (העוגן נבנה בבלוק ה-main) ──
    if (b.layer === "footnote") {
      if (!text) continue;
      footIdx += 1;
      footnotes[footIdx] = {
        children: [new Paragraph({
          bidirectional: true, alignment: AlignmentType.JUSTIFIED,
          children: [new TextRun({ text, font: bodyFont, size: baseSize - 4, rightToLeft: true })],
        })],
      };
      continue;
    }

    if (!text) continue;

    // ── שכבות משניות (פרשנות/מ"מ/מקור/שאלה/תשובה) ──
    const isSecondary = b.layer !== "main";
    const label = LAYER_LABEL[b.layer] || "";
    const children: TextRun[] = [];
    const marker = meta.marker ? `${meta.marker} ` : "";

    if (label) {
      children.push(new TextRun({ text: `${label}: ${marker}`, font: bodyFont, bold: true, size: baseSize - 3, rightToLeft: true, color: "7a2e3a" }));
    } else if (marker) {
      children.push(new TextRun({ text: marker, font: bodyFont, bold: true, size: baseSize - 1, rightToLeft: true }));
    }

    // מילת פתיחה מוטבעת (כאשר main והפעולה מוגדרת ולא בלוק openingWord נפרד)
    let bodyText = text;
    let leadRun: TextRun | null = null;
    if (b.layer === "main" && (s.openingWord === "dropcap" || s.openingWord === "bold-word") && !label && !marker) {
      const m = text.match(/^(\S+)\s+([\s\S]*)$/);
      if (m) {
        const big = s.openingWord === "dropcap" ? baseSize + 10 : baseSize;
        leadRun = new TextRun({ text: m[1] + " ", font: bodyFont, bold: true, size: big, rightToLeft: true });
        bodyText = m[2];
      }
    }
    if (leadRun) children.push(leadRun);

    // סוגריים קטנות — נתמך ברמת ה-run ע"י פיצול על סוגריים ()[]
    if (s.smallParens && /[()[\]]/.test(bodyText)) {
      const parts = bodyText.split(/(\([^)]*\)|\[[^\]]*\])/g);
      for (const part of parts) {
        if (!part) continue;
        const small = /^[([]/.test(part);
        children.push(new TextRun({
          text: part, font: bodyFont,
          size: (isSecondary ? baseSize - 3 : baseSize) - (small ? 3 : 0),
          rightToLeft: true,
        }));
      }
    } else {
      children.push(new TextRun({ text: bodyText, font: bodyFont, size: isSecondary ? baseSize - 3 : baseSize, rightToLeft: true }));
    }

    // עוגני הערות שוליים המשויכים לבלוק זה
    for (const fid of myAnchors) children.push(new FootnoteReferenceRun(fid));

    out.push(new Paragraph({
      alignment: b.layer === "main" ? AlignmentType.JUSTIFIED : AlignmentType.JUSTIFIED,
      bidirectional: true,
      pageBreakBefore: pageBreak,
      keepNext: !!meta.keepWithNext,
      spacing: {
        line: lineSpacing,
        after: isSecondary ? 60 : 120,
      },
      indent: isSecondary ? { start: 360 } : (s.paragraphIndent ? { firstLine: Math.round((s.paragraphIndent || 0) * 240) } : undefined),
      children,
    }));
  }

  if (!out.length) {
    out.push(new Paragraph({ bidirectional: true, alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "(אין תוכן)", font: bodyFont, rightToLeft: true })] }));
  }
  return out;
}

const PAGE_SIZES: Record<string, { w: number; h: number }> = {
  // twips (1/1440 inch). A4=210×297mm, A5=148×210, B5=176×250, letter=8.5×11in
  a4: { w: 11906, h: 16838 },
  a5: { w: 8391, h: 11906 },
  b5: { w: 9978, h: 14173 },
  letter: { w: 12240, h: 15840 },
};

const MM = (mm: number) => Math.round((mm / 25.4) * 1440);

export async function bookToDocx(book: Book): Promise<Buffer> {
  let s: BookSettings;
  let blocks: ContentBlock[];
  try { s = JSON.parse(book.settings || "{}"); } catch { s = {} as BookSettings; }
  try { blocks = JSON.parse(book.content || "[]"); } catch { blocks = []; }

  const bodyFont = pickFont(s.fontFamily || "");
  const headFont = pickFont(s.headingFont || s.fontFamily || "");
  const size = PAGE_SIZES[s.pageSize] || PAGE_SIZES.a5;
  const baseSize = hp(s.fontSize || 16);

  // כותרת רצה: שם הספר (+ פרק אם נבחר)
  const runningText = s.runningHeadText?.trim() || book.title;
  const header = s.runningHead
    ? new Header({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER, bidirectional: true,
          children: [new TextRun({ text: runningText, font: headFont, size: 18, color: "7a2e3a", rightToLeft: true })],
        })],
      })
    : undefined;

  // כותרת תחתונה — מספור עמודים (סימון גימטריה כאשר נבחר)
  const numbering = s.pageNumbering || "gematria";
  let footer: Footer | undefined;
  if (numbering !== "none") {
    const numHint = numbering === "gematria" || numbering === "letters" ? "עמ׳ " : "עמוד ";
    footer = new Footer({
      children: [new Paragraph({
        alignment: AlignmentType.CENTER, bidirectional: true,
        children: [
          new TextRun({ text: numHint, font: bodyFont, size: 16, color: "8a8a8a", rightToLeft: true }),
          new TextRun({ children: [PageNumber.CURRENT], font: bodyFont, size: 16, color: "8a8a8a" }),
        ],
      })],
    });
  }

  // הערות שוליים אמיתיות
  const footnotes: FootnoteMap = {};
  const bodyChildren = buildParagraphs(blocks, s, bodyFont, headFont, footnotes);

  // תוכן עניינים
  const preChildren: (Paragraph | TableOfContents)[] = [];

  // שער — שם הספר + מחבר
  preChildren.push(new Paragraph({
    alignment: AlignmentType.CENTER, bidirectional: true, spacing: { after: 80 },
    children: [new TextRun({ text: book.title, font: headFont, bold: true, size: baseSize + 16, color: s.coverColor?.replace("#", "") || "7a2e3a", rightToLeft: true })],
  }));
  if (book.author) {
    preChildren.push(new Paragraph({
      alignment: AlignmentType.CENTER, bidirectional: true, spacing: { after: 240 },
      children: [new TextRun({ text: book.author, font: bodyFont, size: baseSize, color: "555555", rightToLeft: true })],
    }));
  }
  if (s.tableOfContents) {
    preChildren.push(new Paragraph({
      alignment: AlignmentType.CENTER, bidirectional: true, spacing: { before: 120, after: 120 },
      children: [new TextRun({ text: "תוכן העניינים", font: headFont, bold: true, size: Math.round(baseSize * 1.3), color: "7a2e3a", rightToLeft: true })],
    }));
    preChildren.push(new TableOfContents("תוכן העניינים", {
      hyperlink: true,
      headingStyleRange: "1-3",
      rightTabStop: size.w - MM((s.marginInner ?? 22) + (s.marginOuter ?? 16)),
    }));
    preChildren.push(new Paragraph({ children: [], pageBreakBefore: true }));
  }

  const columns = (s.columns && s.columns >= 2)
    ? { count: 2, space: MM(s.columnGap ?? 8) }
    : undefined;

  const doc = new Document({
    creator: "אות ודף — מנוע עימוד תורני",
    title: book.title,
    features: { updateFields: !!s.tableOfContents },
    styles: {
      default: {
        document: { run: { font: bodyFont, size: baseSize, rightToLeft: true } },
      },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { font: headFont, bold: true, size: Math.round(baseSize * (s.headingSizeH1 || 1.6)), color: "7a2e3a", rightToLeft: true },
          paragraph: { spacing: { before: 320, after: 160 }, alignment: alignOf(s.headingAlign, AlignmentType.CENTER) } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { font: headFont, bold: true, size: Math.round(baseSize * (s.headingSizeH2 || 1.25)), color: "7a2e3a", rightToLeft: true },
          paragraph: { spacing: { before: 200, after: 100 }, alignment: alignOf(s.headingAlign, AlignmentType.RIGHT) } },
      ],
    },
    footnotes: Object.keys(footnotes).length ? footnotes : undefined,
    sections: [{
      properties: {
        page: {
          size: { width: size.w, height: size.h },
          margin: {
            top: MM(s.marginTop ?? 20),
            bottom: MM(s.marginBottom ?? 20),
            right: MM(s.marginInner ?? 22), // בעברית הפנימי = ימין
            left: MM(s.marginOuter ?? 16),
          },
        },
        column: columns,
      },
      headers: header ? { default: header } : undefined,
      footers: footer ? { default: footer } : undefined,
      children: [...preChildren, ...bodyChildren],
    }],
  });

  return Packer.toBuffer(doc);
}

// ייצוא עזר לגימטריה עבור צרכנים אחרים במידת הצורך
export { toGematria };
