/**
 * מחלקת מיתוג — לוגיקת דומיין משותפת (client + server).
 *
 * מבוסס על מחקר: research2/branding_dept.md
 *   - שאלון בריף 35 שאלות (7 קטגוריות) — ManyRequests
 *   - 12 ארכיטיפים של יונג (4 קבוצות מוטיבציה)
 *   - 5 ממדי אישיות מותג של Aaker
 *   - מבנה Brand Book של 7 סעיפים, 20-35 עמ' — Toimi
 *   - צנרת לוגו: Nano Banana Pro (טקסט עברי) → Recraft Vectorize (SVG)
 *
 * הקוד כאן טהור-נתונים (ללא תלות בשרת) כדי לשמש גם את הלקוח וגם את השרת.
 */

// ═══════════════════ 12 ארכיטיפים (מודל יונג) ═══════════════════

export type ArchetypeGroup = "stability" | "freedom" | "mastery" | "belonging";

export interface Archetype {
  key: string;
  name: string; // עברית
  nameEn: string;
  group: ArchetypeGroup;
  groupName: string;
  desc: string; // תיאור קצר בעברית
  brands: string; // דוגמאות מותג
  // ברירות-מחדל עיצוביות הנגזרות מהארכיטיפ:
  palette: string[]; // hex — 5 צבעים מוצעים
  fontHeadline: string; // שם גופן עברי מומלץ
  fontBody: string;
  voice: string[]; // 3-4 תכונות קול
  keywords: string[]; // מילות-מפתח לפרומפט לוגו
}

