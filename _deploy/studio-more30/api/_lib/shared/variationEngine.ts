// ═══════════════════════════════════════════════════════════════════════════
// מנוע הווריאציות — הלב של ריבוי הסגנונות
// ───────────────────────────────────────────────────────────────────────────
// composeTemplate({ layout, palette, fonts, ornaments, background, fields })
//   → TemplateDoc מלא ומעוצב.
// שילוב של: 8 ארכיטיפי-פריסה × 20 פלטות × 9 זוגות-פונטים × 9 ערכות-עיטור
//            × 8 רקעים  =  ~207,000 קומבינציות תיאורטיות, אלפי מוצלחות.
// ═══════════════════════════════════════════════════════════════════════════

import type { TemplateDoc, AnyLayer, TemplateBackground } from "./layers";
import {
  getPalette, getFontPairing, getOrnamentSet, getBackgroundTreatment,
  type Palette, type FontPairing, type OrnamentSet, type BackgroundTreatment,
} from "./designTokens";

export interface FieldValues {
  opener?: string; // בס"ד / פתיח
  title?: string; // כותרת ראשית
  subtitle?: string; // תת-כותרת
  maggid?: string; // שם הרב / מגיד
  topic?: string; // נושא
  time?: string; // זמן
  place?: string; // מקום
  footer?: string; // תחתית
  banner?: string; // באנר הדגשה
  [k: string]: string | undefined;
}

export interface ComposeSpec {
  layout: string; // מפתח ארכיטיפ
  palette: string; // מפתח פלטה
  fonts: string; // מפתח זוג פונטים
  ornaments: string; // מפתח ערכת עיטור
  background: string; // מפתח רקע
  width: number;
  height: number;
  fields?: FieldValues;
  withPhoto?: boolean; // האם לכלול מקום לתמונת הרב
}

// עזר: שכבת טקסט מלאה עם ברירות מחדל שפויות
function txt(o: Partial<AnyLayer> & {
  id: string; text: string; x: number; y: number; width: number;
  fontFamily: string; fontSize: number; fill: string; role: any;
}): AnyLayer {
  return {
    type: "text", align: "center", autoFit: true, editable: true,
    lineHeight: 1.12, verticalAlign: "middle",
    ...o,
  } as AnyLayer;
}

// ---------------------------------------------------------------------------
// רקע — בונה TemplateBackground + שכבות רקע נוספות (בלוקים/קשתות/פיצול)
// ---------------------------------------------------------------------------
function buildBackground(bt: BackgroundTreatment, p: Palette, w: number, h: number): {
  background: TemplateBackground; extraLayers: AnyLayer[];
} {
  const extra: AnyLayer[] = [];
  let background: TemplateBackground;

  switch (bt.kind) {
    case "gradient":
      background = { type: "gradient", gradient: { from: p.bg1, to: p.bg2, angle: bt.angle ?? 135 }, pattern: bt.pattern, patternColor: p.accent2 };
      break;
    case "solid":
      background = { type: "solid", color: p.bg1, pattern: bt.pattern };
      break;
    case "pattern":
      background = { type: "pattern", color: p.bg1, pattern: bt.pattern ?? "subtle_damask", patternColor: p.accent2 };
      break;
    case "header_block":
      background = { type: "solid", color: p.surface };
      // בלוק כותרת עליון כהה + קו הדגשה
      extra.push(
        { id: "bgHeader", type: "shape", shape: "rect", x: 0, y: 0, width: w, height: Math.round(h * 0.42), fill: p.bg1, locked: true } as AnyLayer,
        { id: "bgHeaderLine", type: "shape", shape: "rect", x: 0, y: Math.round(h * 0.42) - 6, width: w, height: 8, fill: p.accent, locked: true } as AnyLayer,
      );
      break;
    case "split":
      background = { type: "solid", color: p.bg1 };
      // משולש/פיצול אלכסוני בצבע ההדגשה בתחתית
      extra.push(
        { id: "bgSplit", type: "shape", shape: "rect", x: -60, y: h - Math.round(h * 0.28), width: w + 120, height: Math.round(h * 0.32), fill: p.accent, rotation: -(bt.angle ?? 8), opacity: 0.14, locked: true } as AnyLayer,
      );
      break;
    case "arch":
      background = { type: "gradient", gradient: { from: p.bg1, to: p.bg2, angle: 180 } };
      // קשת מוארת עליונה (מסגרת עגולה למעלה)
      extra.push(
        { id: "bgArch", type: "shape", shape: "circle", x: w / 2 - w * 0.55, y: -h * 0.35, width: w * 1.1, height: w * 1.1, stroke: p.accent, strokeWidth: 4, fill: "transparent", opacity: 0.4, locked: true } as AnyLayer,
      );
      break;
    default:
      background = { type: "solid", color: p.bg1 };
  }
  return { background, extraLayers: extra };
}

