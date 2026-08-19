// ==== מודל הדוח: 7 קטגוריות · 3 רמות · ודאות לכל נתון ====
//
// עקרונות שאסור להפר:
// 1. אין נתוני דמה. אין מקור → כותבים למה אין, לא ממציאים.
// 2. לכל נתון יש ודאות מוצהרת: אמת / מקורב / הערכה.
// 3. הטקסט שמגיע למסך הלקוח הוא עברית מדוברת. בלי ז'רגון טכני,
//    בלי שמות API, בלי "point-in-polygon" ובלי ראשי תיבות לועזיים.

/** רמת הוודאות של נתון — מוצגת ליד כל שדה במסך. */
export type Certainty =
  | 'verified' // אמת — הגיע ממקור רשמי ומתאר את הנכס עצמו
  | 'approx' // מקורב — נתון אמיתי, אך על הסביבה/האזור ולא על הנכס עצמו
  | 'estimate'; // הערכה — חישוב שלנו על בסיס נתונים אחרים

export const CERTAINTY_LABEL: Record<Certainty, string> = {
  verified: 'אמת',
  approx: 'מקורב',
  estimate: 'הערכה',
};

/** הסבר בעברית מדוברת — נכנס ל-tooltip ליד התווית. */
export const CERTAINTY_EXPLAIN: Record<Certainty, string> = {
  verified: 'נתון רשמי שמתאר את הנכס הזה עצמו, כפי שהוא רשום במקור.',
  approx: 'נתון אמיתי, אבל הוא מתאר את הסביבה או את האזור — לא בהכרח את הנכס עצמו.',
  estimate: 'חישוב שלנו על בסיס הנתונים שנאספו. לא נתון רשמי.',
};

export type ReportTier = 'basic' | 'premium' | 'vip';

/**
 * שמות הרמות. ⚠️ חייבים להיות זהים בכל מקום: הטופס הציבורי הציג "בסיסי /
 * פרימיום" בעוד הדוח עצמו הציג "רגיל / מקיף", כלומר לקוח בחר רמה בשם אחד
 * וקיבל מסמך בשם אחר. הניסוח כאן הוא זה שב-`NADLAN_SPEC_FULL` §2 —
 * **חינמי / פרימיום / VIP** — והוא היחיד שמוצג ללקוח.
 */
export const TIER_LABEL: Record<ReportTier, string> = {
  basic: 'חינמי',
  premium: 'פרימיום',
  vip: 'VIP',
};

export const TIER_ORDER: Record<ReportTier, number> = { basic: 0, premium: 1, vip: 2 };

/** האם רמה נתונה מספיקה כדי לראות שדה שדורש רמה מסוימת. */
export function tierAllows(current: ReportTier, required: ReportTier): boolean {
  return TIER_ORDER[current] >= TIER_ORDER[required];
}

/**
 * §2 במפרט: **הדוח החינמי לא עולה לנו כלום.**
 *
 * כל מקור שגובה תשלום לכל משיכה — Google Places, מטריצת המרחקים, גיאוקוד של
 * גוגל, Street View, מפה סטטית, ולוחות המודעות (Apify) — חסום ברמה הזו.
 * מה שנשאר הוא מה שהמדינה מפרסמת בחינם ומה ששמור אצלנו במטמון: איתור הכתובת
 * (GovMap/OSM), גוש וחלקה, מרשם העסקאות, מינהל התכנון, לוח הזמנים הארצי,
 * מרשמי מוסדות החינוך והתחנות, ומפה אינטראקטיבית על אריחים פתוחים.
 *
 * ⚠️ עד לתיקון הזה הדוח החינמי הריץ שבע שאילתות Places וחמישה יעדי מרחק —
 * כ-0.25$ לכל הפקה. כלומר "חינמי" היה חינמי ללקוח בלבד.
 */
export function tierMayUsePaidSources(tier: ReportTier): boolean {
  return tier !== 'basic';
}

/**
 * צילום הבניין והמפה האזורית של גוגל — **VIP בלבד**, כלשון §2 במפרט
 * ("VIP: כל המידע + צילום בניין מדויק + מפה אזורית מלאה").
 * המפה האינטראקטיבית (אריחים פתוחים) מוצגת בכל הרמות והיא חינמית.
 */
export function tierMayUseImagery(tier: ReportTier): boolean {
  return tier === 'vip';
}

/**
 * פלטי VIP: מצגת ו-PDF מעוצב. §2 מייחד אותם ל-VIP
 * ("הורדת מצגת + PDF מעוצב").
 */
