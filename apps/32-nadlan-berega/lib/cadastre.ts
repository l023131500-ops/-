// ==== קדסטר — גוש/חלקה, בשני הכיוונים, מול המקורות החיים ====
//
// 🔴 מה שנשבר, ולמה זה החזיר גוש/חלקה שגויים בשקט:
//   הקובץ הזה נשען על `open.govmap.gov.il/geoserver` (WFS). **השרת הזה הוסר.**
//   הוא עדיין נפתר ב-DNS (147.237.2.142) ומחזיר **HTTP 200** — אבל את דף
//   השגיאה הכללי של אתרי הממשלה ("האתר המבוקש אינו נמצא") ולא XML/JSON.
//   כלומר: לא 404, לא DNS error, לא timeout. `fetchJson` זרק "תשובה אינה JSON",
//   הקורא תפס את החריגה, ו-`gush/helka` פשוט נשארו ריקים — ואז הדוח לקח את
//   הגוש/חלקה מ**עסקאות שכנות**. כך "דיזנגוף 100 תל אביב" קיבל גוש 7091 חלקה
//   203, שהיא החלקה של **דיזנגוף 102**. הקדסטר האמיתי: גוש 7091 **חלקה 7**
//   (מאומת מול nadlan.gov.il לאותה כתובת בדיוק).
//
// המקורות החיים שהוחלפו אליהם (כולם נבדקו בפועל מול השרת):
//   1) נקודה → חלקה:  POST www.govmap.gov.il/api/spatial-analysis/layer-features-by-location
//      שכבת `parcel_all`, שדות gush_num/parcel/objectid/legal_area/status_text/gush_suffix.
//      ⚠️ הנקודה היא **ITM (EPSG:2039)**, ו-`fields` חייב להיות רשימה מפורשת —
//      `[]` מחזיר `No fields specified` ו-`["*"]` מחזיר attributes ריק.
//      הנתיב מאמת `apiToken` **מול ה-Origin**: הטוקן הציבורי שמפורסם ב-
//      `nadlan.gov.il/config.json` עובד עם Origin של nadlan.gov.il (זהו הטוקן
//      שאתר הנדל"ן הממשלתי עצמו שולח מהדפדפן). הטוקן נמשך משם בזמן ריצה ולא
//      מקובע בקוד, כדי שסבב מפתחות באתר הממשלתי לא ישבור אותנו.
//   2) גוש/חלקה → נקודה:  POST www.govmap.gov.il/api/search-service/autocomplete
//      עם "גוש X חלקה Y" — מחזיר `parcel|LAYER_PARCEL_ALL|{objectid}` ו-`shape`
//      ב-Web Mercator. פתוח לחלוטין (בלי טוקן).
//   3) אימות עצמאי מול nadlan.gov.il:  POST api.nadlan.gov.il/parcel-valid
//      `{ids:["7091-7"]}` → קיום החלקה, מספר תתי-החלקות, וחלקה "מובילה"
//      (Block_lead/Plot_lead) כשהייתה חלוקה מחדש. פתוח, בלי reCAPTCHA.

import { fetchJson } from './http';
import { isPlausibleItm, mercatorToItm, parseWktPoint } from './itm';

const GOVMAP = 'https://www.govmap.gov.il/api';
const NADLAN_CONFIG = 'https://www.nadlan.gov.il/config.json';
const NADLAN_ORIGIN = 'https://www.nadlan.gov.il';

// --- המקור הישן. מת נכון ל-30/07/2026, נשמר כגיבוי אם יחזור. ---
const OWS = 'https://open.govmap.gov.il/geoserver/opendata/ows';
const PARCEL_LAYER = 'opendata:Parcels_ITM';

export interface Parcel {
  gush: string;
  helka: string;
  gushSuffix?: string;
  /** שטח רשום במ"ר. אינו אסמכתה חוקית — כך מנוסח גם ב-NOTE של המקור. */
  legalAreaSqm: number | null;
  /** מצב הסדר, למשל "מוסדר". */
  status: string | null;
  localityName: string | null;
  localityId: number | null;
  countyName: string | null;
  /** מזהה מקור בפורמט "גוש--חלקה". */
  sourceId: string | null;
  parcelId: number | null;
  /** איזה מקור החזיר את החלקה בפועל — לשקיפות מלאה ולאבחון. */
  source?: 'govmap-spatial' | 'govmap-search' | 'geoserver-wfs';
}

