// QA only — builds a 12-page PDF used to exercise components/PdfViewer.tsx
// locally (this machine cannot reach the gannenet-shelf bucket: /api/shelf
// answers 502 here).
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { writeFileSync } from "node:fs";

const doc = await PDFDocument.create();
const font = await doc.embedFont(StandardFonts.Helvetica);
for (let p = 1; p <= 12; p++) {
  const page = doc.addPage([595, 842]);
  page.drawText(`QA PAGE ${p}`, { x: 60, y: 700, size: 48, font, color: rgb(0.17, 0.29, 0.55) });
}
writeFileSync(process.argv[2], await doc.save());
console.log("wrote", process.argv[2]);