// ---------------------------------------------------------------------------
// עיטורים — בונה שכבות עיטור לפי ערכת העיטורים
// ---------------------------------------------------------------------------
function buildOrnaments(os: OrnamentSet, p: Palette, w: number, h: number, m: number): AnyLayer[] {
  const L: AnyLayer[] = [];
  // מסגרת
  if (os.frame === "frame_ornate") {
    L.push({ id: "frame", type: "decoration", kind: "frame_ornate", x: m, y: m, width: w - 2 * m, height: h - 2 * m, fill: p.accent, strokeWidth: 3, locked: true } as AnyLayer);
  } else if (os.frame === "frame_double") {
    L.push({ id: "frame", type: "decoration", kind: "frame_double", x: m, y: m, width: w - 2 * m, height: h - 2 * m, fill: p.accent, strokeWidth: 2.5, locked: true } as AnyLayer);
  } else if (os.frame === "frame_mourning") {
    L.push({ id: "frame", type: "decoration", kind: "frame_mourning", x: m, y: m, width: w - 2 * m, height: h - 2 * m, fill: "#000000", strokeWidth: 14, locked: true } as AnyLayer);
  }
  // עיטורי פינה
  if (os.corners) {
    const cs = Math.round(w * 0.11);
    L.push(
      { id: "cornTL", type: "decoration", kind: "corner_ornament", x: m + 6, y: m + 6, width: cs, height: cs, fill: p.accent, locked: true } as AnyLayer,
      { id: "cornTR", type: "decoration", kind: "corner_ornament", x: w - m - cs - 6, y: m + 6, width: cs, height: cs, fill: p.accent, rotation: 90, locked: true } as AnyLayer,
    );
  }
  // פסים עליון/תחתון
  if (os.topBar) {
    L.push(
      { id: "topbar", type: "shape", shape: "rect", x: 0, y: 0, width: w, height: 20, fill: p.accent, locked: true } as AnyLayer,
      { id: "botbar", type: "shape", shape: "rect", x: 0, y: h - 20, width: w, height: 20, fill: p.accent, locked: true } as AnyLayer,
    );
  }
  return L;
}

// כתר עליון (אם יש בערכה)
function crownLayer(os: OrnamentSet, p: Palette, w: number, topY: number): AnyLayer | null {
  if (!os.crown) return null;
  const cw = Math.round(w * 0.13);
  return { id: "crown", type: "decoration", kind: "crown", x: w / 2 - cw / 2, y: topY, width: cw, height: Math.round(cw * 0.78), fill: p.accent, locked: true } as AnyLayer;
}

// מפריד לפי הערכה
function dividerLayer(os: OrnamentSet, p: Palette, w: number, y: number): AnyLayer | null {
  if (os.divider === "none") return null;
  const dw = os.divider === "divider_line" ? Math.round(w * 0.5) : Math.round(w * 0.42);
  if (os.divider === "divider_line") {
    return { id: `div_${y}`, type: "shape", shape: "rect", x: w / 2 - dw / 2, y, width: dw, height: 4, fill: p.accent, locked: true } as AnyLayer;
  }
  return { id: `div_${y}`, type: "decoration", kind: os.divider, x: w / 2 - dw / 2, y: y - 18, width: dw, height: 44, fill: p.accent, locked: true } as AnyLayer;
}

// ---------------------------------------------------------------------------
// ארכיטיפי פריסה — כל אחד מסדר את שכבות התוכן במבנה שונה לגמרי.
// מקבלים (w,h,p,f,os,fields,withPhoto) ומחזירים שכבות תוכן (ללא רקע/מסגרת).
// ---------------------------------------------------------------------------
type LayoutCtx = { w: number; h: number; p: Palette; f: FontPairing; os: OrnamentSet; fields: FieldValues; withPhoto: boolean };

export interface LayoutArchetype {
  key: string;
  label: string;
  description: string;
  build: (ctx: LayoutCtx) => AnyLayer[];
}

const inkFor = (p: Palette) => (p.isDark ? p.inkOnDark : p.ink);

