// הגדרות תבניות מובנות — עיצובים אמיתיים ברמת מעצב.
// כל תבנית מגדירה שכבות ממוקמות (title ענק, שדות, עיטורים, מסגרת, מקום לתמונה).
// הטקסט הוא שכבה נפרדת עם פונט אמיתי — לא "תמונת AI עם טקסט".
// בהשראת דוגמת האיכות shiur1.jpg: כותרת ענקית, היררכיה עשירה, גריד, לוגו למעלה.

import type { TemplateDoc, AnyLayer } from "./layers";
import { getStyle } from "./styles";
import { renderCategoryTemplate } from "./categoryTemplates";

export interface TemplateDef {
  key: string;
  category: string; // מפתח קטגוריה מ-knowledge.ts
  style: string;
  format: string;
  name: string;
  build: (w: number, h: number) => TemplateDoc;
}

// ברירת מחדל: פוסט לאורך 1080×1350
const W = 1080;
const H = 1350;

// עזר ליצירת שכבת טקסט
function T(o: Partial<AnyLayer> & { id: string; text: string; x: number; y: number; width: number; fontFamily: string; fontSize: number; fill: string; role: any }): AnyLayer {
  return {
    type: "text",
    align: "center",
    autoFit: true,
    editable: true,
    lineHeight: 1.15,
    ...o,
  } as AnyLayer;
}

/* =========================================================================
   1. שיעור תורה — מלכות (malchut): נייבי מלכותי, מסגרת זהב מפוארת, כתר
   ========================================================================= */
function shiurMalchut(w = W, h = H): TemplateDoc {
  const s = getStyle("malchut");
  const m = 70; // margin
  return {
    width: w,
    height: h,
    background: {
      type: "gradient",
      gradient: { from: "#0B1E3D", to: "#050E1F", angle: 135 },
      pattern: "vignette",
    },
    layers: [
      // מסגרת זהב מפוארת
      { id: "frame", type: "decoration", kind: "frame_ornate", x: m, y: m, width: w - 2 * m, height: h - 2 * m, fill: s.palette.accent, strokeWidth: 3, locked: true },
      // עיטורי פינה
      { id: "cornTR", type: "decoration", kind: "corner_ornament", x: w - m - 130, y: m + 6, width: 124, height: 124, fill: s.palette.accent, rotation: 90, locked: true },
      { id: "cornTL", type: "decoration", kind: "corner_ornament", x: m + 6, y: m + 6, width: 124, height: 124, fill: s.palette.accent, locked: true },
      // כתר עליון
      { id: "crown", type: "decoration", kind: "crown", x: w / 2 - 70, y: m + 34, width: 140, height: 110, fill: s.palette.accent, locked: true },
      // בס"ד
      T({ id: "opener", text: 'בס"ד', x: m + 40, y: m + 150, width: w - 2 * m - 80, fontFamily: "Frank Ruhl Libre", fontSize: 34, fill: s.palette.accent, role: "opener", fieldName: "opener", maxFontSize: 40, minFontSize: 20 }),
      // כותרת ענקית
      T({ id: "title", text: "שיעור עיון בגמרא", x: m + 30, y: m + 210, width: w - 2 * m - 60, height: 240, fontFamily: "David Libre", fontSize: 150, fontWeight: 700, fill: s.palette.textLight, role: "title", fieldName: "title", maxFontSize: 170, minFontSize: 60, letterSpacing: 1 }),
      // מפריד מעוטר
      { id: "div1", type: "decoration", kind: "divider_ornament", x: w / 2 - 200, y: m + 470, width: 400, height: 44, fill: s.palette.accent, locked: true },
      // מגיד השיעור
      T({ id: "maggid", text: "הגאון רבי יעקב לוי שליט\"א", x: m + 40, y: m + 540, width: w - 2 * m - 80, height: 130, fontFamily: "Frank Ruhl Libre", fontSize: 62, fontWeight: 700, fill: s.palette.accent, role: "field", fieldName: "maggid", maxFontSize: 72, minFontSize: 34 }),
      // מקום לתמונת הרב (עגול, ממוסגר זהב)
      { id: "rabbiPhoto", type: "image", src: null, placeholder: true, circle: true, x: w / 2 - 150, y: m + 690, width: 300, height: 300, label: "תמונת הרב", fit: "cover", locked: false },
      // נושא
      T({ id: "topic", text: "מסכת בבא קמא — סוגיית 'שור שנגח'", x: m + 40, y: h - m - 340, width: w - 2 * m - 80, height: 100, fontFamily: "Frank Ruhl Libre", fontSize: 48, fill: s.palette.textLight, role: "field", fieldName: "topic", maxFontSize: 56, minFontSize: 26 }),
      // זמן ומקום — שורת מידע תחתונה
      T({ id: "time", text: "בין מנחה למעריב", x: m + 40, y: h - m - 220, width: w - 2 * m - 80, fontFamily: "Frank Ruhl Libre", fontSize: 44, fontWeight: 700, fill: s.palette.accent, role: "field", fieldName: "time", maxFontSize: 52, minFontSize: 24 }),
      T({ id: "place", text: "היכל הישיבה 'עטרת שלמה'", x: m + 40, y: h - m - 150, width: w - 2 * m - 80, fontFamily: "Frank Ruhl Libre", fontSize: 40, fill: s.palette.textLight, role: "field", fieldName: "place", maxFontSize: 48, minFontSize: 22 }),
      // מפריד תחתון
      { id: "div2", type: "decoration", kind: "flourish", x: w / 2 - 160, y: h - m - 90, width: 320, height: 40, fill: s.palette.accent, locked: true },
    ],
  };
}