/** תשובת האימות של nadlan.gov.il לחלקה. */
export interface ParcelValidity {
  exists: boolean;
  /** מספר תתי-החלקות הרשומות (בבית משותף — מספר היחידות). */
  subParcelCount: number | null;
  /** "1" = חלקה רגילה · "2,3" = בית משותף. כפי שהמקור מחזיר. */
  assetType: string | null;
  /** חלקה "מובילה" — קיימת כשהחלקה אוחדה/חולקה מחדש והרישום עבר לאחרת. */
  leadGush: string | null;
  leadHelka: string | null;
}

// ---------- הטוקן הציבורי של אתר הנדל"ן הממשלתי ----------

let tokenCache: { value: string; at: number } | null = null;
const TOKEN_TTL_MS = 6 * 3600 * 1000;

async function govmapToken(): Promise<string> {
  if (tokenCache && Date.now() - tokenCache.at < TOKEN_TTL_MS) return tokenCache.value;
  const cfg = await fetchJson<any>(NADLAN_CONFIG, { timeoutMs: 12000 });
  const value = String(cfg?.map_token_prod || cfg?.map_token || '').trim();
  if (!value) throw new Error('לא נמצא טוקן מפה בקונפיגורציה של אתר הנדל"ן הממשלתי');
  tokenCache = { value, at: Date.now() };
  return value;
}

// ---------- נקודה -> חלקה ----------

/**
 * נקודת ITM -> החלקה שמכילה אותה. מחזיר null אם אין כיסוי קדסטרלי.
 *
 * ⚠️ הרדיוס הוא 0.3 מ' בכוונה — בדיוק מה שאתר הנדל"ן הממשלתי שולח. רדיוס גדול
 * יותר מחזיר גם חלקות שכנות, ואז "החלקה של הכתובת" הופכת להגרלה בין שתיים.
 */
