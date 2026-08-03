import type { BookSettings, LayerKind } from "./schema";

/**
 * קטלוג תבניות עימוד תורני (גרסה 2 — מורחב).
 *
 * כל תבנית מגדירה: מפתח, שם, קטגוריה (סוג ספר), תיאור, שכבות נתמכות, מבנה,
 * והגדרות ברירת-מחדל (Partial<BookSettings>).
 * התבניות מקובצות לפי סוג ספר קודש (עיון, שו"ת, פסקי הלכה, מוסר, מחשבה,
 * אגדה, הגות, פרשנות, סידור/תפילה, עלון, גמרא/מקרא, שירה).
 * מנוע ה-CSS (client/src/lib/pagedRender.ts) ממיר תבנית+תוכן ל-HTML+CSS.
 */

export type TemplateCategory =
  | "iyun"        // ספרי עיון
  | "shut"        // שו"ת
  | "halacha"     // פסקי הלכה
  | "mussar"      // מוסר
  | "machshava"   // מחשבה / הגות
  | "aggada"      // אגדה
  | "parshanut"   // פרשנות / ביאור
  | "tefila"      // סידור / תפילה
  | "alon"        // עלון תורני
  | "classic"     // צורת הדף / מקראות (מבנה קלאסי)
  | "shira";      // פיוט / שירה

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  iyun: "ספרי עיון",
  shut: 'שו"ת',
  halacha: "פסקי הלכה",
  mussar: "מוסר",
  machshava: "מחשבה והגות",
  aggada: "אגדה",
  parshanut: "פרשנות וביאור",
  tefila: "סידור ותפילה",
  alon: "עלון תורני",
  classic: "מבנה קלאסי (דף/מקראות)",
  shira: "פיוט ושירה",
};

// סדר תצוגה של הקטגוריות בקטלוג
export const CATEGORY_ORDER: TemplateCategory[] = [
  "iyun",
  "shut",
  "halacha",
  "mussar",
  "machshava",
  "aggada",
  "parshanut",
  "tefila",
  "alon",
  "classic",
  "shira",
];

export interface TemplateDef {
  key: string;
  name: string;
  nameEn: string;
  category: TemplateCategory;
  description: string;
  // שכבות שהתבנית יודעת להציג
  layers: LayerKind[];
  // מבנה: צורת דף היקפית / טורים / ליניארי
  kind: "framed" | "columns" | "linear";
  defaults: Partial<BookSettings>;
}

export const HEBREW_FONTS: { key: string; label: string; stack: string; nikud: boolean }[] = [
  { key: "frank", label: "פרנק-רוהל (קלאסי)", stack: "'Frank Ruhl Libre', serif", nikud: true },
  { key: "david", label: "דוד (David Libre)", stack: "'David Libre', serif", nikud: true },
  { key: "taamey", label: 'תעמי דוד (ניקוד+טעמים)', stack: "'Taamey David CLM', 'Frank Ruhl Libre', serif", nikud: true },
  { key: "cardo", label: "Cardo (מלומד, ניקוד)", stack: "'Cardo', serif", nikud: true },
  { key: "notoserif", label: "Noto Serif Hebrew", stack: "'Noto Serif Hebrew', serif", nikud: true },
  { key: "notorashi", label: 'נוֹטוֹ רש"י (כתב רש"י)', stack: "'Noto Rashi Hebrew', serif", nikud: false },
  { key: "suez", label: "אמנותי (Suez One)", stack: "'Suez One', serif", nikud: false },
  { key: "heebo", label: "היבו (Heebo — ללא סריף)", stack: "'Heebo', sans-serif", nikud: true },
  { key: "assistant", label: "אסיסטנט (Assistant — מודרני)", stack: "'Assistant', sans-serif", nikud: true },
  { key: "rubik", label: "רוביק (Rubik — עלונים)", stack: "'Rubik', sans-serif", nikud: true },
  { key: "alef", label: "אלף (Alef — נקי)", stack: "'Alef', sans-serif", nikud: true },
  { key: "miriam", label: "מרים ליברה (Miriam Libre)", stack: "'Miriam Libre', sans-serif", nikud: false },
  { key: "bellefair", label: "בלפייר (Bellefair — שערים)", stack: "'Bellefair', serif", nikud: false },
];