/* =========================================================================
   2. שיעור תורה — חסידי-מלכותי (chasidic_royal): בורדו עמוק, זהב עתיק
   ========================================================================= */
function shiurChasidicRoyal(w = W, h = H): TemplateDoc {
  const s = getStyle("chasidic_royal");
  const m = 64;
  return {
    width: w,
    height: h,
    background: {
      type: "gradient",
      gradient: { from: "#5C0A1E", to: "#2E0510", angle: 160 },
      pattern: "subtle_damask",
      patternColor: "#7a1428",
    },
    layers: [
      // פס עליון זהב
      { id: "topbar", type: "shape", shape: "rect", x: 0, y: 0, width: w, height: 24, fill: s.palette.accent, locked: true },
      { id: "botbar", type: "shape", shape: "rect", x: 0, y: h - 24, width: w, height: 24, fill: s.palette.accent, locked: true },
      // מסגרת כפולה
      { id: "frame", type: "decoration", kind: "frame_double", x: m, y: m, width: w - 2 * m, height: h - 2 * m, fill: s.palette.accent, strokeWidth: 2.5, locked: true },
      // בס"ד + פסוק פתיחה
      T({ id: "opener", text: "ישבעו ויתענגו מטובך", x: m + 40, y: m + 60, width: w - 2 * m - 80, fontFamily: "Frank Ruhl Libre", fontSize: 40, fill: s.palette.accent, role: "opener", fieldName: "opener", maxFontSize: 48, minFontSize: 24 }),
      // כותרת ענק
      T({ id: "title", text: "שיעור בפנימיות התורה", x: m + 24, y: m + 140, width: w - 2 * m - 48, height: 280, fontFamily: "David Libre", fontSize: 130, fontWeight: 700, fill: s.palette.textLight, role: "title", fieldName: "title", maxFontSize: 150, minFontSize: 54 }),
      // מפריד
      { id: "div1", type: "decoration", kind: "divider_ornament", x: w / 2 - 220, y: m + 440, width: 440, height: 46, fill: s.palette.accent, locked: true },
      // מסגרת פנימית לשם המגיד — כרטיס זהב
      { id: "maggidCard", type: "shape", shape: "rect", x: m + 70, y: m + 520, width: w - 2 * m - 140, height: 150, fill: "rgba(201,162,39,0.12)", stroke: s.palette.accent, strokeWidth: 2, cornerRadius: 12, locked: true },
      T({ id: "maggid", text: "מורנו הגאון רבי משה שטרן שליט\"א", x: m + 90, y: m + 545, width: w - 2 * m - 180, height: 100, fontFamily: "Frank Ruhl Libre", fontSize: 58, fontWeight: 700, fill: s.palette.accent, role: "field", fieldName: "maggid", maxFontSize: 66, minFontSize: 30 }),
      // תמונת הרב
      { id: "rabbiPhoto", type: "image", src: null, placeholder: true, circle: true, x: w / 2 - 140, y: m + 710, width: 280, height: 280, label: "תמונת הרב", fit: "cover" },
      // נושא
      T({ id: "topic", text: "מאמרי חסידות לעבודת השי\"ת", x: m + 40, y: h - m - 360, width: w - 2 * m - 80, height: 110, fontFamily: "Frank Ruhl Libre", fontSize: 50, fill: s.palette.textLight, role: "field", fieldName: "topic", maxFontSize: 58, minFontSize: 26 }),
      // זמן ומקום
      T({ id: "time", text: "כל בוקר לפני התפילה בשעה 6:15", x: m + 40, y: h - m - 230, width: w - 2 * m - 80, fontFamily: "Frank Ruhl Libre", fontSize: 46, fontWeight: 700, fill: s.palette.accent, role: "field", fieldName: "time", maxFontSize: 54, minFontSize: 24 }),
      T({ id: "place", text: "בית המדרש הגדול", x: m + 40, y: h - m - 155, width: w - 2 * m - 80, fontFamily: "Frank Ruhl Libre", fontSize: 40, fill: s.palette.textLight, role: "field", fieldName: "place", maxFontSize: 48, minFontSize: 22 }),
    ],
  };
}

