// ==== מנהל התכנון — XPLAN (ArcGIS REST) ====
//
// ⚠️ תיקון נתיב: השירות לא עבר שרת ולא שינה שם — השתנה שם מופע ה-Web Adaptor:
//     /arcgis/  ->  /arcgisiplan/
// הנתיב הישן הוא catch-all שמחזיר דף שגיאה של gov.il ב-HTTP 200 לכל בקשה,
// ולכן זה נראה כמו השבתה מוחלטת. נבדק חי.
//
// ⚠️ תיקון שכבה: שכבת ייעודי הקרקע היא 4, לא 1.
//     0 ישויות נקודתיות · 1 קווים כחולים · 2 ישויות קוויות
//     3 ישויות פוליגונליות (שכבות-על: שימור, עתיקות) · 4 יעודי קרקע
//
// השירות עובד ב-wkid 2039 באופן טבעי — אין צורך בהמרה.
// השרת איטי; יש להקציב timeout נדיב.

import { fetchJson } from './http';

export interface AppliedPlan {
  planNumber: string | null;
  planName: string | null;
  status: string | null;
  /** שטח הפוליגון במ"ר — ככל שקטן יותר, כך התכנית ספציפית יותר לנכס. */
  areaSqm: number | null;
  landUse: string | null;
  /** קישור לעיון בהוראות התכנית ב"תכנון זמין" (שם נמצאות זכויות הבנייה). */
  documentsUrl: string | null;
  /** מונה גרסת התקנון והתשריט — עולה בכל תיקון, ומאפשר לזהות עיון בגרסה ישנה. */
  orderVersion: number | null;
  tasritVersion: number | null;
}

export interface PlanningResult {
  landUse?: string;
  landUseCode?: number;
  planNumber?: string;
  planName?: string;
  status?: string;
  lastUpdated?: string;
  /** שכבות-על החלות על הנקודה (עתיקות, שימור וכד'). */
  overlays: string[];
  /** ⚠️ תמיד null — ראה הערה למטה. */
  buildingRights: null;
  /** למה זכויות הבנייה אינן מוצגות, ואיפה כן אפשר להשיג אותן. */
  buildingRightsNote: string;
  /** **כל** התכניות החלות על הנקודה, מהספציפית לרחבה. */
  appliedPlans: AppliedPlan[];
  /**
   * true כשכל התכניות החלות מפנות לתכנית אחרת ואין ייעוד קונקרטי בשירות.
   * במצב הזה אסור להציג את מחרוזת ההפניה כאילו היא הייעוד.
   */
  landUseDeferred: boolean;
  raw?: unknown;
}

/**
 * ⚠️ ערך אמיתי במרשם, ולא ייעוד: פירושו "התכנית הזו אינה קובעת ייעוד, היא
 * מפנה לתכנית אחרת". נצפה בפועל בכל 9 התכניות שחלות על דיזנגוף 100 תל אביב.
 * הצגתו כייעוד הקרקע של הנכס היא הצגה מטעה, ולכן הוא מזוהה ומסונן.
 */
