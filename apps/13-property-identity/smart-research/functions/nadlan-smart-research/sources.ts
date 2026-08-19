// ============================================================================
// sources.ts — מחברים למקורות ממשלתיים חינמיים (data.gov.il CKAN)
// כל המקורות ללא מפתח/רישום. datastore_search מחזיר JSON.
// ============================================================================

import { itmToWgs84 } from "./geo.ts";

const CKAN = "https://data.gov.il/api/3/action/datastore_search";

// resource IDs (נבדקו בפועל)
export const RES = {
  socioeconomic: "7c860e04-9f8d-41c2-9f24-6249958d2081", // אשכול חברתי-כלכלי לפי יישוב
  census2022: "9a9e085f-3bc8-41df-b15f-be0daaf99e30",    // מפקד 2022 לפי אזור סטטיסטי
  crime2024: "5fc13c50-b6f3-4712-b831-a75e0f91a17e",     // פשיעה 2024 לפי אזור סטטיסטי
  transitStops: "e873e6a2-66c1-494f-a677-f5e77348edb0",  // תחנות תח"צ (Lat/Long)
  schoolCoords: "5c5d6bb0-755d-470d-84b6-d7dd3135ba9c",  // קואורדינטות מוסדות חינוך (ITM)
  election25: "cc223336-07bc-485d-b160-62df92967c0a",    // בחירות כנסת 25 לפי קלפי
};

async function ckan(resourceId: string, opts: {
  limit?: number; offset?: number; q?: string; filters?: Record<string, unknown>;
} = {}): Promise<any[]> {
  const params = new URLSearchParams();
  params.set("resource_id", resourceId);
  params.set("limit", String(opts.limit ?? 100));
  if (opts.offset) params.set("offset", String(opts.offset));
  if (opts.q) params.set("q", opts.q);
  if (opts.filters) params.set("filters", JSON.stringify(opts.filters));
  const resp = await fetch(`${CKAN}?${params.toString()}`);
  if (!resp.ok) return [];
  const data = await resp.json();
  return data?.result?.records ?? [];
}

// ----- מדד חברתי-כלכלי לפי סמל יישוב -----
// הערה: קובץ זה (995 שורות) מכסה בעיקר יישובים קטנים ומועצות; הערים הגדולות
// אינן כלולות. לכן הוא מקור משלים בלבד — הפרוקסי החברתי-כלכלי העיקרי מגיע
// מהמפקד (שכר חציוני, % אקדמאים, מידת דתיות) ברזולוציית אזור סטטיסטי.
export interface SocioEconomic { cluster: number | null; name: string | null; }
export async function fetchSocioEconomic(localityCode: number): Promise<SocioEconomic | null> {
  const recs = await ckan(RES.socioeconomic, { filters: { "LOCALITY SYMBOL": localityCode }, limit: 1 });
  if (!recs.length) return null;
  const r = recs[0];
  const c = r["ESHKOL 2019"];
  return { cluster: c != null && c !== "" ? Number(c) : null, name: r["HEBREW NAME OF LOCALITY"] ?? null };
}

// ----- דמוגרפיה לפי אזור סטטיסטי (מפקד 2022) -----
// אם statArea ידוע -> אזור מדויק; אחרת ממוצע/ראשון של היישוב
export interface Demographics {
  statArea?: string;
  popApprox?: number;
  popDensity?: number;
  religionHe?: string;
  ageMedian?: number;
  age0_19?: number;
  age65?: number;
  dependencyRatio?: number;
  religiosity?: string;
  medWage?: number;
  acadmCertPcnt?: number;
  ownPcnt?: number;
  rentPcnt?: number;
  raw?: Record<string, unknown>;
}
export async function fetchDemographics(localityCode: number, statArea?: string): Promise<Demographics | null> {
  // LocalityCode ו-StatArea הם שדות text ב-CKAN — חובה לסנן כמחרוזות
  const lc = String(localityCode);
  const filters: Record<string, unknown> = { LocalityCode: lc };
  if (statArea) filters.StatArea = String(statArea);
  let recs = await ckan(RES.census2022, { filters, limit: 5 });
  if (!recs.length && statArea) {
    // נפילה חזרה לרמת יישוב (השורה עם StatArea ריק = סיכום יישובי)
    recs = await ckan(RES.census2022, { filters: { LocalityCode: lc }, limit: 5 });
  }
  if (!recs.length) return null;
  // עדיפות לשורה עם אזור סטטיסטי תואם; אחרת הראשונה
  const r = (statArea && recs.find((x) => String(x.StatArea) === String(statArea))) || recs[0];
  const num = (v: unknown) => (v != null && v !== "" && !isNaN(Number(v)) ? Number(v) : undefined);
  return {
    statArea: r.StatArea != null ? String(r.StatArea) : undefined,
    popApprox: num(r.pop_approx),
    popDensity: num(r.pop_density),
    religionHe: r.ReligionHeb ?? undefined,
    ageMedian: num(r.age_median),
    age0_19: num(r.age0_19_pcnt),
    age65: num(r.age65_pcnt),
    dependencyRatio: num(r.DependencyRatio),
    // הערה: במקור השדות הפוכים — hh_MidatDatiyut מכיל את הטקסט ("חילוני")
    religiosity: r.hh_MidatDatiyut ?? undefined,
    medWage: num(r.employeesAnnual_medWage),
    acadmCertPcnt: num(r.AcadmCert_pcnt),
    ownPcnt: num(r.own_pcnt),
    rentPcnt: num(r.rent_pcnt),
    raw: r,
  };
}

