// ═══════════════════════════════════════════════════════════════════════════
// מנוע הווריאציות — בסיס הטוקנים
// ───────────────────────────────────────────────────────────────────────────
// הרעיון: מודעה = ארכיטיפ-פריסה × פלטה × זוג-פונטים × ערכת-עיטורים × רקע.
// מכפלה של הרכיבים = מאות/אלפי סגנונות אמיתיים ושונים זה מזה.
// כל רכיב מתועד לפי "חתימת משרד" (בוסטון / פוטנציאל / סטודיו 7 / מלכות / חסידי).
// ═══════════════════════════════════════════════════════════════════════════

// ---------------------------------------------------------------------------
// 1. פלטות צבע — כל אחת עם אופי משלה. הרבה יותר מ-5 סגנונות.
// ---------------------------------------------------------------------------
export interface Palette {
  key: string;
  label: string;
  studio?: string; // חתימת משרד/סגנון
  mood: string[]; // תגיות מצב-רוח לסינון (יוקרתי, חם, מודרני, מכובד, חגיגי...)
  bg1: string; // רקע ראשי
  bg2: string; // רקע משני / גרדיאנט
  ink: string; // טקסט על רקע בהיר
  inkOnDark: string; // טקסט על רקע כהה
  accent: string; // הדגשה ראשית (בד"כ זהב/מתכת)
  accent2: string; // הדגשה משנית
  surface: string; // כרטיסים / משטחים
  isDark: boolean; // האם הרקע כהה (קובע צבע טקסט ברירת מחדל)
}

