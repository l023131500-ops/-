// ==== מס שבח — PRODUCT_TIERS.md "חישוב מיסוי (מס רכישה, מס שבח)" ====
// חישוב אריתמטי בלבד לפי חוק מיסוי מקרקעין — לא תלוי במקור חיצוני, בדיוק כמו
// lib/purchasetax.ts (המחשבון האחות שלו, שכבר בנוי ומחובר ב-VipPanel).
//
// שני מנגנונים משולבים, שניהם אומתו מול שני מקורות משפטיים עצמאיים לפני
// המימוש (ולא רק אחריו — ראו הדוגמאות המספריות בהמשך):
// 1. פטור דירה יחידה (סעיף 49ב(2)): מכירה עד תקרת הפטור — פטורה במלואה.
//    מעל התקרה, ההפרש בין שווי המכירה לתקרה נחשב "כדמי מכר של זכות אחרת" —
//    כלומר רק חלק יחסי מהשבח (לפי יחס ההפרש למחיר המכירה המלא) חייב במס,
//    ואותו חלק חייב עובר בעצמו את החישוב הליניארי (סעיף 2 למטה).
//    תקרת הפטור ל-2026: 5,008,000 ₪ (מוקפאת, כמו מדרגות מס הרכישה).
// 2. חישוב ליניארי מוטב (סעיף 48א(ב2)): לדירות שנרכשו לפני 1.1.2014, השבח
//    הריאלי מפוצל יחסית למספר הימים לפני/אחרי 1.1.2014 — החלק שעד 1.1.2014
//    פטור לגמרי, החלק מ-1.1.2014 ואילך חייב ב-25%. דירה שנרכשה ב-1.1.2014
//    ואילך — כל השבח בקטגוריית "אחרי", כלומר כל השבח ב-25%.
//
// [25/08/2026 Loop A] תוקן: סעיף 49ב(2) קובע **שני** תנאי-סף מצטברים סביב
// 18 חודשים, לא אחד — האימוש המקורי בדק רק את הראשון. אומת מול שני מקורות
// עצמאיים (חיפוש רשת, לא ניחוש): (1) המוכר מחזיק בדירה 18 חודשים לפחות מהיום
// שהייתה לדירת מגורים — זה מה ש-`meetsMinHoldingPeriod` כבר בדק. (2) תנאי
// **נפרד**: המוכר לא מכר דירת מגורים **אחרת** בפטור לפי אותו סעיף ב-18
// החודשים שקדמו למכירה הזו — זה לא היה קיים בכלל. הדוח אינו יודע (ולא יכול
// לדעת) על מכירות אחרות של הלקוח, ולכן זהו קלט מהמשתמש (תיבת סימון), לא
// חישוב — בדיוק כמו "דירה יחידה" שכבר קלט מהמשתמש ולא ניחוש.
//
// ⚠️ מגבלות מכוונות (מפורשות ללקוח בכרטיס, באותו דפוס בדיוק כמו מס רכישה):
// - שווי הרכישה **אינו מתואם למדד המחירים לצרכן** (אין בסביבה הזו גישת רשת
//   ישירה כדי לשלוף ולאמת סדרת מדד היסטורית לטווח שרירותי לפני המסירה —
//   ראו lib/cbs.ts שכבר קיים לטווחי "24 נקודות אחרונות" בלבד, לא לתאריך
//   רכישה שרירותי). לכן זהו "שבח נומינלי", לא "שבח ריאלי" מדויק כהגדרתו
//   בחוק — עלול **להפחית** את המס האמיתי (ולא להגדיל), כי אינפלציה מצטברת
//   על פני עשורים מקטינה בדרך כלל את השבח החייב האמיתי לעומת הנומינלי.
// - אינו כולל קיזוז הפסדים, הוצאות מוכרות מעבר להשבחות שהוזנו (שכ"ט עו"ד,
//   דמי תיווך, מס רכישה ששולם), פטורים מיוחדים (ירושה, פינוי-בינוי, תושב
//   חוץ, מכירה לקרוב) או מקדמי-שווי אחרים.
// - יש לאמת מול הסימולטור הרשמי (misim.gov.il) לפני החלטה.

