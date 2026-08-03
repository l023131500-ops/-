// ==== מנוע היתרים ומסמכים ====
//
// עונה על השאלה "מה מותר לבנות כאן, לפי איזו תכנית, ואיפה המסמכים" — לכל
// ארבעת סוגי הנכס (מגורים, שכירות, מסחרי, קרקע). מרכיב שלושה מקורות פתוחים:
//   · XPLAN שכבה 4 — ייעוד הקרקע של תא השטח
//   · XPLAN שכבה 1 — מרשם התכניות: מטרות, שלב, ועדה, כמויות, תאריכים
//   · MAVAT        — עמוד התכנית, שבו התקנון והתשריט
//
// 🔴 מה שנבדק חי ולא עבד, כדי שלא ייבדק שוב:
// ה-REST של MAVAT (`/rest/api/SV4/1?mid=…` לפרטי תכנית ו-`/rest/api/Attacments/…`
// לקובץ עצמו) דורש כותרת `authorization` שהיא **טוקן reCAPTCHA Enterprise**
// שנוצר בדפדפן. נמדד: בלי הכותרת → 404; עם טוקן שאינו אמיתי → 401. כלומר
// השרת מאמת את הטוקן, ואין דרך לשרת שלנו למשוך את קובץ ה-PDF.
// אנחנו **לא מזייפים טוקן ולא עוקפים captcha** — בדיוק כמו במרשם העסקאות של
// nadlan.gov.il. לכן: מציגים את רשימת המסמכים ומפנים בקישור ישיר לעמוד התכנית,
// ואומרים ללקוח במפורש שההורדה עצמה נעשית באתר הממשלתי.
//
// מה שכן פתוח לגמרי ומשמש כאן: `Luts` של MAVAT, וכל שכבות XPLAN.

import { queryPlanningAtPoint, queryPlansAtPoint, type PlanRecord, type PlanningResult } from './xplan';

export interface PermitDocument {
  /** "הוראות התכנית (תקנון)" · "תשריט התכנית" */
  title: string;
  /** הקישור לעמוד שבו הקובץ מתפרסם. */
  url: string | null;
  /** מספר הגרסה שהמרשם מדווח — משתנה בכל תיקון לתכנית. */
  version: number | null;
}

export interface PlanWithDocs extends PlanRecord {
  documents: PermitDocument[];
  /** הסבר בעברית מדוברת: מה התכנית הזו עושה לנכס. */
  plainSummary: string;
  /** שורות כמות אמיתיות, כל אחת מיוחסת לשטח התכנית. */
  quantityLines: string[];
}

export interface NearbyPlanning {
  landUse: string | null;
  planNumber: string | null;
  radiusM: number;
  plans: number;
  /** ועדה ומרחב תכנון מתכנית סמוכה שתחום השיפוט שלה הוא היישוב עצמו. */
  committee?: string | null;
  planningSpace?: string | null;
}

export interface PermitsResult {
  /** ייעוד הקרקע של תא השטח (שכבה 4). */
  landUse: string | null;
  landUseDeferred: boolean;
  overlays: string[];
  /** תכניות מאושרות שמכוחן ניתן להוציא היתר. */
  approved: PlanWithDocs[];
  /** תכניות בהליך — עדיין לא מאושרות. זה הצפי, לא המצב. */
  inProcess: PlanWithDocs[];
  /** מסמכי מדיניות — מחייבים שיקול דעת אך אינם מקנים זכויות. */
  policy: PlanWithDocs[];
  /** ועדת התכנון המקומית, כפי שהיא רשומה בתכניות עצמן. */
  committee: string | null;
  planningSpace: string | null;
  /**
   * הנקודה אינה מכוסה כלל במפה המקוונת — לא תכנית ולא ייעוד.
   * זה **אינו** "אין תכניות": זה חור בכיסוי, ויש הבדל מהותי בין השניים.
   */
  coverageGap: boolean;
  /** מה נמצא בסביבה כשיש חור כיסוי — מוצג כשל השכנים, לא כשל המגרש. */
  nearby: NearbyPlanning | null;
  /**
   * שם הוועדה נלקח מתכנית בסביבה ולא מתכנית שחלה על המגרש.
   *
   * ⚠️ מותר **רק** לוועדה ולמרחב התכנון, ורק כשתחום השיפוט של אותה תכנית הוא
   * היישוב עצמו: הוועדה היא תכונה של הרשות המקומית, לא של המגרש. ייעוד קרקע
   * וזכויות בנייה לעולם אינם נלקחים כך.
   */
  committeeFromNearby: boolean;
  /** מה לעשות כדי לקבל היתר בנייה בפועל — בלי להמציא מערכת שלא קיימת. */
  permitGuidance: string;
  /** למה קובץ ה-PDF אינו מצורף לדוח. */
  documentsAccessNote: string;
  /** אזהרות אמת (שירות שלא ענה וכד'). */
  warnings: string[];
}