const DEFERRAL_RE = /יעוד\s*עפ["']?י\s*תכנית\s*מאושרת\s*אחרת/;

/**
 * ⚠️ ערך שני מאותה משפחה, שנתפס בבדיקה חיה על "דיזנגוף 100 תל אביב":
 * `mavat_code = 999` → "שטח שהתוכנית אינה חלה עליו". זו הצהרה של התכנית
 * ש**היא לא חלה כאן**, ובכל זאת היא נבחרה כייעוד הקרקע והוצגה ללקוח ככזה.
 * כלומר הדוח אמר "ייעוד הקרקע: שטח שהתוכנית אינה חלה עליו" — משפט חסר מובן
 * שנשמע כמו נתון. מסונן בדיוק כמו ההפניה.
 */
const NOT_APPLICABLE_RE = /שטח\s*שה?ת(ו)?כנית\s*אינה\s*חלה\s*עליו/;
const NOT_APPLICABLE_CODE = 999;

function isDeferral(name: unknown, code?: unknown): boolean {
  if (Number(code) === NOT_APPLICABLE_CODE) return true;
  return typeof name === 'string' && (DEFERRAL_RE.test(name) || NOT_APPLICABLE_RE.test(name));
}

/** קישור לעמוד התכנית ב"תכנון זמין" — שם מתפרסמות הוראות התכנית. */
function planDocsUrl(planNumber: unknown): string | null {
  if (typeof planNumber !== 'string' || !planNumber.trim()) return null;
  return `https://mavat.iplan.gov.il/SV3?text=${encodeURIComponent(planNumber.trim())}`;
}

const XPLAN_BASE =
  process.env.XPLAN_BASE ??
  'https://ags.iplan.gov.il/arcgisiplan/rest/services/PlanningPublic/Xplan/MapServer';

// ⚠️ אזהרת אבחון: השרת מאחורי WAF שדוחה סוכן משתמש קצר. בקשה עם
// `User-Agent: Mozilla/5.0` בלבד מקבלת **HTTP 200 עם דף השגיאה של gov.il**,
// בדיוק כמו שרת קדסטר מת. `lib/http.ts` שולח סוכן דפדפן מלא ולכן עובד —
// אל תקצר אותו, ואל תסיק "השירות נפל" מבדיקה ידנית עם UA קצר.

async function queryLayer(
  layer: number,
  itmX: number,
  itmY: number,
  radiusM = 0,
): Promise<any[]> {
  const url =
    `${XPLAN_BASE}/${layer}/query?geometry=${itmX.toFixed(2)},${itmY.toFixed(2)}` +
    `&geometryType=esriGeometryPoint&inSR=2039&spatialRel=esriSpatialRelIntersects` +
    `&outFields=*&returnGeometry=false&f=json` +
    (radiusM > 0 ? `&distance=${radiusM}&units=esriSRUnit_Meter` : '');
  const json = await fetchJson<any>(url, { timeoutMs: 45000, retries: 2 });
  if (json?.error) throw new Error(`XPLAN שכבה ${layer}: ${json.error?.message ?? 'שגיאה'}`);
  return json?.features ?? [];
}

/**
 * בחירת הייעוד התקף.
 *
 * ⚠️ שאילתת נקודה מחזירה תוכניות רבות שנערמו זו על זו לאורך השנים, וביניהן
 * תוכניות בהיקף עירוני שלם (shape_area ~50 קמ"ר). האיבר הראשון אינו בהכרח
 * הרלוונטי. הדירוג: מאושרות תחילה, ואז הפוליגון הקטן ביותר — כלומר תא השטח
 * הספציפי ביותר שחל על הנקודה.
 */
function pickMostSpecific(features: any[]): any | null {
  if (!features.length) return null;
  const scored = features
    .map((f) => f?.attributes ?? {})
    .filter((a) => a && Object.keys(a).length);
  if (!scored.length) return null;

  scored.sort((a, b) => {
    const approvedA = a.station_desc === 'אישור' ? 0 : 1;
    const approvedB = b.station_desc === 'אישור' ? 0 : 1;
    if (approvedA !== approvedB) return approvedA - approvedB;
    const areaA = Number(a.shape_area) || Number.MAX_SAFE_INTEGER;
    const areaB = Number(b.shape_area) || Number.MAX_SAFE_INTEGER;
    return areaA - areaB;
  });
  return scored[0];
}

// ==== שכבה 1 — מרשם התכניות ("קווים כחולים") ====
//
// שכבה 4 מחזירה את **ייעוד הקרקע** של תא השטח, וזה כל מה שהיה כאן עד עכשיו.
// שכבה 1 היא רשומת התכנית עצמה, והיא מחזיקה בדיוק את מה שחסר לדוח היתרים:
// מטרות התכנית כלשונן, שלב תכנוני, שם ועדת התכנון, סוג ההיתר שניתן להוציא
// מכוחה, כל תאריכי ההליך, וכמויות מאושרות/מוצעות.
//
// ⚠️ שמות השדות אינם מתעדים את עצמם (`quantity_delta_120`). המשמעות נלקחה
// מ-`alias` הרשמי של השירות, לא מניחוש:
//   pq_authorised_quantity_120 → "מגורים מאושר יח\"ד"
//   pq_authorised_quantity_105 → "חדרי מלון מאושר מ\"ר"
//   pq_authorised_quantity_110 → "דיור מיוחד מאושר מ\"ר"
//   quantity_delta_120 → "שינוי מס' יח' דיור"      · quantity_delta_125 → "שינוי שטח דיור מ\"ר"
//   quantity_delta_110 → "שינוי מס' יח' דיור מיוחד" · quantity_delta_105 → "שינוי מוצע מלונאות מ\"ר"
//   quantity_delta_60  → "שינוי בשטח מבני תעסוקה מ\"ר"
//   quantity_delta_75  → "שינוי בשטח מבני מסחר מ\"ר"
//   quantity_delta_80  → "שינוי בשטח מבני ציבור מ\"ר"
//
// 🔴 הכמויות האלה הן **לכל שטח התכנית**, לא לחלקה. תכנית עירונית אחת ברחובות
// משתרעת על 18,500 דונם. להציג "2,000 יח\"ד" כזכויות של הנכס זו הטעיה — ולכן
// כל כמות נשמרת יחד עם `areaDunam` של אותה תכנית ומוצגת מיוחסת לתכנית.

export interface PlanQuantities {
  approvedHousingUnits: number | null;
  approvedHotelSqm: number | null;
  approvedSpecialHousingSqm: number | null;
  deltaHousingUnits: number | null;
  deltaSpecialHousingUnits: number | null;
  deltaResidentialSqm: number | null;
  deltaEmploymentSqm: number | null;
  deltaCommerceSqm: number | null;
  deltaPublicSqm: number | null;
  deltaHotelSqm: number | null;
}

export interface PlanDates {
  received: string | null;
  thresholdMet: string | null;
  depositDiscussion: string | null;
  lastDeposit: string | null;
  objectionsDeadline: string | null;
  approvalDiscussion: string | null;
  gazette: string | null;
  newspaper: string | null;
  lastUpdate: string | null;
}

export interface PlanRecord {
  planNumber: string | null;
  planName: string | null;
  /** "תכנית מתאר מקומית" · "תכנית מפורטת" · "תכנית מתאר ארצית" · "מסמך מדיניות" */
  planType: string | null;
  /** התחנה שבה התכנית נמצאת כרגע ("אישור", "בבדיקה תכנונית"...). */
  status: string | null;
  /** הניסוח הציבורי של השלב ("פרסום אישור", "קיום תנאי סף"...). */
  stage: string | null;
  /** מטרות התכנית כלשונן במרשם. */
  objectives: string | null;
  areaDunam: number | null;
  /** שם ועדת התכנון — זו הכתובת לבקשת היתר ולעיון בתיק הבניין. */
  committee: string | null;
  planningSpace: string | null;
  jurisdiction: string | null;
  county: string | null;
  district: string | null;
  /** "תכנית שמכוחה ניתן להוציא היתרים או הרשאות" — או שלא. */
  permitCharacter: string | null;
  canIssuePermits: boolean;
  approved: boolean;
  inProcess: boolean;
  isPolicyDocument: boolean;
  dates: PlanDates;
  quantities: PlanQuantities;
  /** עמוד התכנית ב"מידע תכנוני" — שם נמצאים התקנון והתשריט להורדה. */
  mavatUrl: string | null;
  mpId: string | null;
}

function num(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** ערך 0 ב-delta פירושו "התכנית לא משנה את הכמות הזו" — לא נתון להצגה. */
function nonZero(v: unknown): number | null {
  const n = num(v);
  return n === null || n === 0 ? null : n;
}

function isoDate(v: unknown): string | null {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  const d = new Date(n);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

/**
 * ⚠️ שני שדות סטטוס שאינם מסכימים זה עם זה: נצפתה תכנית עם
 * `station_desc="אחר"` ו-`internet_short_status="התכנית אושרה"`. לכן ההחלטה
 * נשענת על שניהם, והטקסט הגולמי של שניהם נשמר ומוצג — הדוח לא מסתיר סטטוס.
 */
function classify(station: string | null, stage: string | null, gazette: string | null) {
  const isPolicyDocument = /מסמך\s*מדיניות/.test(`${station ?? ''} ${stage ?? ''}`);
  const approved =
    !isPolicyDocument &&
    (/אוש|איש/.test(stage ?? '') || /^אישור$/.test(station ?? '') || gazette !== null);
  return { isPolicyDocument, approved, inProcess: !approved && !isPolicyDocument };
}

function toPlanRecord(a: any): PlanRecord {
  const station = str(a.station_desc);
  const stage = str(a.internet_short_status);
  const gazette = isoDate(a.pl_date_8);
  const { isPolicyDocument, approved, inProcess } = classify(station, stage, gazette);
  const permitCharacter = str(a.plan_charactor_name);

  return {
    planNumber: str(a.pl_number),
    planName: str(a.pl_name),
    planType: str(a.entity_subtype_desc),
    status: station,
    stage,
    objectives: str(a.pl_objectives),
    areaDunam: num(a.pl_area_dunam),
    committee: str(a.ja_concat),
    planningSpace: str(a.plan_area_name),
    jurisdiction: str(a.jurstiction_area_name),
    county: str(a.plan_county_name),
    district: str(a.district_name),
    permitCharacter,
    canIssuePermits: !!permitCharacter && !/לא\s*ניתן/.test(permitCharacter),
    approved,
    inProcess,
    isPolicyDocument,
    dates: {
      received: isoDate(a.receiving_date),
      thresholdMet: isoDate(a.date_saf),
      depositDiscussion: isoDate(a.depositing_date),
      lastDeposit: isoDate(a.pl_last_deposit_date),
      objectionsDeadline: isoDate(a.pl_rejection_date),
      approvalDiscussion: isoDate(a.pl_date7),
      gazette,
      newspaper: isoDate(a.pl_date_advertise),
      lastUpdate: isoDate(a.last_update_date),
    },
    quantities: {
      approvedHousingUnits: nonZero(a.pq_authorised_quantity_120),
      approvedHotelSqm: nonZero(a.pq_authorised_quantity_105),
      approvedSpecialHousingSqm: nonZero(a.pq_authorised_quantity_110),
      deltaHousingUnits: nonZero(a.quantity_delta_120),
      deltaSpecialHousingUnits: nonZero(a.quantity_delta_110),
      deltaResidentialSqm: nonZero(a.quantity_delta_125),
      deltaEmploymentSqm: nonZero(a.quantity_delta_60),
      deltaCommerceSqm: nonZero(a.quantity_delta_75),
      deltaPublicSqm: nonZero(a.quantity_delta_80),
      deltaHotelSqm: nonZero(a.quantity_delta_105),
    },
    mavatUrl: str(a.pl_url) ?? (str(a.pl_number) ? planDocsUrl(a.pl_number) : null),
    mpId: a.mp_id != null ? String(a.mp_id) : null,
  };
}

/**
 * כל התכניות שהקו הכחול שלהן חולש על הנקודה — מאושרות ובהליך כאחד.
 * ממוינות מהספציפית (שטח קטן) לרחבה, כי תכנית של 18,500 דונם מתארת עיר
 * שלמה ותכנית של 4 דונם מתארת את המגרש.
 */
export async function queryPlansAtPoint(itmX: number, itmY: number, radiusM = 0): Promise<PlanRecord[]> {
  const features = await queryLayer(1, itmX, itmY, radiusM);
  return features
    .map((f) => f?.attributes ?? {})
    .filter((a) => a && Object.keys(a).length)
    .map(toPlanRecord)
    .sort((a, b) => (a.areaDunam ?? Infinity) - (b.areaDunam ?? Infinity));
}

/**
 * ייעודי הקרקע ברדיוס סביב הנקודה — לשימוש **רק** כשהנקודה עצמה אינה מכוסה.
 *
 * ⚠️ נמדד על "הדקל 22, חצור הגלילית": שכבת התכניות ושכבת ייעודי הקרקע מחזירות
 * **אפס** תוצאות על החלקה עצמה (גם על מרכז החלקה מהקדסטר, לא רק על נקודת
 * הכתובת), ומחזירות תוצאות אמיתיות כבר ב-120 מ'. כלומר יש חורים אמיתיים
 * בכיסוי המקוון — שכונות שתוכננו לפני הדיגיטציה אינן שם.
 *
 * ⚠️ הערך שחוזר מכאן **אינו הייעוד של המגרש**. הוא ייעוד של מגרש שכן, והוא
 * מוצג ככזה במפורש. לקחת אותו כייעוד הנכס זו בדיוק הטעות שעלתה לנו 77 מטר
 * בשאילתות הקדסטר.
 */
export async function queryLandUseNear(
  itmX: number,
  itmY: number,
  radiusM: number,
): Promise<{ landUse: string | null; planNumber: string | null; radiusM: number }> {
  const features = await queryLayer(4, itmX, itmY, radiusM);
  const attrs = features
    .map((f) => f?.attributes ?? {})
    .filter((a) => a?.mavat_name && !isDeferral(a.mavat_name, a.mavat_code))
    // הפוליגון הקטן ביותר הוא תא שטח ממשי ולא תכנית עירונית כוללת.
    .sort((a, b) => (Number(a.shape_area) || Infinity) - (Number(b.shape_area) || Infinity));
  const a = attrs[0];
  return {
    landUse: a ? String(a.mavat_name) : null,
    planNumber: a?.pl_number ? String(a.pl_number) : null,
    radiusM,
  };
}

export async function queryPlanningAtPoint(itmX: number, itmY: number): Promise<PlanningResult> {
  // שכבה 4 = ייעוד קרקע (חובה); שכבה 3 = שכבות-על (best-effort).
  const landFeatures = await queryLayer(4, itmX, itmY);

  // כל התכניות החלות, מהספציפית (פוליגון קטן) לרחבה — לא רק אחת.
  const attrs = landFeatures
    .map((f) => f?.attributes ?? {})
    .filter((x) => x && Object.keys(x).length);

  const appliedPlans: AppliedPlan[] = attrs
    .slice()
    .sort((x, y) => (Number(x.shape_area) || Infinity) - (Number(y.shape_area) || Infinity))
    .map((x) => ({
      planNumber: x.pl_number ? String(x.pl_number) : null,
      planName: x.pl_name ? String(x.pl_name) : null,
      status: x.station_desc ? String(x.station_desc) : null,
      areaSqm: Number.isFinite(Number(x.shape_area)) ? Math.round(Number(x.shape_area)) : null,
      landUse: isDeferral(x.mavat_name, x.mavat_code)
        ? null
        : x.mavat_name
          ? String(x.mavat_name)
          : null,
      documentsUrl: planDocsUrl(x.pl_number),
      orderVersion: Number.isFinite(Number(x.pl_order_print_version))
        ? Number(x.pl_order_print_version)
        : null,
      tasritVersion: Number.isFinite(Number(x.pl_tasrit_prn_version))
        ? Number(x.pl_tasrit_prn_version)
        : null,
    }));

  // הייעוד נלקח מהתכנית הספציפית ביותר ש**באמת** קובעת ייעוד.
  const concrete = attrs
    .slice()
    .sort((x, y) => (Number(x.shape_area) || Infinity) - (Number(y.shape_area) || Infinity))
    .find((x) => x.mavat_name && !isDeferral(x.mavat_name, x.mavat_code));

  const landUseDeferred = attrs.length > 0 && !concrete;
  const a = concrete ?? pickMostSpecific(landFeatures) ?? {};

  let overlays: string[] = [];
  try {
    const overlayFeatures = await queryLayer(3, itmX, itmY);
    overlays = Array.from(
      new Set(
        overlayFeatures
          .map((f) => f?.attributes?.mavat_name)
          .filter((n: any): n is string => typeof n === 'string' && n.trim().length > 0),
      ),
    );
  } catch {
    // שכבות-על אינן חוסמות — נשארות ריקות.
  }

  return {
    // ⚠️ כשכל התכניות מפנות לתכנית אחרת — אין ייעוד להציג. החזרת מחרוזת
    // ההפניה כאן הייתה מציגה ללקוח "יעוד עפ"י תכנית מאושרת אחרת" ככתוב.
    landUse: !landUseDeferred && a.mavat_name ? String(a.mavat_name) : undefined,
    appliedPlans,
    landUseDeferred,
    buildingRightsNote: appliedPlans.length
      ? 'זכויות בנייה כמותיות (אחוזי בנייה, קומות, יח"ד) אינן מתפרסמות בשירות המפות. הן מופיעות בהוראות התכנית ב"תכנון זמין" — הקישור לכל תכנית מופיע ברשימה.'
      : 'לא נמצאה תכנית החלה על הנקודה, ולכן אין ממה לגזור זכויות בנייה.',
    landUseCode: Number.isFinite(Number(a.mavat_code)) ? Number(a.mavat_code) : undefined,
    planNumber: a.pl_number ? String(a.pl_number) : undefined,
    planName: a.pl_name ? String(a.pl_name) : undefined,
    status: a.station_desc ? String(a.station_desc) : undefined,
    lastUpdated: Number.isFinite(Number(a.last_update_date))
      ? new Date(Number(a.last_update_date)).toISOString()
      : undefined,
    overlays,
    // ⚠️ זכויות בנייה כמותיות (אחוזי בנייה, מספר קומות, יח"ד) אינן קיימות
    // בשירות הזה כלל. הן מופיעות רק בהוראות התכנית ב-MAVAT, שאליהן ניתן
    // להגיע דרך pl_number/mp_id — אינטגרציה נפרדת. לכן: לעולם לא להציג
    // כאן ערך משוער, אלא "לא זמין".
    buildingRights: null,
    raw: a,
  };
}