export interface CapitalGainsTaxInput {
  purchaseDateIso: string;
  purchasePrice: number;
  saleDateIso: string;
  salePrice: number;
  isSingleHome: boolean;
  /** עלויות השבחה מוכרות (שיפוץ מהותי וכד') — לא חובה, ברירת מחדל 0. */
  improvementCosts?: number;
  /**
   * תנאי מצטבר שני בסעיף 49ב(2), נפרד מתקופת ההחזקה: המוכר לא זכאי אם מכר
   * דירת מגורים **אחרת** בפטור לפי אותו סעיף ב-18 החודשים שקדמו למכירה הזו.
   * ברירת מחדל false (לא מכר) — הנחה אופטימית, כמו כל שדה אופציונלי אחר כאן.
   */
  soldAnotherExemptHomeInLast18Months?: boolean;
}

export interface CapitalGainsTaxResult {
  /** שבח נומינלי (לפני תיאום מדד) — ראו האזהרה בראש הקובץ. */
  nominalGain: number;
  eligibleForSingleHomeExemption: boolean;
  /** למה לא זכאי, אם רלוונטי — לתצוגה. */
  exemptionIneligibleReason: 'not-single-home' | 'holding-period' | 'recent-exempt-sale' | null;
  exemptionCeiling: number;
  /** true אם שווי המכירה חורג מתקרת הפטור (רלוונטי רק אם זכאי לפטור). */
  exceedsCeiling: boolean;
  /** חלק השבח הפטור (מכל מנגנון — תקרה ו/או ליניארי). */
  exemptGain: number;
  /** חלק השבח החייב, לפני מס. */
  taxableGain: number;
  totalTax: number;
  effectiveRatePct: number | null;
}

const SINGLE_HOME_EXEMPTION_CEILING_2026 = 5_008_000;
const LINEAR_MUTAV_CUTOFF = Date.UTC(2014, 0, 1);
const LINEAR_TAX_RATE_PCT = 25;
const MIN_HOLDING_MONTHS_FOR_EXEMPTION = 18;

function daysBetween(fromMs: number, toMs: number): number {
  return Math.max(0, Math.round((toMs - fromMs) / 86_400_000));
}

/** מפצל שבח נתון לחלק הפטור (עד 1.1.2014) והחלק החייב (מ-1.1.2014), לפי ימים. */
function splitLinearMutav(gain: number, purchaseMs: number, saleMs: number): { exempt: number; taxable: number } {
  if (gain <= 0) return { exempt: 0, taxable: 0 };
  if (purchaseMs >= LINEAR_MUTAV_CUTOFF) return { exempt: 0, taxable: gain };
  const totalDays = daysBetween(purchaseMs, saleMs);
  if (totalDays <= 0) return { exempt: 0, taxable: gain };
  const postCutoffDays = daysBetween(LINEAR_MUTAV_CUTOFF, saleMs);
  const postRatio = Math.min(1, postCutoffDays / totalDays);
  const taxable = gain * postRatio;
  return { exempt: gain - taxable, taxable };
}

/** true אם ההחזקה עומדת ברף 18 החודשים הנדרש לפטור דירה יחידה (סעיף 49ב(2)). */
function meetsMinHoldingPeriod(purchaseMs: number, saleMs: number): boolean {
  const p = new Date(purchaseMs);
  const minSaleMs = Date.UTC(
    p.getUTCFullYear(),
    p.getUTCMonth() + MIN_HOLDING_MONTHS_FOR_EXEMPTION,
    p.getUTCDate(),
  );
  return saleMs >= minSaleMs;
}