// 1. קלאסי-מרכזי: פתיח, כותרת ענק, מפריד, רב, תמונה, נושא, זמן+מקום
function layoutClassicCentered(c: LayoutCtx): AnyLayer[] {
  const { w, h, p, f, os, fields, withPhoto } = c;
  const m = Math.round(w * 0.065);
  const cw = w - 2 * m;
  const ink = inkFor(p);
  const L: AnyLayer[] = [];
  let y = m + Math.round(h * 0.09);
  const cr = crownLayer(os, p, w, m + Math.round(h * 0.025));
  if (cr) { L.push(cr); y = m + Math.round(h * 0.11); }
  L.push(txt({ id: "opener", text: fields.opener ?? 'בס"ד', x: m, y, width: cw, fontFamily: f.body, fontSize: Math.round(h * 0.026), fill: p.accent, role: "opener", fieldName: "opener", maxFontSize: Math.round(h * 0.032), minFontSize: 14 }));
  y += Math.round(h * 0.05);
  L.push(txt({ id: "title", text: fields.title ?? "כותרת המודעה", x: m, y, width: cw, height: Math.round(h * 0.18), fontFamily: f.title, fontSize: Math.round(h * 0.11), fontWeight: f.titleWeight, fill: ink, role: "title", fieldName: "title", maxFontSize: Math.round(h * 0.13), minFontSize: 40, letterSpacing: 1 }));
  y += Math.round(h * 0.2);
  const dv = dividerLayer(os, p, w, y); if (dv) L.push(dv);
  y += Math.round(h * 0.04);
  L.push(txt({ id: "maggid", text: fields.maggid ?? "הרב שליט\"א", x: m, y, width: cw, height: Math.round(h * 0.09), fontFamily: f.body, fontSize: Math.round(h * 0.046), fontWeight: 700, fill: p.accent, role: "field", fieldName: "maggid", maxFontSize: Math.round(h * 0.055), minFontSize: 22 }));
  y += Math.round(h * 0.1);
  if (withPhoto) {
    const ps = Math.round(w * 0.26);
    L.push({ id: "rabbiPhoto", type: "image", src: null, placeholder: true, circle: true, x: w / 2 - ps / 2, y, width: ps, height: ps, label: "תמונת הרב", fit: "cover" } as AnyLayer);
    y += ps + Math.round(h * 0.02);
  }
  L.push(txt({ id: "topic", text: fields.topic ?? "", x: m, y, width: cw, height: Math.round(h * 0.08), fontFamily: f.body, fontSize: Math.round(h * 0.036), fill: ink, role: "field", fieldName: "topic", maxFontSize: Math.round(h * 0.044), minFontSize: 18 }));
  // תחתית: זמן ומקום
  L.push(txt({ id: "time", text: fields.time ?? "", x: m, y: h - m - Math.round(h * 0.14), width: cw, fontFamily: f.body, fontSize: Math.round(h * 0.036), fontWeight: 700, fill: p.accent, role: "field", fieldName: "time", maxFontSize: Math.round(h * 0.044), minFontSize: 18 }));
  L.push(txt({ id: "place", text: fields.place ?? "", x: m, y: h - m - Math.round(h * 0.08), width: cw, fontFamily: f.body, fontSize: Math.round(h * 0.03), fill: ink, role: "field", fieldName: "place", maxFontSize: Math.round(h * 0.036), minFontSize: 16 }));
  return L;
}

// 2. בלוק כותרת עליון (בוסטון/מודרני): חצי עליון צבע, כותרת ענק, תמונה חוצה גבול
function layoutHeaderBlock(c: LayoutCtx): AnyLayer[] {
  const { w, h, p, f, fields, withPhoto } = c;
  const m = Math.round(w * 0.055);
  const cw = w - 2 * m;
  const headerH = Math.round(h * 0.42);
  const onDark = p.inkOnDark;
  const ink = p.ink;
  const L: AnyLayer[] = [];
  L.push(txt({ id: "opener", text: fields.opener ?? 'בס"ד', x: m, y: Math.round(h * 0.045), width: cw, align: "right", fontFamily: f.body, fontSize: Math.round(h * 0.026), fill: p.accent, role: "opener", fieldName: "opener", maxFontSize: Math.round(h * 0.03), minFontSize: 14 }));
  L.push(txt({ id: "title", text: fields.title ?? "כותרת המודעה", x: m, y: Math.round(h * 0.11), width: cw, height: Math.round(h * 0.24), fontFamily: f.title, fontSize: Math.round(h * 0.1), fontWeight: f.titleWeight, fill: onDark, role: "title", fieldName: "title", maxFontSize: Math.round(h * 0.12), minFontSize: 40, lineHeight: 1.05 }));
  let y = headerH + Math.round(h * 0.02);
  if (withPhoto) {
    const ps = Math.round(w * 0.24);
    L.push({ id: "rabbiPhoto", type: "image", src: null, placeholder: true, circle: true, x: w / 2 - ps / 2, y: headerH - ps / 2, width: ps, height: ps, label: "תמונת הרב", fit: "cover" } as AnyLayer);
    y = headerH + ps / 2 + Math.round(h * 0.02);
  }
  L.push(txt({ id: "maggid", text: fields.maggid ?? "הרב שליט\"א", x: m, y, width: cw, height: Math.round(h * 0.08), fontFamily: f.body, fontSize: Math.round(h * 0.048), fontWeight: 700, fill: ink, role: "field", fieldName: "maggid", maxFontSize: Math.round(h * 0.056), minFontSize: 22 }));
  y += Math.round(h * 0.1);
  // כרטיס נושא
  L.push({ id: "topicCard", type: "shape", shape: "rect", x: m + 20, y, width: cw - 40, height: Math.round(h * 0.1), fill: p.surface, cornerRadius: 16, locked: true } as AnyLayer);
  L.push(txt({ id: "topic", text: fields.topic ?? "", x: m + 40, y: y + Math.round(h * 0.018), width: cw - 80, height: Math.round(h * 0.06), fontFamily: f.body, fontSize: Math.round(h * 0.034), fontWeight: 500, fill: ink, role: "field", fieldName: "topic", maxFontSize: Math.round(h * 0.04), minFontSize: 16 }));
  L.push(txt({ id: "time", text: fields.time ?? "", x: m, y: h - m - Math.round(h * 0.12), width: cw, fontFamily: f.body, fontSize: Math.round(h * 0.036), fontWeight: 700, fill: p.accent, role: "field", fieldName: "time", maxFontSize: Math.round(h * 0.044), minFontSize: 18 }));
  L.push(txt({ id: "place", text: fields.place ?? "", x: m, y: h - m - Math.round(h * 0.06), width: cw, fontFamily: f.body, fontSize: Math.round(h * 0.028), fill: ink, role: "field", fieldName: "place", maxFontSize: Math.round(h * 0.034), minFontSize: 14 }));
  return L;
}

