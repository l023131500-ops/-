// ==== הרשות הממשלתית להתחדשות עירונית — פינוי-בינוי ====
// מודול הבידול של המערכת: שיוך נכס למתחם פינוי-בינוי מוכרז.
//
// מקור (נבדק חי 2026-07-20): ה-FeatureServer הרשמי של משרד הבינוי,
//   services6.arcgis.com/.../GIS_UrbanRenewal/FeatureServer/1
// שכבה 1 = "מתחמי פינוי בינוי מוכרזים" (954 מתחמים). מוגש מתשתית Esri
// (לא gov.il), ולכן נגיש גם משרתים מחוץ לישראל — ללא token.
//
// השאילתה היא point-in-polygon: נקודת ITM (EPSG:2039) של הנכס מול פוליגוני
// המתחמים. השירות מקבל inSR=2039 באופן טבעי.
//
// ⚠️ שיוך נעשה לפי נקודה, לא לפי גוש/חלקה — אף אחד ממקורות ההתחדשות אינו
// ממופתח בגוש/חלקה. נכס שאינו במתחם מוכרז מחזיר 0 תוצאות — וזה נתון אמת
// (״לא נמצא שיוך״), לא כשל.

import { fetchJson } from './http';
import { isPlausibleItm } from './itm';

const RENEWAL_LAYER =
  'https://services6.arcgis.com/I08Ekaykft5ELucH/arcgis/rest/services/GIS_UrbanRenewal/FeatureServer/1/query';

// מיפוי codeStatusHarashut (codeStatusTichnun חסר תוויות שימושיות במקור).
const STATUS_LABELS: Record<number, string> = {
  1: 'תכנון ראשוני',
  2: 'תכנון סטטוטורי',
  3: 'תכנית מאושרת לפני מימוש',
  4: 'תכנית מאושרת במימוש',
};

export interface RenewalResult {
  inCompound: boolean;
  compoundName?: string;
  track?: string; // מסלול (פינוי בינוי / עיבוי וכד')
  status?: string; // סטטוס הרשות (טקסטואלי)
  units?: number | null; // מכסת יח"ד (סה"כ מוצע)
  planNumber?: string;
  declaredYear?: number | null;
  matched: boolean; // האם בוצעה בדיקה מול מקור אמיתי
  note?: string;
}

export async function checkRenewal(itmX?: number, itmY?: number): Promise<RenewalResult> {
  if (itmX == null || itmY == null || !isPlausibleItm(itmX, itmY)) {
    return { inCompound: false, matched: false, note: 'אין נקודת ITM לזיהוי מתחם.' };
  }

  const url =
    `${RENEWAL_LAYER}?geometry=${itmX.toFixed(2)},${itmY.toFixed(2)}` +
    `&geometryType=esriGeometryPoint&inSR=2039&spatialRel=esriSpatialRelIntersects` +
    `&outFields=ShemMitcham,Yeshuv,TeurMaslul,codeStatusHarashut,taarichTokef,yachadMutzaRashut,YachadTosafti,plan_name` +
    `&returnGeometry=false&f=json`;

  const json = await fetchJson<any>(url, { timeoutMs: 20000, retries: 2 });
  if (json?.error) throw new Error(`ArcGIS: ${json.error?.message ?? 'שגיאה'}`);

  const a = json?.features?.[0]?.attributes;
  if (!a) {
    return { inCompound: false, matched: true, note: 'הנכס אינו במתחם פינוי-בינוי מוכרז.' };
  }

  const statusCode = Number(a.codeStatusHarashut);
  const units = Number(a.YachadTosafti ?? a.yachadMutzaRashut);
  const yearMs = Number(a.taarichTokef);
  // taarichTokef=0/null ממופה ל-1970 — שנה לא-אמיתית (התחדשות עירונית מאוחרת בהרבה).
  const declaredYear = Number.isFinite(yearMs) ? new Date(yearMs).getUTCFullYear() : NaN;
  const validYear = declaredYear >= 2000 && declaredYear <= new Date().getUTCFullYear() + 1;

  return {
    inCompound: true,
    matched: true,
    compoundName: a.ShemMitcham ? String(a.ShemMitcham) : undefined,
    track: a.TeurMaslul ? String(a.TeurMaslul) : undefined,
    status: Number.isFinite(statusCode) ? STATUS_LABELS[statusCode] : undefined,
    units: Number.isFinite(units) && units > 0 ? units : null,
    planNumber: a.plan_name ? String(a.plan_name).trim() : undefined,
    declaredYear: validYear ? declaredYear : null,
  };
}