export function tierMayExport(tier: ReportTier): boolean {
  return tier === 'vip';
}

/**
 * קטגוריות הדוח — סדר התצוגה בניווט.
 *
 * שבע הראשונות הן דוח המגורים כפי שהיה. ארבע האחרונות נוספו בשלב ההרחבה:
 * `permits` מוצגת בכל סוגי הנכס (אותו מנוע היתרים), ו-`rental`/`commercial`/
 * `land` מוצגות רק כשזה סוג הנכס שנבחר.
 */
export type CategoryKey =
  | 'property'
  | 'building'
  | 'sold'
  | 'listings'
  | 'surroundings'
  | 'transport'
  | 'potential'
  | 'permits'
  | 'rental'
  | 'commercial'
  | 'land';

export const CATEGORY_ORDER: CategoryKey[] = [
  'property',
  'building',
  'rental',
  'commercial',
  'land',
  'sold',
  'listings',
  'permits',
  'surroundings',
  'transport',
  'potential',
];

export const CATEGORY_TITLE: Record<CategoryKey, string> = {
  property: 'הנכס',
  building: 'הבניין והכניסה',
  sold: 'עסקאות שנמכרו',
  listings: 'דירות מוצעות כרגע',
  surroundings: 'סביבה ומוסדות',
  transport: 'תחבורה',
  potential: 'פוטנציאל',
  permits: 'היתרים, זכויות ומסמכים',
  rental: 'שכירות באזור',
  commercial: 'הנכס המסחרי',
  land: 'הקרקע והמצב התכנוני',
};

/** משפט הסבר קצר לכל קטגוריה, בעברית מדוברת. */
export const CATEGORY_SUBTITLE: Record<CategoryKey, string> = {
  property: 'מה בדיוק הנכס הזה — כתובת, גוש וחלקה, גודל ומחיר.',
  building: 'הבניין שבו נמצא הנכס: כמה קומות, מתי נבנה, ומה יש בכניסה.',
  sold: 'מה באמת נמכר כאן ובסביבה — מחירים שנסגרו, לא מחירי בקשה.',
  listings: 'מה מוצע למכירה ברגע זה באזור, וכמה זמן המודעות באוויר.',
  surroundings: 'מוסדות חינוך, בריאות ומסחר — כל אחד בשמו ובמרחק המדויק.',
  transport: 'איך מגיעים מכאן — תחנות, קווים וזמני הליכה אמיתיים.',
  potential: 'מה עשוי לקרות כאן בעתיד — התחדשות עירונית ותוכניות בנייה.',
  permits:
    'אילו תוכניות חלות על הנכס, מה הן מתירות, מי הוועדה, ואיפה נמצאים התקנון והתשריט.',
  rental: 'מה נדרש כאן בשכירות, מול מדד שכר הדירה הארצי של הלמ"ס.',
  commercial: 'זכויות מסחר ותעסוקה, עסקאות מסחריות והסביבה העסקית.',
  land: 'ייעוד המגרש היום, מה מותר בו, ואילו תוכניות בהליך עשויות לשנות אותו.',
};

/**
 * נתון בודד בדוח.
 * `value === null` פירושו שאין נתון — ואז `missingReason` חייב להסביר למה,
 * בעברית מדוברת. זה מה שמחליף "לא זמין" יבש.
 */
export interface Fact {
  label: string;
  value: string | number | null;
  /** יחידה להצגה: ₪, מ"ר, דקות... */
  unit?: string;
  certainty: Certainty;
  /** מפתח מתוך מרשם המקורות (lib/sources.ts). */
  sourceKey: string;
  /** מאיפה הנתון, בעברית מדוברת. מוצג ללקוח. */
  sourceNote?: string;
  /** תאריך הנתון (ISO). */
  asOf?: string;
  /** הרמה המינימלית שבה השדה נחשף. */
  tier: ReportTier;
  /** כשאין נתון — למה אין, בעברית מדוברת. */
  missingReason?: string;
  /** הדגשה חזותית לשדות מובילים (מחיר, מחיר למ"ר). */
  highlight?: boolean;
  /**
   * איך להציג את הערך.
   *
   * ⚠️ נוסף אחרי שהתגלה במייל אמיתי שנשלח ללקוח: שנת בנייה הוצגה כ"2,023"
   * ושנת העסקה הראשונה כ"2,001" — מפריד אלפים על שנה — ותאריך עסקה הוצג
   * כ-"2026-01-11T00:00:00.000Z" גולמי. עדיף סימון מפורש על הניחוש שכל
   * מספר הוא כמות: זה בדיוק סוג הפרט שהופך דוח בתשלום לחשוד.
   */
  kind?: 'number' | 'year' | 'date' | 'text';
}