// 3. טיפוגרפי-ענק (סטודיו 7): כותרת עצומה תופסת מרכז, מינימום אלמנטים
function layoutTypeHero(c: LayoutCtx): AnyLayer[] {
  const { w, h, p, f, fields, withPhoto } = c;
  const m = Math.round(w * 0.08);
  const cw = w - 2 * m;
  const ink = inkFor(p);
  const L: AnyLayer[] = [];
  L.push(txt({ id: "opener", text: fields.opener ?? 'בס"ד', x: m, y: Math.round(h * 0.07), width: cw, align: "right", fontFamily: f.body, fontSize: Math.round(h * 0.024), fill: p.accent2, role: "opener", fieldName: "opener", maxFontSize: Math.round(h * 0.03), minFontSize: 13, letterSpacing: 3 }));
  L.push(txt({ id: "subtitle", text: fields.subtitle ?? "", x: m, y: Math.round(h * 0.16), width: cw, fontFamily: f.body, fontSize: Math.round(h * 0.03), fill: p.accent, role: "subtitle", fieldName: "subtitle", maxFontSize: Math.round(h * 0.036), minFontSize: 16, letterSpacing: 2 }));
  L.push(txt({ id: "title", text: fields.title ?? "כותרת ענק", x: m, y: Math.round(h * 0.24), width: cw, height: Math.round(h * 0.34), fontFamily: f.title, fontSize: Math.round(h * 0.16), fontWeight: f.titleWeight, fill: ink, role: "title", fieldName: "title", maxFontSize: Math.round(h * 0.2), minFontSize: 48, lineHeight: 0.98 }));
  L.push({ id: "divline", type: "shape", shape: "rect", x: w / 2 - Math.round(w * 0.12), y: Math.round(h * 0.62), width: Math.round(w * 0.24), height: 4, fill: p.accent, locked: true } as AnyLayer);
  L.push(txt({ id: "maggid", text: fields.maggid ?? "", x: m, y: Math.round(h * 0.67), width: cw, fontFamily: f.body, fontSize: Math.round(h * 0.042), fontWeight: 700, fill: ink, role: "field", fieldName: "maggid", maxFontSize: Math.round(h * 0.05), minFontSize: 20 }));
  L.push(txt({ id: "topic", text: fields.topic ?? "", x: m, y: Math.round(h * 0.74), width: cw, fontFamily: f.body, fontSize: Math.round(h * 0.032), fill: p.accent2, role: "field", fieldName: "topic", maxFontSize: Math.round(h * 0.038), minFontSize: 16 }));
  L.push(txt({ id: "time", text: fields.time ?? "", x: m, y: h - m - Math.round(h * 0.11), width: cw, fontFamily: f.body, fontSize: Math.round(h * 0.034), fontWeight: 700, fill: p.accent, role: "field", fieldName: "time", maxFontSize: Math.round(h * 0.04), minFontSize: 16 }));
  L.push(txt({ id: "place", text: fields.place ?? "", x: m, y: h - m - Math.round(h * 0.06), width: cw, fontFamily: f.body, fontSize: Math.round(h * 0.026), fill: p.accent2, role: "field", fieldName: "place", maxFontSize: Math.round(h * 0.032), minFontSize: 13 }));
  return L;
}