/* =========================================================================
   3. שיעור תורה — מודרני-תורני (modern_torani): נקי, כחול/לבן, מגע זהב
   ========================================================================= */
function shiurModern(w = W, h = H): TemplateDoc {
  const s = getStyle("modern_torani");
  return {
    width: w,
    height: h,
    background: { type: "solid", color: "#F7F9FC" },
    layers: [
      // בלוק כותרת עליון כחול
      { id: "headerBlock", type: "shape", shape: "rect", x: 0, y: 0, width: w, height: 560, fill: s.palette.primary, locked: true },
      // קו זהב מפריד
      { id: "goldline", type: "shape", shape: "rect", x: 0, y: 556, width: w, height: 8, fill: s.palette.accent, locked: true },
      // בס"ד
      T({ id: "opener", text: 'בס"ד', x: 60, y: 60, width: w - 120, align: "right", fontFamily: "Assistant", fontSize: 34, fill: s.palette.accent, role: "opener", fieldName: "opener", maxFontSize: 40, minFontSize: 20 }),
      // כותרת ענק לבנה
      T({ id: "title", text: "שיעור הלכה למעשה", x: 60, y: 150, width: w - 120, height: 300, fontFamily: "Assistant", fontSize: 128, fontWeight: 800, fill: "#FFFFFF", role: "title", fieldName: "title", maxFontSize: 148, minFontSize: 52, lineHeight: 1.05 }),
      // תמונת הרב — ריבוע מעוגל שחוצה את הגבול
      { id: "rabbiPhoto", type: "image", src: null, placeholder: true, circle: true, x: w / 2 - 130, y: 430, width: 260, height: 260, label: "תמונת הרב", fit: "cover", cornerRadius: 130 },
      // שם המגיד
      T({ id: "maggid", text: "הרב יואל שפיגלר שליט\"א", x: 60, y: 730, width: w - 120, height: 110, fontFamily: "Heebo", fontSize: 64, fontWeight: 700, fill: s.palette.primary, role: "field", fieldName: "maggid", maxFontSize: 72, minFontSize: 32 }),
      // נושא — כרטיס
      { id: "topicCard", type: "shape", shape: "rect", x: 90, y: 860, width: w - 180, height: 130, fill: s.palette.secondary, cornerRadius: 16, locked: true },
      T({ id: "topic", text: "הלכות שבת — הוצאה מרשות לרשות", x: 120, y: 885, width: w - 240, height: 80, fontFamily: "Heebo", fontSize: 46, fontWeight: 500, fill: s.palette.primary, role: "field", fieldName: "topic", maxFontSize: 54, minFontSize: 24 }),
      // שורת זמן ומקום עם אייקונים (טקסט)
      T({ id: "time", text: "כל יום חמישי · 20:30", x: 60, y: 1050, width: w - 120, fontFamily: "Heebo", fontSize: 48, fontWeight: 700, fill: s.palette.accent, role: "field", fieldName: "time", maxFontSize: 56, minFontSize: 26 }),
      T({ id: "place", text: "בית הכנסת 'אהל יעקב', רחוב הרב קוק 12", x: 60, y: 1130, width: w - 120, fontFamily: "Heebo", fontSize: 38, fill: s.palette.primary, role: "field", fieldName: "place", maxFontSize: 44, minFontSize: 20 }),
      // פס תחתון כחול
      { id: "footerBlock", type: "shape", shape: "rect", x: 0, y: h - 60, width: w, height: 60, fill: s.palette.primary, locked: true },
    ],
  };
}

