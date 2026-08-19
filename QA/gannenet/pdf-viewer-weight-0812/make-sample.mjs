// Builds the 8-page PDF the viewer check is run against. This machine cannot
// fetch a real seed PDF -- NetFree answers 418 to PDF bodies from supabase.co
// (STATUS.md) -- so the file's *bytes* are made locally and served through
// Playwright's network layer at the very URL the page asks for. Everything
// above the network (route, page, component, pdf-lib, download) is the shipped
// code path.
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
// ESM resolution starts at this file, which is outside the app; resolve the
// app's own copy instead of adding a dependency here.
const { PDFDocument, StandardFonts } = createRequire(
  "file:///C:/Users/USER/Downloads/more30/apps/40-gannenet/package.json"
)("pdf-lib");

const doc = await PDFDocument.create();
const font = await doc.embedFont(StandardFonts.Helvetica);
for (let i = 1; i <= 8; i++) {
  const page = doc.addPage([420, 595]);
  page.drawText(`page ${i}`, { x: 40, y: 520, size: 36, font });
}
const bytes = await doc.save();
writeFileSync(new URL("./sample.pdf", import.meta.url), bytes);
console.log(JSON.stringify({ pages: 8, bytes: bytes.length }));
