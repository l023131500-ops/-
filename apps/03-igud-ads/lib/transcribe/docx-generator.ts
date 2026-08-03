import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  FootnoteReferenceRun, Footer, Header, PageNumber, NumberFormat
} from "docx";
import { parseFootnoteMarkers, extractContext, type Footnote } from "./footnotes";

const FONT = "David";  // פונט עברי בטוח שמותקן ברוב מערכות Office

function rtlPara(text: string, opts: { heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel]; bold?: boolean; size?: number } = {}) {
  const runs = text.split("\n").flatMap((line, i, arr) => {
    const r = [
      new TextRun({ text: line, bold: opts.bold, size: opts.size, font: FONT, rightToLeft: true })
    ];
    if (i < arr.length - 1) r.push(new TextRun({ break: 1 }));
    return r;
  });
  return new Paragraph({
    children: runs,
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
    heading: opts.heading,
    spacing: { after: 120 }
  });
}

function footerFor(label: string) {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        bidirectional: true,
        children: [
          new TextRun({ text: `${label} — תמלול מבית איגוד השיעורים  |  עמוד `, font: FONT, size: 18, rightToLeft: true }),
          new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18 }),
          new TextRun({ text: " / ", font: FONT, size: 18 }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 18 })
        ]
      })
    ]
  });
}

function header() {
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        bidirectional: true,
        children: [
          new TextRun({ text: "תמלול מבית איגוד השיעורים", font: FONT, size: 22, bold: true, rightToLeft: true, color: "1A2E5A" })
        ]
      })
    ]
  });
}

// ============================================================
// קובץ 1 — original.docx: תמלול גולמי לחלוטין
// ============================================================
export async function buildOriginalDocx(opts: {
  title: string;       // שם השיעור / מסלול
  style: string;       // litvish/chassidish/yiddish
  rawText: string;
  date: Date;
}): Promise<Buffer> {
  const { title, style, rawText, date } = opts;

  const intro: Paragraph[] = [
    rtlPara("תמלול גולמי — נאמן למקור", { heading: HeadingLevel.HEADING_1, bold: true, size: 36 }),
    rtlPara(title, { heading: HeadingLevel.HEADING_2, size: 28 }),
    rtlPara(`מסלול: ${style}   |   תאריך הפקה: ${date.toLocaleDateString("he-IL")}`, { size: 20 }),
    rtlPara("הטקסט שלהלן הוא פלט תמלול אוטומטי, ללא עריכה, ללא פיסוק נוסף ובלי כל שינוי תוכן.", { size: 20 }),
    rtlPara("", {}),
  ];

  const body: Paragraph[] = rawText
    .split(/\n+/)
    .filter((l) => l.trim().length > 0)
    .map((line) => rtlPara(line));

  const doc = new Document({
    creator: "תמלול מבית איגוד השיעורים",
    title,
    styles: { default: { document: { run: { font: FONT, rightToLeft: true } } } },
    sections: [{
      properties: { page: { pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } } },
      headers: { default: header() },
      footers: { default: footerFor("גולמי") },
      children: [...intro, ...body]
    }]
  });
  return await Packer.toBuffer(doc);
}