export const PALETTES: Palette[] = [
  // ── יוקרה מלכותית ──
  { key: "royal_navy_gold", label: "נייבי מלכותי · זהב", studio: "מלכות", mood: ["יוקרתי", "מכובד", "חגיגי"], bg1: "#0B1E3D", bg2: "#050E1F", ink: "#0D0D0D", inkOnDark: "#F5EEDD", accent: "#D4AF37", accent2: "#B8912E", surface: "#12294d", isDark: true },
  { key: "royal_burgundy_gold", label: "בורדו עמוק · זהב עתיק", studio: "חסידי", mood: ["יוקרתי", "חם", "מכובד"], bg1: "#5C0A1E", bg2: "#2E0510", ink: "#0D0D0D", inkOnDark: "#F8F2E4", accent: "#C9A227", accent2: "#8B0000", surface: "#6d1226", isDark: true },
  { key: "royal_emerald_gold", label: "ירוק אזמרגד · זהב", studio: "מלכות", mood: ["יוקרתי", "חגיגי", "רענן"], bg1: "#0A2E24", bg2: "#04150F", ink: "#0D0D0D", inkOnDark: "#EFEAD6", accent: "#CBA35C", accent2: "#9c7b3e", surface: "#123a2e", isDark: true },
  { key: "royal_wine_cream", label: "יין · שמנת", studio: "מלכות", mood: ["יוקרתי", "חם", "קלאסי"], bg1: "#7A1F2B", bg2: "#4A0E17", ink: "#3a1418", inkOnDark: "#F6ECDC", accent: "#D8B45A", accent2: "#a37f34", surface: "#8f2733", isDark: true },
  { key: "royal_black_gold", label: "שחור · זהב", studio: "מלכות", mood: ["יוקרתי", "דרמטי", "מכובד"], bg1: "#121212", bg2: "#000000", ink: "#121212", inkOnDark: "#F3E9CE", accent: "#D4AF37", accent2: "#9c7f2e", surface: "#1e1e1e", isDark: true },

  // ── בוסטון-סטייל: נקי, טיפוגרפי, ניגודיות חדה, מודרני-מכובד ──
  { key: "boston_ink_amber", label: "בוסטון · דיו וענבר", studio: "בוסטון", mood: ["מודרני", "נקי", "מכובד"], bg1: "#141821", bg2: "#0d1017", ink: "#141821", inkOnDark: "#F2F4F8", accent: "#E0A73E", accent2: "#c98b2a", surface: "#1c2230", isDark: true },
  { key: "boston_cream_navy", label: "בוסטון · שמנת ונייבי", studio: "בוסטון", mood: ["מודרני", "נקי", "קלאסי"], bg1: "#F4F1EA", bg2: "#EAE5D8", ink: "#1B2A4A", inkOnDark: "#F4F1EA", accent: "#1B2A4A", accent2: "#B8912E", surface: "#FFFFFF", isDark: false },
  { key: "boston_slate_rust", label: "בוסטון · צפחה וחלודה", studio: "בוסטון", mood: ["מודרני", "עוצמתי", "חם"], bg1: "#2B2F36", bg2: "#1a1d22", ink: "#2B2F36", inkOnDark: "#EDEEF0", accent: "#C05621", accent2: "#8f3e18", surface: "#363b44", isDark: true },

  // ── פוטנציאל-סטייל: צבעוני-חי, אנרגטי, גרדיאנטים, קמפיינים ──
  { key: "potential_teal_coral", label: "פוטנציאל · טורקיז ואלמוג", studio: "פוטנציאל", mood: ["אנרגטי", "צבעוני", "מודרני", "צעיר"], bg1: "#0E5C63", bg2: "#0a4247", ink: "#0E3A3F", inkOnDark: "#F0FAFB", accent: "#FF6B5C", accent2: "#FFC145", surface: "#12727a", isDark: true },
  { key: "potential_indigo_lime", label: "פוטנציאל · אינדיגו ולײם", studio: "פוטנציאל", mood: ["אנרגטי", "צעיר", "עוצמתי"], bg1: "#241B4A", bg2: "#150F30", ink: "#241B4A", inkOnDark: "#F3F1FB", accent: "#B6E24A", accent2: "#7B5CFF", surface: "#2f2560", isDark: true },
  { key: "potential_sunset", label: "פוטנציאל · שקיעה", studio: "פוטנציאל", mood: ["אנרגטי", "חם", "חגיגי", "צבעוני"], bg1: "#8A2846", bg2: "#D9642F", ink: "#4a1424", inkOnDark: "#FFF3EC", accent: "#FFD166", accent2: "#FF8C42", surface: "#a1304f", isDark: true },
  { key: "potential_ocean", label: "פוטנציאל · אוקיינוס", studio: "פוטנציאל", mood: ["רענן", "מודרני", "צעיר"], bg1: "#0B4F8A", bg2: "#062E52", ink: "#083357", inkOnDark: "#EEF6FF", accent: "#4FD1C5", accent2: "#63B3ED", surface: "#0f5fa5", isDark: true },

  // ── סטודיו 7: מינימליסטי-פרימיום, שקט, טיפוגרפיה גדולה ──
  { key: "studio7_bone_charcoal", label: "סטודיו 7 · עצם ופחם", studio: "סטודיו 7", mood: ["מינימלי", "נקי", "יוקרתי", "מודרני"], bg1: "#EDEAE3", bg2: "#E2DDD2", ink: "#232323", inkOnDark: "#EDEAE3", accent: "#232323", accent2: "#8a7d68", surface: "#FFFFFF", isDark: false },
  { key: "studio7_sand_terracotta", label: "סטודיו 7 · חול וטרהקוטה", studio: "סטודיו 7", mood: ["מינימלי", "חם", "רגוע"], bg1: "#E7DBC9", bg2: "#DccBB2", ink: "#4A3628", inkOnDark: "#FBF6EE", accent: "#B5643C", accent2: "#8a6f52", surface: "#F3ECDF", isDark: false },
  { key: "studio7_forest_bone", label: "סטודיו 7 · יער ועצם", studio: "סטודיו 7", mood: ["מינימלי", "רגוע", "יוקרתי"], bg1: "#2C382F", bg2: "#1c241e", ink: "#2C382F", inkOnDark: "#EDEAE0", accent: "#C9A96A", accent2: "#8a9a82", surface: "#37443a", isDark: true },
  { key: "studio7_off_white", label: "סטודיו 7 · לבן שבור", studio: "סטודיו 7", mood: ["מינימלי", "נקי", "מודרני"], bg1: "#FAF8F3", bg2: "#F0EDE5", ink: "#1A1A1A", inkOnDark: "#FAF8F3", accent: "#9A7B4F", accent2: "#c2a878", surface: "#FFFFFF", isDark: false },

  // ── מודרני-תורני / מוסדות ──
  { key: "modern_blue_gold", label: "מודרני · כחול וזהב", mood: ["מודרני", "מכובד", "נקי"], bg1: "#1B2A4A", bg2: "#0f1c36", ink: "#1B2A4A", inkOnDark: "#FFFFFF", accent: "#B8912E", accent2: "#4a6fa5", surface: "#E8EDF3", isDark: true },
  { key: "modern_gray_teal", label: "מודרני · אפור וטורקיז", mood: ["מודרני", "נקי", "רענן"], bg1: "#F5F7FA", bg2: "#E6EBF0", ink: "#233044", inkOnDark: "#FFFFFF", accent: "#2C8C99", accent2: "#1f6570", surface: "#FFFFFF", isDark: false },

  // ── קלאסי / עיתונות ──
  { key: "classic_paper_red", label: "קלאסי · נייר ואדום", mood: ["קלאסי", "מסורתי"], bg1: "#FBFAF7", bg2: "#F0EEE8", ink: "#0D0D0D", inkOnDark: "#FFFFFF", accent: "#8B0000", accent2: "#5a5a5a", surface: "#FFFFFF", isDark: false },
  { key: "classic_sepia", label: "קלאסי · ספיה", mood: ["קלאסי", "חם", "מסורתי"], bg1: "#F3E9D6", bg2: "#E6D6B8", ink: "#3a2c17", inkOnDark: "#FBF4E4", accent: "#8a5a2b", accent2: "#5a3d1c", surface: "#FBF4E4", isDark: false },

  // ── אבל ──
  { key: "mourning_bw", label: "אבל · שחור-לבן", mood: ["אבל", "מסורתי"], bg1: "#FFFFFF", bg2: "#FFFFFF", ink: "#000000", inkOnDark: "#000000", accent: "#000000", accent2: "#333333", surface: "#FFFFFF", isDark: false },

  // ═══ תת-סגנונות מבוססי-מחקר (בולטון פוטנציאל / סגנון-7 / מלכותי-חסידי / חתונה) ═══
  // ── בולטון פוטנציאל · "לילה/מסתורין" (קמפיין דוריטוס פורים 2025): שחור מלא + נגיעת צבע יחידה ──
  { key: "bopo_night", label: "בולטון · לילה דרמטי", studio: "פוטנציאל", mood: ["דרמטי", "עוצמתי", "מודרני"], bg1: "#0A0A0A", bg2: "#000000", ink: "#0A0A0A", inkOnDark: "#F7F7F7", accent: "#F5A623", accent2: "#E4C55A", surface: "#141414", isDark: true },
  // ── בולטון פוטנציאל · "נקי ומאופק" (כלל ביטוח/דיסקונט): שחור-לבן-כסף + נקודת צבע יחידה ──
  { key: "bopo_corporate", label: "בולטון · תאגידי מאופק", studio: "בוסטון", mood: ["נקי", "מכובד", "מודרני"], bg1: "#FFFFFF", bg2: "#F2F2F2", ink: "#1A1A1A", inkOnDark: "#FFFFFF", accent: "#0B4F8A", accent2: "#8A8A8A", surface: "#FFFFFF", isDark: false },
  // ── בולטון פוטנציאל · "מזון/משפחתי" (שטראוס/מטרנה): פלטה חמה ומזמינה ──
  { key: "bopo_food_warm", label: "בולטון · מזון חם ומשפחתי", studio: "פוטנציאל", mood: ["חם", "צבעוני", "אנרגטי"], bg1: "#C8471F", bg2: "#E8703A", ink: "#4a1a0c", inkOnDark: "#FFF4EC", accent: "#FFD166", accent2: "#FF8C42", surface: "#d4562b", isDark: true },
  // ── בולטון פוטנציאל · חטיבת "בראש סרוג BOPO" (דתי-לאומי): כחול-לבן/ירוק מודרני ──
  { key: "bopo_dati_leumi", label: "בראש סרוג · דתי-לאומי", studio: "פוטנציאל", mood: ["מודרני", "רענן", "צעיר", "נקי"], bg1: "#0E5A4A", bg2: "#093F34", ink: "#0b3a30", inkOnDark: "#F0FAF6", accent: "#3FA9E0", accent2: "#8FD14F", surface: "#12705c", isDark: true },
  // ── סגנון-7 · "קונספט רעיוני-חד": מינימלי-פרימיום, מוקד יחיד, ניגוד חד ──
  { key: "signon7_concept", label: "סגנון-7 · קונספט חד", studio: "סטודיו 7", mood: ["מינימלי", "עוצמתי", "מודרני", "יוקרתי"], bg1: "#111315", bg2: "#050607", ink: "#111315", inkOnDark: "#F4F5F6", accent: "#D9C27A", accent2: "#6E7B85", surface: "#1a1d20", isDark: true },
  // ── סגנון-7 · "מגזין/תוכן אסטרטגי" ("הפורום"): עיתונאי, קריא, טור ──
  { key: "signon7_magazine", label: "סגנון-7 · מגזין הפורום", studio: "סטודיו 7", mood: ["נקי", "מודרני", "קלאסי"], bg1: "#FBFAF8", bg2: "#EFEDE7", ink: "#1C1C1C", inkOnDark: "#FBFAF8", accent: "#8A2432", accent2: "#4A4A4A", surface: "#FFFFFF", isDark: false },
  // ── מלכותי-חסידי · זהב-בורדו-שחור קלאסי (perli.co.il) ──
  { key: "malchut_gold_burgundy", label: "מלכותי · זהב-בורדו-שחור", studio: "מלכות", mood: ["יוקרתי", "חגיגי", "מכובד", "דרמטי"], bg1: "#1A0608", bg2: "#3A0A12", ink: "#1a0608", inkOnDark: "#F8EFD8", accent: "#C9A227", accent2: "#6B0F1A", surface: "#2a0a10", isDark: true },
  // ── הזמנת חתונה דתית · זהב/כסף/לבן = טהרה וקדושה (clickdesigns) ──
  { key: "wedding_gold_white", label: "חתונה · זהב על לבן", studio: "מלכות", mood: ["יוקרתי", "חגיגי", "רגוע", "נקי"], bg1: "#FCF9F2", bg2: "#F4EEDF", ink: "#3A2E15", inkOnDark: "#FCF9F2", accent: "#B99433", accent2: "#CBB26B", surface: "#FFFFFF", isDark: false },
  { key: "wedding_silver_white", label: "חתונה · כסף על שמנת", studio: "מלכות", mood: ["יוקרתי", "רגוע", "נקי", "קלאסי"], bg1: "#F7F6F3", bg2: "#ECEAE4", ink: "#2E2E30", inkOnDark: "#F7F6F3", accent: "#8A8D93", accent2: "#B7BABF", surface: "#FFFFFF", isDark: false },
];

