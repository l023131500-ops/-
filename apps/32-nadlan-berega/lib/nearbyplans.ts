// ==== §12 במפרט — "אתרי בנייה ותכנון באזור הנכס" (פרימיום/VIP) ====
//
// שכבת הנתונים בלבד: אילו תכניות (מרשם ה"קווים הכחולים", שכבה 1 של XPLAN)
// נמצאות ברדיוס סביב הנכס, וב**איפה בדיוק** — כדי שאפשר יהיה למקם אותן על
// המפה, לא רק לפרט אותן ברשימה. `queryPlansAtPoint`/`queryLandUseNear`
// שכבר קיימות ב-xplan.ts שואלות נקודה אחת ומחזירות `returnGeometry=false`
// (הן צריכות רק את התכנית שחלה על הנכס עצמו). כאן צריך גם את המיקום של כל
// תכנית שכנה, ולכן `returnGeometry=true` + חישוב מרכז-שטח מ-geometry.ts.
//
// ⚠️ עדיין לא מחובר ל-API route/UI/שער פרימיום — זה רק שכבת הנתונים, נבדקת
// בנפרד (ר' scripts/qa/nearby-plans-geometry.mjs). החיבור לדוח ולתצוגה על
// המפה הוא הצעד הבא.

import { fetchJson } from './http';
import { itmToWgs84 } from './itm';
import { polygonCentroid, planarDistanceM, type Point } from './geometry';

const XPLAN_BASE =
  process.env.XPLAN_BASE ??
  'https://ags.iplan.gov.il/arcgisiplan/rest/services/PlanningPublic/Xplan/MapServer';

export interface NearbyPlan {
  planNumber: string | null;
  planName: string | null;
  /** התחנה התכנונית כלשונה ("אישור", "בבדיקה תכנונית"...). */
  status: string | null;
  areaDunam: number | null;
  /** מרחק מהנכס במטרים, ITM (הטלה מטרית — אין צורך בהמרה ל-WGS84 לשם כך). */
  distanceM: number;
  lat: number;
  lng: number;
}

/**
 * תכניות ברדיוס שהשטח שלהן קטן מדי כדי להיות "תכנית עירונית כוללת" — כלומר
 * באמת רלוונטיות כ"מה נבנה כאן" ולא כרעש של תכנית מתאר שמכסה עיר שלמה.
 * אותו סף רעיוני כמו `pickMostSpecific` ב-xplan.ts, רק כסף מוחלט ולא יחסי,
 * כי כאן משווים תכניות שונות זו לזו ולא גרסאות של אותה נקודה.
 */
const MAX_LOCAL_AREA_DUNAM = 200;

async function queryLayer1WithGeometry(itmX: number, itmY: number, radiusM: number): Promise<any[]> {
  const url =
    `${XPLAN_BASE}/1/query?geometry=${itmX.toFixed(2)},${itmY.toFixed(2)}` +
    `&geometryType=esriGeometryPoint&inSR=2039&spatialRel=esriSpatialRelIntersects` +
    `&distance=${radiusM}&units=esriSRUnit_Meter` +
    `&outFields=pl_number,pl_name,station_desc,pl_area_dunam` +
    `&returnGeometry=true&outSR=2039&f=json`;
  const json = await fetchJson<any>(url, { timeoutMs: 45000, retries: 2 });
  if (json?.error) throw new Error(`XPLAN שכבה 1 (רדיוס): ${json.error?.message ?? 'שגיאה'}`);
  return json?.features ?? [];
}

/**
 * תכניות ברדיוס סביב הנכס, כל אחת עם מיקום ממוקם (מרכז השטח שלה) ומרחק.
 *
 * `radiusM` ברירת מחדל 400מ' — מספיק לראות "מה קורה ברחוב", לא רחוק מספיק
 * כדי לגרור תכניות שכונתיות שאין להן קשר ויזואלי לנכס.
 */
export async function nearbyConstructionPlans(
  itmX: number,
  itmY: number,
  radiusM = 400,
): Promise<NearbyPlan[]> {
  const features = await queryLayer1WithGeometry(itmX, itmY, radiusM);
  const origin: Point = { x: itmX, y: itmY };

  const byPlanNumber = new Map<string, NearbyPlan>();
  for (const f of features) {
    const a = f?.attributes ?? {};
    const areaDunam = Number.isFinite(Number(a.pl_area_dunam)) ? Number(a.pl_area_dunam) : null;
    if (areaDunam !== null && areaDunam > MAX_LOCAL_AREA_DUNAM) continue;

    const centroid = polygonCentroid(f?.geometry?.rings);
    if (!centroid) continue; // אין מיקום אמין → לא ממציאים אחד

    const planNumber = a.pl_number ? String(a.pl_number) : null;
    // אותה תכנית חוזרת פעמים רבות (multipart) — שומרים את המופע הקרוב ביותר.
    const distanceM = Math.round(planarDistanceM(origin, centroid));
    const key = planNumber ?? `${centroid.x.toFixed(1)},${centroid.y.toFixed(1)}`;
    const existing = byPlanNumber.get(key);
    if (existing && existing.distanceM <= distanceM) continue;

    const { lat, lng } = itmToWgs84(centroid.x, centroid.y);
    byPlanNumber.set(key, {
      planNumber,
      planName: a.pl_name ? String(a.pl_name) : null,
      status: a.station_desc ? String(a.station_desc) : null,
      areaDunam,
      distanceM,
      lat,
      lng,
    });
  }

  return Array.from(byPlanNumber.values()).sort((x, y) => x.distanceM - y.distanceM);
}