// 4. אסימטרי-צדי (פוטנציאל/מודרני): כותרת מיושרת לצד, אלמנט צבע גדול
function layoutAsymmetric(c: LayoutCtx): AnyLayer[] {
  const { w, h, p, f, fields, withPhoto } = c;
  const m = Math.round(w * 0.06);
  const cw = w - 2 * m;
  const ink = inkFor(p);
  const L: AnyLayer[] = [];
  // בלוק צבע אלכסוני/צדי
  L.push({ id: "sideBlock", type: "shape", shape: "rect", x: w - Math.round(w * 0.22), y: 0, width: Math.round(w * 0.22), height: h, fill: p.accent, opacity: 0.9, locked: true } as AnyLayer);
  L.push(txt({ id: "opener", text: fields.opener ?? 'בס"ד', x: m, y: Math.round(h * 0.06), width: cw - Math.round(w * 0.2), align: "right", fontFamily: f.body, fontSize: Math.round(h * 0.026), fill: p.accent, role: "opener", fieldName: "opener", maxFontSize: Math.round(h * 0.03), minFontSize: 14 }));
  L.push(txt({ id: "title", text: fields.title ?? "כותרת", x: m, y: Math.round(h * 0.14), width: cw - Math.round(w * 0.18), height: Math.round(h * 0.26), align: "right", fontFamily: f.title, fontSize: Math.round(h * 0.11), fontWeight: f.titleWeight, fill: ink, role: "title", fieldName: "title", maxFontSize: Math.round(h * 0.14), minFontSize: 40, lineHeight: 1.02 }));
  L.push(txt({ id: "subtitle", text: fields.subtitle ?? "", x: m, y: Math.round(h * 0.44), width: cw - Math.round(w * 0.18), align: "right", fontFamily: f.body, fontSize: Math.round(h * 0.036), fill: p.accent2, role: "subtitle", fieldName: "subtitle", maxFontSize: Math.round(h * 0.042), minFontSize: 18 }));
  if (withPhoto) {
    const ps = Math.round(w * 0.22);
    L.push({ id: "rabbiPhoto", type: "image", src: null, placeholder: true, circle: true, x: m, y: Math.round(h * 0.54), width: ps, height: ps, label: "תמונת הרב", fit: "cover" } as AnyLayer);
  }
  L.push(txt({ id: "maggid", text: fields.maggid ?? "", x: m, y: Math.round(h * 0.8), width: cw - Math.round(w * 0.18), align: "right", fontFamily: f.body, fontSize: Math.round(h * 0.042), fontWeight: 700, fill: ink, role: "field", fieldName: "maggid", maxFontSize: Math.round(h * 0.05), minFontSize: 20 }));
  L.push(txt({ id: "time", text: fields.time ?? "", x: m, y: h - m - Math.round(h * 0.11), width: cw - Math.round(w * 0.18), align: "right", fontFamily: f.body, fontSize: Math.round(h * 0.034), fontWeight: 700, fill: p.accent, role: "field", fieldName: "time", maxFontSize: Math.round(h * 0.04), minFontSize: 16 }));
  L.push(txt({ id: "place", text: fields.place ?? "", x: m, y: h - m - Math.round(h * 0.06), width: cw - Math.round(w * 0.18), align: "right", fontFamily: f.body, fontSize: Math.round(h * 0.026), fill: p.accent2, role: "field", fieldName: "place", maxFontSize: Math.round(h * 0.032), minFontSize: 13 }));
  return L;
}