/** הצגת ערך של נתון — משותפת למסך, למייל, ל-PDF ולמצגת. */
export function formatFactValue(f: Fact): string {
  const v = f.value;
  if (v === null || v === undefined) return '';
  const unit = f.unit ? ` ${f.unit}` : '';

  if (f.kind === 'year') return String(v).replace(/[^\d]/g, '') + unit;

  if (f.kind === 'date') {
    const d = new Date(String(v));
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString('he-IL');
    return String(v) + unit;
  }

  if (typeof v === 'number') return new Intl.NumberFormat('he-IL').format(v) + unit;
  return String(v) + unit;
}

export interface ReportCategory {
  key: CategoryKey;
  title: string;
  subtitle: string;
  facts: Fact[];
  /** תוכן עשיר לקטגוריה (טבלאות, רשימות) — נבנה לפי הקטגוריה. */
  notes?: string[];
}

/** בונה נתון קיים. */
export function fact(
  label: string,
  value: string | number | null | undefined,
  opts: {
    certainty: Certainty;
    sourceKey: string;
    sourceNote?: string;
    asOf?: string;
    tier?: ReportTier;
    unit?: string;
    missingReason?: string;
    highlight?: boolean;
    kind?: Fact['kind'];
  },
): Fact {
  const has = value !== null && value !== undefined && value !== '';
  return {
    label,
    value: has ? (value as string | number) : null,
    unit: opts.unit,
    certainty: opts.certainty,
    sourceKey: opts.sourceKey,
    sourceNote: opts.sourceNote,
    asOf: opts.asOf,
    tier: opts.tier ?? 'basic',
    missingReason: has ? undefined : opts.missingReason ?? 'המקור לא החזיר נתון עבור הנכס הזה.',
    highlight: opts.highlight,
    kind: opts.kind,
  };
}

/** שדה שדורש מקור מורשה שאינו מחובר — נאמר במפורש, בלי להמציא. */
export function needsLicensedSource(label: string, sourceKey: string, what: string): Fact {
  return {
    label,
    value: null,
    certainty: 'verified',
    sourceKey,
    tier: 'premium',
    missingReason: `דורש מקור מורשה — ${what}`,
  };
}

/** עוזר: מרחק במטרים → טקסט מדובר. */
export function distanceText(meters: number | null | undefined): string | null {
  if (meters == null || !Number.isFinite(meters)) return null;
  if (meters < 1000) return `${Math.round(meters)} מ'`;
  return `${(meters / 1000).toFixed(1)} ק"מ`;
}

/**
 * עוזר: שניות → טקסט הליכה מדובר. התאמת יחיד/רבים בעברית.
 *
 * ⚠️ הקורא מקבל את הערך אחרי המילית `כ-`, ולכן `כ-דקה` הופיע בדוח. עברית לא
 * מקפת מילית לפני מילה — `כדקה`. לכן קיים גם walkApprox שמחזיר את הביטוי
 * המלא, והוא זה שמשמש בטקסטים.
 */
export function walkText(seconds: number | null | undefined): string | null {
  if (seconds == null || !Number.isFinite(seconds)) return null;
  const min = Math.round(seconds / 60);
  if (min < 1) return 'פחות מדקה';
  // ⚠️ "כ-1 דקות" הופיע בדוח אמיתי. עברית לא סובלת את זה.
  if (min === 1) return 'דקה';
  if (min === 2) return 'שתי דקות';
  if (min < 60) return `${min} דקות`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  const hours = h === 1 ? 'שעה' : h === 2 ? 'שעתיים' : `${h} שעות`;
  if (!rest) return hours;
  return `${hours} ו-${rest === 1 ? 'דקה' : `${rest} דקות`}`;
}

/** ביטוי הליכה משוער, כולל המילית: "כדקה" / "כשתי דקות" / "כ-7 דקות". */
export function walkApprox(seconds: number | null | undefined): string | null {
  const t = walkText(seconds);
  if (!t) return null;
  return /^[0-9]/.test(t) ? `כ-${t}` : `כ${t}`;
}

/** התאמת יחיד/רבים לספירה בעברית: 1 → "עסקה אחת", 2 → "שתי עסקאות". */
export function countText(n: number, singular: string, plural: string, feminine = true): string {
  if (n === 1) return `${singular} ${feminine ? 'אחת' : 'אחד'}`;
  if (n === 2) return `${feminine ? 'שתי' : 'שני'} ${plural}`;
  return `${n} ${plural}`;
}