// ----- פשיעה לפי אזור/יישוב (ספירת רשומות) -----
export interface CrimeStats { totalRecords: number; byGroup: Record<string, number>; }
// מסנן לפי YeshuvKod (סמל יישוב) — יציב יותר משם (ששתנה בין המקורות)
export async function fetchCrime(localityCode: number, statAreaKod?: string): Promise<CrimeStats | null> {
  const filters: Record<string, unknown> = { YeshuvKod: String(localityCode) };
  if (statAreaKod) filters.StatisticAreaKod = String(statAreaKod);
  let recs = await ckan(RES.crime2024, { filters, limit: 2000 });
  if (!recs.length) recs = await ckan(RES.crime2024, { filters: { YeshuvKod: localityCode }, limit: 2000 });
  if (!recs.length) return null;
  const byGroup: Record<string, number> = {};
  for (const r of recs) {
    const g = r.StatisticGroup ?? "אחר";
    byGroup[g] = (byGroup[g] ?? 0) + 1;
  }
  return { totalRecords: recs.length, byGroup };
}

// ----- נקודות עניין: תחנות תח"צ (כולל רכבת) לפי עיר -----
export interface Poi { name?: string; subtype?: string; lat: number; lon: number; attrs?: Record<string, unknown>; }
export async function fetchTransitStops(cityCode: number): Promise<Poi[]> {
  const recs = await ckan(RES.transitStops, { filters: { CityCode: cityCode }, limit: 3000 });
  return recs
    .filter((r) => r.Lat != null && r.Long != null)
    .map((r) => ({
      name: r.CityName,
      subtype: r.StationTypeName,
      lat: Number(r.Lat),
      lon: Number(r.Long),
      attrs: { operator: r.StationOperatorTypeName, metro: r.MetropolinName },
    }));
}

// ----- נקודות עניין: מוסדות חינוך (ITM -> WGS84) — סינון לפי קרבה -----
// המקור אינו כולל עיר, לכן מסננים גיאוגרפית סביב הנקודה
export async function fetchSchoolsNear(lat: number, lon: number, radiusM = 3000, maxScan = 5000): Promise<Poi[]> {
  const out: Poi[] = [];
  const recs = await ckan(RES.schoolCoords, { limit: maxScan });
  for (const r of recs) {
    const x = Number(r.ITM_X), y = Number(r.ITM_Y);
    if (!x || !y) continue;
    // המקור כולל גם UTM_X/UTM_Y ב-WGS84 (lon/lat) — נשתמש בהם אם קיימים
    let plat: number, plon: number;
    if (r.UTM_X && r.UTM_Y) { plon = Number(r.UTM_X); plat = Number(r.UTM_Y); }
    else { const w = itmToWgs84(x, y); plat = w.lat; plon = w.lon; }
    out.push({ name: r.SHEM_MOSAD, subtype: "school", lat: plat, lon: plon, attrs: { semel: r.SEMEL_MOSAD } });
  }
  return out;
}

// ============================================================================
// OpenStreetMap Overpass API (חינמי, ללא מפתח, רישיון ODbL)
// משמש לנקודות עניין שאין להן מקור ממשלתי לאומי אחיד:
// בתי כנסת/מוסדות דת, כבישים ראשיים, ומרכזים (קניונים/מסחר).
// ============================================================================
const OVERPASS = "https://overpass-api.de/api/interpreter";

async function overpass(query: string): Promise<any[]> {
  try {
    const resp = await fetch(OVERPASS, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "nadlan-research/1.0" },
      body: "data=" + encodeURIComponent(query),
    });
    if (!resp.ok) return [];
    const d = await resp.json();
    return d?.elements ?? [];
  } catch {
    return [];
  }
}

function elLatLon(e: any): { lat: number; lon: number } | null {
  const lat = e.lat ?? e.center?.lat;
  const lon = e.lon ?? e.center?.lon;
  if (lat == null || lon == null) return null;
  return { lat: Number(lat), lon: Number(lon) };
}

// בתי כנסת / מוסדות דת יהודיים סביב נקודה
export async function fetchSynagoguesNear(lat: number, lon: number, radiusM = 1500): Promise<Poi[]> {
  const q =
    `[out:json][timeout:25];(` +
    `node["amenity"="place_of_worship"]["religion"="jewish"](around:${radiusM},${lat},${lon});` +
    `way["amenity"="place_of_worship"]["religion"="jewish"](around:${radiusM},${lat},${lon});` +
    `);out center 60;`;
  const els = await overpass(q);
  const out: Poi[] = [];
  for (const e of els) {
    const c = elLatLon(e);
    if (c) out.push({ name: e.tags?.name, subtype: "synagogue", lat: c.lat, lon: c.lon });
  }
  return out;
}

