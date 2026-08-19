// ═══════════════════════════════════════════════════════════════════════════
// קטלוג תבניות לפי קטגוריה — הגשר בין 20 הקטגוריות (knowledge.ts) לבין
// מנוע-הווריאציות (composeTemplate). לכל קטגוריה מוגדרים:
//   • צירופי-עיצוב מומלצים ("כמו שמקובל" בענף) — layout+palette+fonts+ornaments+background
//   • ברירות-מחדל לשדות (fieldDefaults) שמתאימות לסוג המודעה
//   • מבנה קבוע היכן שהמסורת דורשת (למשל אבל: שחור-לבן, מסגרת, תנצב"ה)
// כך שכל קטגוריה מפיקה מיד תבניות נכונות ומכובדות, לא צירוף אקראי.
// ───────────────────────────────────────────────────────────────────────────
// מקורות מחקר: research2/design_engine.md (מוסכמות מודעות אבל/שמחה),
//   modaot-avelim.com, fontim.co.il, clickdesigns.co.il, perli.co.il, zevi.co.il.
// ═══════════════════════════════════════════════════════════════════════════

import { composeTemplate, type FieldValues, type ComposeSpec } from "./variationEngine";
import type { TemplateDoc } from "./layers";
import { getCategory } from "./knowledge";

type Spec = Omit<ComposeSpec, "width" | "height" | "fields">;

export interface CategoryTemplate {
  key: string; // מזהה ייחודי בתוך הקטגוריה
  name: string; // שם ידידותי
  note: string; // למה זה מתאים / מה מיוחד בו
  locked?: boolean; // מבנה נעול (מסורת) — אי-אפשר לשנות צבעים/מבנה
  spec: Spec;
  fieldDefaults?: FieldValues; // טקסט ברירת-מחדל לשדות
}

export interface CategoryTemplateSet {
  categoryKey: string;
  label: string; // שם הקטגוריה
  intro: string; // משפט הסבר על מוסכמות הסוג
  templates: CategoryTemplate[];
}

// ---------------------------------------------------------------------------
// הגדרות התבניות לכל קטגוריה
// ---------------------------------------------------------------------------
type CatalogEntry = Omit<CategoryTemplateSet, "categoryKey" | "label"> & { fieldDefaultsAll?: FieldValues };