// 5. גריד-ימים (סדרת שיעורים): כותרת + טבלת ימים
function layoutWeeklyGrid(c: LayoutCtx): AnyLayer[] {
  const { w, h, p, f, fields } = c;
  const m = Math.round(w * 0.055);
  const cw = w - 2 * m;
  const ink = inkFor(p);
  const L: AnyLayer[] = [];
  L.push(txt({ id: "opener", text: fields.opener ?? "קובעים עיתים", x: m, y: Math.round(h * 0.07), width: cw, fontFamily: f.body, fontSize: Math.round(h * 0.05), fontWeight: 700, fill: p.accent, role: "opener", fieldName: "opener", maxFontSize: Math.round(h * 0.06), minFontSize: 24 }));
  L.push(txt({ id: "title", text: fields.title ?? "לתורה", x: m, y: Math.round(h * 0.13), width: cw, height: Math.round(h * 0.16), fontFamily: f.title, fontSize: Math.round(h * 0.15), fontWeight: f.titleWeight, fill: ink, role: "title", fieldName: "title", maxFontSize: Math.round(h * 0.18), minFontSize: 60 }));
  L.push(txt({ id: "subtitle", text: fields.subtitle ?? "", x: m, y: Math.round(h * 0.32), width: cw, height: Math.round(h * 0.08), fontFamily: f.body, fontSize: Math.round(h * 0.034), fill: p.accent2, role: "subtitle", fieldName: "subtitle", maxFontSize: Math.round(h * 0.04), minFontSize: 16 }));
  L.push({ id: "goldline", type: "shape", shape: "rect", x: m, y: Math.round(h * 0.43), width: cw, height: 5, fill: p.accent, locked: true } as AnyLayer);
  L.push(txt({ id: "banner", text: fields.banner ?? "", x: m, y: Math.round(h * 0.45), width: cw, fontFamily: f.title, fontSize: Math.round(h * 0.04), fontWeight: f.titleWeight, fill: p.accent, role: "field", fieldName: "banner", maxFontSize: Math.round(h * 0.046), minFontSize: 18 }));
  // גריד 5 ימים
  const cols = 5;
  const gridTop = Math.round(h * 0.53);
  const gap = Math.round(w * 0.018);
  const cellW = (cw - (cols - 1) * gap) / cols;
  const cellH = Math.round(h * 0.22);
  const days = ["יום א'", "יום ב'", "יום ג'", "יום ד'", "יום ה'"];
  const defTopics = ["הלכה", "מוסר", "עיון", "פרשה", "גמרא"];
  for (let i = 0; i < cols; i++) {
    const x = m + i * (cellW + gap);
    L.push(
      { id: `daycard${i}`, type: "shape", shape: "rect", x, y: gridTop, width: cellW, height: cellH, fill: p.surface, stroke: p.accent2, strokeWidth: 2, cornerRadius: 12, locked: true } as AnyLayer,
      txt({ id: `dayname${i}`, text: fields[`day${i}_name`] ?? days[i], x: x + 4, y: gridTop + Math.round(cellH * 0.08), width: cellW - 8, fontFamily: f.body, fontSize: Math.round(h * 0.026), fontWeight: 700, fill: p.accent, role: "field", fieldName: `day${i}_name`, maxFontSize: Math.round(h * 0.03), minFontSize: 12 }),
      txt({ id: `daytopic${i}`, text: fields[`day${i}_topic`] ?? defTopics[i], x: x + 4, y: gridTop + Math.round(cellH * 0.34), width: cellW - 8, height: Math.round(cellH * 0.32), fontFamily: f.body, fontSize: Math.round(h * 0.032), fontWeight: 700, fill: ink, role: "field", fieldName: `day${i}_topic`, maxFontSize: Math.round(h * 0.038), minFontSize: 12 }),
      txt({ id: `dayrav${i}`, text: fields[`day${i}_rav`] ?? "הרב כהן", x: x + 4, y: gridTop + Math.round(cellH * 0.76), width: cellW - 8, fontFamily: f.body, fontSize: Math.round(h * 0.02), fill: p.accent2, role: "field", fieldName: `day${i}_rav`, maxFontSize: Math.round(h * 0.024), minFontSize: 10 }),
    );
  }
  L.push(txt({ id: "footer", text: fields.footer ?? "", x: m, y: h - m - Math.round(h * 0.09), width: cw, height: Math.round(h * 0.08), fontFamily: f.body, fontSize: Math.round(h * 0.028), fontWeight: 500, fill: ink, role: "footer", fieldName: "footer", maxFontSize: Math.round(h * 0.034), minFontSize: 14 }));
  return L;
}

// 6. כרטיס-ממורכז (מודרני מוסדי): כרטיס לבן מוגבה במרכז רקע צבעוני
function layoutCardCentered(c: LayoutCtx): AnyLayer[] {
  const { w, h, p, f, fields, withPhoto } = c;
  const cardM = Math.round(w * 0.1);
  const cardX = cardM, cardY = Math.round(h * 0.1);
  const cardW = w - 2 * cardM, cardH = h - 2 * cardY;
  const inm = cardX + Math.round(w * 0.05);
  const inw = cardW - 2 * Math.round(w * 0.05);
  const L: AnyLayer[] = [];
  L.push({ id: "card", type: "shape", shape: "rect", x: cardX, y: cardY, width: cardW, height: cardH, fill: p.surface, cornerRadius: 20, shadowColor: "rgba(0,0,0,0.25)", shadowBlur: 40, locked: true } as AnyLayer);
  const cardInk = "#1A1A1A";
  L.push({ id: "cardAccent", type: "shape", shape: "rect", x: cardX, y: cardY, width: cardW, height: 14, fill: p.accent, cornerRadius: 7, locked: true } as AnyLayer);
  let y = cardY + Math.round(h * 0.05);
  L.push(txt({ id: "opener", text: fields.opener ?? 'בס"ד', x: inm, y, width: inw, fontFamily: f.body, fontSize: Math.round(h * 0.024), fill: p.accent, role: "opener", fieldName: "opener", maxFontSize: Math.round(h * 0.028), minFontSize: 13 }));
  y += Math.round(h * 0.045);
  L.push(txt({ id: "title", text: fields.title ?? "כותרת", x: inm, y, width: inw, height: Math.round(h * 0.16), fontFamily: f.title, fontSize: Math.round(h * 0.09), fontWeight: f.titleWeight, fill: cardInk, role: "title", fieldName: "title", maxFontSize: Math.round(h * 0.11), minFontSize: 38 }));
  y += Math.round(h * 0.18);
  if (withPhoto) {
    const ps = Math.round(w * 0.22);
    L.push({ id: "rabbiPhoto", type: "image", src: null, placeholder: true, circle: true, x: w / 2 - ps / 2, y, width: ps, height: ps, label: "תמונת הרב", fit: "cover" } as AnyLayer);
    y += ps + Math.round(h * 0.02);
  }
  L.push(txt({ id: "maggid", text: fields.maggid ?? "", x: inm, y, width: inw, fontFamily: f.body, fontSize: Math.round(h * 0.042), fontWeight: 700, fill: cardInk, role: "field", fieldName: "maggid", maxFontSize: Math.round(h * 0.05), minFontSize: 20 }));
  y += Math.round(h * 0.08);
  L.push(txt({ id: "topic", text: fields.topic ?? "", x: inm, y, width: inw, fontFamily: f.body, fontSize: Math.round(h * 0.032), fill: "#4a4a4a", role: "field", fieldName: "topic", maxFontSize: Math.round(h * 0.038), minFontSize: 16 }));
  L.push(txt({ id: "time", text: fields.time ?? "", x: inm, y: cardY + cardH - Math.round(h * 0.12), width: inw, fontFamily: f.body, fontSize: Math.round(h * 0.034), fontWeight: 700, fill: p.accent, role: "field", fieldName: "time", maxFontSize: Math.round(h * 0.04), minFontSize: 16 }));
  L.push(txt({ id: "place", text: fields.place ?? "", x: inm, y: cardY + cardH - Math.round(h * 0.06), width: inw, fontFamily: f.body, fontSize: Math.round(h * 0.026), fill: "#4a4a4a", role: "field", fieldName: "place", maxFontSize: Math.round(h * 0.032), minFontSize: 13 }));
  return L;
}