const DOCS_ACCESS_NOTE =
  'קובצי התקנון והתשריט מתפרסמים באתר "מידע תכנוני" של מינהל התכנון, וההורדה שם ' +
  'מוגנת ב-reCAPTCHA — כלומר היא מתבצעת בדפדפן ולא ניתנת למשיכה אוטומטית. ' +
  'לכל תכנית בדוח יש קישור ישיר לעמוד שלה, ובו הכפתורים "הוראות התכנית" ו"תשריט התכנית".';

function fmt(n: number): string {
  return new Intl.NumberFormat('he-IL').format(Math.round(n));
}

/**
 * שורות הכמויות של תכנית.
 * ⚠️ כל שורה נושאת את שטח התכנית, כי הכמות היא לכל שטח התכנית ולא לחלקה.
 * בלי זה "2,000 יח\"ד" נקרא כאילו מותר לבנות 2,000 דירות על המגרש הזה.
 */
function quantityLines(p: PlanRecord): string[] {
  const scope = p.areaDunam ? ` (בכל שטח התכנית — ${fmt(p.areaDunam)} דונם)` : '';
  const q = p.quantities;
  const out: string[] = [];
  const add = (label: string, v: number | null, unit: string) => {
    if (v !== null) out.push(`${label}: ${fmt(v)} ${unit}${scope}`);
  };
  add('יחידות דיור מאושרות', q.approvedHousingUnits, 'יח"ד');
  add('שינוי במספר יחידות הדיור', q.deltaHousingUnits, 'יח"ד');
  add('שינוי בשטח למגורים', q.deltaResidentialSqm, 'מ"ר');
  add('שינוי בשטח מבני תעסוקה', q.deltaEmploymentSqm, 'מ"ר');
  add('שינוי בשטח מבני מסחר', q.deltaCommerceSqm, 'מ"ר');
  add('שינוי בשטח מבני ציבור', q.deltaPublicSqm, 'מ"ר');
  add('דיור מיוחד מאושר', q.approvedSpecialHousingSqm, 'מ"ר');
  add('שינוי במספר יחידות דיור מיוחד', q.deltaSpecialHousingUnits, 'יח"ד');
  add('חדרי מלון מאושרים', q.approvedHotelSqm, 'מ"ר');
  add('שינוי בשטח מלונאות', q.deltaHotelSqm, 'מ"ר');
  return out;
}

function heDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('he-IL');
}

/** תיאור התכנית בשפה מדוברת — מהשדות עצמם, בלי ניסוח שאין לו כיסוי. */
function plainSummary(p: PlanRecord): string {
  const parts: string[] = [];

  if (p.isPolicyDocument) {
    parts.push('מסמך מדיניות: מנחה את הוועדה בשיקול הדעת שלה, אך אינו מקנה זכויות בנייה בעצמו.');
  } else if (p.approved) {
    const when = heDate(p.dates.gazette);
    parts.push(
      when
        ? `תכנית מאושרת. פורסמה למתן תוקף ברשומות ב-${when}.`
        : 'תכנית מאושרת.',
    );
  } else {
    const stage = p.stage ?? p.status;
    parts.push(
      stage
        ? `תכנית בהליך — השלב הנוכחי: ${stage}. עוד לא אושרה, ולכן אינה מקנה זכויות היום.`
        : 'תכנית בהליך — עוד לא אושרה, ולכן אינה מקנה זכויות היום.',
    );
    const objections = heDate(p.dates.objectionsDeadline);
    if (objections) parts.push(`המועד האחרון להגשת התנגדויות שנרשם: ${objections}.`);
  }

  if (p.permitCharacter) parts.push(p.permitCharacter + '.');
  if (p.planType) parts.push(`סוג התכנית: ${p.planType}.`);

  return parts.join(' ');
}

/**
 * המסמכים של התכנית.
 * המרשם מדווח מונה גרסה נפרד לתקנון ולתשריט; הוא נשמר כאן כי הוא מה שמאפשר
 * לזהות שראית גרסה ישנה. הקישור מוביל לעמוד התכנית, שם מתבצעת ההורדה.
 */
