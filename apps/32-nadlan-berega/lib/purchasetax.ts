// ==== מס רכישה — PRODUCT_TIERS.md "חישוב מיסוי (מס רכישה, מס שבח)" ====
// חישוב אריתמטי בלבד לפי מדרגות מס הרכישה הרשמיות של רשות המסים — לא תלוי
// במקור חיצוני, בדיוק כמו תשואת שכירות/משכנתא/תזרים ב-VipPanel.
//
// המדרגות מוקפאות מ-15.1.2026 עד 15.1.2028 (חוק ההתייעלות הכלכלית 2025,
// הוראת ביצוע מיסוי מקרקעין 1/2026 — gov.il/he/departments/policies/inst-01-2026)
// ולכן אינן מתעדכנות למדד המחירים באמצע התקופה הזו כפי שקורה בדרך כלל ב-16
// בינואר של כל שנה. סכומים אומתו מול כמה מקורות משפטיים עצמאיים (כולל דוגמת
// חישוב מלאה: דירה יחידה ב-2,400,000 ₪ → 15,538 ₪ מס, שהחישוב כאן משחזר
// בדיוק). זהו אומדן חוקי-מדרגות בלבד — לא ייעוץ מס אישי: אינו כולל הנחות
// אישיות (עולה חדש/נכה/משפחה מרובת ילדים/רכישה מקבלן) שתלויות במסמכים
// אישיים ונבדקות מול רשות המסים. יש לאמת מול הסימולטור הרשמי
// (misim.gov.il/svsimurechisha) לפני החלטה.

export type PurchaseTaxBuyerType = 'single' | 'additional';

export interface PurchaseTaxBracket {
  from: number;
  /** null = ומעלה (המדרגה העליונה). */
  to: number | null;
  ratePct: number;
}

// דירה יחידה — לרוכש שאין לו דירה נוספת בישראל בעת הרכישה (או שמתחייב למכור
// את הקודמת תוך שנתיים / תושב חוזר וכיו"ב לפי סעיף 9 לחוק מיסוי מקרקעין).
export const SINGLE_HOME_BRACKETS: PurchaseTaxBracket[] = [
  { from: 0, to: 1_978_745, ratePct: 0 },
  { from: 1_978_745, to: 2_347_040, ratePct: 3.5 },
  { from: 2_347_040, to: 6_055_070, ratePct: 5 },
  { from: 6_055_070, to: 20_183_565, ratePct: 8 },
  { from: 20_183_565, to: null, ratePct: 10 },
];

// דירה נוספת (משקיע/דירה שנייה ומעלה) — ללא מדרגת פטור, מהשקל הראשון.
export const ADDITIONAL_HOME_BRACKETS: PurchaseTaxBracket[] = [
  { from: 0, to: 6_055_070, ratePct: 8 },
  { from: 6_055_070, to: null, ratePct: 10 },
];

export interface PurchaseTaxLine {
  from: number;
  to: number | null;
  ratePct: number;
  taxableAmount: number;
  tax: number;
}

export interface PurchaseTaxResult {
  buyerType: PurchaseTaxBuyerType;
  price: number;
  lines: PurchaseTaxLine[];
  totalTax: number;
  effectiveRatePct: number | null;
}

function bracketsFor(buyerType: PurchaseTaxBuyerType): PurchaseTaxBracket[] {
  return buyerType === 'single' ? SINGLE_HOME_BRACKETS : ADDITIONAL_HOME_BRACKETS;
}

/**
 * מחשב מס רכישה למחיר רכישה נתון, לפי סוג הרוכש. מחזיר null על מחיר לא תקין
 * כדי שהתצוגה תדע שאין תוצאה להציג, בדיוק כמו `estimateRental`/מחשבון
 * המשכנתא ב-VipPanel כשהקלט חסר.
 */
export function calcPurchaseTax(
  price: number,
  buyerType: PurchaseTaxBuyerType,
): PurchaseTaxResult | null {
  if (!Number.isFinite(price) || price <= 0) return null;

  const lines: PurchaseTaxLine[] = [];
  let totalTax = 0;
  for (const b of bracketsFor(buyerType)) {
    if (price <= b.from) break;
    const upper = b.to == null ? price : Math.min(price, b.to);
    const taxableAmount = Math.max(0, upper - b.from);
    if (taxableAmount <= 0) continue;
    const tax = (taxableAmount * b.ratePct) / 100;
    totalTax += tax;
    lines.push({ from: b.from, to: b.to, ratePct: b.ratePct, taxableAmount, tax: Math.round(tax) });
  }

  return {
    buyerType,
    price,
    lines,
    totalTax: Math.round(totalTax),
    effectiveRatePct: price > 0 ? Math.round((totalTax / price) * 1000) / 10 : null,
  };
}