// 7. באנר-עליון + תוכן (עיתונות/מידע): רצועת כותרת חזקה למעלה, גוף מתחת
function layoutBannerTop(c: LayoutCtx): AnyLayer[] {
  const { w, h, p, f, fields } = c;
  const m = Math.round(w * 0.05);
  const cw = w - 2 * m;
  const ink = inkFor(p);
  const bannerH = Math.round(h * 0.22);
  const L: AnyLayer[] = [];
  L.push({ id: "banner", type: "shape", shape: "rect", x: 0, y: 0, width: w, height: bannerH, fill: p.accent, locked: true } as AnyLayer);
  L.push(txt({ id: "title", text: fields.title ?? "כותרת", x: m, y: Math.round(bannerH * 0.2), width: cw, height: Math.round(bannerH * 0.6), fontFamily: f.title, fontSize: Math.round(h * 0.075), fontWeight: f.titleWeight, fill: p.isDark ? p.bg1 : "#FFFFFF", role: "title", fieldName: "title", maxFontSize: Math.round(h * 0.09), minFontSize: 34 }));
  let y = bannerH + Math.round(h * 0.05);
  L.push(txt({ id: "opener", text: fields.opener ?? 'בס"ד', x: m, y, width: cw, fontFamily: f.body, fontSize: Math.round(h * 0.024), fill: p.accent, role: "opener", fieldName: "opener", maxFontSize: Math.round(h * 0.028), minFontSize: 13 }));
  y += Math.round(h * 0.05);
  L.push(txt({ id: "subtitle", text: fields.subtitle ?? "", x: m, y, width: cw, height: Math.round(h * 0.12), fontFamily: f.title, fontSize: Math.round(h * 0.055), fontWeight: 700, fill: ink, role: "subtitle", fieldName: "subtitle", maxFontSize: Math.round(h * 0.065), minFontSize: 26 }));
  y += Math.round(h * 0.16);
  L.push(txt({ id: "maggid", text: fields.maggid ?? "", x: m, y, width: cw, fontFamily: f.body, fontSize: Math.round(h * 0.04), fontWeight: 700, fill: p.accent, role: "field", fieldName: "maggid", maxFontSize: Math.round(h * 0.048), minFontSize: 18 }));
  y += Math.round(h * 0.08);
  L.push(txt({ id: "topic", text: fields.topic ?? "", x: m, y, width: cw, height: Math.round(h * 0.1), fontFamily: f.body, fontSize: Math.round(h * 0.032), fill: ink, role: "field", fieldName: "topic", maxFontSize: Math.round(h * 0.038), minFontSize: 15 }));
  L.push(txt({ id: "time", text: fields.time ?? "", x: m, y: h - m - Math.round(h * 0.11), width: cw, fontFamily: f.body, fontSize: Math.round(h * 0.034), fontWeight: 700, fill: p.accent, role: "field", fieldName: "time", maxFontSize: Math.round(h * 0.04), minFontSize: 16 }));
  L.push(txt({ id: "place", text: fields.place ?? "", x: m, y: h - m - Math.round(h * 0.06), width: cw, fontFamily: f.body, fontSize: Math.round(h * 0.026), fill: ink, role: "field", fieldName: "place", maxFontSize: Math.round(h * 0.032), minFontSize: 13 }));
  return L;
}