export const getPalette = (key: string) => PALETTES.find((p) => p.key === key) || PALETTES[0];

// ---------------------------------------------------------------------------
// 2. זוגות פונטים — כותרת + גוף. אופי טיפוגרפי משתנה דרמטית בין הזוגות.
// ---------------------------------------------------------------------------
export interface FontPairing {
  key: string;
  label: string;
  title: string; // פונט כותרת
  body: string; // פונט גוף
  titleWeight: number;
  bodyWeight: number;
  character: string[]; // תגיות (מסורתי, מודרני, דרמטי, עדין...)
}

export const FONT_PAIRINGS: FontPairing[] = [
  { key: "libre_classic", label: "פרנק-ריהל · דוד", title: "David Libre", body: "Frank Ruhl Libre", titleWeight: 700, bodyWeight: 400, character: ["מסורתי", "מכובד", "יוקרתי"] },
  { key: "frank_solo", label: "פרנק-ריהל (מלא)", title: "Frank Ruhl Libre", body: "Frank Ruhl Libre", titleWeight: 900, bodyWeight: 400, character: ["מסורתי", "קלאסי"] },
  { key: "assistant_heebo", label: "אסיסטנט · היבו", title: "Assistant", body: "Heebo", titleWeight: 800, bodyWeight: 400, character: ["מודרני", "נקי"] },
  { key: "heebo_bold", label: "היבו עוצמתי", title: "Heebo", body: "Heebo", titleWeight: 900, bodyWeight: 400, character: ["מודרני", "עוצמתי"] },
  { key: "rubik_heebo", label: "רוביק · היבו", title: "Rubik", body: "Heebo", titleWeight: 900, bodyWeight: 400, character: ["מודרני", "צעיר", "מעוגל"] },
  { key: "rubik_assistant", label: "רוביק · אסיסטנט", title: "Rubik", body: "Assistant", titleWeight: 700, bodyWeight: 400, character: ["מודרני", "צעיר"] },
  { key: "david_heebo", label: "דוד · היבו (מעורב)", title: "David Libre", body: "Heebo", titleWeight: 700, bodyWeight: 400, character: ["מכובד", "מודרני"] },
  { key: "amatic_heebo", label: "אמאטיק · היבו", title: "Amatic SC", body: "Heebo", titleWeight: 700, bodyWeight: 400, character: ["דקורטיבי", "צעיר", "חופשי"] },
  { key: "assistant_frank", label: "אסיסטנט · פרנק-ריהל", title: "Assistant", body: "Frank Ruhl Libre", titleWeight: 800, bodyWeight: 400, character: ["מודרני", "מכובד"] },
];