export const ARCHETYPES: Archetype[] = [
  {
    key: "caregiver", name: "המטפל", nameEn: "Caregiver", group: "stability", groupName: "יציבות ושליטה",
    desc: "חומל, מטפח, מגן. מותג שנותן ביטחון ותחושת דאגה אמיתית.",
    brands: "ג'ונסון, יוניסף, ארגוני חסד",
    palette: ["#2E7D6B", "#A8D5C4", "#F4EDE4", "#D98C6A", "#3A3A3A"],
    fontHeadline: "Frank Ruhl Libre", fontBody: "Assistant",
    voice: ["חם", "אכפתי", "מרגיע", "אמין"],
    keywords: ["warm", "protective", "gentle", "rounded", "embrace"],
  },
  {
    key: "creator", name: "היוצר", nameEn: "Creator", group: "stability", groupName: "יציבות ושליטה",
    desc: "חדשני, ייחודי, מבטא חזון. מותג שמעריך יצירתיות ומקוריות.",
    brands: "אפל, לגו, אדובי",
    palette: ["#E8552A", "#1D1D1F", "#F5F5F7", "#FFB800", "#6C63FF"],
    fontHeadline: "Heebo", fontBody: "Assistant",
    voice: ["מעורר השראה", "ביטויי", "מקורי", "נועז"],
    keywords: ["creative", "bold", "expressive", "geometric", "visionary"],
  },
  {
    key: "ruler", name: "השליט", nameEn: "Ruler", group: "stability", groupName: "יציבות ושליטה",
    desc: "סמכותי, מכובד, מצליח. מותג של יוקרה, מנהיגות ואיכות עליונה.",
    brands: "מרצדס, מיקרוסופט, רולקס",
    palette: ["#0B1E3F", "#C9A227", "#F5F0E6", "#8A8A8A", "#111111"],
    fontHeadline: "Frank Ruhl Libre", fontBody: "David Libre",
    voice: ["סמכותי", "מכובד", "יוקרתי", "בטוח"],
    keywords: ["luxury", "authority", "gold", "elegant", "crown", "prestige"],
  },
  {
    key: "sage", name: "החכם", nameEn: "Sage", group: "freedom", groupName: "חופש ולמידה",
    desc: "מבקש אמת וידע. מותג של חכמה, לימוד והבנה מעמיקה — מתאים לתורה.",
    brands: "גוגל, ויקיפדיה, מוסדות חינוך",
    palette: ["#1E3A5F", "#4A7BA6", "#EDF2F7", "#B8860B", "#2D2D2D"],
    fontHeadline: "Frank Ruhl Libre", fontBody: "David Libre",
    voice: ["מלומד", "רגוע", "מדויק", "מעמיק"],
    keywords: ["wisdom", "knowledge", "classic", "serif", "scholarly", "timeless"],
  },
  {
    key: "innocent", name: "התמים", nameEn: "Innocent", group: "freedom", groupName: "חופש ולמידה",
    desc: "אופטימי, טהור, פשוט. מותג של תמימות, שמחה וטוב לב.",
    brands: "קוקה-קולה, דאב, דיסני",
    palette: ["#4A90D9", "#FFFFFF", "#FDF6E3", "#7ED957", "#F4A9C0"],
    fontHeadline: "Rubik", fontBody: "Assistant",
    voice: ["חיובי", "פשוט", "כן", "עליז"],
    keywords: ["pure", "simple", "light", "optimistic", "clean", "bright"],
  },
  {
    key: "explorer", name: "החוקר", nameEn: "Explorer", group: "freedom", groupName: "חופש ולמידה",
    desc: "הרפתקן, חופשי, סקרן. מותג של גילוי, עצמאות וחוויה.",
    brands: "ג'יפ, נאס\"א, North Face",
    palette: ["#5A6B3B", "#C77D3E", "#F0E9DC", "#3B4A52", "#1F1F1F"],
    fontHeadline: "Heebo", fontBody: "Assistant",
    voice: ["הרפתקני", "עצמאי", "אותנטי", "נועז"],
    keywords: ["adventure", "earthy", "rugged", "freedom", "explore"],
  },
  {
    key: "rebel", name: "המורד", nameEn: "Rebel", group: "freedom", groupName: "חופש ולמידה",
    desc: "פורץ דרך, לא-קונפורמיסט. מותג שמשנה את הכללים.",
    brands: "הארלי-דיווידסון, רד-בול",
    palette: ["#111111", "#E63946", "#F1F1F1", "#8D8D8D", "#FFB800"],
    fontHeadline: "Heebo", fontBody: "Assistant",
    voice: ["נועז", "ישיר", "עוצמתי", "מתריס"],
    keywords: ["bold", "edgy", "high-contrast", "rebellious", "strong"],
  },
  {
    key: "hero", name: "הגיבור", nameEn: "Hero", group: "mastery", groupName: "סיכון והישג",
    desc: "אמיץ, נחוש, שואף למצוינות. מותג שמנצח אתגרים.",
    brands: "נייקי, BMW, פדקס",
    palette: ["#0B1E3F", "#E63946", "#FFFFFF", "#C9A227", "#2D2D2D"],
    fontHeadline: "Heebo", fontBody: "Assistant",
    voice: ["נחוש", "מעצים", "עוצמתי", "ישיר"],
    keywords: ["strong", "dynamic", "confident", "bold", "achievement"],
  },
  {
    key: "magician", name: "הקוסם", nameEn: "Magician", group: "mastery", groupName: "סיכון והישג",
    desc: "חזוני, הופך חלומות למציאות. מותג של טרנספורמציה ופלא.",
    brands: "דיסני, מאסטרקארד",
    palette: ["#3B1F5E", "#8A5CD9", "#F3EEFA", "#C9A227", "#1A1A1A"],
    fontHeadline: "Frank Ruhl Libre", fontBody: "Assistant",
    voice: ["חזוני", "מסתורי", "מעורר השראה", "מרומם"],
    keywords: ["mystical", "transformative", "deep", "elegant", "wonder"],
  },
  {
    key: "jester", name: "הליצן", nameEn: "Jester", group: "belonging", groupName: "שייכות",
    desc: "כיף, הומור, קלילות. מותג ששמח ליהנות ולשמח אחרים.",
    brands: "בן אנד ג'ריס, M&M's",
    palette: ["#FF6B35", "#FFD23F", "#FFFFFF", "#4ECDC4", "#2D2D2D"],
    fontHeadline: "Rubik", fontBody: "Assistant",
    voice: ["שמח", "קליל", "משעשע", "אנושי"],
    keywords: ["playful", "colorful", "fun", "rounded", "cheerful"],
  },
  {
    key: "everyman", name: "איש הרחוב", nameEn: "Everyman", group: "belonging", groupName: "שייכות",
    desc: "נגיש, אמין, שוויוני. מותג שמדבר בגובה העיניים.",
    brands: "איקאה, ליוויס",
    palette: ["#2C5F8A", "#E8A33D", "#F2EEE6", "#5A5A5A", "#1F1F1F"],
    fontHeadline: "Assistant", fontBody: "Assistant",
    voice: ["ידידותי", "ישר", "נגיש", "אמין"],
    keywords: ["friendly", "approachable", "honest", "simple", "warm"],
  },
  {
    key: "lover", name: "האוהב", nameEn: "Lover", group: "belonging", groupName: "שייכות",
    desc: "תשוקה, אינטימיות, יופי. מותג של רגש, חמימות ואסתטיקה.",
    brands: "שאנל, מותגי יוקרה",
    palette: ["#7A2E3B", "#D4A5A5", "#FBF3F0", "#C9A227", "#2D2D2D"],
    fontHeadline: "Frank Ruhl Libre", fontBody: "David Libre",
    voice: ["חם", "אלגנטי", "רגשי", "מזמין"],
    keywords: ["elegant", "warm", "intimate", "refined", "romantic"],
  },
];

