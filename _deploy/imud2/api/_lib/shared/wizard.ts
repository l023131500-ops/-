// ═══════════════════════════════════════════════════════════════════════════
// אשף העימוד החכם (גרסה 2) — מבין מה סוג הספר מתוך שאלון קצר + שפה חופשית,
// וממליץ על תבנית (מתוך 34 התבניות ב-templates.ts) + על אילו "פונקציות"
// (תכונות עימוד) להפעיל, ובונה BookSettings מלא מוכן לתצוגה מקדימה.
// ───────────────────────────────────────────────────────────────────────────
// זרימה:
//   1. המשתמש עונה על שאלון (סוג הספר, גודל, תוספות) ו/או כותב בחופשי מה הוא רוצה.
//   2. inferSetup() מדרג תבניות + מסמן פונקציות מומלצות + בונה BookSettings.
//   3. המשתמש מסמן/מבטל פונקציות ידנית → תצוגת דוגמה מתעדכנת → אישור → יצירת ספר.
// מבוסס מחקר: research2/typesetting.md.
// ═══════════════════════════════════════════════════════════════════════════

import type { BookSettings, LayerKind } from "./schema";
import { getTemplate, DEFAULT_SETTINGS, TEMPLATES } from "./templates";
import type { TemplateCategory } from "./templates";

// ─── הפונקציות (תכונות) שניתן לסמן להפעלה בעימוד ───
export type FeatureKey =
  | "footnotes"        // הערות שוליים ממוספרות
  | "footnotes2col"    // הערות שוליים בשני טורים
  | "sidenotes"        // מ"מ / הערות צד
  | "commentaryRing"   // טבעת פרשנים (מקראות / צורת דף)
  | "parallelColumns"  // טורים מקבילים להשוואה
  | "twoColumns"       // שני טורים רגילים
  | "openingWord"      // מילת/אות פתיחה בולטת
  | "smallParens"      // סוגריים קטנות מהטקסט
  | "centerLastLine"   // שורה אחרונה ממורכזת בכל מקטע
  | "nikud"            // ניקוד
  | "gematria"         // מספור עמודים בגימטריה
  | "runningHead"      // כותרת רצה
  | "toc"              // תוכן עניינים
  | "titlePage"        // עמוד שער
  | "chapterHeadings"; // כותרות פרקים/סימנים

export interface FeatureDef {
  key: FeatureKey;
  label: string;
  hint: string;
  // אילו שכבות תוכן הפיצ'ר מוסיף (אם בכלל)
  layers?: LayerKind[];
  // כיצד הוא מתבטא ב-BookSettings
  settings?: Partial<BookSettings>;
}

export const FEATURES: FeatureDef[] = [
  { key: "chapterHeadings", label: "כותרות פרקים / סימנים", hint: "כותרת מודגשת לכל פרק או סימן", layers: ["heading"] },
  { key: "openingWord", label: "מילת פתיחה בולטת", hint: "אות או מילה ראשונה מעוטרת/מודגשת בתחילת מקטע", layers: ["openingWord"], settings: { openingWord: "bold-word" } },
  { key: "footnotes", label: "הערות שוליים", hint: "הערות ממוספרות בתחתית העמוד — לביאור ופרשנות", layers: ["footnote"], settings: { footnoteColumns: 1 } },
  { key: "footnotes2col", label: "הערות בשני טורים", hint: "הערות שוליים בשני טורים בתחתית העמוד", layers: ["footnote"], settings: { footnoteColumns: 2 } },
  { key: "sidenotes", label: "מראי מקומות בצד", hint: 'מ"מ והפניות בשולי הצד החיצוני', layers: ["sidenote"], settings: { marginOuter: 42 } },
  { key: "commentaryRing", label: "טבעת פרשנים", hint: "טקסט מרכזי מוקף פרשנים (מקראות / צורת דף)", layers: ["rashi", "commentaryA"] },
  { key: "parallelColumns", label: "טורים מקבילים (השוואה)", hint: "שני נוסחים/מקורות זה מול זה", layers: ["commentaryA", "commentaryB"] },
  { key: "twoColumns", label: "שני טורים", hint: "טקסט בשני טורים עם קו מפריד", settings: { columns: 2, columnGap: 12 } },
  { key: "smallParens", label: "סוגריים קטנות", hint: "טקסט בתוך סוגריים בגודל קטן יותר", settings: { smallParens: true } },
  { key: "centerLastLine", label: "שורה אחרונה ממורכזת", hint: "השורה האחרונה בכל מקטע ממורכזת", settings: { lastLineAlign: "center" } },
  { key: "nikud", label: "ניקוד", hint: "התוכן מנוקד — גופן תומך-ניקוד", settings: { nikud: true } },
  { key: "gematria", label: "מספור עמודים בגימטריה", hint: "א׳, ב׳, ג׳ … במקום ספרות", settings: { pageNumbering: "gematria" } },
  { key: "runningHead", label: "כותרת רצה", hint: "שם הספר/הפרק בראש כל עמוד", settings: { runningHead: true } },
  { key: "toc", label: "תוכן עניינים", hint: "הפקת תוכן עניינים אוטומטי מהכותרות", settings: { tableOfContents: true } },
  { key: "titlePage", label: "עמוד שער", hint: "שער מעוצב עם שם הספר והמחבר", settings: { titlePage: true } },
];