export const getFontPairing = (key: string) => FONT_PAIRINGS.find((f) => f.key === key) || FONT_PAIRINGS[0];

// ---------------------------------------------------------------------------
// 3. ערכות עיטורים — מגדירות את שפת הקישוט של המודעה.
// ---------------------------------------------------------------------------
export type OrnamentSet = {
  key: string;
  label: string;
  level: "high" | "medium" | "low" | "none";
  frame: "frame_ornate" | "frame_double" | "frame_mourning" | "none"; // מסגרת
  corners: boolean; // עיטורי פינה
  crown: boolean; // כתר עליון
  divider: "divider_ornament" | "divider_line" | "flourish" | "none";
  topBar: boolean; // פס עליון/תחתון מתכתי
  studio?: string;
};

export const ORNAMENT_SETS: OrnamentSet[] = [
  { key: "royal_full", label: "מלכותי מלא", level: "high", frame: "frame_ornate", corners: true, crown: true, divider: "divider_ornament", topBar: false, studio: "מלכות" },
  { key: "royal_frame", label: "מסגרת מלכותית", level: "high", frame: "frame_double", corners: true, crown: false, divider: "divider_ornament", topBar: true, studio: "חסידי" },
  { key: "chasidic_rich", label: "חסידי עשיר", level: "high", frame: "frame_double", corners: false, crown: true, divider: "divider_ornament", topBar: true, studio: "חסידי" },
  { key: "elegant_line", label: "אלגנטי-קווי", level: "medium", frame: "none", corners: false, crown: false, divider: "divider_line", topBar: true, studio: "בוסטון" },
  { key: "boston_minimal", label: "בוסטון מינימלי", level: "low", frame: "none", corners: false, crown: false, divider: "divider_line", topBar: false, studio: "בוסטון" },
  { key: "modern_clean", label: "מודרני נקי", level: "low", frame: "none", corners: false, crown: false, divider: "divider_line", topBar: false },
  { key: "studio7_bare", label: "סטודיו 7 חשוף", level: "none", frame: "none", corners: false, crown: false, divider: "none", topBar: false, studio: "סטודיו 7" },
  { key: "potential_accentbar", label: "פוטנציאל · פסי הדגשה", level: "medium", frame: "none", corners: false, crown: false, divider: "divider_line", topBar: true, studio: "פוטנציאל" },
  { key: "mourning_set", label: "אבל", level: "medium", frame: "frame_mourning", corners: false, crown: false, divider: "none", topBar: false },
  // ── תת-סגנונות מבוססי-מחקר ──
  { key: "night_single_accent", label: "לילה · הדגשה יחידה", level: "low", frame: "none", corners: false, crown: false, divider: "divider_line", topBar: false, studio: "פוטנציאל" },
  { key: "concept_bare", label: "קונספט חשוף", level: "none", frame: "none", corners: false, crown: false, divider: "none", topBar: false, studio: "סטודיו 7" },
  { key: "malchut_grand", label: "מלכותי מפואר", level: "high", frame: "frame_ornate", corners: true, crown: true, divider: "divider_ornament", topBar: true, studio: "מלכות" },
  { key: "wedding_delicate", label: "חתונה · עדין", level: "medium", frame: "frame_double", corners: true, crown: false, divider: "flourish", topBar: false, studio: "מלכות" },
];