// 8. מודעת אבל: מבנה קבוע, שחור-לבן
function layoutMourning(c: LayoutCtx): AnyLayer[] {
  const { w, h, f, fields } = c;
  const m = Math.round(w * 0.09);
  const cw = w - 2 * m;
  const L: AnyLayer[] = [];
  L.push(txt({ id: "opener", text: fields.opener ?? "ברוך דיין האמת", x: m, y: Math.round(h * 0.1), width: cw, fontFamily: f.body, fontSize: Math.round(h * 0.04), fontWeight: 700, fill: "#000000", role: "opener", fieldName: "opener", maxFontSize: Math.round(h * 0.046), minFontSize: 18 }));
  L.push(txt({ id: "subtitle", text: fields.subtitle ?? "בצער רב אנו מודיעים על פטירת", x: m, y: Math.round(h * 0.2), width: cw, fontFamily: f.body, fontSize: Math.round(h * 0.03), fill: "#000000", role: "subtitle", fieldName: "subtitle", maxFontSize: Math.round(h * 0.036), minFontSize: 15 }));
  L.push(txt({ id: "title", text: fields.title ?? "שם הנפטר ז\"ל", x: m, y: Math.round(h * 0.3), width: cw, height: Math.round(h * 0.18), fontFamily: f.title, fontSize: Math.round(h * 0.09), fontWeight: 700, fill: "#000000", role: "title", fieldName: "title", maxFontSize: Math.round(h * 0.11), minFontSize: 34 }));
  L.push(txt({ id: "topic", text: fields.topic ?? "", x: m, y: Math.round(h * 0.52), width: cw, height: Math.round(h * 0.14), fontFamily: f.body, fontSize: Math.round(h * 0.03), fill: "#000000", role: "field", fieldName: "topic", maxFontSize: Math.round(h * 0.036), minFontSize: 14 }));
  L.push(txt({ id: "time", text: fields.time ?? "", x: m, y: Math.round(h * 0.72), width: cw, fontFamily: f.body, fontSize: Math.round(h * 0.03), fontWeight: 700, fill: "#000000", role: "field", fieldName: "time", maxFontSize: Math.round(h * 0.036), minFontSize: 14 }));
  L.push(txt({ id: "place", text: fields.place ?? "", x: m, y: Math.round(h * 0.8), width: cw, fontFamily: f.body, fontSize: Math.round(h * 0.026), fill: "#000000", role: "field", fieldName: "place", maxFontSize: Math.round(h * 0.032), minFontSize: 13 }));
  L.push(txt({ id: "footer", text: fields.footer ?? "תנצב\"ה", x: m, y: h - m - Math.round(h * 0.06), width: cw, fontFamily: f.body, fontSize: Math.round(h * 0.026), fontWeight: 700, fill: "#000000", role: "footer", fieldName: "footer", maxFontSize: Math.round(h * 0.03), minFontSize: 13 }));
  return L;
}

export const LAYOUTS: LayoutArchetype[] = [
  { key: "classic_centered", label: "קלאסי-מרכזי", description: "פתיח, כותרת ענק, מפריד, רב, תמונה, זמן ומקום", build: layoutClassicCentered },
  { key: "header_block", label: "בלוק כותרת עליון", description: "חצי עליון צבעוני, תמונה חוצה גבול, כרטיס נושא", build: layoutHeaderBlock },
  { key: "type_hero", label: "טיפוגרפי-ענק", description: "כותרת עצומה במרכז, מינימליזם, סטודיו-7", build: layoutTypeHero },
  { key: "asymmetric", label: "אסימטרי-צדי", description: "יישור צדי, בלוק צבע גדול, אנרגטי", build: layoutAsymmetric },
  { key: "weekly_grid", label: "גריד ימים", description: "כותרת + טבלת ימי שבוע לסדרת שיעורים", build: layoutWeeklyGrid },
  { key: "card_centered", label: "כרטיס מרכזי", description: "כרטיס מוגבה במרכז רקע צבעוני", build: layoutCardCentered },
  { key: "banner_top", label: "באנר עליון", description: "רצועת כותרת חזקה למעלה, מידע מתחת", build: layoutBannerTop },
  { key: "mourning", label: "מודעת אבל", description: "מבנה מסורתי שחור-לבן", build: layoutMourning },
];

export const getLayout = (key: string) => LAYOUTS.find((l) => l.key === key) || LAYOUTS[0];

// ═══════════════════════════════════════════════════════════════════════════
// המרכיב הראשי — composeTemplate
// ═══════════════════════════════════════════════════════════════════════════
export function composeTemplate(spec: ComposeSpec): TemplateDoc {
  const { width: w, height: h } = spec;
  const p = getPalette(spec.palette);
  const f = getFontPairing(spec.fonts);
  const os = getOrnamentSet(spec.ornaments);
  const bt = getBackgroundTreatment(spec.background);
  const fields = spec.fields ?? {};
  const withPhoto = spec.withPhoto ?? true;
  const m = Math.round(w * 0.055);

  const { background, extraLayers } = buildBackground(bt, p, w, h);
  const ornamentLayers = buildOrnaments(os, p, w, h, m);
  const content = getLayout(spec.layout).build({ w, h, p, f, os, fields, withPhoto });

  // סדר שכבות: רקע-נוסף → עיטורים → תוכן
  const layers: AnyLayer[] = [...extraLayers, ...ornamentLayers, ...content];
  return { width: w, height: h, background, layers };
}
