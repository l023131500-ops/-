// ═══════════════════════════════════════════════════════════════════════════
// קטלוג הפריסטים — הופך את מנוע-הווריאציות לגלריה נתונה לגלישה.
// ───────────────────────────────────────────────────────────────────────────
// כל פריסט = צירוף קוהרנטי (layout+palette+fonts+ornaments+background) שנבחר
// בקפידה כך שייראה טוב. מחולל CURATED_COMBOS מרחיב למאות סגנונות אמיתיים.
// כל פריסט משויך למשרד/סגנון (studioSignature) לסינון בגלריה.
// ═══════════════════════════════════════════════════════════════════════════

import { composeTemplate, type FieldValues, type ComposeSpec } from "./variationEngine";
import type { TemplateDoc } from "./layers";

export interface StylePreset {
  key: string;
  name: string; // שם ידידותי
  studio: string; // חתימת משרד (מלכות/חסידי/בוסטון/פוטנציאל/סטודיו 7/מודרני/קלאסי/אבל)
  mood: string[]; // תגיות סינון
  spec: Omit<ComposeSpec, "width" | "height" | "fields">;
}

// ---------------------------------------------------------------------------
// צירופים קוהרנטיים ידניים — "חתימות" של כל משרד. אלו העוגנים האיכותיים.
// המחולל למטה מרחיב אותם למאות וריאציות.
// ---------------------------------------------------------------------------
type Combo = {
  studio: string; nameBase: string; mood: string[];
  layout: string; palette: string; fonts: string; ornaments: string; background: string;
};