export function getArchetype(key: string): Archetype | undefined {
  return ARCHETYPES.find((a) => a.key === key);
}

export const ARCHETYPE_GROUPS: { key: ArchetypeGroup; name: string }[] = [
  { key: "stability", name: "יציבות ושליטה" },
  { key: "freedom", name: "חופש ולמידה" },
  { key: "mastery", name: "סיכון והישג" },
  { key: "belonging", name: "שייכות" },
];

// ═══════════════════ 5 ממדי אישיות של Aaker ═══════════════════

export interface AakerDimension {
  key: string;
  name: string;
  nameEn: string;
  desc: string;
  brands: string;
}

export const AAKER_DIMENSIONS: AakerDimension[] = [
  { key: "sincerity", name: "כנות", nameEn: "Sincerity", desc: "ארצי, כן, מלא לב, עליז", brands: "פטגוניה" },
  { key: "excitement", name: "התרגשות", nameEn: "Excitement", desc: "נועז, יצירתי, נלהב", brands: "רד-בול, טסלה" },
  { key: "competence", name: "מיומנות", nameEn: "Competence", desc: "אמין, אינטליגנטי, מצליח", brands: "וולוו, מיקרוסופט" },
  { key: "sophistication", name: "תחכום", nameEn: "Sophistication", desc: "מהמעמד הגבוה, מקסים", brands: "שאנל, אפל" },
  { key: "ruggedness", name: "חוסן", nameEn: "Ruggedness", desc: "חוצני, קשוח, יציב", brands: "הארלי, לנד-רובר" },
];

// ═══════════════════ שאלון בריף — 35 שאלות, 7 קטגוריות ═══════════════════

export interface BriefQuestion {
  id: string;
  q: string;
  type: "text" | "textarea" | "keywords" | "select" | "multi";
  placeholder?: string;
  options?: string[];
  core?: boolean; // 12 שאלות ליבה — מספיקות לתוצר מהיר
}

export interface BriefCategory {
  key: string;
  name: string;
  icon: string; // lucide icon name
  questions: BriefQuestion[];
}