export const getFeature = (k: FeatureKey) => FEATURES.find((f) => f.key === k);

// ─── שאלון: סוג הספר → הטיית תבנית ופונקציות ───
export interface WizardQuestion {
  key: string;
  label: string;
  options: { value: string; label: string; category?: TemplateCategory; templateKey?: string; features: FeatureKey[] }[];
}

export const QUESTIONS: WizardQuestion[] = [
  {
    key: "bookType",
    label: "מה סוג הספר?",
    options: [
      { value: "iyun", label: "ספר עיון", category: "iyun", features: ["chapterHeadings", "openingWord", "footnotes"] },
      { value: "shut", label: 'שו"ת', category: "shut", features: ["chapterHeadings", "footnotes"] },
      { value: "halacha", label: "פסקי הלכה", category: "halacha", features: ["chapterHeadings", "sidenotes"] },
      { value: "mussar", label: "מוסר / דרוש", category: "mussar", features: ["chapterHeadings", "openingWord"] },
      { value: "machshava", label: "מחשבה והגות", category: "machshava", features: ["chapterHeadings", "footnotes"] },
      { value: "aggada", label: "אגדה וסיפור", category: "aggada", features: ["chapterHeadings", "openingWord"] },
      { value: "parshanut", label: "פרשנות וביאור", category: "parshanut", features: ["chapterHeadings", "footnotes"] },
      { value: "tefila", label: "סידור / תפילה", category: "tefila", features: ["nikud", "chapterHeadings"] },
      { value: "alon", label: "עלון תורני", category: "alon", features: ["twoColumns", "chapterHeadings"] },
      { value: "gemara", label: "צורת הדף (גמרא)", templateKey: "daf-gemara", features: ["commentaryRing"] },
      { value: "mikraot", label: "מקראות גדולות / חומש", templateKey: "mikraot-gedolot", features: ["commentaryRing", "nikud"] },
      { value: "shira", label: "פיוט / שירה", category: "shira", features: ["openingWord", "nikud"] },
    ],
  },
  {
    key: "size",
    label: "גודל הספר?",
    options: [
      { value: "pocket", label: "כיס (A5)", features: [] },
      { value: "standard", label: "רגיל (A4)", features: [] },
      { value: "b5", label: "בינוני (B5)", features: [] },
    ],
  },
  {
    key: "layout",
    label: "מבנה?",
    options: [
      { value: "single", label: "טור יחיד", features: [] },
      { value: "double", label: "שני טורים", features: ["twoColumns"] },
    ],
  },
  {
    key: "extras",
    label: "תוספות רצויות?",
    options: [
      { value: "gematria", label: "מספור בגימטריה", features: ["gematria"] },
      { value: "runhead", label: "כותרת רצה", features: ["runningHead"] },
      { value: "footnotes", label: "הערות שוליים", features: ["footnotes"] },
      { value: "nikud", label: "ניקוד", features: ["nikud"] },
      { value: "toc", label: "תוכן עניינים", features: ["toc"] },
      { value: "openingWord", label: "מילת פתיחה בולטת", features: ["openingWord"] },
    ],
  },
];

const SIZE_MAP: Record<string, BookSettings["pageSize"]> = { pocket: "a5", standard: "a4", b5: "b5" };

