// ייצוא — PNG ברזולוציה מלאה ו-PDF (jsPDF) מתוך ה-Konva stage.
import { jsPDF } from "jspdf";
import type Konva from "konva";

// מייצא את ה-Stage ל-dataURL ברזולוציה מלאה (מפצה על ה-scale של התצוגה)
export function stageToDataURL(stage: Konva.Stage, fullWidth: number): string {
  const displayW = stage.width();
  const pixelRatio = fullWidth / displayW; // מחזיר לרזולוציה מלאה
  return stage.toDataURL({ pixelRatio, mimeType: "image/png" });
}

export function downloadPNG(stage: Konva.Stage, fullWidth: number, filename = "modaa.png") {
  const url = stageToDataURL(stage, fullWidth);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

export function downloadPDF(stage: Konva.Stage, fullWidth: number, fullHeight: number, filename = "modaa.pdf") {
  const url = stageToDataURL(stage, fullWidth);
  const orientation = fullWidth >= fullHeight ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "px", format: [fullWidth, fullHeight] });
  pdf.addImage(url, "PNG", 0, 0, fullWidth, fullHeight);
  pdf.save(filename);
}

// תמונה ממוזערת לתצוגה בגלריה
export function stageThumbnail(stage: Konva.Stage, size = 300): string {
  const ratio = size / stage.width();
  return stage.toDataURL({ pixelRatio: ratio, mimeType: "image/png" });
}
