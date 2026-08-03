// Generate a print-quality PDF from the composed PNG.
import PDFDocument from "pdfkit";

export async function pngToPdf(pngBuffer: Buffer, title = "מודעת שיעור"): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // A4 portrait: 595 x 842 pt
    const doc = new PDFDocument({
      size: "A4",
      margin: 0,
      info: { Title: title, Author: "איגוד השיעורים", Creator: "igud-ads" },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Fit image to page preserving aspect ratio
    doc.image(pngBuffer, 0, 0, { fit: [595, 842], align: "center", valign: "center" });
    doc.end();
  });
}