export const BRIEF_CATEGORIES: BriefCategory[] = [
  {
    key: "identity", name: "זהות ועלילת המותג", icon: "Fingerprint",
    questions: [
      { id: "business", q: "ספר לנו על העסק שלך — אילו מוצרים/שירותים אתה מספק?", type: "textarea", core: true, placeholder: "לדוגמה: מוסד תורני, גמ\"ח, בית עסק, ארגון חסד…" },
      { id: "story", q: "למה התחלת את העסק ואיך הוא התפתח למצבו הנוכחי?", type: "textarea" },
      { id: "mission", q: "אילו שליחות וערכי ליבה מניעים את המותג?", type: "textarea", core: true },
      { id: "personality", q: "במשפט אחד — איך היית מאפיין את אישיות המותג?", type: "text", core: true },
      { id: "fiveWords", q: "5 מילים שמסכמות את מהות המותג", type: "keywords", core: true, placeholder: "מכובד, אמין, חם…" },
      { id: "emotions", q: "אילו רגשות צריך הקהל לחוות כשנחשף למותג?", type: "keywords", placeholder: "ביטחון, כבוד, השראה…" },
    ],
  },
  {
    key: "audience", name: "קהל יעד ומיצוב", icon: "Users",
    questions: [
      { id: "idealClient", q: "תאר את הלקוח האידאלי לעומק — אישיות והתנהגות", type: "textarea", core: true },
      { id: "clientDay", q: "איך נראה יום טיפוסי בחיי הלקוח האידאלי?", type: "textarea" },
      { id: "painPoints", q: "אילו קשיים שגרתיים חווה הלקוח שאתה פותר?", type: "textarea", core: true },
      { id: "competitors", q: "מיהם המתחרים העיקריים ובמה אתה בולט מולם?", type: "textarea" },
      { id: "positioning", q: "איך אתה ממצב את המותג בשוק?", type: "text" },
    ],
  },
  {
    key: "messaging", name: "מסרים ותקשורת", icon: "MessageSquare",
    questions: [
      { id: "keyMessages", q: "אילו מסרים חיוניים חייב המותג להעביר?", type: "textarea", core: true },
      { id: "howSpeak", q: "איך המותג מדבר ומתקשר עם הקהל?", type: "text" },
      { id: "drivePurchase", q: "איך המותג מניע לפעולה/רכישה?", type: "text" },
      { id: "results", q: "לאילו תוצאות צריך הלקוח לצפות לאחר הפעולה?", type: "text" },
    ],
  },
  {
    key: "visual", name: "זהות חזותית והעדפות עיצוב", icon: "Palette",
    questions: [
      { id: "logoInspo", q: "2-3 עיצובי לוגו שמעוררים בך השראה — והסבר את ההעדפה", type: "textarea", core: true },
      { id: "colorPref", q: "פלטת צבעים מועדפת, ואילו צבעים להימנע?", type: "text", core: true, placeholder: "אוהב כחול-כהה וזהב; להימנע מוורוד" },
      { id: "typoPref", q: "טיפוגרפיה או סגנון גופן ספציפי בראש?", type: "text" },
      { id: "visualStyle", q: "איך היית מתאר את הסגנון החזותי?", type: "select", core: true, options: ["מינימליסטי ונקי", "קלאסי ומכובד", "חסידי/מלכותי מעוטר", "מודרני ונועז", "חם ורך", "יוקרתי ואלגנטי"] },
      { id: "existingAssets", q: "האם יש נכסי עיצוב קיימים שברצונך לשמר?", type: "textarea" },
    ],
  },
  {
    key: "marketing", name: "אסטרטגיית שיווק", icon: "Megaphone",
    questions: [
      { id: "materials", q: "אילו חומרי שיווק תזדקק להם?", type: "multi", options: ["לוגו", "כרטיס ביקור", "חתימת אימייל", "תבנית פוסט לרשתות", "עלון/חוברת", "שילוט", "מצגת", "נייר מכתבים"] },
      { id: "social", q: "תאר את הנוכחות הרצויה ברשתות חברתיות", type: "text" },
      { id: "reach", q: "איך אתה מתכוון להגיע ללקוח האידאלי?", type: "text" },
      { id: "unique", q: "מה הופך את ההצעה לייחודית מול המתחרים?", type: "textarea", core: true },
    ],
  },
  {
    key: "strategy", name: "תובנות אסטרטגיות", icon: "Target",
    questions: [
      { id: "goals", q: "מהם היעדים לטווח קצר וארוך?", type: "textarea" },
      { id: "vision", q: "איפה אתה רואה את המותג בעוד שנה / 3 / 5 שנים?", type: "textarea" },
      { id: "timeline", q: "מהם לוחות הזמנים והדדליינים לפרויקט?", type: "text" },
      { id: "implement", q: "איך תיישם את אסטרטגיית המיתוג בפעילות?", type: "text" },
      { id: "feedback", q: "איך אתה מעדיף לתת משוב וזמן תגובה לתיקונים?", type: "text" },
    ],
  },
  {
    key: "bonus", name: "תובנות נוספות", icon: "Sparkles",
    questions: [
      { id: "priorFailures", q: "איך פתרונות קודמים לא ענו על צרכי הלקוח?", type: "textarea" },
      { id: "logoOrigin", q: "אם כבר יש לוגו — מה היווה לו השראה?", type: "text" },
      { id: "balance", q: "איך המותג מאזן בין ניגודים (מודרני/קלאסי, טכני/פשוט)?", type: "text" },
      { id: "admiredBrands", q: "אילו מותגים אחרים אתה מעריך ולמה?", type: "textarea" },
      { id: "imageryStyle", q: "איזה סוג imagery אתה מדמיין (איורים/תמונות/מופשט)?", type: "text" },
      { id: "experience", q: "איך אתה רוצה שהלקוחות יחוו את המותג?", type: "textarea" },
    ],
  },
];

export const ALL_QUESTIONS: BriefQuestion[] = BRIEF_CATEGORIES.flatMap((c) => c.questions);
export const CORE_QUESTIONS: BriefQuestion[] = ALL_QUESTIONS.filter((q) => q.core);
export const TOTAL_QUESTIONS = ALL_QUESTIONS.length; // 35

// ═══════════════════ מיפוי סגנון חזותי → העדפת ארכיטיפ ═══════════════════

export const VISUAL_STYLE_TO_ARCHETYPE: Record<string, string> = {
  "מינימליסטי ונקי": "innocent",
  "קלאסי ומכובד": "sage",
  "חסידי/מלכותי מעוטר": "ruler",
  "מודרני ונועז": "creator",
  "חם ורך": "caregiver",
  "יוקרתי ואלגנטי": "lover",
};

// ═══════════════════ מבנה Brand Book — 7 סעיפים ═══════════════════

