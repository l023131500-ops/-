// ==== "היתכנות להיתר נוסף" — §7 במפרט ====
//
// השאלה שהלקוח שואל היא פשוטה: *אפשר להוסיף כאן משהו, ומה ייחשב חריגה?*
// התשובה נבנית **רק** ממה שהמקורות הרשמיים באמת אומרים:
//   · ייעוד הקרקע של תא השטח (XPLAN שכבה 4)
//   · התכניות המאושרות שחלות על הנקודה, ובמיוחד אלה שכל מטרתן היא תוספת
//     בנייה — הרחבות דיור, מרפסות, ממ"דים, עליית גג, מחסנים, תמ"א 38.
//     הזיהוי נעשה מהשם והמטרות של התכנית עצמה, לא מרשימה שהומצאה כאן.
//   · המגבלות שמסומנות על התשריט בפועל: קווי בניין, הריסה, שימור, עתיקות.
//
// 🔴 מה שלא ייכתב כאן לעולם: **מספר**. אחוזי בנייה, מספר קומות ושטח עיקרי
// אינם מתפרסמים בשום שירות מקוון — הם בהוראות התכנית בלבד. דוח שממציא להם
// ערך הוא בדיוק סוג הדוח שהמפרט אוסר. לכן הסעיף אומר במפורש מה לא ידוע,
// ואיפה בודקים אותו.

import type { PermitsResult, PlanWithDocs } from './permits';
import type { ParcelConstraints, PlanEntity } from './planentities';

/** תכנית שכל עניינה הוא תוספת בנייה למבנה קיים. */
const ADDITIVE =
  /(הרחב(ת|ות)\s*דיור|תוספת\s*(שטח|שטחי|בנ[יי]|יח|קומ)|מרפס|ממ["׳]?ד|מרחב\s*מוגן|עליית\s*גג|מחסן|מחסנים|חיזוק\s*מבנ|תמ["׳]?א\s*38|פינוי\s*בינוי|התחדשות|תוספת\s*מעלית|מעלית)/;

/** תכנית שמגדירה קווי בניין — נוגעת ישירות למיקום התוספת. */
const SETBACK = /קו(וי)?\s*בנ[יי]?[ןן]/;

export interface FeasibilityPlan {
  planNumber: string | null;
  planName: string | null;
  /** למה היא רלוונטית לשאלה — במילים של התכנית עצמה. */
  why: string;
  documentsUrl: string | null;
  approved: boolean;
}

export interface Feasibility {
  /** ייעוד הקרקע כלשונו, או null. */
  landUse: string | null;
  /** משפט פתיחה בעברית מדוברת — מה בכלל מותר כאן. */
  headline: string;
  /** תכניות מאושרות שמאפשרות תוספת בנייה. */
  additivePlans: FeasibilityPlan[];
  /** תכניות בהליך שעשויות לפתוח תוספת בעתיד — צפי, לא מצב. */
  pendingPlans: FeasibilityPlan[];
  /** קווי בניין שנמצאו על החלקה. */
  buildingLines: PlanEntity[];
  /** מגבלות שמסומנות על התשריט (הריסה, שימור, עתיקות, עצים). */
  restrictions: PlanEntity[];
  /** מה שאי אפשר לדעת מקוון, ואיפה כן בודקים. */
  unknowns: string[];
  /** מה נחשב חריגת בנייה — בשפה פשוטה. */
  deviationExplained: string[];
  /** לאן פונים בפועל. */
  whereToCheck: string;
}

function toFeasPlan(p: PlanWithDocs, why: string): FeasibilityPlan {
  return {
    planNumber: p.planNumber,
    planName: p.planName,
    why,
    documentsUrl: p.documents[0]?.url ?? p.mavatUrl ?? null,
    approved: p.approved,
  };
}