export async function parcelAtPoint(itmX: number, itmY: number): Promise<Parcel | null> {
  if (!isPlausibleItm(itmX, itmY)) {
    throw new Error(`נקודת ITM מחוץ לתחום רשת ישראל: ${itmX}, ${itmY}`);
  }

  try {
    const apiToken = await govmapToken();
    const json = await fetchJson<any>(`${GOVMAP}/spatial-analysis/layer-features-by-location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: NADLAN_ORIGIN,
        Referer: `${NADLAN_ORIGIN}/`,
      },
      body: JSON.stringify({
        data: {
          geometry: `POINT(${itmX.toFixed(2)} ${itmY.toFixed(2)})`,
          radius: 0.3,
          layers: [
            {
              name: 'parcel_all',
              // רשימה מפורשת — ראה ההערה בראש הקובץ.
              fields: ['gush_num', 'parcel', 'objectid', 'legal_area', 'status_text', 'gush_suffix'],
            },
          ],
        },
        apiToken,
      }),
      timeoutMs: 20000,
    });

    const feature = json?.layers?.parcel_all?.[0];
    const a = feature?.attributes;
    if (a?.gush_num != null && a?.parcel != null) {
      const area = Number(a.legal_area);
      return {
        gush: String(a.gush_num),
        helka: String(a.parcel),
        gushSuffix: a.gush_suffix != null && Number(a.gush_suffix) ? String(a.gush_suffix) : undefined,
        legalAreaSqm: Number.isFinite(area) && area > 0 ? area : null,
        status: a.status_text || null,
        localityName: null, // השכבה אינה מחזירה יישוב — הוא מגיע מהאיתור ומהעסקאות
        localityId: null,
        countyName: null,
        sourceId: `${a.gush_num}--${a.parcel}`,
        parcelId: Number.isFinite(Number(a.objectid)) ? Number(a.objectid) : null,
        source: 'govmap-spatial',
      };
    }
  } catch {
    /* נופלים ל-WFS הישן */
  }

  return parcelAtPointWfs(itmX, itmY);
}

// ---------- גוש/חלקה -> נקודה ----------

/**
 * חיפוש הפוך: גוש/חלקה -> החלקה + מרכזה.
 *
 * המסלול החי הוא ה-autocomplete הפתוח של GovMap. ⚠️ ההתאמה חייבת להיות
 * **מדויקת**: החיפוש "גוש 7091 חלקה 7" מחזיר גם "גוש 7091 חלקה 70" ו-"…71",
 * והתוצאה הראשונה אינה בהכרח המבוקשת. לכן משווים את הטקסט המוחזר מספר-מול-מספר.
 */
export async function parcelByGushHelka(gush: string, helka: string): Promise<
  (Parcel & {
    centroidItm: { x: number; y: number } | null;
    /**
     * האם הנקודה שהתקבלה מה-autocomplete אומתה עצמאית (parcelAtPoint על אותה
     * נקודה חוזר לאותו גוש/חלקה בדיוק). autocomplete הוא fuzzy במקורו
     * (`isAccurate: false`) — הטקסט מסונן להתאמה מדויקת, אבל הגאומטריה
     * המוחזרת יכולה בכל זאת להיות שגויה/מיושנת בלי שהטקסט יסגיר זאת. כשלא
     * מאומת, אין לסמוך על הנקודה לצילום Street View/מיילי התראה בלי אזהרה.
     * מסלול ה-WFS (fallback) הוא true תמיד — הוא שולף את הגאומטריה מתוך
     * אותה שורה שהותאמה במדויק ב-CQL, אין בו שלב fuzzy כלל.
     */
    centroidVerified: boolean;
  }) | null
> {
  const g = String(Number(gush));
  const h = String(Number(helka));

  try {
    const json = await fetchJson<any>(`${GOVMAP}/search-service/autocomplete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ searchText: `גוש ${g} חלקה ${h}`, language: 'he', isAccurate: false, maxResults: 10 }),
      timeoutMs: 20000,
    });

    for (const r of json?.results ?? []) {
      if (String(r?.type) !== 'parcel') continue;
      const m = /גוש\s*(\d+)\s*חלקה\s*(\d+)/.exec(String(r?.text ?? ''));
      if (!m || m[1] !== g || m[2] !== h) continue; // התאמה מדויקת בלבד
      const pt = parseWktPoint(String(r?.shape ?? ''));
      if (!pt) continue;
      const itm = mercatorToItm(pt.x, pt.y);
      if (!isPlausibleItm(itm.x, itm.y)) continue;

      const objectId = Number(String(r?.id ?? '').split('|').pop());
      // השטח הרשום ומצב ההסדר מגיעים משאילתת הנקודה על אותה חלקה.
      const atPoint = await parcelAtPoint(itm.x, itm.y).catch(() => null);
      const same = atPoint && atPoint.gush === g && atPoint.helka === h ? atPoint : null;

      return {
        gush: g,
        helka: h,
        gushSuffix: same?.gushSuffix,
        legalAreaSqm: same?.legalAreaSqm ?? null,
        status: same?.status ?? null,
        localityName: null,
        localityId: null,
        countyName: null,
        sourceId: `${g}--${h}`,
        parcelId: Number.isFinite(objectId) ? objectId : (same?.parcelId ?? null),
        source: 'govmap-search',
        centroidItm: { x: itm.x, y: itm.y },
        centroidVerified: same !== null,
      };
    }
  } catch {
    /* נופלים ל-WFS הישן */
  }

  return parcelByGushHelkaWfs(gush, helka);
}

// ---------- אימות מול nadlan.gov.il ----------

/**
 * אימות החלקה מול אתר הנדל"ן הממשלתי עצמו.
 *
 * זהו אימות **בלתי תלוי** בגוש/חלקה שהקדסטר החזיר: מקור אחר, שרת אחר, ומאגר
 * אחר (מרשם המקרקעין ולא שכבת החלקות). כשהוא אומר שהחלקה אינה קיימת — אין
 * להציג אותה כעובדה. `Block_lead/Plot_lead` הוא החלקה שאליה עבר הרישום אחרי
 * חלוקה/איחוד, וזו בדיוק התקלה שגרמה בעבר ל"לא נרשמה עסקה בבניין".
 */
