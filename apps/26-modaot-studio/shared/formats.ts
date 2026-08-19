// פורמטים טכניים למודעות — מבוסס kb_styles_formats.md
// מקורות: Buffer, PostFast, Hootsuite (דיגיטל); modoprint, FF2Designs (הדפסה); moked.co.il (עיתונות)

export interface AdFormat {
  key: string;
  label: string;
  group: "digital" | "print";
  width: number; // px (בהדפסה: @300DPI)
  height: number;
  ratio: string;
  dpi: number;
  colorSpace: "RGB" | "CMYK";
  bleedMm?: number;
  note?: string;
}

export const FORMATS: AdFormat[] = [
  {
    key: "ig_feed_45",
    label: "פוסט לאורך (אינסטגרם/פייסבוק)",
    group: "digital",
    width: 1080,
    height: 1350,
    ratio: "4:5",
    dpi: 72,
    colorSpace: "RGB",
    note: "הפורמט המומלץ ביותר לרשתות ב-2026 — תופס יותר שטח מסך",
  },
  {
    key: "ig_square",
    label: "פוסט מרובע",
    group: "digital",
    width: 1080,
    height: 1080,
    ratio: "1:1",
    dpi: 72,
    colorSpace: "RGB",
    note: "פורמט קלאסי, נתמך בכל המכשירים",
  },
  {
    key: "story",
    label: "סטורי / סטטוס וואטסאפ",
    group: "digital",
    width: 1080,
    height: 1920,
    ratio: "9:16",
    dpi: 72,
    colorSpace: "RGB",
    note: "אזור בטוח מרכזי — 250px עליון ו-400px תחתון פנויים",
  },
  {
    key: "a4_print",
    label: "פלייר / מודעה A4 (הדפסה)",
    group: "print",
    width: 2480,
    height: 3508,
    ratio: "1:1.414",
    dpi: 300,
    colorSpace: "CMYK",
    bleedMm: 3,
    note: "210×297 מ\"מ @300DPI, מוכן לדפוס עם bleed",
  },
  {
    key: "a3_poster",
    label: "פוסטר / כרזה A3",
    group: "print",
    width: 3508,
    height: 4961,
    ratio: "1:1.414",
    dpi: 300,
    colorSpace: "CMYK",
    bleedMm: 5,
    note: "297×420 מ\"מ @300DPI",
  },
  {
    key: "newspaper_quarter",
    label: "מודעת עיתון (רבע עמוד)",
    group: "print",
    width: 2008,
    height: 1500,
    ratio: "~4:3",
    dpi: 300,
    colorSpace: "CMYK",
    bleedMm: 3,
    note: "~170×127 מ\"מ — ברירת מחדל, ניתן לכייל לפי עיתון",
  },
];

export const getFormat = (key: string) => FORMATS.find((f) => f.key === key) || FORMATS[0];
