// טיפוסים משותפים לצד הלקוח + מיפוי צבעי קופות
export type FundAvailable = { key: string; name: string; plans: string[] };

export type HfTopic = {
  id: number;
  catalogNo: number | null;
  kind: "fund" | "gov" | "ngo";
  category: string;
  subCategory: string;
  topic: string;
  audience: string;
  benefitSummary: string;
  rangeText: string;
  bestFund: string;
  publicSiteText: string;
  sourceName: string;
  serviceUrl: string;
  fundsAvailable: FundAvailable[];
};

// פירוט הכיסוי בפועל למסלול אחד של קופה אחת — זה מה שמאפשר השוואה אמיתית.
export type FundPlan = {
  plan: string;
  code: string;
  text: string;
  rate?: string;
  amount?: string;
  waiting?: string;
};
export type HfTopicDetail = HfTopic & {
  fundDetails: Record<string, FundPlan[]> | null;
};

export const FUND_ORDER = ["clalit", "maccabi", "meuhedet", "leumit"];

export type FundMeta = { key: string; name: string; color: string };
export type HfMeta = {
  title: string;
  fundCount: number;
  govCount: number;
  ngoCount: number;
  fundCategories: string[];
  govCategories: string[];
  ngoCategories: string[];
  funds: FundMeta[];
};

// צבעי קופות (ברירת מחדל אם ה-meta לא זמין)
export const FUND_COLORS: Record<string, string> = {
  clalit: "#00A0AF",
  maccabi: "#005BAB",
  meuhedet: "#5BA829",
  leumit: "#F57F20",
};

export const KIND_LABELS: Record<string, string> = {
  fund: "קופות חולים",
  gov: "זכויות ממשלה",
  ngo: "עמותות וסיוע",
};

export function fundColor(key: string, meta?: HfMeta): string {
  const fromMeta = meta?.funds.find((f) => f.key === key)?.color;
  return fromMeta || FUND_COLORS[key] || "#12938F";
}

// שם הקופה כפי שהוא מופיע בתחילת bestFund ("מכבי שלי" -> maccabi)
const FUND_BY_NAME: Record<string, string> = {
  כללית: "clalit",
  מכבי: "maccabi",
  מאוחדת: "meuhedet",
  לאומית: "leumit",
};

/** מפתח הקופה הבולטת לנושא, או null כשהנתונים אינם מכריעים.
 *
 *  זה הסימן היחיד להשוואה שקיים באמת במאגר: `fundsAvailable` מחזיק לכל 435
 *  הנושאים בדיוק את אותה רשימה של ארבע הקופות, כלומר הוא קבוע ולא נתון —
 *  ולכן אסור לסנן או להשוות לפיו. `bestFund` לעומת זאת משתנה בין נושאים.
 */
export function bestFundKey(bestFund?: string): string | null {
  if (!bestFund) return null;
  for (const [name, key] of Object.entries(FUND_BY_NAME)) {
    if (bestFund.includes(name)) return key;
  }
  return null;
}

export const INK = "#1a2b2b";

/** בהירות יחסית לפי WCAG 2.1 (לא YIQ). */
function relLuminance(hex: string): number {
  const c = hex.replace("#", "");
  const ch = [0, 2, 4].map((i) => {
    const v = parseInt(c.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

/** יחס ניגודיות בין שני צבעי hex. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relLuminance(a), relLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** צבע הטקסט הקריא על רקע נתון.
 *
 *  🔴 הגרסה הקודמת חישבה **בהירות נתפסת** בנוסחת YIQ
 *  (`0.299r + 0.587g + 0.114b`) והשוותה לסף שרירותי של 0.62. זו אינה
 *  הנוסחה שהתקן מדבר עליה, והפער אינו תיאורטי: שלושת צבעי המותג של
 *  הקופות נפלו בדיוק מתחת לסף וקיבלו טקסט לבן, בעוד שהניגודיות האמיתית
 *  הייתה 2.65:1 עד 3.16:1. נמדדו **166 כשלי ניגודיות בעמוד אחד** —
 *  התג של כל קופה בכל אחד מ-435 הנושאים.
 *
 *  עכשיו נמדד היחס האמיתי מול שתי האפשרויות ונבחרת הגבוהה. התוצאה:
 *  לאומית 5.57 · מאוחדת 4.97 · כללית 4.67 (כהה) · מכבי 6.81 (לבן) —
 *  כל ארבע הקופות עוברות את 4.5, וצבעי המותג עצמם לא שונו.
 */
export function readableText(hex: string): string {
  const c = hex.replace("#", "");
  if (c.length < 6) return INK;
  return contrastRatio("#ffffff", hex) >= contrastRatio(INK, hex) ? "#ffffff" : INK;
}