/** מה בתכנית הזו עונה על השאלה — מנוסח מהשדות שלה, לא מתבנית קבועה. */
function whyRelevant(p: PlanWithDocs): string | null {
  const hay = [p.planName ?? '', p.objectives ?? ''].join(' ');
  if (ADDITIVE.test(hay)) {
    if (/חיזוק\s*מבנ|תמ["׳]?א\s*38/.test(hay))
      return 'תכנית לחיזוק מבנים בפני רעידות אדמה — מסלול מוכר לתוספת בנייה למבנה קיים.';
    if (/מרפס/.test(hay)) return 'התכנית עוסקת בתוספת מרפסות למבנה קיים.';
    if (/ממ["׳]?ד|מרחב\s*מוגן/.test(hay)) return 'התכנית עוסקת בתוספת מרחב מוגן דירתי.';
    if (/מעלית/.test(hay)) return 'התכנית עוסקת בתוספת מעלית למבנה קיים.';
    if (/עליית\s*גג/.test(hay)) return 'התכנית עוסקת בניצול עליית הגג.';
    if (/מחסן|מחסנים/.test(hay)) return 'התכנית עוסקת בתוספת מחסנים.';
    if (/הרחב/.test(hay)) return 'התכנית עוסקת בהרחבת דיור.';
    if (/פינוי\s*בינוי|התחדשות/.test(hay))
      return 'תכנית התחדשות עירונית — הריסה ובנייה מחדש בהיקף גדול מתוספת.';
    return 'התכנית עוסקת בתוספת שטחי בנייה.';
  }
  if (SETBACK.test(hay))
    return 'התכנית קובעת קווי בניין — כלומר עד היכן מותר להתקרב לגבול המגרש.';
  return null;
}

export function buildFeasibility(
  permits: PermitsResult | null,
  constraints: ParcelConstraints | null,
  opts: { city?: string | null } = {},
): Feasibility | null {
  if (!permits) return null;

  const additivePlans: FeasibilityPlan[] = [];
  const pendingPlans: FeasibilityPlan[] = [];
  for (const p of permits.approved) {
    const why = whyRelevant(p);
    if (why) additivePlans.push(toFeasPlan(p, why));
  }
  for (const p of permits.inProcess) {
    const why = whyRelevant(p);
    if (why) pendingPlans.push(toFeasPlan(p, why));
  }

  const buildingLines = constraints?.buildingLines ?? [];
  const restrictions = constraints?.restrictions ?? [];

  // ---- משפט הפתיחה ----
  let headline: string;
  if (permits.coverageGap) {
    headline =
      'המפה המקוונת של מינהל התכנון אינה מכסה את החלקה הזו, ולכן אי אפשר לומר מכאן מה מותר ' +
      'להוסיף בה. זה אינו אומר שאין תכנית — אלא שהיא לא עברה דיגיטציה. הבירור נעשה בוועדה המקומית.';
  } else if (!permits.landUse) {
    headline =
      'לא נמצא ייעוד קרקע קונקרטי לתא השטח הזה במפה המקוונת, ולכן נקודת המוצא לשאלה מה מותר ' +
      'להוסיף אינה זמינה מקוון.';
  } else if (additivePlans.length) {
    headline =
      `ייעוד הקרקע כאן הוא "${permits.landUse}". על החלקה חלות ` +
      `${additivePlans.length === 1 ? 'תכנית מאושרת אחת' : `${additivePlans.length} תכניות מאושרות`} ` +
      'שכל עניינן תוספת בנייה למבנה קיים — כלומר יש מסלול תכנוני קיים לבקשת תוספת. ' +
      'ההיקף המדויק שמותר להוסיף כתוב בהוראות התכניות עצמן.';
  } else {
    headline =
      `ייעוד הקרקע כאן הוא "${permits.landUse}". לא נמצאה תכנית מאושרת שמטרתה תוספת בנייה ` +
      'למבנה קיים. אין פירושו שאי אפשר לבקש תוספת — פירושו שאין מסלול תכנוני ייעודי לכך, ' +
      'וכל בקשה תיבחן מול הוראות התכניות הכלליות שחלות על המגרש.';
  }

  // ---- מה שלא ידוע מקוון ----
  const unknowns: string[] = [
    'אחוזי הבנייה, מספר הקומות והשטח העיקרי המותר — אינם מתפרסמים בשום שירות מפות מקוון. ' +
      'הם כתובים בהוראות התכנית (התקנון), והקישור לכל תכנית מופיע ברשימה שמעל.',
    'מה כבר נוצל מהזכויות בפועל — כלומר כמה נשאר — נמצא בתיק הבניין בוועדה המקומית. ' +
      'אין מרשם ארצי של היתרי בנייה שאפשר לשאול בו לפי כתובת.',
  ];
  if (!buildingLines.length) {
    unknowns.push(
      'לא אותרו קווי בניין מצוירים על החלקה בשירות המפות. ייתכן שהם מוגדרים בהוראות התכנית ' +
        'בטקסט בלבד, ולא כקו על התשריט.',
    );
  }

  // ---- מה נחשב חריגת בנייה ----
  const deviationExplained: string[] = [
    'בנייה בלי היתר בכלל — גם אם התכנית מתירה אותה. התכנית קובעת מה מותר; ההיתר הוא האישור לבצע.',
    'בנייה מעבר לשטח שההיתר נתן — סגירת מרפסת, תוספת חדר, פרגולה קבועה או מחסן שלא נכללו בו.',
    'בנייה שחורגת מקו הבניין — כלומר קרובה לגבול המגרש יותר ממה שהתכנית מתירה. ' +
      'זו החריגה הנפוצה ביותר בתוספות לבתים קיימים.',
    'שימוש שאינו תואם את הייעוד — למשל הפעלת עסק בדירת מגורים בלי שימוש חורג מאושר.',
    'חריגה נרשמת בתיק הבניין, והיא מתגלה בדרך כלל בעסקה: הבנק אינו מממן שטח לא מאושר, ' +
      'והקונה יורש את האחריות לה.',
  ];

  const where = permits.committee
    ? `הבירור המחייב נעשה מול ${permits.committee}: עיון בתיק הבניין, ובקשת "מידע להיתר" (תיק מידע) לחלקה.`
    : opts.city
      ? `הבירור המחייב נעשה מול הוועדה המקומית לתכנון ולבנייה ב${opts.city}: עיון בתיק הבניין, ובקשת "מידע להיתר" לחלקה.`
      : 'הבירור המחייב נעשה מול הוועדה המקומית לתכנון ולבנייה: עיון בתיק הבניין, ובקשת "מידע להיתר" לחלקה.';

  return {
    landUse: permits.landUse,
    headline,
    additivePlans,
    pendingPlans,
    buildingLines,
    restrictions,
    unknowns,
    deviationExplained,
    whereToCheck: where,
  };
}