/**
 * ברירות-מחדל מלאות לכל שדות BookSettings v2.
 * כל ספר חדש מתחיל מכאן, ותבנית דורסת שדות רלוונטיים דרך defaults.
 * ספרים ישנים ממוזגים עם ערכים אלו (mergedSettings) — אחורה-תואם.
 */
export const DEFAULT_SETTINGS: BookSettings = {
  /* גודל ופריסה */
  pageSize: "a5",
  columns: 1,
  columnGap: 8,

  /* טיפוגרפיה בסיסית */
  fontFamily: "'Frank Ruhl Libre', serif",
  fontSize: 16,
  lineHeight: 1.7,

  /* שוליים */
  marginTop: 20,
  marginBottom: 20,
  marginInner: 22,
  marginOuter: 16,

  /* מספור עמודים */
  pageNumbering: "gematria",
  pageNumberSide: "outer",

  /* כותרות רצות */
  runningHead: true,
  runningHeadText: "",
  runningHeadShowChapter: true,

  /* מיקרו-טיפוגרפיה */
  openingWord: "bold-word",
  lastLineAlign: "justify",
  smallParens: false,
  preventWidows: true,
  paragraphIndent: 1.2,

  /* כותרות */
  headingFont: "'Frank Ruhl Libre', serif",
  headingSizeH1: 1.6,
  headingSizeH2: 1.3,
  headingAlign: "center",

  /* תוכן ותכונות */
  nikud: false,
  tableOfContents: true,
  footnoteColumns: 1,

  /* שער וכריכה */
  titlePage: true,
  coverColor: "#7a2e3a",
  titlePageSubtitle: "",
};