const CATALOG: Record<string, CatalogEntry> = {
  // ═══ שיעורי תורה ═══
  shiur_daf_yomi: {
    intro: "מודעת דף-יומי: כותרת מסכת/דף בולטת, זמן קבוע, שם המגיד. מכובד ונקי.",
    templates: [
      { key: "modern_clean", name: "מודרני · כחול-זהב", note: "מוסדי ונקי — קריא לכל קהל", spec: { layout: "header_block", palette: "modern_blue_gold", fonts: "assistant_heebo", ornaments: "modern_clean", background: "header_block" } },
      { key: "chasidic_warm", name: "חסידי · בורדו-זהב", note: "חם ומסורתי לבתי-מדרש", spec: { layout: "classic_centered", palette: "royal_burgundy_gold", fonts: "libre_classic", ornaments: "chasidic_rich", background: "gradient_damask" } },
      { key: "boston_type", name: "בוסטון · טיפוגרפי", note: "כותרת גדולה, מראה עיתונאי מכובד", spec: { layout: "type_hero", palette: "boston_ink_amber", fonts: "assistant_frank", ornaments: "boston_minimal", background: "solid_clean" } },
    ],
  },
  shiur_gemara: {
    intro: "שיעור גמרא עיוני: אווירה תורנית מכובדת, בורדו/זהב, פונט סריף.",
    templates: [
      { key: "chasidic_royal", name: "חסידי-מלכותי · בורדו", note: "הסגנון הדומיננטי לשיעורי עיון", spec: { layout: "classic_centered", palette: "royal_burgundy_gold", fonts: "libre_classic", ornaments: "chasidic_rich", background: "gradient_damask" } },
      { key: "malchut_navy", name: "מלכות · נייבי-זהב", note: "הידור מלכותי לשיעור מרכזי", spec: { layout: "classic_centered", palette: "royal_navy_gold", fonts: "libre_classic", ornaments: "royal_full", background: "gradient_vignette" } },
      { key: "classic_sepia", name: "קלאסי · ספיה", note: "מסורתי-עיתונאי", spec: { layout: "classic_centered", palette: "classic_sepia", fonts: "libre_classic", ornaments: "elegant_line", background: "solid_linen" } },
    ],
  },
  shiur_halacha: {
    intro: "שיעור הלכה: בהיר, מסודר, מדגיש נושא ומועד. מודרני-תורני.",
    templates: [
      { key: "modern_gray_teal", name: "מודרני · אפור-טורקיז", note: "נקי וברור להלכה יומית", spec: { layout: "card_centered", palette: "modern_gray_teal", fonts: "heebo_bold", ornaments: "modern_clean", background: "solid_clean" } },
      { key: "modern_blue_gold", name: "מודרני · כחול-זהב", note: "מוסדי ומכובד", spec: { layout: "header_block", palette: "modern_blue_gold", fonts: "assistant_heebo", ornaments: "modern_clean", background: "header_block" } },
      { key: "boston_cream", name: "בוסטון · שמנת-נייבי", note: "טיפוגרפי ונקי", spec: { layout: "type_hero", palette: "boston_cream_navy", fonts: "assistant_frank", ornaments: "elegant_line", background: "solid_clean" } },
    ],
  },
  shiur_mussar: {
    intro: "שיעור מוסר: חם, מעמיק, אווירה מכובדת ומסורתית.",
    templates: [
      { key: "chasidic_wine", name: "חסידי · יין קלאסי", note: "חם ומעורר", spec: { layout: "card_centered", palette: "royal_wine_cream", fonts: "libre_classic", ornaments: "chasidic_rich", background: "gradient_damask" } },
      { key: "studio7_sand", name: "סטודיו 7 · חול-טרהקוטה", note: "רגוע ומינימלי", spec: { layout: "type_hero", palette: "studio7_sand_terracotta", fonts: "assistant_heebo", ornaments: "studio7_bare", background: "solid_linen" } },
      { key: "malchut_navy", name: "מלכות · נייבי-זהב", note: "מכובד לשיעור קבוע", spec: { layout: "classic_centered", palette: "royal_navy_gold", fonts: "libre_classic", ornaments: "royal_frame", background: "gradient_vignette" } },
    ],
  },
  shiur_chasidut: {
    intro: "שיעור חסידות: אווירה חסידית עשירה, בורדו/זהב, עיטורים.",
    templates: [
      { key: "chasidic_royal", name: "חסידי-מלכותי · בורדו", note: "הסגנון החסידי הקלאסי", spec: { layout: "classic_centered", palette: "royal_burgundy_gold", fonts: "libre_classic", ornaments: "chasidic_rich", background: "gradient_damask" } },
      { key: "malchut_gold_burgundy", name: "מלכותי · זהב-בורדו-שחור", note: "עשיר ודרמטי לחצרות", spec: { layout: "classic_centered", palette: "malchut_gold_burgundy", fonts: "frank_solo", ornaments: "malchut_grand", background: "gradient_vignette" } },
      { key: "royal_wine", name: "מלכות · יין-שמנת", note: "חם ומכובד", spec: { layout: "type_hero", palette: "royal_wine_cream", fonts: "frank_solo", ornaments: "royal_frame", background: "gradient_vignette" } },
    ],
  },
  shiur_parsha: {
    intro: "שיעור פרשת-שבוע: מזמין, נגיש, לרוב לפני שבת. מודרני-תורני חם.",
    templates: [
      { key: "modern_blue_gold", name: "מודרני · כחול-זהב", note: "נגיש ומכובד", spec: { layout: "header_block", palette: "modern_blue_gold", fonts: "assistant_heebo", ornaments: "modern_clean", background: "header_block" } },
      { key: "boston_ink", name: "בוסטון · דיו-ענבר", note: "טיפוגרפי חם", spec: { layout: "header_block", palette: "boston_ink_amber", fonts: "assistant_frank", ornaments: "boston_minimal", background: "header_block" } },
      { key: "chasidic_warm", name: "חסידי · בורדו-זהב", note: "מסורתי וחם", spec: { layout: "card_centered", palette: "royal_burgundy_gold", fonts: "libre_classic", ornaments: "chasidic_rich", background: "gradient_damask" } },
    ],
  },
  shiur_women: {
    intro: "שיעור לנשים: עדין, רגוע, נקי — גוונים חמים/רכים.",
    templates: [
      { key: "wedding_gold_white", name: "עדין · זהב על לבן", note: "רך ומכובד", spec: { layout: "card_centered", palette: "wedding_gold_white", fonts: "libre_classic", ornaments: "wedding_delicate", background: "solid_clean" } },
      { key: "studio7_offwhite", name: "סטודיו 7 · לבן שבור", note: "מינימלי ונקי", spec: { layout: "card_centered", palette: "studio7_off_white", fonts: "assistant_heebo", ornaments: "studio7_bare", background: "solid_clean" } },
      { key: "modern_gray_teal", name: "מודרני · אפור-טורקיז", note: "רענן ונקי", spec: { layout: "card_centered", palette: "modern_gray_teal", fonts: "heebo_bold", ornaments: "modern_clean", background: "solid_clean" } },
    ],
  },
  shiur_youth: {
    intro: "שיעור לנוער/בחורים: אנרגטי, צבעוני, עוצמתי — סגנון פוטנציאל.",
    templates: [
      { key: "potential_teal", name: "פוטנציאל · טורקיז-אלמוג", note: "צעיר ואנרגטי", spec: { layout: "asymmetric", palette: "potential_teal_coral", fonts: "rubik_heebo", ornaments: "potential_accentbar", background: "solid_clean" } },
      { key: "bopo_night", name: "בולטון · לילה דרמטי", note: "עוצמתי לבחורים", spec: { layout: "type_hero", palette: "bopo_night", fonts: "heebo_bold", ornaments: "night_single_accent", background: "gradient_glow" } },
      { key: "potential_indigo", name: "פוטנציאל · אינדיגו-ליים", note: "צעיר ועכשווי", spec: { layout: "asymmetric", palette: "potential_indigo_lime", fonts: "rubik_heebo", ornaments: "modern_clean", background: "split_diagonal" } },
    ],
  },
  shiur_series: {
    intro: "סדרת שיעורים: לרוב גריד/לוח מפגשים או כותרת-סדרה עם תאריכים.",
    templates: [
      { key: "weekly_grid", name: "מודרני · גריד ימים", note: "לוח מפגשים ברור", spec: { layout: "weekly_grid", palette: "modern_gray_teal", fonts: "assistant_heebo", ornaments: "modern_clean", background: "gradient_glow" } },
      { key: "chasidic_series", name: "חסידי · בורדו-זהב", note: "סדרה מכובדת", spec: { layout: "banner_top", palette: "royal_burgundy_gold", fonts: "frank_solo", ornaments: "royal_frame", background: "gradient_vignette" } },
      { key: "boston_series", name: "בוסטון · דיו טיפוגרפי", note: "סדרה מודרנית", spec: { layout: "type_hero", palette: "boston_ink_amber", fonts: "assistant_heebo", ornaments: "boston_minimal", background: "gradient_glow" } },
    ],
  },

  // ═══ מעגל-החיים ═══
  siyum_masechet: {
    intro: "סיום מסכת: חגיגי ומכובד, זהב עשיר, כותרת 'הדרן עלך'.",
    fieldDefaultsAll: { opener: "בסייעתא דשמיא", banner: "הדרן עלך" },
    templates: [
      { key: "malchut_navy", name: "מלכות · נייבי-זהב מפואר", note: "חגיגיות מלכותית לסיום", spec: { layout: "classic_centered", palette: "royal_navy_gold", fonts: "libre_classic", ornaments: "royal_full", background: "gradient_vignette" }, fieldDefaults: { banner: "הדרן עלך" } },
      { key: "chasidic_gold", name: "חסידי · בורדו-זהב", note: "חם וחגיגי", spec: { layout: "banner_top", palette: "royal_burgundy_gold", fonts: "frank_solo", ornaments: "chasidic_rich", background: "gradient_damask" }, fieldDefaults: { banner: "הדרן עלך" } },
      { key: "malchut_grand", name: "מלכותי · זהב-בורדו-שחור", note: "הידור עילית", spec: { layout: "classic_centered", palette: "malchut_gold_burgundy", fonts: "frank_solo", ornaments: "malchut_grand", background: "gradient_vignette" }, fieldDefaults: { banner: "הדרן עלך" } },
    ],
  },
  wedding_chasidic: {
    intro: "הזמנת/מודעת חתונה: זהב או כסף על לבן/שמנת — קדושה וטהרה, עיטורים עדינים.",
    templates: [
      { key: "wedding_gold_white", name: "חתונה · זהב על לבן", note: "טהור ומכובד — המקובל ביותר", spec: { layout: "card_centered", palette: "wedding_gold_white", fonts: "libre_classic", ornaments: "wedding_delicate", background: "solid_clean" }, fieldDefaults: { opener: "בסייעתא דשמיא" } },
      { key: "wedding_silver", name: "חתונה · כסף על שמנת", note: "עדין וקלאסי", spec: { layout: "type_hero", palette: "wedding_silver_white", fonts: "assistant_frank", ornaments: "wedding_delicate", background: "solid_clean" }, fieldDefaults: { opener: "בסייעתא דשמיא" } },
      { key: "malchut_wedding", name: "מלכות · נייבי-זהב", note: "חגיגי ומפואר", spec: { layout: "classic_centered", palette: "royal_navy_gold", fonts: "libre_classic", ornaments: "royal_frame", background: "gradient_vignette" }, fieldDefaults: { opener: "בסייעתא דשמיא" } },
    ],
  },
  petira: {
    intro: "מודעת אבל: שחור-לבן בלבד, מסגרת שחורה עבה, ללא קישוטים צבעוניים. מבנה קבוע: 'בדאבון לב' → בני המשפחה → שם הנפטר → פרטי הלוויה → שבעה → תנצב\"ה. המבנה נעול לפי המסורת.",
    fieldDefaultsAll: { opener: "בדאבון לב רב", footer: "תנצב\"ה" },
    templates: [
      { key: "mourning_traditional", name: "אבל · מסורתי (שחור-לבן)", note: "המבנה הקבוע והמכובד — מסגרת שחורה עבה, מרכוז", locked: true, spec: { layout: "mourning", palette: "mourning_bw", fonts: "libre_classic", ornaments: "mourning_set", background: "solid_clean" }, fieldDefaults: { opener: "בדאבון לב רב", footer: "תנצב\"ה" } },
      { key: "mourning_david", name: "אבל · דוד (סריף כבד)", note: "וריאציה עם פונט דוד — כבד ומכובד", locked: true, spec: { layout: "mourning", palette: "mourning_bw", fonts: "frank_solo", ornaments: "mourning_set", background: "solid_clean" }, fieldDefaults: { opener: "בדאבון לב רב", footer: "תנצב\"ה" } },
    ],
  },
  bar_mitzvah: {
    intro: "בר-מצווה: חגיגי אך מכובד, לרוב זהב/כחול, כותרת שמחה.",
    fieldDefaultsAll: { opener: "בסייעתא דשמיא" },
    templates: [
      { key: "chasidic_gold", name: "חסידי · בורדו-זהב", note: "חגיגי ומסורתי", spec: { layout: "card_centered", palette: "royal_burgundy_gold", fonts: "libre_classic", ornaments: "chasidic_rich", background: "gradient_damask" }, fieldDefaults: { opener: "בסייעתא דשמיא" } },
      { key: "malchut_navy", name: "מלכות · נייבי-זהב", note: "מכובד ומפואר", spec: { layout: "classic_centered", palette: "royal_navy_gold", fonts: "libre_classic", ornaments: "royal_frame", background: "gradient_vignette" }, fieldDefaults: { opener: "בסייעתא דשמיא" } },
      { key: "modern_celebrate", name: "מודרני · כחול-זהב", note: "עכשווי ונגיש", spec: { layout: "header_block", palette: "modern_blue_gold", fonts: "assistant_heebo", ornaments: "modern_clean", background: "header_block" }, fieldDefaults: { opener: "בסייעתא דשמיא" } },
    ],
  },
  pidyon_nefesh: {
    intro: "פדיון נפש / בקשת רחמים: מכובד ומאופק, לרוב קלאסי או מודרני נקי.",
    templates: [
      { key: "classic_sepia", name: "קלאסי · ספיה", note: "מסורתי ומאופק", spec: { layout: "classic_centered", palette: "classic_sepia", fonts: "libre_classic", ornaments: "elegant_line", background: "solid_linen" } },
      { key: "classic_paper", name: "קלאסי · נייר-אדום", note: "עיתונאי מסורתי", spec: { layout: "banner_top", palette: "classic_paper_red", fonts: "frank_solo", ornaments: "elegant_line", background: "solid_clean" } },
      { key: "modern_clean", name: "מודרני · אפור-טורקיז", note: "נקי ומכובד", spec: { layout: "card_centered", palette: "modern_gray_teal", fonts: "heebo_bold", ornaments: "modern_clean", background: "solid_clean" } },
    ],
  },

  // ═══ מעגל-השנה (מועדים) ═══
  rosh_hashana: {
    intro: "ראש השנה: מלכותי-חגיגי, זהב, ברכת שנה טובה.",
    fieldDefaultsAll: { banner: "כתיבה וחתימה טובה" },
    templates: [
      { key: "malchut_navy", name: "מלכות · נייבי-זהב", note: "מלכותי לימים הנוראים", spec: { layout: "classic_centered", palette: "royal_navy_gold", fonts: "libre_classic", ornaments: "royal_full", background: "gradient_vignette" }, fieldDefaults: { banner: "כתיבה וחתימה טובה" } },
      { key: "malchut_grand", name: "מלכותי · זהב-בורדו-שחור", note: "הידור חגיגי", spec: { layout: "classic_centered", palette: "malchut_gold_burgundy", fonts: "frank_solo", ornaments: "malchut_grand", background: "gradient_vignette" }, fieldDefaults: { banner: "שנה טובה ומתוקה" } },
      { key: "royal_wine", name: "מלכות · יין-שמנת", note: "חם וחגיגי", spec: { layout: "type_hero", palette: "royal_wine_cream", fonts: "frank_solo", ornaments: "royal_frame", background: "gradient_vignette" }, fieldDefaults: { banner: "שנה טובה" } },
    ],
  },
  chanukah: {
    intro: "חנוכה: חגיגי, זהב/כחול, אווירת נרות ואור.",
    fieldDefaultsAll: { banner: "חנוכה שמח" },
    templates: [
      { key: "chasidic_gold", name: "חסידי · בורדו-זהב", note: "חם וחגיגי — אור הנרות", spec: { layout: "card_centered", palette: "royal_burgundy_gold", fonts: "libre_classic", ornaments: "chasidic_rich", background: "gradient_damask" }, fieldDefaults: { banner: "חנוכה שמח" } },
      { key: "malchut_navy", name: "מלכות · נייבי-זהב", note: "מלכותי וחגיגי", spec: { layout: "classic_centered", palette: "royal_navy_gold", fonts: "libre_classic", ornaments: "royal_full", background: "gradient_glow" }, fieldDefaults: { banner: "חנוכה שמח" } },
      { key: "modern_celebrate", name: "מודרני · כחול-זהב", note: "עכשווי ונגיש", spec: { layout: "header_block", palette: "modern_blue_gold", fonts: "assistant_heebo", ornaments: "modern_clean", background: "header_block" }, fieldDefaults: { banner: "חנוכה שמח" } },
    ],
  },
  purim: {
    intro: "פורים: שמח וצבעוני, אווירת חג עליז.",
    fieldDefaultsAll: { banner: "פורים שמח" },
    templates: [
      { key: "potential_sunset", name: "פוטנציאל · שקיעה", note: "צבעוני וחגיגי", spec: { layout: "header_block", palette: "potential_sunset", fonts: "rubik_assistant", ornaments: "potential_accentbar", background: "header_block" }, fieldDefaults: { banner: "פורים שמח" } },
      { key: "chasidic_gold", name: "חסידי · בורדו-זהב", note: "חגיגי ומסורתי", spec: { layout: "card_centered", palette: "royal_burgundy_gold", fonts: "libre_classic", ornaments: "chasidic_rich", background: "gradient_damask" }, fieldDefaults: { banner: "פורים שמח" } },
      { key: "potential_teal", name: "פוטנציאל · טורקיז-אלמוג", note: "עליז וצעיר", spec: { layout: "asymmetric", palette: "potential_teal_coral", fonts: "rubik_heebo", ornaments: "potential_accentbar", background: "solid_clean" }, fieldDefaults: { banner: "פורים שמח" } },
    ],
  },
  pesach: {
    intro: "פסח: מלכותי-חגיגי, אווירת חירות, זהב.",
    fieldDefaultsAll: { banner: "חג פסח כשר ושמח" },
    templates: [
      { key: "malchut_navy", name: "מלכות · נייבי-זהב", note: "מלכותי וחגיגי", spec: { layout: "classic_centered", palette: "royal_navy_gold", fonts: "libre_classic", ornaments: "royal_full", background: "gradient_vignette" }, fieldDefaults: { banner: "חג פסח כשר ושמח" } },
      { key: "royal_emerald", name: "מלכות · אזמרגד-זהב", note: "רענן וחגיגי (אביב)", spec: { layout: "classic_centered", palette: "royal_emerald_gold", fonts: "libre_classic", ornaments: "royal_frame", background: "gradient_damask" }, fieldDefaults: { banner: "חג האביב" } },
      { key: "malchut_grand", name: "מלכותי · זהב-בורדו", note: "הידור עילית", spec: { layout: "classic_centered", palette: "malchut_gold_burgundy", fonts: "frank_solo", ornaments: "malchut_grand", background: "gradient_vignette" }, fieldDefaults: { banner: "חג פסח כשר ושמח" } },
    ],
  },

  // ═══ אירועים ═══
  hachnasat_sefer_torah: {
    intro: "הכנסת ספר תורה: אירוע מרכזי ומפואר — מלכות/זהב, כותרת גדולה.",
    fieldDefaultsAll: { opener: "בשמחה רבה", banner: "הכנסת ספר תורה" },
    templates: [
      { key: "malchut_navy", name: "מלכות · נייבי-זהב מפואר", note: "הידור עילית לאירוע מרכזי", spec: { layout: "classic_centered", palette: "royal_navy_gold", fonts: "libre_classic", ornaments: "royal_full", background: "gradient_vignette" }, fieldDefaults: { banner: "הכנסת ספר תורה" } },
      { key: "malchut_grand", name: "מלכותי · זהב-בורדו-שחור", note: "עשיר ודרמטי", spec: { layout: "classic_centered", palette: "malchut_gold_burgundy", fonts: "frank_solo", ornaments: "malchut_grand", background: "gradient_vignette" }, fieldDefaults: { banner: "הכנסת ספר תורה" } },
      { key: "chasidic_gold", name: "חסידי · בורדו-זהב", note: "חם וחגיגי", spec: { layout: "banner_top", palette: "royal_burgundy_gold", fonts: "frank_solo", ornaments: "chasidic_rich", background: "gradient_damask" }, fieldDefaults: { banner: "הכנסת ספר תורה" } },
    ],
  },
  dinner: {
    intro: "דינר / גיוס כספים: מכובד ומפואר, מזמין לתרומה — מלכות/מודרני.",
    templates: [
      { key: "malchut_navy", name: "מלכות · נייבי-זהב", note: "מפואר ומכובד לדינר", spec: { layout: "classic_centered", palette: "royal_navy_gold", fonts: "libre_classic", ornaments: "royal_full", background: "gradient_vignette" } },
      { key: "boston_corporate", name: "בולטון · תאגידי מאופק", note: "מודרני ומכובד לגיוס", spec: { layout: "header_block", palette: "bopo_corporate", fonts: "assistant_heebo", ornaments: "boston_minimal", background: "header_block" } },
      { key: "modern_blue_gold", name: "מודרני · כחול-זהב", note: "מוסדי ונקי", spec: { layout: "header_block", palette: "modern_blue_gold", fonts: "assistant_heebo", ornaments: "modern_clean", background: "header_block" } },
    ],
  },
};