export const CURATED_COMBOS: Combo[] = [
  // ── מלכות (יוקרה מלכותית) ──
  { studio: "מלכות", nameBase: "מלכות · נייבי-זהב מפואר", mood: ["יוקרתי", "חגיגי"], layout: "classic_centered", palette: "royal_navy_gold", fonts: "libre_classic", ornaments: "royal_full", background: "gradient_vignette" },
  { studio: "מלכות", nameBase: "מלכות · שחור-זהב דרמטי", mood: ["יוקרתי", "דרמטי"], layout: "classic_centered", palette: "royal_black_gold", fonts: "libre_classic", ornaments: "royal_full", background: "gradient_glow" },
  { studio: "מלכות", nameBase: "מלכות · אזמרגד מלכותי", mood: ["יוקרתי", "רענן"], layout: "classic_centered", palette: "royal_emerald_gold", fonts: "libre_classic", ornaments: "royal_frame", background: "gradient_damask" },
  { studio: "מלכות", nameBase: "מלכות · יין ושמנת", mood: ["יוקרתי", "חם"], layout: "type_hero", palette: "royal_wine_cream", fonts: "frank_solo", ornaments: "royal_frame", background: "gradient_vignette" },

  // ── חסידי (בורדו/זהב עשיר) ──
  { studio: "חסידי", nameBase: "חסידי · בורדו מלכותי", mood: ["יוקרתי", "מכובד"], layout: "classic_centered", palette: "royal_burgundy_gold", fonts: "libre_classic", ornaments: "chasidic_rich", background: "gradient_damask" },
  { studio: "חסידי", nameBase: "חסידי · בורדו + מסגרת כפולה", mood: ["מכובד", "חם"], layout: "banner_top", palette: "royal_burgundy_gold", fonts: "frank_solo", ornaments: "royal_frame", background: "gradient_vignette" },
  { studio: "חסידי", nameBase: "חסידי · יין קלאסי", mood: ["חם", "מסורתי"], layout: "card_centered", palette: "royal_wine_cream", fonts: "libre_classic", ornaments: "chasidic_rich", background: "gradient_damask" },

  // ── בוסטון (נקי, טיפוגרפי, מכובד-מודרני) ──
  { studio: "בוסטון", nameBase: "בוסטון · דיו וענבר", mood: ["מודרני", "נקי", "מכובד"], layout: "header_block", palette: "boston_ink_amber", fonts: "assistant_frank", ornaments: "boston_minimal", background: "header_block" },
  { studio: "בוסטון", nameBase: "בוסטון · שמנת ונייבי", mood: ["נקי", "קלאסי"], layout: "type_hero", palette: "boston_cream_navy", fonts: "assistant_frank", ornaments: "elegant_line", background: "solid_clean" },
  { studio: "בוסטון", nameBase: "בוסטון · צפחה וחלודה", mood: ["עוצמתי", "מודרני"], layout: "banner_top", palette: "boston_slate_rust", fonts: "heebo_bold", ornaments: "elegant_line", background: "solid_clean" },
  { studio: "בוסטון", nameBase: "בוסטון · דיו טיפוגרפי", mood: ["מודרני", "מכובד"], layout: "type_hero", palette: "boston_ink_amber", fonts: "assistant_heebo", ornaments: "boston_minimal", background: "gradient_glow" },

  // ── פוטנציאל (אנרגטי, צבעוני, קמפיינים) ──
  { studio: "פוטנציאל", nameBase: "פוטנציאל · טורקיז ואלמוג", mood: ["אנרגטי", "צעיר"], layout: "asymmetric", palette: "potential_teal_coral", fonts: "rubik_heebo", ornaments: "potential_accentbar", background: "solid_clean" },
  { studio: "פוטנציאל", nameBase: "פוטנציאל · שקיעה", mood: ["אנרגטי", "חם", "חגיגי"], layout: "header_block", palette: "potential_sunset", fonts: "rubik_assistant", ornaments: "potential_accentbar", background: "header_block" },
  { studio: "פוטנציאל", nameBase: "פוטנציאל · אינדיגו ולײם", mood: ["צעיר", "עוצמתי"], layout: "asymmetric", palette: "potential_indigo_lime", fonts: "rubik_heebo", ornaments: "modern_clean", background: "split_diagonal" },
  { studio: "פוטנציאל", nameBase: "פוטנציאל · אוקיינוס", mood: ["רענן", "מודרני"], layout: "card_centered", palette: "potential_ocean", fonts: "rubik_assistant", ornaments: "modern_clean", background: "gradient_glow" },

  // ── סטודיו 7 (מינימליסטי-פרימיום) ──
  { studio: "סטודיו 7", nameBase: "סטודיו 7 · עצם ופחם", mood: ["מינימלי", "יוקרתי"], layout: "type_hero", palette: "studio7_bone_charcoal", fonts: "assistant_frank", ornaments: "studio7_bare", background: "solid_clean" },
  { studio: "סטודיו 7", nameBase: "סטודיו 7 · חול וטרהקוטה", mood: ["מינימלי", "חם", "רגוע"], layout: "type_hero", palette: "studio7_sand_terracotta", fonts: "assistant_heebo", ornaments: "studio7_bare", background: "solid_linen" },
  { studio: "סטודיו 7", nameBase: "סטודיו 7 · יער ועצם", mood: ["מינימלי", "רגוע", "יוקרתי"], layout: "type_hero", palette: "studio7_forest_bone", fonts: "libre_classic", ornaments: "elegant_line", background: "solid_clean" },
  { studio: "סטודיו 7", nameBase: "סטודיו 7 · לבן שבור", mood: ["מינימלי", "נקי"], layout: "card_centered", palette: "studio7_off_white", fonts: "assistant_heebo", ornaments: "studio7_bare", background: "solid_clean" },

  // ── מודרני-תורני / מוסדות ──
  { studio: "מודרני", nameBase: "מודרני · כחול וזהב", mood: ["מודרני", "מכובד"], layout: "header_block", palette: "modern_blue_gold", fonts: "assistant_heebo", ornaments: "modern_clean", background: "header_block" },
  { studio: "מודרני", nameBase: "מודרני · אפור וטורקיז", mood: ["מודרני", "נקי", "רענן"], layout: "card_centered", palette: "modern_gray_teal", fonts: "heebo_bold", ornaments: "modern_clean", background: "solid_clean" },
  { studio: "מודרני", nameBase: "מודרני · גריד ימים", mood: ["מודרני", "נקי"], layout: "weekly_grid", palette: "modern_gray_teal", fonts: "assistant_heebo", ornaments: "modern_clean", background: "gradient_glow" },

  // ── קלאסי / עיתונות ──
  { studio: "קלאסי", nameBase: "קלאסי · נייר ואדום", mood: ["קלאסי", "מסורתי"], layout: "banner_top", palette: "classic_paper_red", fonts: "frank_solo", ornaments: "elegant_line", background: "solid_clean" },
  { studio: "קלאסי", nameBase: "קלאסי · ספיה", mood: ["קלאסי", "חם"], layout: "classic_centered", palette: "classic_sepia", fonts: "libre_classic", ornaments: "elegant_line", background: "solid_linen" },

  // ── אבל ──
  { studio: "אבל", nameBase: "אבל · מסורתי", mood: ["אבל", "מסורתי"], layout: "mourning", palette: "mourning_bw", fonts: "libre_classic", ornaments: "mourning_set", background: "solid_clean" },

  // ═══ תת-סגנונות מבוססי-מחקר (משפחות סגנון עם עוגן תיעודי) ═══
  // בולטון פוטנציאל · לילה דרמטי (שחור + נגיעת צבע יחידה)
  { studio: "פוטנציאל", nameBase: "בולטון · לילה דרמטי", mood: ["דרמטי", "עוצמתי", "מודרני"], layout: "type_hero", palette: "bopo_night", fonts: "heebo_bold", ornaments: "night_single_accent", background: "gradient_glow" },
  // בולטון פוטנציאל · תאגידי מאופק (שחור-לבן-כסף + נקודת צבע)
  { studio: "בוסטון", nameBase: "בולטון · תאגידי מאופק", mood: ["נקי", "מכובד", "מודרני"], layout: "header_block", palette: "bopo_corporate", fonts: "assistant_heebo", ornaments: "boston_minimal", background: "header_block" },
  // בולטון פוטנציאל · מזון חם ומשפחתי
  { studio: "פוטנציאל", nameBase: "בולטון · מזון חם", mood: ["חם", "צבעוני", "אנרגטי"], layout: "asymmetric", palette: "bopo_food_warm", fonts: "rubik_heebo", ornaments: "potential_accentbar", background: "solid_clean" },
  // בראש סרוג BOPO · דתי-לאומי
  { studio: "פוטנציאל", nameBase: "בראש סרוג · דתי-לאומי", mood: ["מודרני", "רענן", "צעיר"], layout: "card_centered", palette: "bopo_dati_leumi", fonts: "rubik_assistant", ornaments: "modern_clean", background: "gradient_glow" },
  // סגנון-7 · קונספט חד (מוקד יחיד, ניגוד חד)
  { studio: "סטודיו 7", nameBase: "סגנון-7 · קונספט חד", mood: ["מינימלי", "עוצמתי", "יוקרתי"], layout: "type_hero", palette: "signon7_concept", fonts: "assistant_frank", ornaments: "concept_bare", background: "gradient_glow" },
  // סגנון-7 · מגזין הפורום (עיתונאי, קריא)
  { studio: "סטודיו 7", nameBase: "סגנון-7 · מגזין הפורום", mood: ["נקי", "קלאסי", "מודרני"], layout: "banner_top", palette: "signon7_magazine", fonts: "assistant_frank", ornaments: "elegant_line", background: "solid_clean" },
  // מלכותי-חסידי · זהב-בורדו-שחור
  { studio: "מלכות", nameBase: "מלכותי · זהב-בורדו-שחור", mood: ["יוקרתי", "חגיגי", "דרמטי"], layout: "classic_centered", palette: "malchut_gold_burgundy", fonts: "frank_solo", ornaments: "malchut_grand", background: "gradient_vignette" },
  // חתונה · זהב על לבן (טהרה/קדושה)
  { studio: "מלכות", nameBase: "חתונה · זהב על לבן", mood: ["יוקרתי", "חגיגי", "רגוע", "נקי"], layout: "card_centered", palette: "wedding_gold_white", fonts: "libre_classic", ornaments: "wedding_delicate", background: "solid_clean" },
  // חתונה · כסף על שמנת
  { studio: "מלכות", nameBase: "חתונה · כסף על שמנת", mood: ["יוקרתי", "רגוע", "נקי", "קלאסי"], layout: "type_hero", palette: "wedding_silver_white", fonts: "assistant_frank", ornaments: "wedding_delicate", background: "solid_clean" },
];