// ─── מיפוי שפה חופשית → פונקציות/קטגוריה/תבנית ───
const FREE_TEXT_RULES: { re: RegExp; features?: FeatureKey[]; category?: TemplateCategory; templateKey?: string }[] = [
  { re: /גמר?א|תלמוד|דף|גפ"?ת|צורת ה?דף/i, templateKey: "daf-gemara", features: ["commentaryRing"] },
  { re: /מקראות גדולות|חומש|תורה|טבעת/i, templateKey: "mikraot-gedolot", features: ["commentaryRing", "nikud"] },
  { re: /שו"?ת|שאל(ה|ות)|תשוב(ה|ות)/i, category: "shut", features: ["chapterHeadings"] },
  { re: /הלכה|פסק|סעיף|שו"?ע|שולחן ערוך/i, category: "halacha", features: ["chapterHeadings"] },
  { re: /מוסר|דרוש|חיזוק|התעוררות/i, category: "mussar", features: ["openingWord"] },
  { re: /מחשבה|הגות|מאמר|פילוסופ/i, category: "machshava", features: ["footnotes"] },
  { re: /אגדה|מדרש|סיפור/i, category: "aggada", features: ["openingWord"] },
  { re: /פרשנ|ביאור|דיבור המתחיל|פירוש/i, category: "parshanut", features: ["footnotes"] },
  { re: /סידור|תפיל|מחזור|תהיל/i, category: "tefila", features: ["nikud"] },
  { re: /עלון|פרשת שבוע|מדור/i, category: "alon", features: ["twoColumns"] },
  { re: /פיוט|שירה|קינה|קינות|זמיר/i, category: "shira", features: ["openingWord", "nikud"] },
  { re: /הער(ה|ות) שוליים|הערת שוליים|פוטנוט/i, features: ["footnotes"] },
  { re: /(שני|2) טורי (?:הערות|שוליים)/i, features: ["footnotes2col"] },
  { re: /מ"?מ|מרא?י מקומות|הפניות/i, features: ["sidenotes"] },
  { re: /שני טורים|דו-?טורי|טור כפול/i, features: ["twoColumns"] },
  { re: /השוו?א(ה|ת)|נוסח(ים|אות)|מהדורות|מקביל/i, features: ["parallelColumns"], templateKey: "parshanut-parallel" },
  { re: /ניקוד|מנוקד/i, features: ["nikud"] },
  { re: /גימטריה|מספור עברי|אותיות/i, features: ["gematria"] },
  { re: /כותרת רצה|ראש (ה?)עמוד/i, features: ["runningHead"] },
  { re: /מילת פתיחה|אות פתיחה|drop.?cap|מעוטר|בולטת/i, features: ["openingWord"] },
  { re: /שורה אחרונה|ממורכז/i, features: ["centerLastLine"] },
  { re: /סוגריים קטנות|סוגריים קטן/i, features: ["smallParens"] },
  { re: /תוכן עניינים|תוכן ענינים/i, features: ["toc"] },
  { re: /שער|כריכה/i, features: ["titlePage"] },
  { re: /פרק(ים)?|סימן(ים)?|כותרת/i, features: ["chapterHeadings"] },
];

export interface WizardAnswers {
  bookType?: string;
  size?: string;
  layout?: string;
  extras?: string[]; // multi
  freeText?: string;
}

export interface WizardResult {
  templateKey: string;
  templateName: string;
  features: FeatureKey[];       // הפונקציות המומלצות המסומנות
  settings: BookSettings;       // הגדרות מלאות מוכנות ל-render
  reason: string;               // הסבר קצר
  detectedFromText: FeatureKey[]; // מה זוהה מהשפה החופשית (לשקיפות)
}

// בונה BookSettings מתוך תבנית נבחרת + רשימת פונקציות מסומנות + גודל
export function buildSettings(templateKey: string, features: FeatureKey[], size?: string, layout?: string): BookSettings {
  const tpl = getTemplate(templateKey);
  // בסיס: ברירות-מחדל גלובליות ← ברירות-מחדל התבנית
  const s: BookSettings = { ...DEFAULT_SETTINGS, ...tpl.defaults } as BookSettings;
  // אפס תכונות אופציונליות שאינן חלק מהתבנית, כדי שהסימון הידני יקבע
  // (לא נוגעים בשדות מבניים כגון pageSize/columns אם התבנית לא הגדירה אחרת)
  for (const fk of features) {
    const f = getFeature(fk);
    if (f?.settings) Object.assign(s, f.settings);
  }
  if (size && SIZE_MAP[size]) s.pageSize = SIZE_MAP[size];
  if (layout === "double") s.columns = 2;
  else if (layout === "single") s.columns = 1;
  return s;
}

// המנוע הראשי — שאלון + שפה חופשית → המלצה
export function inferSetup(ans: WizardAnswers): WizardResult {
  const featureSet = new Set<FeatureKey>();
  const categoryVotes: Record<string, number> = {};
  const templateVotes: Record<string, number> = {};
  const detectedFromText: FeatureKey[] = [];

  // 1) סוג הספר
  const bt = QUESTIONS[0].options.find((o) => o.value === ans.bookType);
  if (bt) {
    bt.features.forEach((f) => featureSet.add(f));
    if (bt.templateKey) templateVotes[bt.templateKey] = (templateVotes[bt.templateKey] ?? 0) + 3;
    if (bt.category) categoryVotes[bt.category] = (categoryVotes[bt.category] ?? 0) + 3;
  }
  // 2) מבנה
  const lay = QUESTIONS[2].options.find((o) => o.value === ans.layout);
  lay?.features.forEach((f) => featureSet.add(f));
  // 3) תוספות (multi)
  for (const ex of ans.extras ?? []) {
    const opt = QUESTIONS[3].options.find((o) => o.value === ex);
    opt?.features.forEach((f) => featureSet.add(f));
  }
  // 4) שפה חופשית
  const txt = (ans.freeText ?? "").trim();
  if (txt) {
    for (const rule of FREE_TEXT_RULES) {
      if (rule.re.test(txt)) {
        rule.features?.forEach((f) => { if (!featureSet.has(f)) detectedFromText.push(f); featureSet.add(f); });
        if (rule.templateKey) templateVotes[rule.templateKey] = (templateVotes[rule.templateKey] ?? 0) + 2;
        if (rule.category) categoryVotes[rule.category] = (categoryVotes[rule.category] ?? 0) + 1.5;
      }
    }
  }

  // בחירת תבנית: קודם הצבעה ישירה לתבנית, אחרת התבנית הראשונה בקטגוריה המנצחת.
  let templateKey = "iyun-classic";
  const bestTpl = Object.entries(templateVotes).sort((a, b) => b[1] - a[1])[0];
  const bestCat = Object.entries(categoryVotes).sort((a, b) => b[1] - a[1])[0];

  if (bestTpl && (!bestCat || bestTpl[1] >= bestCat[1])) {
    templateKey = bestTpl[0];
  } else if (bestCat) {
    const cat = bestCat[0] as TemplateCategory;
    // אם ביקשו שני טורים — העדף תבנית בשני טורים באותה קטגוריה
    const wantTwoCol = featureSet.has("twoColumns");
    const inCat = TEMPLATES.filter((t) => t.category === cat);
    const twoCol = inCat.find((t) => (t.defaults.columns ?? 1) === 2);
    templateKey = (wantTwoCol && twoCol ? twoCol.key : inCat[0]?.key) ?? "iyun-classic";
  }

  const tpl = getTemplate(templateKey);

  // אם התבנית בשני טורים — ודא סימון הפיצ'ר (לשקיפות בממשק)
  if ((tpl.defaults.columns ?? DEFAULT_SETTINGS.columns) === 2) featureSet.add("twoColumns");
  if (tpl.defaults.nikud) featureSet.add("nikud");

  const features = FEATURES.map((f) => f.key).filter((k) => featureSet.has(k)); // סדר יציב
  const settings = buildSettings(templateKey, features, ans.size, ans.layout);

  const reasonParts: string[] = [];
  if (bt) reasonParts.push(`סוג: ${bt.label}`);
  reasonParts.push(`תבנית מומלצת: ${tpl.name}`);
  if (detectedFromText.length) {
    const labels = detectedFromText.map((f) => getFeature(f)?.label).filter(Boolean);
    reasonParts.push(`מהתיאור זוהו: ${labels.join(", ")}`);
  }

  return {
    templateKey,
    templateName: tpl.name,
    features,
    settings,
    reason: reasonParts.join(" · "),
    detectedFromText,
  };
}

// המרת תבנית + רשימת פונקציות → שכבות תוכן דרושות (לבניית תוכן ברירת-מחדל)
export function featuresToLayers(templateKey: string, features: FeatureKey[]): LayerKind[] {
  const tpl = getTemplate(templateKey);
  const layers = new Set<LayerKind>(["main", ...tpl.layers]);
  for (const fk of features) getFeature(fk)?.layers?.forEach((l) => layers.add(l));
  return Array.from(layers);
}
