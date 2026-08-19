// ==== ישויות התכנית שחלות על החלקה עצמה ====
//
// שכבה 4 (יעודי קרקע) ושכבה 1 (קווים כחולים) עונות על "מה מותר כאן בגדול".
// שלוש השכבות הנוספות של אותו שירות — 0 (נקודתיות), 2 (קוויות) ו-3
// (פוליגונליות) — מחזיקות את מה שנדרש לשאלה "האם אפשר להוסיף כאן בנייה":
// **קווי בניין**, סימוני הריסה, עצים לשימור, אתרי עתיקות ומגבלות נוספות
// שמצוירות על התשריט עצמו.
//
// נבדק חי על "דורש טוב 17, ירושלים": שכבה 2 החזירה `קו בנין`,
// `קו בנין תחתי/ תת קרקעי`, `מידות - קו` ו-`להריסה`; שכבה 3 החזירה
// `אתר עתיקות/אתר הסטורי`; שכבה 0 החזירה `עץ/עצים לשימור` ו-`עצים לעקירה`.
// כל אלה משנים בפועל את מה שאפשר לבקש בהיתר.
//
// ⚠️ מה שאין כאן, ולא יהיה: **מספרים** של זכויות בנייה (אחוזי בנייה, מספר
// קומות, שטח עיקרי). נבדק בשדות של כל חמש השכבות — הם אינם מתפרסמים בשירות
// המפות כלל, אלא בהוראות התכנית בלבד. לכן המודול הזה לעולם אינו מחזיר מספר
// זכויות, ורק מדווח על מגבלות שמסומנות בפועל על התשריט.

import { fetchJson } from './http';

const XPLAN_BASE =
  process.env.XPLAN_BASE ??
  'https://ags.iplan.gov.il/arcgisiplan/rest/services/PlanningPublic/Xplan/MapServer';

export interface PlanEntity {
  /** שם הישות כלשונה במרשם: "קו בנין", "להריסה", "אתר עתיקות/אתר הסטורי". */
  name: string;
  /** התכנית שממנה היא מגיעה. */
  planNumber: string | null;
  /** סטטוס התכנית — "אישור" פירושו שהיא מחייבת היום. */
  status: string | null;
  /** נקודתי / קווי / פוליגונלי. */
  shape: 'point' | 'line' | 'polygon';
}

export interface ParcelConstraints {
  entities: PlanEntity[];
  /** קווי בניין שנמצאו על החלקה או בסמוך לה. */
  buildingLines: PlanEntity[];
  /** מגבלות שמשנות את מה שאפשר לבקש: הריסה, שימור, עתיקות, עצים. */
  restrictions: PlanEntity[];
  /** השירות לא ענה — שונה מ"אין מגבלות". */
  failed: boolean;
}

/** מה נחשב "קו בניין" ברשימת שמות המבא"ת. */
const BUILDING_LINE = /^קו\s*בנ[יי]?[ןן]/;

/** ישויות שמגבילות בנייה בפועל — לפי שם המבא"ת כלשונו. */
const RESTRICTION =
  /(להריסה|שימור|עתיקות|הסטורי|היסטורי|עקירה|נוף|תשתית|רצועת|מגבלות|בטיחות|קו מתח|ניקוז|נחל)/;

/** רעש תשריטי — מספרים ומידות שאינם מגבלה ואינם מעניינים את הלקוח. */
const NOISE = /^(מידות|בלוק מידות|בלוק טקסט|טקסט|חץ|צפון|קנה מידה)/;

async function queryLayer(layer: number, itmX: number, itmY: number, radiusM: number) {
  const url =
    `${XPLAN_BASE}/${layer}/query?geometry=${itmX.toFixed(2)},${itmY.toFixed(2)}` +
    `&geometryType=esriGeometryPoint&inSR=2039&spatialRel=esriSpatialRelIntersects` +
    `&outFields=mavat_name,pl_number,station_desc&returnGeometry=false&f=json` +
    (radiusM > 0 ? `&distance=${radiusM}&units=esriSRUnit_Meter` : '');
  const json = await fetchJson<any>(url, { timeoutMs: 45000, retries: 1 });
  if (json?.error) throw new Error(json.error?.message ?? 'XPLAN error');
  return (json?.features ?? []) as any[];
}

/**
 * המגבלות התכנוניות שמסומנות על החלקה.
 *
 * `radiusM` קטן במכוון (30 מ'): קו בניין הוא קו על גבול המגרש, ורדיוס גדול
 * היה שואב את קווי הבניין של השכנים ומציג אותם כמגבלה על הנכס הזה.
 */
export async function parcelConstraints(
  itmX: number,
  itmY: number,
  radiusM = 30,
): Promise<ParcelConstraints> {
  const shapes: [number, PlanEntity['shape']][] = [
    [0, 'point'],
    [2, 'line'],
    [3, 'polygon'],
  ];
  const results = await Promise.allSettled(
    shapes.map(([layer]) => queryLayer(layer, itmX, itmY, radiusM)),
  );

  const entities: PlanEntity[] = [];
  let failed = 0;
  results.forEach((r, i) => {
    if (r.status !== 'fulfilled') {
      failed++;
      return;
    }
    for (const f of r.value) {
      const a = f?.attributes ?? {};
      const name = typeof a.mavat_name === 'string' ? a.mavat_name.trim() : '';
      if (!name || NOISE.test(name)) continue;
      entities.push({
        name,
        planNumber: a.pl_number ? String(a.pl_number) : null,
        status: a.station_desc ? String(a.station_desc) : null,
        shape: shapes[i][1],
      });
    }
  });

  // ייחוד: אותה ישות מצוירת פעמים רבות על התשריט (כל קטע קו בנפרד).
  const seen = new Set<string>();
  const unique = entities.filter((e) => {
    const k = `${e.name}|${e.planNumber}|${e.status}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return {
    entities: unique,
    buildingLines: unique.filter((e) => BUILDING_LINE.test(e.name)),
    restrictions: unique.filter((e) => !BUILDING_LINE.test(e.name) && RESTRICTION.test(e.name)),
    failed: failed === shapes.length,
  };
}