// ---------------------------------------------------------------------------
// מחולל וריאציות — מרחיב כל combo לכמה גרסאות (layout/רקע חלופיים) →
// עשרות-מאות פריסטים. שומר קוהרנטיות (רק צירופים שמתאימים לאופי).
// ---------------------------------------------------------------------------
const LAYOUT_ALTS: Record<string, string[]> = {
  // לכל studio — אילו ארכיטיפים מתאימים לו
  "מלכות": ["classic_centered", "type_hero", "card_centered", "banner_top"],
  "חסידי": ["classic_centered", "banner_top", "card_centered"],
  "בוסטון": ["header_block", "type_hero", "banner_top", "card_centered"],
  "פוטנציאל": ["asymmetric", "header_block", "card_centered", "banner_top"],
  "סטודיו 7": ["type_hero", "card_centered", "classic_centered"],
  "מודרני": ["header_block", "card_centered", "weekly_grid", "type_hero"],
  "קלאסי": ["banner_top", "classic_centered"],
  "אבל": ["mourning"],
};

const BG_ALTS: Record<string, string[]> = {
  "gradient_vignette": ["gradient_vignette", "gradient_glow", "gradient_damask"],
  "gradient_glow": ["gradient_glow", "gradient_vignette"],
  "gradient_damask": ["gradient_damask", "gradient_vignette"],
  "solid_clean": ["solid_clean", "solid_linen"],
  "solid_linen": ["solid_linen", "solid_clean"],
  "header_block": ["header_block", "gradient_glow"],
  "split_diagonal": ["split_diagonal", "solid_clean"],
};