/**
 * מחשב מס שבח משוער. מחזיר null על קלט לא תקין (מחירים לא חיוביים, תאריכים
 * שלא נפרסים, או מכירה לפני/ביום הרכישה) — כדי שהתצוגה תדע שאין תוצאה
 * להציג, בדיוק כמו calcPurchaseTax.
 */
export function calcCapitalGainsTax(input: CapitalGainsTaxInput): CapitalGainsTaxResult | null {
  const { purchaseDateIso, purchasePrice, saleDateIso, salePrice, isSingleHome } = input;
  const improvementCosts = input.improvementCosts ?? 0;
  const soldAnotherExemptHomeInLast18Months = input.soldAnotherExemptHomeInLast18Months ?? false;

  if (!Number.isFinite(purchasePrice) || purchasePrice <= 0) return null;
  if (!Number.isFinite(salePrice) || salePrice <= 0) return null;
  if (!Number.isFinite(improvementCosts) || improvementCosts < 0) return null;

  const purchaseMs = Date.parse(purchaseDateIso);
  const saleMs = Date.parse(saleDateIso);
  if (!Number.isFinite(purchaseMs) || !Number.isFinite(saleMs)) return null;
  if (saleMs <= purchaseMs) return null;

  const nominalGain = salePrice - purchasePrice - improvementCosts;

  if (nominalGain <= 0) {
    return {
      nominalGain,
      eligibleForSingleHomeExemption: false,
      exemptionIneligibleReason: null,
      exemptionCeiling: SINGLE_HOME_EXEMPTION_CEILING_2026,
      exceedsCeiling: false,
      exemptGain: 0,
      taxableGain: 0,
      totalTax: 0,
      effectiveRatePct: null,
    };
  }

  let exemptionIneligibleReason: 'not-single-home' | 'holding-period' | 'recent-exempt-sale' | null = null;
  if (!isSingleHome) exemptionIneligibleReason = 'not-single-home';
  else if (!meetsMinHoldingPeriod(purchaseMs, saleMs)) exemptionIneligibleReason = 'holding-period';
  else if (soldAnotherExemptHomeInLast18Months) exemptionIneligibleReason = 'recent-exempt-sale';
  const eligibleForSingleHomeExemption = exemptionIneligibleReason === null;

  const exceedsCeiling = salePrice > SINGLE_HOME_EXEMPTION_CEILING_2026;

  let exemptGain: number;
  let taxableGain: number;

  if (eligibleForSingleHomeExemption && !exceedsCeiling) {
    // פטור מלא — כל השבח פטור, אין צורך בחישוב הליניארי.
    exemptGain = nominalGain;
    taxableGain = 0;
  } else if (eligibleForSingleHomeExemption && exceedsCeiling) {
    // רק החלק היחסי שמעל התקרה נכנס לחישוב הליניארי; מתחתיה — פטור.
    const excessRatio = Math.min(1, (salePrice - SINGLE_HOME_EXEMPTION_CEILING_2026) / salePrice);
    const gainAboveCeiling = nominalGain * excessRatio;
    const split = splitLinearMutav(gainAboveCeiling, purchaseMs, saleMs);
    taxableGain = split.taxable;
    exemptGain = nominalGain - taxableGain;
  } else {
    // לא זכאי לפטור דירה יחידה כלל — כל השבח עובר את החישוב הליניארי.
    const split = splitLinearMutav(nominalGain, purchaseMs, saleMs);
    taxableGain = split.taxable;
    exemptGain = split.exempt;
  }

  const totalTax = Math.round((taxableGain * LINEAR_TAX_RATE_PCT) / 100);

  return {
    nominalGain: Math.round(nominalGain),
    eligibleForSingleHomeExemption,
    exemptionIneligibleReason,
    exemptionCeiling: SINGLE_HOME_EXEMPTION_CEILING_2026,
    exceedsCeiling,
    exemptGain: Math.round(exemptGain),
    taxableGain: Math.round(taxableGain),
    totalTax,
    effectiveRatePct: nominalGain > 0 ? Math.round((totalTax / nominalGain) * 1000) / 10 : null,
  };
}
