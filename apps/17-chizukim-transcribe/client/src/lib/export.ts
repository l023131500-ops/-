import { saveAs } from "file-saver";
import type { Recording } from "./supabase";
import { recordingTitle } from "./format";

// Split edited text into structured blocks: {type:'h'|'p', text}
function parseBlocks(text: string): { type: "h" | "p"; text: string }[] {
  return text
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((block) => {
      const h = block.match(/^\*\*(.+?)\*\*$/);
      if (h) return { type: "h" as const, text: h[1] };
      return { type: "p" as const, text: block.replace(/\*\*(.+?)\*\*/g, "$1") };
    });
}

function fileBase(r: Recording): string {
  const t = recordingTitle(r).replace(/[\\/:*?"<>|]/g, "").slice(0, 80);
  return t || `הקלטה_${r.seq ?? ""}`;
}

export async function exportWord(r: Recording, which: "edited" | "raw") {
  // Lazy-load docx so it is code-split out of the main bundle.
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } =
    await import("docx");
  const title = recordingTitle(r);
  const body: any[] = [];

  body.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: title, rightToLeft: true, size: 40, bold: true })],
    }),
  );
  if (r.parsha_or_date) {
    body.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        bidirectional: true,
        children: [
          new TextRun({ text: r.parsha_or_date, rightToLeft: true, italics: true, size: 24 }),
        ],
        spacing: { after: 240 },
      }),
    );
  }

  const content = which === "edited" ? r.edited_transcript : r.raw_transcript;
  if (which === "edited" && content) {
    for (const blk of parseBlocks(content)) {
      body.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          bidirectional: true,
          heading: blk.type === "h" ? HeadingLevel.HEADING_2 : undefined,
          children: [
            new TextRun({
              text: blk.text,
              rightToLeft: true,
              bold: blk.type === "h",
              size: blk.type === "h" ? 28 : 24,
            }),
          ],
          spacing: { after: blk.type === "h" ? 120 : 200 },
        }),
      );
    }
  } else if (content) {
    for (const para of content.split(/\n+/).filter(Boolean)) {
      body.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          bidirectional: true,
          children: [new TextRun({ text: para, rightToLeft: true, size: 24 })],
          spacing: { after: 200 },
        }),
      );
    }
  }

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "David" } },
      },
    },
    sections: [{ properties: {}, children: body }],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${fileBase(r)}${which === "raw" ? "_גולמי" : ""}.docx`);
}

// PDF via a styled print window (handles Hebrew fonts natively via the browser).
export function exportPdf(r: Recording, which: "edited" | "raw") {
  const title = recordingTitle(r);
  const content = which === "edited" ? r.edited_transcript : r.raw_transcript;
  let inner = "";
  if (which === "edited" && content) {
    inner = parseBlocks(content)
      .map((b) =>
        b.type === "h"
          ? `<h2>${esc(b.text)}</h2>`
          : `<p>${esc(b.text).replace(/\n/g, "<br/>")}</p>`,
      )
      .join("");
  } else if (content) {
    inner = content
      .split(/\n+/)
      .filter(Boolean)
      .map((p) => `<p>${esc(p)}</p>`)
      .join("");
  }

  const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">
  <title>${esc(title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;700&display=swap" rel="stylesheet">
  <style>
    @page { margin: 2.2cm; }
    body { font-family:'Frank Ruhl Libre',serif; direction:rtl; color:#1a1a1a; line-height:1.9; }
    h1 { font-size:24pt; margin:0 0 4pt; }
    .date { font-style:italic; color:#555; margin-bottom:20pt; font-size:12pt; }
    h2 { font-size:15pt; color:#26365c; margin:18pt 0 6pt; }
    p { font-size:12.5pt; margin:0 0 10pt; text-align:justify; }
  </style></head><body>
  <h1>${esc(title)}</h1>
  ${r.parsha_or_date ? `<div class="date">${esc(r.parsha_or_date)}</div>` : ""}
  ${inner}
  <script>window.onload=function(){setTimeout(function(){window.print();},400);};</script>
  </body></html>`;

  const w = window.open("", "_blank");
  if (!w) {
    alert("החלון נחסם. אנא אפשר חלונות קופצים כדי להוריד PDF.");
    return;
  }
  w.document.write(html);
  w.document.close();
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