// בונה את רשימת כל הפריסטים (עוגנים + וריאציות)
function buildPresets(): StylePreset[] {
  const out: StylePreset[] = [];
  const seen = new Set<string>();

  for (const combo of CURATED_COMBOS) {
    const layouts = LAYOUT_ALTS[combo.studio] ?? [combo.layout];
    const bgs = BG_ALTS[combo.background] ?? [combo.background];
    let variantIdx = 0;
    for (const layout of layouts) {
      for (const bg of bgs) {
        const specKey = `${combo.palette}|${combo.fonts}|${combo.ornaments}|${layout}|${bg}`;
        if (seen.has(specKey)) continue;
        seen.add(specKey);
        const isAnchor = layout === combo.layout && bg === combo.background;
        const key = `${combo.palette}_${layout}_${bg}`;
        out.push({
          key,
          name: isAnchor ? combo.nameBase : `${combo.nameBase} · וריאציה ${++variantIdx}`,
          studio: combo.studio,
          mood: combo.mood,
          spec: { layout, palette: combo.palette, fonts: combo.fonts, ornaments: combo.ornaments, background: bg },
        });
      }
    }
  }
  return out;
}

export const PRESETS: StylePreset[] = buildPresets();

export const getPreset = (key: string) => PRESETS.find((p) => p.key === key);

// חתימות משרד ייחודיות (לסינון בגלריה)
export const STUDIOS = ["הכל", "מלכות", "חסידי", "בוסטון", "פוטנציאל", "סטודיו 7", "מודרני", "קלאסי", "אבל"];

// כל תגיות מצב-הרוח הזמינות
export const MOODS = ["יוקרתי", "מודרני", "נקי", "מכובד", "חגיגי", "חם", "אנרגטי", "צעיר", "מינימלי", "רגוע", "עוצמתי", "רענן", "צבעוני", "דרמטי", "קלאסי", "מסורתי"];

// בונה TemplateDoc מפריסט + שדות + מידות
export function renderPreset(presetKey: string, width: number, height: number, fields?: FieldValues, withPhoto = true): TemplateDoc | null {
  const preset = getPreset(presetKey);
  if (!preset) return null;
  return composeTemplate({ ...preset.spec, width, height, fields, withPhoto });
}