export const BRAND_BOOK_SECTIONS = [
  { key: "overview", name: "סקירת מותג", pages: "1-3", desc: "מיסיון, ערכי מותג, אישיות, קהל יעד" },
  { key: "logo", name: "מערכת הלוגו", pages: "3-5", desc: "לוגו ראשי/משני/אייקון, שטח מגן, גרסאות, מה לא לעשות" },
  { key: "color", name: "מערכת הצבע", pages: "2-3", desc: "פלטה עם HEX/RGB/CMYK, יחסי שימוש, נגישות" },
  { key: "typography", name: "טיפוגרפיה", pages: "2-3", desc: "גופנים, סולם טיפוגרפי, רישוי" },
  { key: "imagery", name: "imagery וצילום", pages: "2-3", desc: "סגנון צילום/איור, מתאים מול לא מתאים" },
  { key: "voice", name: "קול וטון", pages: "2-4", desc: "תכונות קול, אנחנו/לא אנחנו, דוגמאות כתיבה" },
  { key: "application", name: "דוגמאות יישום", pages: "3-5", desc: "כרטיס ביקור, אימייל, מצגת, רשתות, אתר" },
];

// ═══════════════════ עזרי צבע ═══════════════════

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return { r: parseInt(n.slice(0, 2), 16), g: parseInt(n.slice(2, 4), 16), b: parseInt(n.slice(4, 6), 16) };
}

export function rgbToCmyk(r: number, g: number, b: number): { c: number; m: number; y: number; k: number } {
  const r1 = r / 255, g1 = g / 255, b1 = b / 255;
  const k = 1 - Math.max(r1, g1, b1);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  const c = (1 - r1 - k) / (1 - k);
  const m = (1 - g1 - k) / (1 - k);
  const y = (1 - b1 - k) / (1 - k);
  return { c: Math.round(c * 100), m: Math.round(m * 100), y: Math.round(y * 100), k: Math.round(k * 100) };
}

/** יחס ניגודיות WCAG בין שני צבעים (1..21). */
export function contrastRatio(hex1: string, hex2: string): number {
  const lum = (hex: string) => {
    const { r, g, b } = hexToRgb(hex);
    const a = [r, g, b].map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  };
  const l1 = lum(hex1), l2 = lum(hex2);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

export interface ColorSpec {
  hex: string;
  rgb: string;
  cmyk: string;
  role: string; // תפקיד: ראשי/משני/הדגשה/ניטרל
}

export function colorSpec(hex: string, role: string): ColorSpec {
  const { r, g, b } = hexToRgb(hex);
  const c = rgbToCmyk(r, g, b);
  return {
    hex: hex.toUpperCase(),
    rgb: `${r}, ${g}, ${b}`,
    cmyk: `${c.c}, ${c.m}, ${c.y}, ${c.k}`,
    role,
  };
}

// ═══════════════════ גופנים עבריים מומלצים (מהמחקר) ═══════════════════

export const HEBREW_FONTS = [
  { name: "Frank Ruhl Libre", type: "serif", desc: "קלאסי, תורני, מכובד — מצוין לכותרות", google: true },
  { name: "David Libre", type: "serif", desc: "מסורתי, קריא — מתאים לגוף טקסט תורני", google: true },
  { name: "Assistant", type: "sans", desc: "נקי, מודרני, גמיש — עובד בכל הקשר", google: true },
  { name: "Heebo", type: "sans", desc: "עכשווי, ברור, מגוון עוביים", google: true },
  { name: "Rubik", type: "sans", desc: "ידידותי, מעוגל, אנרגטי", google: true },
  { name: "Noto Sans Hebrew", type: "sans", desc: "תמיכה מלאה, ניטרלי", google: true },
];

// ═══════════════════ מבנה תוצר המיתוג ═══════════════════

export interface BrandStrategy {
  positioning: string; // משפט מיצוב
  mission: string;
  values: string[]; // 3-5 ערכי מותג
  archetypePrimary: string; // key
  archetypeSecondary?: string;
  aaker: string[]; // ממדי Aaker דומיננטיים (keys)
  voiceTraits: string[];
  voiceDo: string[]; // "אנחנו כן"
  voiceDont: string[]; // "אנחנו לא"
  tagline?: string;
}

export interface BrandColors {
  primary: ColorSpec[];
  secondary: ColorSpec[];
  neutral: ColorSpec[];
  usageRatio: string; // "60/30/10"
}

export interface BrandTypography {
  headline: string;
  body: string;
  scale: { label: string; size: string; weight: string; use: string }[];
}

export interface BrandKit {
  brandName: string;
  strategy: BrandStrategy;
  colors: BrandColors;
  typography: BrandTypography;
  logoPrompt?: string; // הפרומפט ששימש ליצירת הלוגו
}
