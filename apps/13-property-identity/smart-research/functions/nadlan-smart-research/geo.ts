// ============================================================================
// geo.ts — מפתח מרחבי: כתובת -> קואורדינטות -> מזהי אזור (שכונה/יישוב)
// כל המקורות חינמיים: govmap autocomplete + nadlan deal-info
// ============================================================================

export interface GeoResult {
  addressId: string;
  matchedText: string;
  lat: number;
  lon: number;
  streetName?: string; // שם הרחוב שזוהה (מתוך מזהה govmap)
  cityName?: string;   // שם היישוב שזוהה (מתוך מזהה govmap)
  itmX?: number; // רשת ישראל (לחישובי מרחק מטריים מדויקים)
  itmY?: number;
}

export interface AreaResolution {
  neighborhoodId?: string;
  neighborhoodName?: string;
  settlementId?: string; // = locality_code (סמל יישוב)
  settlementName?: string;
  statArea?: string;
}

// המרת Web Mercator (EPSG:3857) ל-WGS84 (lat/lon)
export function webMercatorToWgs84(x: number, y: number): { lat: number; lon: number } {
  const lon = (x / 20037508.34) * 180;
  let lat = (y / 20037508.34) * 180;
  lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2);
  return { lat, lon };
}

// נרמול טקסט עברי להשוואה (הסרת מקפים/רווחים כפולים/גרשיים)
function normHe(s: string): string {
  return String(s || "")
    .replace(/[\u2013\u2014\-]/g, " ") // מקפים -> רווח
    .replace(/['\"׳״]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// חילוץ טוקן הרחוב מתוך טקסט חיפוש (המילה/ים הראשונות עד למספר)
function extractStreetToken(searchText: string): string {
  const t = normHe(searchText);
  // הסר טיפוסי רחוב נפוצים בתחילת המחרוזת כדי להשוות לשם הליבה
  const cleaned = t.replace(/^(שדרות|שד|רחוב|רח|דרך|סמטת|שכונת|כיכר)\s+/i, "");
  const beforeNum = cleaned.split(/\s+\d/)[0];
  return beforeNum.split(" ")[0]; // מילת הרחוב הראשית
}

function parseGovmapResult(r: any): GeoResult | null {
  if (!r) return null;
  // id: address|ADDR|<addressId>|street|num|city
  const parts = String(r.id).split("|");
  const addressId = parts[2] ?? "";
  const streetName = parts[3] ?? undefined;
  const cityName = parts[5] ?? undefined;
  let lat = 0, lon = 0;
  const m = /POINT\(([-\d.]+)\s+([-\d.]+)\)/.exec(r.shape ?? "");
  if (m) {
    const wgs = webMercatorToWgs84(parseFloat(m[1]), parseFloat(m[2]));
    lat = wgs.lat;
    lon = wgs.lon;
  }
  return { addressId, matchedText: r.text ?? "", lat, lon, streetName, cityName };
}

async function govmapAutocomplete(searchText: string): Promise<any[]> {
  const resp = await fetch("https://www.govmap.gov.il/api/search-service/autocomplete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ searchText, language: "he", isAccurate: false, maxResults: 10 }),
  });
  if (!resp.ok) return [];
  const data = await resp.json();
  return (data?.results ?? []).filter((r: any) => r.type === "address");
}

// חיפוש כתובת דרך govmap autocomplete (חינמי, ללא מפתח)
// עמיד: מנסה גם וריאציות עם תחיליות טיפוס-רחוב, ומעדיף התאמת שם רחוב מדויקת
export async function geocodeAddress(searchText: string): Promise<GeoResult | null> {
  const wantStreet = normHe(extractStreetToken(searchText));

  // וריאציות שאילתה: המקורית + עם "שדרות"/"רחוב"/"דרך" (מתקן התאמות מטושטשות שגויות)
  const queries = [
    searchText,
    `שדרות ${searchText}`,
    `רחוב ${searchText}`,
    `דרך ${searchText}`,
  ];

  const seen = new Set<string>();
  const all: any[] = [];
  for (const q of queries) {
    const res = await govmapAutocomplete(q);
    for (const r of res) {
      const id = String(r.id);
      if (!seen.has(id)) {
        seen.add(id);
        all.push(r);
      }
    }
    // אם כבר יש התאמת רחוב מדויקת — אין צורך להמשיך לוריאציות נוספות
    const exact = all.find((r) => normHe(String(r.id).split("|")[3] ?? "") === wantStreet);
    if (exact) break;
  }
  if (all.length === 0) return null;

  // בחירת מועמד: 1) שם רחוב זהה בדיוק  2) שם רחוב שמכיל את הטוקן  3) ראשון
  const exact = all.find((r) => normHe(String(r.id).split("|")[3] ?? "") === wantStreet);
  const contains = all.find((r) => normHe(String(r.id).split("|")[3] ?? "").includes(wantStreet));
  const chosen = exact ?? contains ?? all[0];
  return parseGovmapResult(chosen);
}

// המרת מזהה כתובת למזהי שכונה/יישוב דרך nadlan deal-info (חינמי, JSON רגיל, ללא טוקן)
export async function resolveArea(addressId: string): Promise<AreaResolution | null> {
  const resp = await fetch("https://api.nadlan.gov.il/deal-info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base_name: "addr_id", base_id: addressId }),
  });
  if (!resp.ok) return null;
  const d = await resp.json();
  return {
    neighborhoodId: d?.neigh_id != null ? String(d.neigh_id) : undefined,
    neighborhoodName: d?.neigh_name ?? undefined,
    settlementId: d?.setl_id != null ? String(d.setl_id) : undefined,
    settlementName: d?.setl_name ?? undefined,
    statArea: d?.stat_area != null ? String(d.stat_area) : undefined,
  };
}

// מיפוי שם יישוב -> סמל ישוב (locality_code) דרך רשימת היישובים הרשמית של הלמ"ס
// משמש כ-fallback כש-deal-info מחזיר "not found" (ערים רבות ללא רשומת שכונה בנדל"ן)
const LOCALITIES_RES = "b7cf8f14-64a2-4b33-8d4b-edb286fdbd37";

export async function resolveLocalityByName(
  cityName: string,
): Promise<{ localityCode: string; localityName: string } | null> {
  const want = normHe(cityName);
  if (!want) return null;
  const url =
    `https://data.gov.il/api/3/action/datastore_search?resource_id=${LOCALITIES_RES}` +
    `&limit=100&q=${encodeURIComponent(cityName)}`;
  const resp = await fetch(url);
  if (!resp.ok) return null;
  const data = await resp.json();
  const records: any[] = data?.result?.records ?? [];
  // התאמה מדויקת על שם מנורמל (השדה מכיל רווחים מובנים)
  let best: any = null;
  for (const r of records) {
    const nm = normHe(r["שם_ישוב"] ?? "");
    if (nm === want) {
      best = r;
      break;
    }
  }
  // אם אין התאמה מדויקת, נסה התאמה לפי תחילית/הכלה (למשל "תל אביב" ↔ "תל אביב יפו")
  if (!best) {
    for (const r of records) {
      const nm = normHe(r["שם_ישוב"] ?? "");
      if (nm && (nm.startsWith(want) || want.startsWith(nm))) {
        best = r;
        break;
      }
    }
  }
  if (!best) return null;
  return {
    localityCode: String(best["סמל_ישוב"]),
    localityName: String(best["שם_ישוב"]).trim(),
  };
}

// מרחק הברסיין במטרים בין שתי נקודות lat/lon
export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// המרת רשת ישראל ITM (EPSG:2039) ל-WGS84 — קירוב מספיק לחישובי קרבה
// (משמש לקואורדינטות מוסדות חינוך שמגיעות ב-ITM_X/ITM_Y)
export function itmToWgs84(x: number, y: number): { lat: number; lon: number } {
  // פרמטרים של רשת ישראל החדשה (ITM)
  const a = 6378137.0;
  const e2 = 0.00669438002290;
  const lat0 = (31.7343936111 * Math.PI) / 180;
  const lon0 = (35.2045169444 * Math.PI) / 180;
  const k0 = 1.0000067;
  const falseE = 219529.584;
  const falseN = 626907.39;

  const M0 = meridianArc(lat0, a, e2);
  const M = M0 + (y - falseN) / k0;
  const mu = M / (a * (1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 ** 3) / 256));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 * e1) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu);
  const ep2 = e2 / (1 - e2);
  const C1 = ep2 * Math.cos(phi1) ** 2;
  const T1 = Math.tan(phi1) ** 2;
  const N1 = a / Math.sqrt(1 - e2 * Math.sin(phi1) ** 2);
  const R1 = (a * (1 - e2)) / Math.pow(1 - e2 * Math.sin(phi1) ** 2, 1.5);
  const D = (x - falseE) / (N1 * k0);
  const lat =
    phi1 -
    ((N1 * Math.tan(phi1)) / R1) *
      ((D * D) / 2 -
        ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D ** 4) / 24 +
        ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * D ** 6) / 720);
  const lon =
    lon0 +
    (D -
      ((1 + 2 * T1 + C1) * D ** 3) / 6 +
      ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * D ** 5) / 120) /
      Math.cos(phi1);
  return { lat: (lat * 180) / Math.PI, lon: (lon * 180) / Math.PI };
}

function meridianArc(phi: number, a: number, e2: number): number {
  return (
    a *
    ((1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 ** 3) / 256) * phi -
      ((3 * e2) / 8 + (3 * e2 * e2) / 32 + (45 * e2 ** 3) / 1024) * Math.sin(2 * phi) +
      ((15 * e2 * e2) / 256 + (45 * e2 ** 3) / 1024) * Math.sin(4 * phi) -
      ((35 * e2 ** 3) / 3072) * Math.sin(6 * phi))
  );
}