function documentsOf(p: PlanRecord, versions: { orders: number | null; tasrit: number | null }): PermitDocument[] {
  if (!p.mavatUrl) return [];
  return [
    { title: 'הוראות התכנית (תקנון)', url: p.mavatUrl, version: versions.orders },
    { title: 'תשריט התכנית', url: p.mavatUrl, version: versions.tasrit },
  ];
}

function enrich(p: PlanRecord, versions: { orders: number | null; tasrit: number | null }): PlanWithDocs {
  return {
    ...p,
    documents: documentsOf(p, versions),
    plainSummary: plainSummary(p),
    quantityLines: quantityLines(p),
  };
}

/**
 * הנחיה מעשית לקבלת היתר.
 *
 * ⚠️ אין בישראל מרשם ארצי של היתרי בנייה שאפשר לשאול בו לפי כתובת — הכיסוי
 * הוא לפי עיר, דרך ה-GIS העירוני או תיק הבניין בוועדה. לכן במקום להציג
 * "לא נמצא היתר" (שמשתמע ממנו שאין היתר), אומרים איפה בודקים בפועל, ומי
 * הוועדה — השם נלקח מהתכניות עצמן ולא מרשימה קשיחה.
 */
function permitGuidanceText(committee: string | null, county: string | null): string {
  const who = committee ?? (county ? `הוועדה המקומית לתכנון ולבנייה ב${county}` : null);
  const base =
    'היתרי בנייה אינם מתפרסמים במרשם ארצי אחד, ולכן אין מקור שאפשר לשאול בו לפי כתובת ' +
    'ולקבל תשובה ארצית. תיק הבניין — ובו ההיתרים שניתנו בפועל, הבקשות והחריגות — נמצא בוועדה המקומית.';
  return who
    ? `${base} הוועדה המוסמכת לנכס הזה, לפי התכניות שחלות עליו, היא ${who}. עיון בתיק הבניין נעשה בבקשה אליה.`
    : `${base} לא הצלחנו לזהות את הוועדה המקומית מהתכניות שחלות על הנקודה.`;
}

/**
 * הרכבת סעיף ההיתרים ממה שכבר נמשך.
 *
 * ⚠️ קיימת בנפרד מ-`buildPermits` כי שכבה 4 (ייעוד קרקע) נמשכת ממילא בדוח
 * הראשי. קריאה חוזרת אליה כאן הייתה מכפילה שאילתה לשרת של מינהל התכנון בכל
 * דוח — ומכניסה סיכוי שאותו דוח יציג שני ערכי ייעוד שונים לאותה נקודה.
 */
