// סגנונות עיצוב חרדיים — מבוסס kb_styles_formats.md
// מקורות: zevi.co.il (מלכות וקסברגר), perli.co.il, galila.co.il, yehudaheller.com, shimon-design.com

export interface DesignStyle {
  key: string;
  label: string;
  description: string;
  palette: {
    primary: string; // רקע ראשי
    secondary: string; // רקע משני
    accent: string; // הדגשה (בד"כ זהב)
    text: string; // טקסט ראשי
    textLight: string; // טקסט על רקע כהה
    cream: string;
  };
  fonts: {
    title: string; // פונט כותרות
    body: string; // פונט גוף
  };
  ornamentLevel: "high" | "medium" | "low" | "none";
}

export const STYLES: DesignStyle[] = [
  {
    key: "malchut",
    label: "מלכות וקסברגר",
    description: "הידור עילית — יודאיקה מפוארת, זהב עשיר, מסגרות מלכותיות. לאירועי הכנסת ס\"ת, דינר, ברכות מכובדות.",
    palette: {
      primary: "#0B1E3D", // נייבי מלכותי
      secondary: "#5C0A1E", // בורדו
      accent: "#D4AF37", // זהב
      text: "#0D0D0D",
      textLight: "#F5EEDD",
      cream: "#F5EEDD",
    },
    fonts: { title: "David Libre", body: "Frank Ruhl Libre" },
    ornamentLevel: "high",
  },
  {
    key: "chasidic_royal",
    label: "חסידי-מלכותי",
    description: "הסגנון הדומיננטי בענף — רנסאנס, זהב, עיטורים עשירים. גמיש מנקי ועד עמוס. לחצרות, ישיבות, גיוס כספים.",
    palette: {
      primary: "#5C0A1E", // בורדו עמוק
      secondary: "#0B1E3D",
      accent: "#C9A227", // זהב עתיק
      text: "#0D0D0D",
      textLight: "#F8F2E4",
      cream: "#F8F2E4",
    },
    fonts: { title: "David Libre", body: "Frank Ruhl Libre" },
    ornamentLevel: "high",
  },
  {
    key: "modern_torani",
    label: "מודרני-תורני",
    description: "נקי, מכובד, עכשווי — כחול/אפור/לבן עם מגע זהב עדין. לעסקים, מוסדות חינוך, מיתוג מודרני.",
    palette: {
      primary: "#1B2A4A", // כחול כהה
      secondary: "#E8EDF3", // אפור-תכלת בהיר
      accent: "#B8912E", // זהב עדין
      text: "#1B2A4A",
      textLight: "#FFFFFF",
      cream: "#F7F9FC",
    },
    fonts: { title: "Assistant", body: "Heebo" },
    ornamentLevel: "low",
  },
  {
    key: "classic",
    label: "קלאסי (עיתונות)",
    description: "מסורתי, פונקציונלי — פרנק-ריהל, מסר חד, מתאים לדפוס ועיתונות חרדית.",
    palette: {
      primary: "#FFFFFF",
      secondary: "#F0F0F0",
      accent: "#8B0000",
      text: "#0D0D0D",
      textLight: "#FFFFFF",
      cream: "#FBFAF7",
    },
    fonts: { title: "Frank Ruhl Libre", body: "Frank Ruhl Libre" },
    ornamentLevel: "low",
  },
  {
    key: "evel",
    label: "מודעת אבל",
    description: "שחור-לבן בלבד, מסגרת שחורה עבה, ללא קישוטים. מבנה קבוע לפי מסורת.",
    palette: {
      primary: "#FFFFFF",
      secondary: "#FFFFFF",
      accent: "#000000",
      text: "#000000",
      textLight: "#000000",
      cream: "#FFFFFF",
    },
    fonts: { title: "David Libre", body: "David Libre" },
    ornamentLevel: "none",
  },
];

export const getStyle = (key: string) => STYLES.find((s) => s.key === key) || STYLES[1];