// ============================================================
// קובץ 2 — edited.docx: טקסט ערוך עם פיסוק, כותרות והערות שוליים
// ============================================================
export async function buildEditedDocx(opts: {
  title: string;
  style: string;
  editedText: string;
  footnotes: Footnote[];
  date: Date;
}): Promise<Buffer> {
  const { title, style, editedText, footnotes, date } = opts;
  const { cleanText, markers } = parseFootnoteMarkers(editedText);
  const fnByNum = new Map(footnotes.map((f) => [f.number, f]));

  // נבנה paragraphs לפי שורות, ובכל שורה נטמיע את ה-references במקומות הנכונים
  const paragraphs: Paragraph[] = [
    rtlPara("שיעור — גרסה ערוכה", { heading: HeadingLevel.HEADING_1, bold: true, size: 36 }),
    rtlPara(title, { heading: HeadingLevel.HEADING_2, size: 28 }),
    rtlPara(`מסלול: ${style}   |   תאריך הפקה: ${date.toLocaleDateString("he-IL")}`, { size: 20 }),
    rtlPara("הגרסה הזו עברה עריכה לשונית: פיסוק, חלוקה לפסקאות, כותרות משנה והערות שוליים ממוספרות. תוכן הדברים לא שונה.", { size: 20 }),
    rtlPara("", {}),
  ];

  // נמפה markers לפי position בטקסט הנקי
  const sortedMarkers = [...markers].sort((a, b) => a.index - b.index);

  // נחלק לפסקאות לפי שורות ריקות / כותרות משנה (###)
  const blocks = cleanText.split(/\n{2,}/);
  let cursor = 0;
  for (const block of blocks) {
    const lines = block.split("\n");
    for (const line of lines) {
      if (line.startsWith("### ")) {
        paragraphs.push(rtlPara(line.replace(/^###\s+/, ""), { heading: HeadingLevel.HEADING_2, bold: true, size: 26 }));
        cursor += line.length + 1;
        continue;
      }
      // בנה Paragraph עם runs ועם FootnoteReferenceRun כשנכון
      const runs: any[] = [];
      let i = 0;
      while (i < line.length) {
        // בדוק אם marker מתחיל כאן
        const marker = sortedMarkers.find((m) => m.index === cursor + i);
        if (marker) {
          runs.push(new FootnoteReferenceRun(marker.number));
          i++; continue;  // הוסף 1 כדי לא להיתקע
        }
        // עד ה-marker הבא או סוף השורה
        const next = sortedMarkers.find((m) => m.index > cursor + i);
        const nextIdxInLine = next ? Math.min(line.length, next.index - cursor) : line.length;
        const chunk = line.slice(i, nextIdxInLine);
        if (chunk) runs.push(new TextRun({ text: chunk, font: FONT, rightToLeft: true, size: 22 }));
        i = nextIdxInLine;
        if (i === cursor + (next?.index || 0) - cursor) {
          // עצור כדי שהמעבר הבא יזהה את ה-marker
        }
      }
      paragraphs.push(new Paragraph({
        children: runs.length ? runs : [new TextRun({ text: line, font: FONT, rightToLeft: true, size: 22 })],
        bidirectional: true,
        alignment: AlignmentType.RIGHT,
        spacing: { after: 120 }
      }));
      cursor += line.length + 1;
    }
    cursor += 1; // עוד newline בין בלוקים
    paragraphs.push(rtlPara("", {}));
  }

  // footnotes section (יוטמע ע"י docx)
  const fnObj: Record<number, { children: Paragraph[] }> = {};
  for (const f of footnotes) {
    fnObj[f.number] = {
      children: [
        new Paragraph({
          bidirectional: true,
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({ text: f.note_text + (f.source_ref ? `  (${f.source_ref})` : ""), font: FONT, rightToLeft: true, size: 18 })
          ]
        })
      ]
    };
  }

  const doc = new Document({
    creator: "תמלול מבית איגוד השיעורים",
    title,
    styles: { default: { document: { run: { font: FONT, rightToLeft: true } } } },
    footnotes: fnObj,
    sections: [{
      properties: { page: { pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } } },
      headers: { default: header() },
      footers: { default: footerFor("ערוך") },
      children: paragraphs
    }]
  });
  return await Packer.toBuffer(doc);
}

// ============================================================
// קובץ 3 — sources.docx: רשימת כל המקורות לבדיקה ידנית
// ============================================================
export async function buildSourcesDocx(opts: {
  title: string;
  editedText: string;
  footnotes: Footnote[];
  date: Date;
}): Promise<Buffer> {
  const { title, editedText, footnotes, date } = opts;
  const { cleanText, markers } = parseFootnoteMarkers(editedText);
  const markersByNum = new Map(markers.map((m) => [m.number, m.index]));

  const paragraphs: Paragraph[] = [
    rtlPara("רשימת מקורות והערות שוליים", { heading: HeadingLevel.HEADING_1, bold: true, size: 36 }),
    rtlPara(title, { heading: HeadingLevel.HEADING_2, size: 28 }),
    rtlPara(`תאריך הפקה: ${date.toLocaleDateString("he-IL")}   |   סה״כ הערות: ${footnotes.length}`, { size: 20 }),
    rtlPara("הרשימה מיועדת לבדיקה ידנית של המקורות שזוהו ע״י המערכת. כל הערה מוצגת לצד הקטע בו היא הופיעה.", { size: 20 }),
    rtlPara("", {}),
  ];

  if (footnotes.length === 0) {
    paragraphs.push(rtlPara("לא זוהו מקורות במסמך זה.", { size: 22 }));
  } else {
    for (const f of [...footnotes].sort((a, b) => a.number - b.number)) {
      const pos = markersByNum.get(f.number);
      const ctx = extractContext(cleanText, pos);
      paragraphs.push(rtlPara(`הערה ${f.number}`, { heading: HeadingLevel.HEADING_3, bold: true, size: 26 }));
      paragraphs.push(rtlPara(`מקור: ${f.source_ref || f.note_text}`, { size: 22, bold: true }));
      if (f.note_text && f.note_text !== f.source_ref) {
        paragraphs.push(rtlPara(`פירוט: ${f.note_text}`, { size: 22 }));
      }
      if (ctx) paragraphs.push(rtlPara(`הקשר בטקסט: "…${ctx}…"`, { size: 20 }));
      paragraphs.push(rtlPara("", {}));
    }
  }

  const doc = new Document({
    creator: "תמלול מבית איגוד השיעורים",
    title: title + " — מקורות",
    styles: { default: { document: { run: { font: FONT, rightToLeft: true } } } },
    sections: [{
      properties: { page: { pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } } },
      headers: { default: header() },
      footers: { default: footerFor("מקורות") },
      children: paragraphs
    }]
  });
  return await Packer.toBuffer(doc);
}