export function composePermits(
  plans: PlanRecord[],
  land: PlanningResult | null,
  opts: {
    failed?: { plans?: boolean; land?: boolean };
    /** מה נמצא בסביבה, כשהנקודה עצמה אינה מכוסה. */
    nearby?: NearbyPlanning | null;
    /** שם היישוב — לזיהוי הוועדה כשאין תכנית שממנה לקרוא אותו. */
    city?: string | null;
  } = {},
): PermitsResult {
  const failed = opts.failed ?? {};
  const nearby = opts.nearby ?? null;
  const warnings: string[] = [];

  if (failed.plans) {
    warnings.push('מרשם התכניות של מינהל התכנון לא ענה, ולכן רשימת התכניות חסרה בדוח הזה.');
  }
  if (failed.land) {
    warnings.push('שכבת ייעודי הקרקע של מינהל התכנון לא ענתה.');
  }

  /**
   * חור כיסוי: שני השירותים ענו, ושניהם החזירו ריק על הנקודה עצמה.
   *
   * ⚠️ נמדד על "הדקל 22, חצור הגלילית" — אפס תכניות ואפס ייעודים על החלקה,
   * ותוצאות אמיתיות כבר ב-120 מ'. הנוסח הקודם ("לרוב בשוליים של יישוב או
   * בשטח פתוח") היה שגוי בדיוק במקרה הזה: זו שכונת מגורים ותיקה בלב יישוב,
   * שהתכניות שלה פשוט לא עברו דיגיטציה למפה המקוונת.
   */
  const coverageGap =
    !failed.plans && !failed.land && plans.length === 0 && (land?.appliedPlans.length ?? 0) === 0;

  if (coverageGap) {
    warnings.push(
      'המפה המקוונת של מינהל התכנון אינה מכסה את הנקודה הזו: אין בה אף תכנית ואף ייעוד קרקע ' +
        'על החלקה עצמה' +
        (nearby?.landUse
          ? `, בעוד שבמרחק של עד ${nearby.radiusM} מ' יש כיסוי מלא. זה אופייני לשכונות שתוכננו לפני שהתכניות עברו לדיגיטציה. ` +
            'מה שמוצג בדוח כ"בסביבה" הוא של מגרשים שכנים ואינו הייעוד של המגרש הזה — את הייעוד המחייב יש לברר בוועדה המקומית.'
          : '. זה אינו אומר שאין תכנית על המגרש, אלא שאין תכנית מקוונת — את המצב התכנוני המחייב יש לברר בוועדה המקומית.'),
    );
  } else if (!failed.plans && plans.length === 0) {
    warnings.push(
      'לא נמצאה אף תכנית שהקו הכחול שלה חולש על הנקודה הזו, למרות שיש כיסוי של ייעודי קרקע. ' +
        'ייתכן שהנקודה נופלת על גבול בין תכניות.',
    );
  }

  // מוני הגרסה מתפרסמים בשכבת ייעודי הקרקע (שכבה 4), ולא במרשם התכניות.
  const versionByPlan = new Map<string, { orders: number | null; tasrit: number | null }>();
  for (const ap of land?.appliedPlans ?? []) {
    if (ap.planNumber) versionByPlan.set(ap.planNumber, { orders: ap.orderVersion, tasrit: ap.tasritVersion });
  }

  const enriched = plans.map((p) =>
    enrich(p, versionByPlan.get(p.planNumber ?? '') ?? { orders: null, tasrit: null }),
  );

  // ⚠️ `ja_concat` הוא **שרשור** של כל תחומי השיפוט שהתכנית נוגעת בהם. תכנית
  // מטרופולינית החזירה "אור יהודה,אזור,בני ברק,בת ים,גבעתיים,הרצליה,חולון,
  // קרית אונו,רמת גן,רמת השרון,תל אביב-יפו" — והמשפט שנבנה ממנה אמר ללקוח
  // שזו "הוועדה המוסמכת לנכס". לכן נבחרת רק רשומה עם תחום שיפוט **יחיד**,
  // מהתכנית הספציפית ביותר (הרשימה ממוינת מהקטנה לגדולה).
  const single = (v: string | null): boolean => !!v && !v.includes(',');
  const local = enriched.find((p) => single(p.committee) && single(p.jurisdiction));
  const ownCommittee = local?.committee ?? enriched.find((p) => single(p.committee))?.committee ?? null;
  const ownSpace = enriched.find((p) => single(p.planningSpace))?.planningSpace ?? null;
  const county = enriched.find((p) => single(p.county))?.county ?? null;

  // בחור כיסוי אין תכנית שממנה לקרוא את שם הוועדה. הוועדה היא של הרשות
  // המקומית ולא של המגרש, ולכן מותר לקחת אותה מתכנית סמוכה **באותו יישוב** —
  // ומסומן במפורש שכך נעשה.
  const committeeFromNearby = !ownCommittee && !!nearby?.committee && coverageGap;
  const committee = ownCommittee ?? (committeeFromNearby ? nearby!.committee! : null);
  const planningSpace = ownSpace ?? (committeeFromNearby ? nearby?.planningSpace ?? null : null);

  return {
    landUse: land?.landUse ?? null,
    landUseDeferred: land?.landUseDeferred ?? false,
    overlays: land?.overlays ?? [],
    approved: enriched.filter((p) => p.approved),
    inProcess: enriched.filter((p) => p.inProcess),
    policy: enriched.filter((p) => p.isPolicyDocument),
    committee,
    planningSpace,
    coverageGap,
    nearby: coverageGap ? nearby : null,
    committeeFromNearby,
    permitGuidance: permitGuidanceText(committee, county ?? opts.city ?? null),
    documentsAccessNote: DOCS_ACCESS_NOTE,
    warnings,
  };
}

/** משיכה עצמאית — לשימוש מחוץ למנוע הדוח (בדיקות, כלי אדמין). */
export async function buildPermits(itmX: number, itmY: number): Promise<PermitsResult> {
  const [plansRes, landRes] = await Promise.allSettled([
    queryPlansAtPoint(itmX, itmY),
    queryPlanningAtPoint(itmX, itmY),
  ]);
  return composePermits(
    plansRes.status === 'fulfilled' ? plansRes.value : [],
    landRes.status === 'fulfilled' ? landRes.value : null,
    { failed: { plans: plansRes.status === 'rejected', land: landRes.status === 'rejected' } },
  );
}