// תוויות עבריות לרמת העיטור — לתצוגה ליד תגית הסגנון (galleries/עורך).
export const ORNAMENT_LEVEL_LABELS: Record<DesignStyle["ornamentLevel"], string> = {
  high: "עשיר",
  medium: "בינוני",
  low: "מינימלי",
  none: "ללא",
};

// פונטים זמינים לבחירה בעורך
// ── רשימת הפונטים העברית המורחבת ──
// category: serif=סריף מסורתי, sans=ללא-תגים מודרני, display=כותרתי, rashi=כתב רש"י
// variable: האם זה פונט משתנה (טווח עובי רציף) — קובע אם סליידר העובי חופשי
export interface FontDef {
  key: string;
  label: string;
  weights: number[];
  category: "serif" | "sans" | "display" | "rashi";
  variable?: boolean; // טווח עובי רציף
  minWeight?: number;
  maxWeight?: number;
}

export const FONTS: FontDef[] = [
  // ── סריף מסורתי / תורני ──
  { key: "Frank Ruhl Libre", label: "פרנק-ריהל (קלאסי תורני)", weights: [300, 400, 500, 700, 900], category: "serif", variable: true, minWeight: 300, maxWeight: 900 },
  { key: "David Libre", label: "דוד (מסורתי)", weights: [400, 500, 700], category: "serif" },
  { key: "Noto Serif Hebrew", label: "נוטו סריף (עברי)", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], category: "serif", variable: true, minWeight: 100, maxWeight: 900 },
  { key: "Bellefair", label: "בלפר (סריף עדין)", weights: [400], category: "serif" },
  { key: "Cardo", label: "קרדו (קלאסי אקדמי)", weights: [400, 700], category: "serif" },
  // ── ללא-תגים מודרני ──
  { key: "Heebo", label: "היבו (מודרני)", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], category: "sans", variable: true, minWeight: 100, maxWeight: 900 },
  { key: "Assistant", label: "אסיסטנט (מודרני)", weights: [200, 300, 400, 500, 600, 700, 800], category: "sans", variable: true, minWeight: 200, maxWeight: 800 },
  { key: "Rubik", label: "רוביק (מעוגל)", weights: [300, 400, 500, 600, 700, 800, 900], category: "sans", variable: true, minWeight: 300, maxWeight: 900 },
  { key: "Noto Sans Hebrew", label: "נוטו סאנס (עברי)", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], category: "sans", variable: true, minWeight: 100, maxWeight: 900 },
  { key: "Alef", label: "אלף (נקי)", weights: [400, 700], category: "sans" },
  { key: "Miriam Libre", label: "מרים (ללא-תגים)", weights: [400, 700], category: "sans" },
  // ── כותרתי / דקורטיבי ──
  { key: "Suez One", label: "סואץ (כותרתי כבד)", weights: [400], category: "display" },
  { key: "Secular One", label: "סקולר (כותרתי)", weights: [400], category: "display" },
  { key: "Amatic SC", label: "אמאטיק (כתב-יד)", weights: [400, 700], category: "display" },
  { key: "Karantina", label: "קרנטינה (כותרתי דק)", weights: [300, 400, 700], category: "display" },
  { key: "Gveret Levin", label: "גברת לוין (דקורטיבי)", weights: [400], category: "display" },
  // ── כתב רש"י ──
  { key: "Noto Rashi Hebrew", label: "כתב רש\"י (נוטו)", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], category: "rashi", variable: true, minWeight: 100, maxWeight: 900 },
];

export const getFont = (key: string) => FONTS.find((f) => f.key === key);
export const FONT_CATEGORIES: { key: FontDef["category"]; label: string }[] = [
  { key: "serif", label: "סריף / תורני" },
  { key: "sans", label: "מודרני" },
  { key: "display", label: "כותרתי" },
  { key: "rashi", label: "כתב רש\"י" },
];