// כבישים ראשיים (מהירים/עורקים) סביב נקודה — רלוונטי לנגישות ולרעש
export async function fetchMajorRoadsNear(lat: number, lon: number, radiusM = 700): Promise<Poi[]> {
  const q =
    `[out:json][timeout:25];(` +
    `way["highway"~"motorway|trunk|primary"](around:${radiusM},${lat},${lon});` +
    `);out center 30;`;
  const els = await overpass(q);
  const out: Poi[] = [];
  for (const e of els) {
    const c = elLatLon(e);
    if (c) out.push({ name: e.tags?.name ?? e.tags?.ref, subtype: e.tags?.highway, lat: c.lat, lon: c.lon });
  }
  return out;
}

// מרכזים (קניונים/מרכזי מסחר) — פרוקסי לקרבת מרכזים
export async function fetchCentralPlacesNear(lat: number, lon: number, radiusM = 2500): Promise<Poi[]> {
  const q =
    `[out:json][timeout:25];(` +
    `node["shop"="mall"](around:${radiusM},${lat},${lon});` +
    `way["shop"="mall"](around:${radiusM},${lat},${lon});` +
    `node["amenity"="marketplace"](around:${radiusM},${lat},${lon});` +
    `);out center 40;`;
  const els = await overpass(q);
  const out: Poi[] = [];
  for (const e of els) {
    const c = elLatLon(e);
    if (c) out.push({ name: e.tags?.name, subtype: e.tags?.shop ?? e.tags?.amenity, lat: c.lat, lon: c.lon });
  }
  return out;
}

// ----- בחירות: הרכב סוציו-דתי לפי יישוב (מצרפי) -----
export interface ElectionProfile {
  eligible?: number; voters?: number; valid?: number; turnout?: number;
  topParties: { party: string; votes: number; share: number }[];
  blocShares: Record<string, number>;
}
// מיפוי אותיות רשימה -> גוש סוציו-דתי (פרוקסי)
const BLOC_MAP: Record<string, string> = {
  שס: "חרדי", ג: "חרדי", // שס, יהדות התורה
  ב: "דתי-לאומי", טב: "דתי-לאומי", // הציונות הדתית
  מחל: "ימין-חילוני", ל: "ימין-חילוני", // הליכוד, ישראל ביתנו
  פה: "מרכז-שמאל", אמת: "מרכז-שמאל", כן: "מרכז-שמאל", מרצ: "מרכז-שמאל", // יש עתיד, העבודה, המחנה, מרצ
  ום: "ערבי", עם: "ערבי", ד: "ערבי", // חדש-תעל, רעם, בלד
};
export async function fetchElectionProfile(localityCode: number): Promise<ElectionProfile | null> {
  // מסנן לפי סמל ישוב (יציב משמות עם רווחים כפולים/מקפים); המקור לפי קלפי -> נסכם
  let rows = await ckan(RES.election25, { filters: { "סמל ישוב": localityCode }, limit: 3000 });
  if (!rows.length) rows = await ckan(RES.election25, { filters: { "סמל ישוב": String(localityCode) }, limit: 3000 });
  if (!rows.length) return null;
  let eligible = 0, voters = 0, valid = 0;
  const partyTotals: Record<string, number> = {};
  const skip = new Set(["_id", "שם ישוב", "סמל ישוב", "ריכוז", "קלפי", "בזב", "מצביעים", "פסולים", "כשרים", "ברזל"]);
  for (const r of rows) {
    eligible += Number(r["בזב"] ?? 0);
    voters += Number(r["מצביעים"] ?? 0);
    valid += Number(r["כשרים"] ?? 0);
    for (const [k, v] of Object.entries(r)) {
      if (skip.has(k)) continue;
      const n = Number(v);
      if (!isNaN(n) && n >= 0 && k.length <= 4) partyTotals[k] = (partyTotals[k] ?? 0) + n;
    }
  }
  const totalValid = valid || Object.values(partyTotals).reduce((a, b) => a + b, 0);
  const topParties = Object.entries(partyTotals)
    .map(([party, votes]) => ({ party, votes, share: totalValid ? +(100 * votes / totalValid).toFixed(1) : 0 }))
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 8);
  const blocShares: Record<string, number> = {};
  for (const [party, votes] of Object.entries(partyTotals)) {
    const bloc = BLOC_MAP[party];
    if (bloc) blocShares[bloc] = (blocShares[bloc] ?? 0) + votes;
  }
  for (const k of Object.keys(blocShares)) {
    blocShares[k] = totalValid ? +(100 * blocShares[k] / totalValid).toFixed(1) : 0;
  }
  return {
    eligible, voters, valid,
    turnout: eligible ? +(100 * voters / eligible).toFixed(1) : undefined,
    topParties, blocShares,
  };
}