export const TEMPLATES: TemplateDef[] = [
  /* ═══════════════ ספרי עיון ═══════════════ */
  {
    key: "iyun-classic",
    name: "עיון קלאסי",
    nameEn: "Classic Study",
    category: "iyun",
    description: "טור יחיד, גופן סריף מסורתי, מילה ראשונה בולטת, כותרות סימנים והערות שוליים. הבסיס לספרי עיון.",
    layers: ["heading", "subheading", "main", "footnote", "openingWord", "source"],
    kind: "linear",
    defaults: { pageSize: "a5", columns: 1, openingWord: "bold-word", pageNumbering: "gematria" },
  },
  {
    key: "iyun-two-col",
    name: "עיון בשני טורים",
    nameEn: "Two-Column Study",
    category: "iyun",
    description: 'שני טורים עם קו מפריד, מילה ראשונה בולטת בכל מקטע, שורה אחרונה ממורכזת. הפורמט המובהק של ספרי עיון מעוצבים כמו "תורה דיליה".',
    layers: ["heading", "subheading", "main", "footnote", "openingWord", "source"],
    kind: "columns",
    defaults: { pageSize: "a4", columns: 2, columnGap: 12, openingWord: "bold-word", lastLineAlign: "center", smallParens: true, pageNumbering: "gematria" },
  },
  {
    key: "iyun-footnotes-2col",
    name: "עיון עם הערות בשני טורים",
    nameEn: "Study + 2-Col Footnotes",
    category: "iyun",
    description: "טקסט מרכזי בטור יחיד, הערות שוליים ממוספרות בשני טורים בתחתית העמוד. לספרי ביאור עם הערות רבות.",
    layers: ["heading", "subheading", "main", "footnote", "openingWord", "source"],
    kind: "linear",
    defaults: { pageSize: "a5", columns: 1, footnoteColumns: 2, openingWord: "bold-word" },
  },
  {
    key: "iyun-sidenotes",
    name: "עיון עם מ״מ בצד",
    nameEn: "Study + Side Refs",
    category: "iyun",
    description: "טקסט מרכזי עם מראי מקומות בשוליים החיצוניים, כותרות מודגשות. לעיון הלכתי עם הפניות.",
    layers: ["heading", "subheading", "main", "sidenote", "footnote", "source"],
    kind: "columns",
    defaults: { pageSize: "a4", columns: 1, marginOuter: 42 },
  },

  /* ═══════════════ שו"ת ═══════════════ */
  {
    key: "shut-classic",
    name: 'שו"ת קלאסי',
    nameEn: "Classic Responsa",
    category: "shut",
    description: 'שאלה מודגשת, תשובה מפורטת, מספור סימנים גימטרי. המבנה המקובל לספרי שאלות ותשובות.',
    layers: ["heading", "question", "answer", "footnote", "source"],
    kind: "linear",
    defaults: { pageSize: "a5", columns: 1, pageNumbering: "gematria", headingAlign: "center" },
  },
  {
    key: "shut-two-col",
    name: 'שו"ת בשני טורים',
    nameEn: "Two-Column Responsa",
    category: "shut",
    description: "שני טורים עם קו מפריד, שאלה ותשובה, כותרת סימן מודגשת. פורמט חסכוני לספרי שו״ת גדולים.",
    layers: ["heading", "question", "answer", "footnote", "source"],
    kind: "columns",
    defaults: { pageSize: "a4", columns: 2, columnGap: 12, pageNumbering: "gematria" },
  },
  {
    key: "shut-footnotes",
    name: 'שו"ת עם הערות שוליים',
    nameEn: "Responsa + Footnotes",
    category: "shut",
    description: "שאלה ותשובה עם הערות שוליים ומראי מקומות בתחתית. לשו״ת מעמיק עם דיון במקורות.",
    layers: ["heading", "question", "answer", "footnote", "sidenote", "source"],
    kind: "linear",
    defaults: { pageSize: "a5", columns: 1, footnoteColumns: 1 },
  },

  /* ═══════════════ פסקי הלכה ═══════════════ */
  {
    key: "halacha-seif",
    name: "הלכה — סעיפים",
    nameEn: "Halacha — Sections",
    category: "halacha",
    description: "הלכות ממוספרות (סעיפים) עם כותרת מודגשת לכל הלכה, keep-with-next כדי שכותרת לא תיפרד מגופה.",
    layers: ["heading", "subheading", "main", "footnote", "sidenote", "source"],
    kind: "linear",
    defaults: { pageSize: "a5", columns: 1, pageNumbering: "gematria", tableOfContents: true },
  },
  {
    key: "halacha-two-col",
    name: "הלכה בשני טורים",
    nameEn: "Two-Column Halacha",
    category: "halacha",
    description: 'שני טורים, סעיפים ממוספרים, מ״מ בהערות. בסגנון שו״ע ומשנה ברורה.',
    layers: ["heading", "subheading", "main", "footnote", "source"],
    kind: "columns",
    defaults: { pageSize: "a4", columns: 2, columnGap: 12, pageNumbering: "gematria" },
  },
  {
    key: "halacha-shulchan",
    name: "בסגנון שולחן ערוך",
    nameEn: "Shulchan Aruch Style",
    category: "halacha",
    description: "פנים ההלכה בטור מרכזי עם נושאי כלים סביב — מבנה צורת-דף להלכה עם נושאי כלים.",
    layers: ["heading", "main", "commentaryA", "commentaryB", "source"],
    kind: "framed",
    defaults: { pageSize: "a4", columns: 1, fontSize: 15 },
  },

  /* ═══════════════ מוסר ═══════════════ */
  {
    key: "mussar-classic",
    name: "מוסר קלאסי",
    nameEn: "Classic Mussar",
    category: "mussar",
    description: "טור יחיד רגוע, מילה ראשונה מעוטרת (dropcap), רווח נדיב בין פסקאות. לספרי מוסר ודרוש.",
    layers: ["heading", "subheading", "main", "footnote", "openingWord", "source"],
    kind: "linear",
    defaults: { pageSize: "a5", columns: 1, openingWord: "dropcap", lineHeight: 1.8, paragraphIndent: 1.4 },
  },
  {
    key: "mussar-quote",
    name: "מוסר עם מובאות",
    nameEn: "Mussar + Pull Quotes",
    category: "mussar",
    description: "טקסט מרכזי עם מובאות ופסוקים מודגשים, שורה אחרונה ממורכזת. לספרי חיזוק והתעוררות.",
    layers: ["heading", "main", "source", "footnote", "openingWord"],
    kind: "linear",
    defaults: { pageSize: "a5", columns: 1, lastLineAlign: "center", openingWord: "bold-word" },
  },

  /* ═══════════════ מחשבה והגות ═══════════════ */
  {
    key: "machshava-essay",
    name: "מאמרי מחשבה",
    nameEn: "Thought Essays",
    category: "machshava",
    description: "פורמט מאמרי, טור יחיד רחב, כותרות משנה, הערות שוליים מלומדות. לספרי מחשבה והגות.",
    layers: ["heading", "subheading", "main", "footnote", "source"],
    kind: "linear",
    defaults: { pageSize: "b5", columns: 1, lineHeight: 1.8, paragraphIndent: 1.2 },
  },
  {
    key: "machshava-two-col",
    name: "מחשבה בשני טורים",
    nameEn: "Two-Column Thought",
    category: "machshava",
    description: "שני טורים אקדמיים עם הערות שוליים ומראי מקומות. להגות שיטתית ומעמיקה.",
    layers: ["heading", "subheading", "main", "footnote", "source"],
    kind: "columns",
    defaults: { pageSize: "a4", columns: 2, columnGap: 14, footnoteColumns: 2 },
  },
  {
    key: "hagut-academic",
    name: "הגות אקדמית",
    nameEn: "Academic Discourse",
    category: "machshava",
    description: "עימוד מלומד עם ביבליוגרפיה, הערות מפורטות ומספור עמודים בספרות. לחיבורי מחקר תורני.",
    layers: ["heading", "subheading", "main", "footnote", "source"],
    kind: "linear",
    defaults: { pageSize: "b5", columns: 1, pageNumbering: "decimal", footnoteColumns: 1 },
  },

  /* ═══════════════ אגדה ═══════════════ */
  {
    key: "aggada-classic",
    name: "אגדה וסיפור",
    nameEn: "Aggada & Story",
    category: "aggada",
    description: "עימוד קריא ונעים לסיפורי חז״ל ואגדה, מילה ראשונה מעוטרת ורווח נדיב.",
    layers: ["heading", "main", "footnote", "openingWord", "source"],
    kind: "linear",
    defaults: { pageSize: "a5", columns: 1, openingWord: "dropcap", lineHeight: 1.8 },
  },
  {
    key: "aggada-source",
    name: "אגדה עם מקור ופירוש",
    nameEn: "Aggada + Source",
    category: "aggada",
    description: "לשון המדרש/אגדה מודגשת ואחריה ביאור, עם הערות שוליים. לביאורי אגדה.",
    layers: ["heading", "source", "main", "footnote"],
    kind: "linear",
    defaults: { pageSize: "a5", columns: 1 },
  },

  /* ═══════════════ פרשנות וביאור ═══════════════ */
  {
    key: "parshanut-lemma",
    name: "ביאור לפי דיבור המתחיל",
    nameEn: "Lemma Commentary",
    category: "parshanut",
    description: 'דיבור המתחיל מודגש ואחריו הביאור, בסגנון פרשני קלאסי. לביאורים על פסוקים או סוגיות.',
    layers: ["heading", "source", "main", "footnote"],
    kind: "linear",
    defaults: { pageSize: "a5", columns: 1, openingWord: "bold-word" },
  },
  {
    key: "parshanut-two-col",
    name: "פרשנות בשני טורים",
    nameEn: "Two-Column Commentary",
    category: "parshanut",
    description: "פסוק/מקור בראש ופרשנות בשני טורים למטה, עם מ״מ בהערות.",
    layers: ["heading", "source", "main", "footnote", "sidenote"],
    kind: "columns",
    defaults: { pageSize: "a4", columns: 2, columnGap: 12 },
  },
  {
    key: "parshanut-parallel",
    name: "השוואת פירושים",
    nameEn: "Parallel Commentaries",
    category: "parshanut",
    description: "שני פרשנים/נוסחים זה מול זה בטורים מקבילים — להשוואת מהדורות, כתבי יד ופירושים.",
    layers: ["heading", "source", "commentaryA", "commentaryB"],
    kind: "columns",
    defaults: { pageSize: "a4", columns: 2, columnGap: 16 },
  },
  {
    key: "parshanut-framed",
    name: "פנים וסביב (צורת מקראות)",
    nameEn: "Framed Commentary",
    category: "parshanut",
    description: "מקור מרכזי מוקף פרשנים בטבעת — מבנה מקראות גדולות מוקטן לספר ביאור.",
    layers: ["heading", "main", "rashi", "commentaryA"],
    kind: "framed",
    defaults: { pageSize: "a4", columns: 1, nikud: true },
  },

  /* ═══════════════ סידור ותפילה ═══════════════ */
  {
    key: "tefila-siddur",
    name: "סידור תפילה",
    nameEn: "Prayer Book",
    category: "tefila",
    description: "טקסט מנוקד גדול וברור, ממורכז, עם כותרות תפילות והוראות בצד. לסידורים ומחזורים.",
    layers: ["heading", "main", "sidenote", "source"],
    kind: "linear",
    defaults: { pageSize: "a5", columns: 1, nikud: true, fontSize: 18, lineHeight: 1.9, headingAlign: "center" },
  },
  {
    key: "tefila-two-col",
    name: "תפילה בשני טורים",
    nameEn: "Two-Column Prayer",
    category: "tefila",
    description: "סידור בשני טורים מנוקדים עם הוראות. לחיסכון בעמודים בסידור מלא.",
    layers: ["heading", "main", "sidenote"],
    kind: "columns",
    defaults: { pageSize: "a4", columns: 2, columnGap: 12, nikud: true, fontSize: 16 },
  },
  {
    key: "tefila-tehillim",
    name: "תהילים / פרקי אמונה",
    nameEn: "Tehillim",
    category: "tefila",
    description: "פסוקים מנוקדים ממוספרים בגימטריה, כותרת פרק מודגשת. לספרי תהילים ופרקי תפילה.",
    layers: ["heading", "main", "source"],
    kind: "linear",
    defaults: { pageSize: "a5", columns: 1, nikud: true, pageNumbering: "gematria", headingAlign: "center" },
  },

  /* ═══════════════ עלון תורני ═══════════════ */
  {
    key: "alon-weekly",
    name: "עלון שבועי",
    nameEn: "Weekly Bulletin",
    category: "alon",
    description: "עלון פרשת שבוע בשני טורים, גופן מודרני, כותרות בולטות ומדורים. לעלונים שבועיים.",
    layers: ["heading", "subheading", "main", "footnote", "source"],
    kind: "columns",
    defaults: { pageSize: "a4", columns: 2, columnGap: 10, fontFamily: "'Rubik', sans-serif", headingFont: "'Rubik', sans-serif", runningHead: false, pageNumbering: "none", titlePage: false, tableOfContents: false },
  },
  {
    key: "alon-tri-section",
    name: "עלון עם מדורים",
    nameEn: "Multi-Section Bulletin",
    category: "alon",
    description: "עלון עם כותרות מדורים ברורות, פסקאות קצרות ומובאות מודגשות. לעלון קהילתי.",
    layers: ["heading", "subheading", "main", "source", "footnote"],
    kind: "columns",
    defaults: { pageSize: "a4", columns: 2, columnGap: 10, fontFamily: "'Assistant', sans-serif", headingFont: "'Heebo', sans-serif", runningHead: false, pageNumbering: "none", titlePage: false, tableOfContents: false },
  },
  {
    key: "alon-single",
    name: "עלון טור יחיד",
    nameEn: "Single-Column Leaflet",
    category: "alon",
    description: "עלון פשוט בטור יחיד לדף A5, מתאים לחלוקה מהירה ולהדפסה דו-צדדית.",
    layers: ["heading", "main", "source"],
    kind: "linear",
    defaults: { pageSize: "a5", columns: 1, fontFamily: "'Assistant', sans-serif", headingFont: "'Heebo', sans-serif", runningHead: false, pageNumbering: "none", titlePage: false, tableOfContents: false },
  },

  /* ═══════════════ מבנה קלאסי (דף/מקראות) ═══════════════ */
  {
    key: "daf-gemara",
    name: "צורת הדף (גמרא)",
    nameEn: "Talmud Page",
    category: "classic",
    description: 'גפ״ת — גמרא במרכז, רש״י בשוליים הפנימיים, תוספות בחיצוניים. המבנה הקלאסי של דף התלמוד.',
    layers: ["main", "rashi", "tosafot"],
    kind: "framed",
    defaults: { pageSize: "a4", columns: 1, fontSize: 15, runningHead: true },
  },
  {
    key: "mikraot-gedolot",
    name: "מקראות גדולות",
    nameEn: "Mikraot Gedolot",
    category: "classic",
    description: "טקסט מקרא מנוקד מרכזי מוקף טבעת פרשנים (רש״י ופרשן נוסף) בגדלים משתנים.",
    layers: ["heading", "main", "rashi", "commentaryA"],
    kind: "framed",
    defaults: { pageSize: "a4", columns: 1, nikud: true },
  },
  {
    key: "mishna-classic",
    name: "משנה עם ביאור",
    nameEn: "Mishna + Commentary",
    category: "classic",
    description: "לשון המשנה מנוקדת ומודגשת עם ביאור מתחת, מספור משניות בגימטריה.",
    layers: ["heading", "main", "commentaryA", "footnote"],
    kind: "linear",
    defaults: { pageSize: "a5", columns: 1, nikud: true, pageNumbering: "gematria" },
  },

  /* ═══════════════ פיוט ושירה ═══════════════ */
  {
    key: "shira-piyut",
    name: "פיוט וקינה",
    nameEn: "Liturgical Poetry",
    category: "shira",
    description: "עימוד ממורכז לפיוטים, קינות ושירה, רווח בין בתים ומילת פתיחה מעוטרת.",
    layers: ["heading", "poem", "source"],
    kind: "linear",
    defaults: { pageSize: "a5", columns: 1, openingWord: "dropcap", lineHeight: 2.0, headingAlign: "center", nikud: true },
  },
  {
    key: "shira-two-col",
    name: "שירה בשני טורים",
    nameEn: "Two-Column Poetry",
    category: "shira",
    description: "בתי שיר בשני טורים ממורכזים, לקבצי פיוטים וזמירות.",
    layers: ["heading", "poem"],
    kind: "columns",
    defaults: { pageSize: "a4", columns: 2, columnGap: 16, lineHeight: 1.9, headingAlign: "center", nikud: true },
  },
];

export function getTemplate(key: string): TemplateDef {
  return TEMPLATES.find((t) => t.key === key) ?? TEMPLATES[0];
}

/** מחזיר תבניות מקובצות לפי קטגוריה, בסדר CATEGORY_ORDER. */
export function templatesByCategory(): { category: TemplateCategory; label: string; items: TemplateDef[] }[] {
  return CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    items: TEMPLATES.filter((t) => t.category === cat),
  })).filter((g) => g.items.length > 0);
}
