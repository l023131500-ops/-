// ספריית הרקעים — שני חצאים משלימים למנדט "רקעים עשירים באיכות גבוהה":
// (א) אוסף אצור של רקעים מובנים (גרדיאנט + שכבת-מרקם פרוצדורלית) בשמות עבריים,
//     שכולם מרונדרים דרך אותו מנוע רקעים (CanvasStage + exporter) — בלי קבצי
//     תמונה, בלי רשת, בלי מכסת AI.
// (ב) מחסן מקומי (localStorage) לרקעי AI שכבר נוצרו — יצירת רקע עולה מכסה
//     יומית, אז כל רקע שנוצר נשמר לשימוש חוזר בין פרויקטים ובין ביקורים,
//     עם נידוי-הישן-ביותר כשמכסת האחסון של הדפדפן נגמרת.
// בנוסף: אריחי המרקם הפרוצדורליים (patternTile) שה-CanvasStage ממלא בהם את
// שכבות ה-linen/subtle_damask — כאן כדי שגם הייצוא וגם הבמה יחלקו מטמון אחד.

import type { TemplateBackground } from "@shared/layers";

// ---- המרות צבע ----

/** #RRGGBB / #RGB → rgba(r,g,b,a). קלט לא-הקסי חוזר כמו-שהוא (צבע CSS חוקי אחר). */
export function hexToRgba(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  let h = m[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

// ---- אריחי מרקם פרוצדורליים ----

export const LINEN_TILE = 24;
export const DAMASK_TILE = 72;

const tileCache = new Map<string, HTMLCanvasElement>();

/** אריח מרקם הניתן לריצוף (repeat) — פשתן ארוג או דמשק עדין, בצבע הנתון.
 *  נשמר במטמון לפי (סוג, צבע) כי אותו אריח משמש כל פריים בווידאו. */
export function patternTile(kind: "linen" | "subtle_damask", color: string): HTMLCanvasElement {
  const key = `${kind}|${color}`;
  const hit = tileCache.get(key);
  if (hit) return hit;

  const size = kind === "linen" ? LINEN_TILE : DAMASK_TILE;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  if (kind === "linen") {
    // אריגה: קו אופקי + קו אנכי חלשים, וקווי-חצי מוזזים חלשים עוד יותר —
    // בריצוף זה נקרא כמרקם בד ולא כרשת.
    ctx.strokeStyle = hexToRgba(color, 0.1);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0.5);
    ctx.lineTo(size, 0.5);
    ctx.moveTo(0.5, 0);
    ctx.lineTo(0.5, size);
    ctx.stroke();
    ctx.strokeStyle = hexToRgba(color, 0.05);
    ctx.beginPath();
    ctx.moveTo(0, size / 2 + 0.5);
    ctx.lineTo(size, size / 2 + 0.5);
    ctx.moveTo(size / 2 + 0.5, 0);
    ctx.lineTo(size / 2 + 0.5, size);
    ctx.stroke();
  } else {
    // דמשק עדין: מעוין המחבר את אמצעי הצלעות, טבעת קטנה במרכז, ורבעי-עיגול
    // בפינות — מוטיב קלאסי בשקיפות נמוכה שלא מתחרה בטיפוגרפיה שמעליו.
    const c = size / 2;
    ctx.strokeStyle = hexToRgba(color, 0.09);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(c, 1);
    ctx.lineTo(size - 1, c);
    ctx.lineTo(c, size - 1);
    ctx.lineTo(1, c);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(c, c, size / 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = hexToRgba(color, 0.06);
    for (const [cx, cy] of [[0, 0], [size, 0], [0, size], [size, size]] as const) {
      ctx.beginPath();
      ctx.arc(cx, cy, size / 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  tileCache.set(key, canvas);
  return canvas;
}

// ---- (א) אוסף הרקעים האצור ----

export interface CuratedBackground {
  id: string;
  name: string;
  background: TemplateBackground;
}

/** רקעים מובנים באיכות גבוהה — גרדיאנט + מרקם, מכוונים למצבי-הרוח הנפוצים של
 *  מודעות הקהילה (שיעור תורה, שמחה, התרמה, אזכרה, הודעת ציבור). כל אחד עשוי
 *  אך ורק מיכולות שהרנדרר מממש, כך שהתצוגה, ה-PNG/PDF, הווידאו וה-SVG זהים. */
export const CURATED_BACKGROUNDS: CuratedBackground[] = [
  { id: "royal-blue", name: "כחול מלכותי", background: { type: "gradient", gradient: { from: "#0B1220", to: "#1A2A4A", angle: 135 }, pattern: "vignette" } },
  { id: "gold-sunset", name: "זהב שקיעה", background: { type: "gradient", gradient: { from: "#2E1A0B", to: "#9C7514", angle: 160 }, pattern: "radial_glow", patternColor: "#FFE9A8" } },
  { id: "parchment", name: "קלף עתיק", background: { type: "gradient", gradient: { from: "#F5EEDD", to: "#E6D9BC", angle: 120 }, pattern: "linen", patternColor: "#8A7444" } },
  { id: "damask-bordeaux", name: "דמשק בורדו", background: { type: "gradient", gradient: { from: "#4A1010", to: "#2B0808", angle: 145 }, pattern: "subtle_damask", patternColor: "#C9A227" } },
  { id: "starry-night", name: "ליל כוכבים", background: { type: "gradient", gradient: { from: "#050B18", to: "#101B32", angle: 90 }, pattern: "radial_glow", patternColor: "#7FA8FF" } },
  { id: "olive-grove", name: "ירוק זית", background: { type: "gradient", gradient: { from: "#1C2415", to: "#3A4A28", angle: 135 }, pattern: "linen", patternColor: "#C9D8A8" } },
  { id: "white-marble", name: "שיש לבן", background: { type: "gradient", gradient: { from: "#FFFFFF", to: "#ECECEC", angle: 100 }, pattern: "linen", patternColor: "#9A9A9A" } },
  { id: "jerusalem-azure", name: "תכלת ירושלים", background: { type: "gradient", gradient: { from: "#0E3A5C", to: "#1C6EA0", angle: 120 }, pattern: "vignette" } },
  { id: "royal-purple", name: "סגול מלכות", background: { type: "gradient", gradient: { from: "#2A103E", to: "#4A2070", angle: 140 }, pattern: "subtle_damask", patternColor: "#E4C55A" } },
  { id: "terra-hamra", name: "אדמת חמרה", background: { type: "gradient", gradient: { from: "#3E1F0A", to: "#6B3A14", angle: 150 }, pattern: "linen", patternColor: "#E0B080" } },
  { id: "charcoal-gold", name: "פחם וזהב", background: { type: "gradient", gradient: { from: "#17181C", to: "#2A2C33", angle: 120 }, pattern: "radial_glow", patternColor: "#C9A227" } },
  { id: "simcha-blush", name: "ורוד שמחות", background: { type: "gradient", gradient: { from: "#F9EDF2", to: "#EFC7D6", angle: 110 }, pattern: "radial_glow", patternColor: "#FFFFFF" } },
  { id: "mikveh-teal", name: "טורקיז עמוק", background: { type: "gradient", gradient: { from: "#0B3B3C", to: "#12666A", angle: 135 }, pattern: "vignette" } },
  { id: "kiddush-wine", name: "יין קידוש", background: { type: "gradient", gradient: { from: "#3B0A1E", to: "#651231", angle: 140 }, pattern: "subtle_damask", patternColor: "#E8B4C8" } },
];

/** עותק עמוק של רקע אצור — כדי שעריכת זווית/צבע אחרי החלה לא תזהם את הקבוע. */
export function cloneBackground(bg: TemplateBackground): TemplateBackground {
  return { ...bg, gradient: bg.gradient ? { ...bg.gradient } : undefined };
}

// ---- (ב) רקעי AI שמורים ----

export interface SavedBackground {
  id: string;
  dataUrl: string;
  prompt: string;
  engine: string;
  savedAt: number;
}

const LS_KEY = "modaot_bg_library_v1";
// רקע Recraft/Gemini כ-data-URL שוקל מאות KB; מכסת localStorage היא ~5MB —
// לכן תקרה קטנה ונידוי הישן-ביותר, לא אוסף בלתי-מוגבל.
const MAX_SAVED = 8;

export function listSavedBackgrounds(): SavedBackground[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is SavedBackground =>
        !!e && typeof e.id === "string" && typeof e.dataUrl === "string" && e.dataUrl.startsWith("data:image/"),
    );
  } catch {
    return [];
  }
}

function persist(list: SavedBackground[]): SavedBackground[] {
  // QuotaExceeded — מנדים מהסוף (הישן ביותר) עד שנכנס או שלא נותר מה לשמור.
  let current = list;
  while (true) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(current));
      return current;
    } catch {
      if (!current.length) return current;
      current = current.slice(0, -1);
    }
  }
}

/** שומר רקע שנוצר; מחזיר את הרשימה המעודכנת. כפילות (אותו dataUrl) לא נשמרת פעמיים. */
export function saveGeneratedBackground(entry: { dataUrl: string; prompt: string; engine: string }): SavedBackground[] {
  const existing = listSavedBackgrounds();
  if (existing.some((e) => e.dataUrl === entry.dataUrl)) return existing;
  const item: SavedBackground = {
    id: `bg_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`,
    dataUrl: entry.dataUrl,
    prompt: entry.prompt,
    engine: entry.engine,
    savedAt: Date.now(),
  };
  return persist([item, ...existing].slice(0, MAX_SAVED));
}

export function removeSavedBackground(id: string): SavedBackground[] {
  return persist(listSavedBackgrounds().filter((e) => e.id !== id));
}