export async function parcelValidity(gush: string, helka: string): Promise<ParcelValidity | null> {
  const id = `${Number(gush)}-${Number(helka)}`;
  try {
    const json = await fetchJson<any[]>('https://api.nadlan.gov.il/parcel-valid', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: NADLAN_ORIGIN,
        Referer: `${NADLAN_ORIGIN}/`,
      },
      body: JSON.stringify({ ids: [id] }),
      timeoutMs: 15000,
    });
    const row = Array.isArray(json) ? json[0] : null;
    if (!row) return null;
    const count = Number(row.count);
    // המקור מסמן "לא קיימת" בשילוב AssetType ריק וספירה 0/חסרה.
    const exists = !(row.AssetType == null && (!Number.isFinite(count) || count === 0));
    return {
      exists,
      subParcelCount: Number.isFinite(count) ? count : null,
      assetType: row.AssetType ?? null,
      leadGush: row.Block_lead != null ? String(row.Block_lead) : null,
      leadHelka: row.Plot_lead != null ? String(row.Plot_lead) : null,
    };
  } catch {
    return null; // אימות שלא זמין אינו הופך נתון לשגוי — הוא רק לא מאושש
  }
}

// ---------- המקור הישן (WFS) — גיבוי בלבד ----------

function wfsUrl(params: Record<string, string>): string {
  return `${OWS}?${new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    outputFormat: 'application/json',
    ...params,
  })}`;
}

function toParcel(props: any): Parcel | null {
  const gush = props?.GUSH_NUM;
  const helka = props?.PARCEL;
  if (gush == null || helka == null) return null;
  const area = Number(props.LEGAL_AREA);
  return {
    gush: String(gush),
    helka: String(helka),
    gushSuffix: props.GUSH_SUFFI ? String(props.GUSH_SUFFI) : undefined,
    legalAreaSqm: Number.isFinite(area) && area > 0 ? area : null,
    status: props.STATUS_TEX || null,
    localityName: props.LOCALITY_N || null,
    localityId: Number.isFinite(Number(props.LOCALITY_I)) ? Number(props.LOCALITY_I) : null,
    countyName: props.COUNTY_NAM || null,
    sourceId: props.ID || null,
    parcelId: Number.isFinite(Number(props.PARCEL_ID)) ? Number(props.PARCEL_ID) : null,
    source: 'geoserver-wfs',
  };
}

async function parcelAtPointWfs(itmX: number, itmY: number): Promise<Parcel | null> {
  const json = await fetchJson(
    wfsUrl({
      typeName: PARCEL_LAYER,
      count: '1',
      cql_filter: `INTERSECTS(the_geom,POINT(${itmX.toFixed(2)} ${itmY.toFixed(2)}))`,
    }),
  );
  const props = json?.features?.[0]?.properties;
  return props ? toParcel(props) : null;
}

async function parcelByGushHelkaWfs(gush: string, helka: string): Promise<
  (Parcel & { centroidItm: { x: number; y: number } | null; centroidVerified: boolean }) | null
> {
  const json = await fetchJson(
    wfsUrl({
      typeName: PARCEL_LAYER,
      count: '1',
      cql_filter: `GUSH_NUM=${Number(gush)} AND PARCEL=${Number(helka)}`,
    }),
  );
  const feature = json?.features?.[0];
  const parcel = feature?.properties ? toParcel(feature.properties) : null;
  if (!parcel) return null;
  // ⚠️ בניגוד למסלול ה-autocomplete: כאן הגאומטריה מגיעה מאותה שורה שהותאמה
  // במדויק ב-CQL (GUSH_NUM=X AND PARCEL=Y) — אין שלב fuzzy, ולכן תמיד מאומת.
  return { ...parcel, centroidItm: centroidOf(feature.geometry), centroidVerified: true };
}

/** מרכז גאומטרי מקורב של פוליגון החלקה (ממוצע קודקודי הטבעת החיצונית). */
function centroidOf(geometry: any): { x: number; y: number } | null {
  const ring =
    geometry?.type === 'MultiPolygon'
      ? geometry.coordinates?.[0]?.[0]
      : geometry?.type === 'Polygon'
        ? geometry.coordinates?.[0]
        : null;
  if (!Array.isArray(ring) || !ring.length) return null;
  let sx = 0, sy = 0;
  for (const [x, y] of ring) { sx += x; sy += y; }
  return { x: sx / ring.length, y: sy / ring.length };
}