/* =========================================================================
   4. סדרת שיעורים — גריד ימים (בהשראת shiur1.jpg) — מודרני
   ========================================================================= */
function shiurGridWeekly(w = W, h = H): TemplateDoc {
  const s = getStyle("modern_torani");
  const cols = 5;
  const gridTop = 720;
  const cellW = (w - 120 - (cols - 1) * 20) / cols;
  const days = ["יום א'", "יום ב'", "יום ג'", "יום ד'", "יום ה'"];
  const dayLayers: AnyLayer[] = [];
  for (let i = 0; i < cols; i++) {
    const x = 60 + i * (cellW + 20);
    dayLayers.push(
      { id: `daycard${i}`, type: "shape", shape: "rect", x, y: gridTop, width: cellW, height: 300, fill: "#FFFFFF", stroke: s.palette.secondary, strokeWidth: 2, cornerRadius: 12, locked: true } as AnyLayer,
      T({ id: `dayname${i}`, text: days[i], x: x + 6, y: gridTop + 18, width: cellW - 12, fontFamily: "Heebo", fontSize: 34, fontWeight: 700, fill: s.palette.accent, role: "field", fieldName: `day${i}_name`, maxFontSize: 38, minFontSize: 18 }),
      T({ id: `daytopic${i}`, text: ["הלכה", "מוסר", "עיון", "פרשה", "גמרא"][i], x: x + 6, y: gridTop + 90, width: cellW - 12, height: 100, fontFamily: "Heebo", fontSize: 40, fontWeight: 700, fill: s.palette.primary, role: "field", fieldName: `day${i}_topic`, maxFontSize: 46, minFontSize: 18 }),
      T({ id: `dayrav${i}`, text: "הרב כהן", x: x + 6, y: gridTop + 220, width: cellW - 12, fontFamily: "Heebo", fontSize: 26, fill: "#5a6b82", role: "field", fieldName: `day${i}_rav`, maxFontSize: 30, minFontSize: 14 }),
    );
  }
  return {
    width: w,
    height: h,
    background: { type: "gradient", gradient: { from: "#E8EDF3", to: "#F7F9FC", angle: 180 } },
    layers: [
      T({ id: "opener", text: "קובעים עיתים", x: 60, y: 130, width: w - 120, fontFamily: "Assistant", fontSize: 72, fontWeight: 700, fill: s.palette.primary, role: "opener", fieldName: "opener", maxFontSize: 84, minFontSize: 36 }),
      T({ id: "title", text: "לתורה", x: 60, y: 210, width: w - 120, height: 220, fontFamily: "Assistant", fontSize: 200, fontWeight: 800, fill: s.palette.primary, role: "title", fieldName: "title", maxFontSize: 230, minFontSize: 90 }),
      T({ id: "subtitle", text: "הצטרפו לבית מדרש ערב · שיעורים מדי יום", x: 60, y: 470, width: w - 120, height: 120, fontFamily: "Heebo", fontSize: 46, fill: "#3a4a63", role: "subtitle", fieldName: "subtitle", maxFontSize: 54, minFontSize: 24 }),
      { id: "goldline", type: "shape", shape: "rect", x: 60, y: 640, width: w - 120, height: 5, fill: s.palette.accent, locked: true },
      T({ id: "banner", text: "חדש! כל ערב בשעה 20:00", x: 60, y: 660, width: w - 120, fontFamily: "Assistant", fontSize: 54, fontWeight: 800, fill: s.palette.accent, role: "field", fieldName: "banner", maxFontSize: 62, minFontSize: 28 }),
      ...dayLayers,
      T({ id: "footer", text: "שיעור דף יומי 19:00 · תפילת ערבית 19:50 · כיבוד קל", x: 60, y: h - 180, width: w - 120, height: 120, fontFamily: "Heebo", fontSize: 40, fontWeight: 500, fill: s.palette.primary, role: "footer", fieldName: "footer", maxFontSize: 46, minFontSize: 20 }),
    ],
  };
}