// שדות ברירת-מחדל כלל-קטגוריה (opener/footer/banner קבועים) — נשמרים בשדה נפרד
const CATEGORY_FIELD_DEFAULTS: Record<string, FieldValues> = {};
for (const [k, v] of Object.entries(CATALOG)) {
  if (v.fieldDefaultsAll) CATEGORY_FIELD_DEFAULTS[k] = v.fieldDefaultsAll;
}

// ---------------------------------------------------------------------------
// API ציבורי
// ---------------------------------------------------------------------------

// מחזיר את סט התבניות המומלצות לקטגוריה (עם שם הקטגוריה מ-knowledge.ts)
export function getCategoryTemplates(categoryKey: string): CategoryTemplateSet | null {
  const entry = CATALOG[categoryKey];
  if (!entry) return null;
  const cat = getCategory(categoryKey);
  return {
    categoryKey,
    label: cat?.label ?? categoryKey,
    intro: entry.intro,
    templates: entry.templates,
  };
}

// כל הקטגוריות שיש להן קטלוג תבניות
export function listCategoryTemplateKeys(): string[] {
  return Object.keys(CATALOG);
}

// מאחד ברירות-מחדל: כלל-קטגוריה + פר-תבנית + שדות שהמשתמש סיפק (המשתמש גובר)
export function mergeFieldDefaults(
  categoryKey: string,
  templateKey: string,
  userFields?: FieldValues,
): FieldValues {
  const catDefaults = CATEGORY_FIELD_DEFAULTS[categoryKey] ?? {};
  const set = CATALOG[categoryKey];
  const tpl = set?.templates.find((t) => t.key === templateKey);
  const tplDefaults = tpl?.fieldDefaults ?? {};
  return { ...catDefaults, ...tplDefaults, ...(userFields ?? {}) };
}

// מרנדר תבנית של קטגוריה ל-TemplateDoc
export function renderCategoryTemplate(
  categoryKey: string,
  templateKey: string,
  width: number,
  height: number,
  userFields?: FieldValues,
  withPhoto = true,
): TemplateDoc | null {
  const set = CATALOG[categoryKey];
  const tpl = set?.templates.find((t) => t.key === templateKey);
  if (!tpl) return null;
  const fields = mergeFieldDefaults(categoryKey, templateKey, userFields);
  // אבל: תמונות אישיות אינן מקובלות — כבה תמיד
  const usePhoto = tpl.locked ? false : withPhoto;
  return composeTemplate({ ...tpl.spec, width, height, fields, withPhoto: usePhoto });
}