export const getOrnamentSet = (key: string) => ORNAMENT_SETS.find((o) => o.key === key) || ORNAMENT_SETS[0];

// ---------------------------------------------------------------------------
// 4. רקעים — טיפול הרקע (גרדיאנט/מוצק/טקסטורה/בלוקים).
// ---------------------------------------------------------------------------
export type BackgroundTreatment = {
  key: string;
  label: string;
  kind: "solid" | "gradient" | "pattern" | "split" | "header_block" | "arch";
  pattern?: "subtle_damask" | "linen" | "radial_glow" | "vignette" | "none";
  angle?: number;
};

export const BACKGROUND_TREATMENTS: BackgroundTreatment[] = [
  { key: "gradient_vignette", label: "גרדיאנט + ויניה", kind: "gradient", pattern: "vignette", angle: 135 },
  { key: "gradient_damask", label: "גרדיאנט + דמשק", kind: "gradient", pattern: "subtle_damask", angle: 160 },
  { key: "gradient_glow", label: "גרדיאנט + זוהר", kind: "gradient", pattern: "radial_glow", angle: 180 },
  { key: "solid_clean", label: "מוצק נקי", kind: "solid", pattern: "none" },
  { key: "solid_linen", label: "מוצק + פשתן", kind: "solid", pattern: "linen" },
  { key: "header_block", label: "בלוק כותרת עליון", kind: "header_block", pattern: "none" },
  { key: "split_diagonal", label: "חלוקה אלכסונית", kind: "split", pattern: "none", angle: 20 },
  { key: "arch_frame", label: "קשת עליונה", kind: "arch", pattern: "none" },
];

export const getBackgroundTreatment = (key: string) => BACKGROUND_TREATMENTS.find((b) => b.key === key) || BACKGROUND_TREATMENTS[0];
