// ייצוא — PNG ברזולוציה מלאה ו-PDF (jsPDF) מתוך ה-Konva stage,
// וגם SVG פרוגרמטי (ממתאם Figma — סעיף 10 ב-CHECKLIST/graphics.md) מתוך
// מפרט השכבות הניטרלי (TemplateDoc), לא מה-Konva stage עצמו — כדי שהתוצאה
// תהיה שכבות וקטוריות אמיתיות (טקסט/צורות/תמונות נפרדות) שניתנות לעריכה
// ב-Figma, לא ריצוף פיקסלים יחיד.
import { jsPDF } from "jspdf";
import type Konva from "konva";
import type { TemplateDoc, AnyLayer, TextLayer, ImageLayer, ShapeLayer, DecorationLayer } from "@shared/layers";

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

// ---- ייצוא SVG (מתאם Figma) ----

function esc(v: string | number): string {
  return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function commonAttrs(l: AnyLayer): string {
  const parts = [`opacity="${l.opacity ?? 1}"`];
  const blend = l.blend && l.blend !== "source-over" ? cssBlendMode(l.blend) : null;
  if (blend) parts.push(`style="mix-blend-mode:${blend}"`);
  if (l.rotation) {
    const cx = l.x, cy = l.y;
    parts.push(`transform="rotate(${l.rotation} ${cx} ${cy})"`);
  }
  return parts.join(" ");
}

// Konva globalCompositeOperation -> CSS mix-blend-mode (שמות זהים ברוב המקרים)
function cssBlendMode(blend: string): string | null {
  const known = new Set([
    "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn",
    "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity",
  ]);
  return known.has(blend) ? blend : null;
}

// כיוון-בסיס לפי התו החזק הראשון (כמו dir="auto" ב-HTML) — עברית -> rtl,
// לטינית -> ltr, בלי תו חזק (מספרים/סימנים בלבד/ריק) נשאר rtl כברירת המחדל
// המקורית. ה-Stage החי (Konva/Canvas2D, ר' CanvasStage.tsx) לא כופה כיוון
// בכלל ומסתמך על אלגוריתם ה-bidi הטבעי של הדפדפן; ה-SVG הזה חייב direction
// מפורש כי אין ברירת מחדל שקולה בפורמט SVG, ולכן צריך להתאים אותו לתוכן
// בפועל כדי לא לסתור את מה שהמשתמש רואה ומעצב בפועל (למשל שכבת קריאה-לפעולה
// באנגלית בלבד, מחיר, טלפון, כתובת אתר — נפוצים במודעות).
export function baseTextDirection(text: string): "rtl" | "ltr" {
  for (const ch of text) {
    if (/[֐-׿]/.test(ch)) return "rtl";
    if (/[A-Za-z]/.test(ch)) return "ltr";
  }
  return "rtl";
}

function textNodeToSVG(l: TextLayer): string {
  const anchor = l.align === "right" ? "end" : l.align === "left" ? "start" : "middle";
  const tx = l.align === "right" ? l.x + l.width : l.align === "left" ? l.x : l.x + l.width / 2;
  const lines = (l.text || "").split("\n");
  const lh = (l.lineHeight ?? 1.15) * l.fontSize;
  const blockH = lh * lines.length;
  const vAlign = l.verticalAlign ?? "top";
  const startY =
    vAlign === "middle" ? l.y + (l.height ?? blockH) / 2 - blockH / 2 + l.fontSize * 0.85 :
    vAlign === "bottom" ? l.y + (l.height ?? blockH) - blockH + l.fontSize * 0.85 :
    l.y + l.fontSize * 0.85;
  const weight = (l.fontWeight ?? (l.fontStyle?.includes("bold") ? 700 : 400)) || 400;
  const italic = l.fontStyle?.includes("italic") ? "italic" : "normal";
  const stroke = l.stroke ? `stroke="${esc(l.stroke)}" stroke-width="${l.strokeWidth ?? 1}"` : "";
  const direction = baseTextDirection(l.text || "");
  const tspans = lines
    .map((line, i) => `<tspan x="${tx}" y="${startY + i * lh}">${esc(line)}</tspan>`)
    .join("");
  return `<text ${commonAttrs(l)} font-family="${esc(l.fontFamily)}" font-size="${l.fontSize}" font-weight="${weight}" font-style="${italic}" fill="${esc(l.fill)}" ${stroke} text-anchor="${anchor}" direction="${direction}" letter-spacing="${l.letterSpacing ?? 0}" data-layer-id="${esc(l.id)}">${tspans}</text>`;
}

function imageNodeToSVG(l: ImageLayer, idx: number): string {
  if (!l.src) {
    return `<rect x="${l.x}" y="${l.y}" width="${l.width}" height="${l.height ?? l.width}" fill="none" stroke="#999" stroke-dasharray="6,4" ${commonAttrs(l)} data-layer-id="${esc(l.id)}" data-placeholder="image"/>`;
  }
  const w = l.width, h = l.height ?? l.width;
  const clipId = `clip_img_${idx}`;
  let clip = "";
  if (l.circle) {
    clip = `<clipPath id="${clipId}"><circle cx="${l.x + w / 2}" cy="${l.y + h / 2}" r="${Math.min(w, h) / 2}"/></clipPath>`;
  } else if (l.cornerRadius) {
    clip = `<clipPath id="${clipId}"><rect x="${l.x}" y="${l.y}" width="${w}" height="${h}" rx="${l.cornerRadius}"/></clipPath>`;
  }
  const preserve = l.fit === "contain" ? "xMidYMid meet" : l.fit === "fill" ? "none" : "xMidYMid slice";
  const clipAttr = clip ? ` clip-path="url(#${clipId})"` : "";
  return `${clip}<image href="${esc(l.src)}" x="${l.x}" y="${l.y}" width="${w}" height="${h}" preserveAspectRatio="${preserve}"${clipAttr} ${commonAttrs(l)} data-layer-id="${esc(l.id)}"/>`;
}

function shapeNodeToSVG(l: ShapeLayer): string {
  const fill = l.fill ?? "none";
  const stroke = l.stroke ? `stroke="${esc(l.stroke)}" stroke-width="${l.strokeWidth ?? 1}"` : "";
  const dash = l.dash?.length ? `stroke-dasharray="${l.dash.join(",")}"` : "";
  if (l.shape === "circle") {
    const r = l.width / 2;
    return `<circle cx="${l.x + r}" cy="${l.y + (l.height ?? l.width) / 2}" r="${r}" fill="${esc(fill)}" ${stroke} ${dash} ${commonAttrs(l)} data-layer-id="${esc(l.id)}"/>`;
  }
  if (l.shape === "line" && l.points?.length) {
    const pts = [];
    for (let i = 0; i < l.points.length; i += 2) pts.push(`${l.x + l.points[i]},${l.y + l.points[i + 1]}`);
    return `<polyline points="${pts.join(" ")}" fill="none" ${stroke || `stroke="${esc(l.fill ?? "#000")}" stroke-width="2"`} ${dash} ${commonAttrs(l)} data-layer-id="${esc(l.id)}"/>`;
  }
  return `<rect x="${l.x}" y="${l.y}" width="${l.width}" height="${l.height ?? l.width}" rx="${l.cornerRadius ?? 0}" fill="${esc(fill)}" ${stroke} ${dash} ${commonAttrs(l)} data-layer-id="${esc(l.id)}"/>`;
}

// עיטורים (מסגרות/כתרים/מגן-דוד וכו') מצוירים ב-Konva דרך נתיבי-Path ייעודיים
// (lib/ornaments.ts) — לא שוכפלו ל-SVG בסבב הזה; מיוצאים כמלבן-מיקום מתויג
// כדי שמבנה התבנית יישמר בפיגמה, לעיצוב-מחדש ידני של הקישוט עצמו שם.
function decorationNodeToSVG(l: DecorationLayer): string {
  return `<g ${commonAttrs(l)} data-layer-id="${esc(l.id)}" data-decoration-kind="${esc(l.kind)}"><rect x="${l.x}" y="${l.y}" width="${l.width}" height="${l.height ?? l.width}" fill="none" stroke="${esc(l.fill)}" stroke-width="1" stroke-dasharray="4,3"/><text x="${l.x + 4}" y="${l.y + 12}" font-size="10" fill="${esc(l.fill)}">${esc(l.kind)}</text></g>`;
}

function backgroundToSVG(doc: TemplateDoc): string {
  const bg = doc.background;
  if (bg.type === "image" && bg.src) {
    return `<image href="${esc(bg.src)}" x="0" y="0" width="${doc.width}" height="${doc.height}" preserveAspectRatio="xMidYMid slice"/>`;
  }
  if (bg.type === "gradient" && bg.gradient) {
    const angle = ((bg.gradient.angle ?? 135) * Math.PI) / 180;
    const x1 = 50 - Math.cos(angle) * 50, y1 = 50 - Math.sin(angle) * 50;
    const x2 = 50 + Math.cos(angle) * 50, y2 = 50 + Math.sin(angle) * 50;
    return `<defs><linearGradient id="bg_grad" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">` +
      `<stop offset="0%" stop-color="${esc(bg.gradient.from)}"/><stop offset="100%" stop-color="${esc(bg.gradient.to)}"/>` +
      `</linearGradient></defs><rect x="0" y="0" width="${doc.width}" height="${doc.height}" fill="url(#bg_grad)"/>`;
  }
  return `<rect x="0" y="0" width="${doc.width}" height="${doc.height}" fill="${esc(bg.color ?? "#ffffff")}"/>`;
}

/** ממיר TemplateDoc ל-SVG פרוגרמטי אמיתי (שכבות וקטוריות נפרדות, לא ריצוף
 * פיקסלים), לגרירה/ייבוא ישיר ל-Figma (תומך בהדבקת/גרירת SVG כשכבות עריכות).
 * ראה CHECKLIST/graphics.md #10. */
export function stageToSVG(doc: TemplateDoc): string {
  const sorted = [...doc.layers].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
  const body = sorted
    .filter((l) => l.visible !== false)
    .map((l, i) => {
      if (l.type === "text") return textNodeToSVG(l);
      if (l.type === "image") return imageNodeToSVG(l, i);
      if (l.type === "shape") return shapeNodeToSVG(l);
      return decorationNodeToSVG(l);
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${doc.width}" height="${doc.height}" viewBox="0 0 ${doc.width} ${doc.height}">\n${backgroundToSVG(doc)}\n${body}\n</svg>`;
}

export function downloadSVG(doc: TemplateDoc, filename = "modaa.svg") {
  const svg = stageToSVG(doc);
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
