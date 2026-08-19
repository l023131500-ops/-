// ═══════════════════════════════════════════════════════════════════════════
// מנוע הבריף החכם — שאלון קצר → הבנת קונספט → הצעת קונספטים מעוצבים.
// ───────────────────────────────────────────────────────────────────────────
// הבריף אוסף: קטגוריה, קהל יעד, מצב-רוח/אווירה, מסר מרכזי, פורמט, העדפת צבע,
// ורפרנסים (מודעות שאהבת). מתוך זה המערכת:
//   1. מנסחת "הבנת רעיון" (concept understanding).
//   2. מדרגת פריסטים מתאימים (matchPresets).
//   3. מציעה 3-4 קונספטים עם הסבר למה כל אחד מתאים.
// ═══════════════════════════════════════════════════════════════════════════

import { PRESETS, type StylePreset } from "./presetCatalog";

export interface Brief {
  category: string; // מפתח קטגוריה (shiur_gemara, wedding_chasidic...)
  audience?: string; // קהל יעד (אברכים, בעלי בתים, נשים, נוער, כללי...)
  mood: string[]; // מצב-רוח/אווירה נבחרים (מתוך MOODS)
  message?: string; // המסר המרכזי / רעיון בחופשי
  format?: string; // מפתח פורמט
  colorPref?: string; // העדפת צבע (חופשי או מפתח פלטה)
  refNotes?: string; // הערות על מודעות/רפרנסים שאהב
}

// תיאורי קהל יעד → הטיית מצב-רוח
export const AUDIENCES = [
  { key: "avreichim", label: "אברכים / בני תורה", moodBias: ["מכובד", "יוקרתי", "מסורתי"] },
  { key: "baalei_batim", label: "בעלי בתים", moodBias: ["מכובד", "נקי", "מודרני"] },
  { key: "nashim", label: "נשים", moodBias: ["רגוע", "חם", "נקי"] },
  { key: "noar", label: "נוער / בחורים", moodBias: ["אנרגטי", "צעיר", "עוצמתי"] },
  { key: "kehila", label: "כלל הקהילה", moodBias: ["מכובד", "חגיגי"] },
  { key: "mosad", label: "מוסד / ארגון", moodBias: ["מודרני", "מכובד", "נקי"] },
];

// דירוג פריסטים לפי התאמה לבריף (ציון 0..1)
export function matchPresets(brief: Brief, limit = 4): { preset: StylePreset; score: number; reason: string }[] {
  const wantMoods = new Set(brief.mood ?? []);
  // הוסף הטיית קהל
  const aud = AUDIENCES.find((a) => a.key === brief.audience);
  const biasMoods = new Set(aud?.moodBias ?? []);

  const scored = PRESETS.map((preset) => {
    let score = 0;
    const matched: string[] = [];
    for (const m of preset.mood) {
      if (wantMoods.has(m)) { score += 2; matched.push(m); }
      else if (biasMoods.has(m)) { score += 0.8; matched.push(m); }
    }
    // בונוס קטגוריית אבל → רק אבל
    if (brief.category?.startsWith("petira") || brief.category === "evel") {
      score = preset.studio === "אבל" ? 100 : -100;
    } else if (preset.studio === "אבל") {
      score = -100; // אל תציע אבל למשהו שמח
    }
    // גיוון: הוסף רעש קטן דטרמיניסטי לפי key כדי לא להחזיר רק אותו משרד
    const reason = buildReason(preset, matched);
    return { preset, score, reason };
  });

  scored.sort((a, b) => b.score - a.score);
  // גיוון תוצאות: ודא שאין יותר מ-2 מאותו משרד ב-top
  const out: typeof scored = [];
  const studioCount: Record<string, number> = {};
  for (const s of scored) {
    if (s.score <= -50) continue;
    const c = studioCount[s.preset.studio] ?? 0;
    if (c >= 2 && out.length >= limit - 1) continue;
    studioCount[s.preset.studio] = c + 1;
    out.push(s);
    if (out.length >= limit) break;
  }
  // אם אין מספיק — מלא מהראש
  if (out.length < limit) {
    for (const s of scored) {
      if (out.includes(s) || s.score <= -50) continue;
      out.push(s);
      if (out.length >= limit) break;
    }
  }
  return out;
}

function buildReason(preset: StylePreset, matched: string[]): string {
  const studioDesc: Record<string, string> = {
    "מלכות": "הידור מלכותי עם מסגרות זהב ועיטורים עשירים",
    "חסידי": "אווירה חסידית חמה עם בורדו וזהב עתיק",
    "בוסטון": "עיצוב נקי וטיפוגרפי בסגנון בוסטון — מכובד ומודרני",
    "פוטנציאל": "אנרגיה צבעונית ודינמית בסגנון פוטנציאל",
    "סטודיו 7": "מינימליזם פרימיום עם טיפוגרפיה גדולה בסגנון סטודיו 7",
    "מודרני": "מראה מוסדי מודרני ונקי",
    "קלאסי": "מראה קלאסי-עיתונאי מסורתי",
    "אבל": "מבנה מסורתי מכובד למודעת אבל",
  };
  const base = studioDesc[preset.studio] ?? preset.name;
  if (matched.length) return `${base}. מתאים לאווירה: ${matched.join(", ")}.`;
  return base + ".";
}

// ניסוח "הבנת רעיון" מבוסס-KB (fallback ללא AI)
export function conceptUnderstanding(brief: Brief): string {
  const parts: string[] = [];
  const audLabel = AUDIENCES.find((a) => a.key === brief.audience)?.label;
  if (brief.message) parts.push(`הרעיון המרכזי: ${brief.message}`);
  if (audLabel) parts.push(`קהל היעד: ${audLabel}`);
  if (brief.mood?.length) parts.push(`האווירה המבוקשת: ${brief.mood.join(", ")}`);
  if (brief.colorPref) parts.push(`העדפת צבע: ${brief.colorPref}`);
  if (brief.refNotes) parts.push(`רפרנסים שאהבת: ${brief.refNotes}`);
  return parts.length
    ? "הבנתי — " + parts.join(". ") + ". להלן כמה כיווני עיצוב שמתאימים בול לרעיון:"
    : "להלן כמה כיווני עיצוב מומלצים:";
}
