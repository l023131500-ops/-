// סכמת השכבות — לב מנוע העיצוב.
// כל תבנית = { width, height, background, layers[] }.
// כל שכבה היא אובייקט עם type, מיקום, ומאפיינים ספציפיים.

export type LayerRole =
  | "opener" // בס"ד / פתיח
  | "title" // כותרת ראשית ענקית
  | "subtitle" // תת-כותרת
  | "body" // גוף
  | "field" // שדה מובנה (שם הרב, זמן, מקום...)
  | "footer" // תחתית
  | "decoration"
  | "background";

export interface BaseLayer {
  id: string;
  type: "text" | "image" | "shape" | "decoration";
  x: number;
  y: number;
  width: number;
  height?: number;
  rotation?: number;
  opacity?: number;
  blend?: string; // מצב מיזוג (Konva/Canvas globalCompositeOperation) — "source-over" = רגיל
  visible?: boolean;
  locked?: boolean; // לא ניתן לגרירה/מחיקה ע"י המשתמש
  z?: number;
}

export interface TextLayer extends BaseLayer {
  type: "text";
  text: string;
  fontFamily: string;
  fontSize: number; // גודל התחלתי (autoFit יכול להקטין)
  fontStyle?: "normal" | "bold" | "italic" | "bold italic";
  fontWeight?: number; // 400/500/700/900 — ממופה ל-fontStyle ב-Konva
  fill: string;
  align?: "right" | "center" | "left";
  verticalAlign?: "top" | "middle" | "bottom";
  lineHeight?: number;
  letterSpacing?: number;
  kerning?: boolean; // false = מבטל זיווג-אותיות (kerning pairs) של הדפדפן — ברירת מחדל true (זהה להתנהגות הקיימת)
  autoFit?: boolean; // shrink-to-fit לתוך width/height
  minFontSize?: number;
  maxFontSize?: number;
  role: LayerRole;
  fieldName?: string; // קישור לשדה בבסיס-הידע (למילוי אוטומטי)
  // אפקטים
  stroke?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  editable?: boolean; // האם המשתמש יכול לערוך את הטקסט
  label?: string; // תווית ידידותית בפאנל השכבות
}

export interface ImageLayer extends BaseLayer {
  type: "image";
  src: string | null; // data URL / URL
  placeholder?: boolean; // אם true — מציג מסגרת "העלה תמונה"
  fit?: "cover" | "contain" | "fill";
  cornerRadius?: number;
  label?: string; // "תמונת הרב", "לוגו"
  circle?: boolean; // חיתוך עגול
}

export interface ShapeLayer extends BaseLayer {
  type: "shape";
  shape: "rect" | "circle" | "line";
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  dash?: number[];
  points?: number[]; // ל-line
}

export type DecorationKind =
  | "frame_double" // מסגרת כפולה קלאסית
  | "frame_ornate" // מסגרת מפוארת (זהב)
  | "frame_mourning" // מסגרת אבל שחורה עבה
  | "corner_ornament" // עיטור פינה
  | "divider_ornament" // מפריד מעוטר
  | "divider_line" // קו מפריד פשוט
  | "crown" // כתר
  | "star_of_david" // מגן דוד
  | "pomegranate" // רימון
  | "flourish"; // קישוט מתפתל

export interface DecorationLayer extends BaseLayer {
  type: "decoration";
  kind: DecorationKind;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}

export type AnyLayer = TextLayer | ImageLayer | ShapeLayer | DecorationLayer;

export type BackgroundType = "solid" | "gradient" | "pattern" | "image";

export interface TemplateBackground {
  type: BackgroundType;
  color?: string; // solid
  gradient?: { from: string; to: string; angle?: number };
  pattern?: "subtle_damask" | "linen" | "radial_glow" | "vignette" | "none";
  patternColor?: string;
  src?: string | null; // image / AI background (data URL)
  offsetX?: number; // מיקום התמונה, נגרר ע"י המשתמש — 0 = מקורי (מלא את הקנבס מ-0,0, כמו בעבר)
  offsetY?: number;
}

export interface TemplateDoc {
  width: number;
  height: number;
  background: TemplateBackground;
  layers: AnyLayer[];
}

// ---- עזרי מזהים ----
let _idc = 0;
export const nextId = (prefix = "l") => `${prefix}_${Date.now().toString(36)}_${(_idc++).toString(36)}`;

// ---- מיפוי משקל לפונט-סטייל של Konva ----
export function weightToFontStyle(weight?: number, base: string = "normal"): string {
  if (!weight) return base;
  if (weight >= 700) return base.includes("italic") ? "bold italic" : "bold";
  return base;
}