/* =========================================================================
   5-9. תבניות קבוצה מובילה לכל אחת משלוש הקבוצות שהיו "בקרוב" — בונות
   דרך מנוע-הווריאציות (composeTemplate, shared/categoryTemplates.ts), אותו
   מנוע אמיתי שכבר מפעיל את קטלוג התבניות של שיעורי תורה מאחורי הקלעים.
   לא placeholder: כל שכבה מרונדרת בפועל (רקע/עיטורים/טיפוגרפיה/שדות).
   ========================================================================= */
function fromCategoryTemplate(categoryKey: string, templateKey: string) {
  return (w = W, h = H): TemplateDoc => {
    const doc = renderCategoryTemplate(categoryKey, templateKey, w, h);
    if (!doc) throw new Error(`category template not found: ${categoryKey}/${templateKey}`);
    return doc;
  };
}

export const TEMPLATE_DEFS: TemplateDef[] = [
  { key: "shiur_malchut", category: "shiur_gemara", style: "malchut", format: "ig_feed_45", name: "שיעור — מלכות", build: shiurMalchut },
  { key: "shiur_chasidic", category: "shiur_chasidut", style: "chasidic_royal", format: "ig_feed_45", name: "שיעור — חסידי מלכותי", build: shiurChasidicRoyal },
  { key: "shiur_modern", category: "shiur_halacha", style: "modern_torani", format: "ig_feed_45", name: "שיעור — מודרני", build: shiurModern },
  { key: "shiur_grid", category: "shiur_series", style: "modern_torani", format: "ig_feed_45", name: "סדרת שיעורים — גריד ימים", build: shiurGridWeekly },
  // מעגל החיים — חתונה (הקטגוריה המובילה בקבוצה)
  { key: "wedding_gold_white", category: "wedding_chasidic", style: "malchut", format: "ig_feed_45", name: "הזמנת חתונה — זהב על לבן", build: fromCategoryTemplate("wedding_chasidic", "wedding_gold_white") },
  // מעגל השנה — ברכת ראש השנה (הקטגוריה המובילה בקבוצה)
  { key: "rosh_hashana_malchut", category: "rosh_hashana", style: "malchut", format: "ig_feed_45", name: "ברכת ראש השנה — מלכות", build: fromCategoryTemplate("rosh_hashana", "malchut_navy") },
  // אירועים וארגונים — הכנסת ספר תורה (הקטגוריה המובילה בקבוצה)
  { key: "hachnasat_sefer_torah_malchut", category: "hachnasat_sefer_torah", style: "malchut", format: "ig_feed_45", name: "הכנסת ספר תורה — מלכות", build: fromCategoryTemplate("hachnasat_sefer_torah", "malchut_navy") },
];

export const getTemplateDef = (key: string) => TEMPLATE_DEFS.find((t) => t.key === key);
