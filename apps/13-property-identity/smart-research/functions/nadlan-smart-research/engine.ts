// ============================================================================
// engine.ts — מנוע המחקר החכם: מצרף את כל הפרמטרים לכתובת + ציון כדאיות
// ============================================================================

import { geocodeAddress, resolveArea, resolveLocalityByName, haversineMeters } from "./geo.ts";
import {
  fetchSocioEconomic, fetchDemographics, fetchCrime,
  fetchTransitStops, fetchSchoolsNear, fetchElectionProfile,
  fetchSynagoguesNear, fetchMajorRoadsNear, fetchCentralPlacesNear,
} from "./sources.ts";

export interface SmartProfile {
  ok: boolean;
  error?: string;
  // קלט + שיוך מרחבי
  query_address: string;
  matched_address?: string;
  lat?: number;
  lon?: number;
  locality_code?: number;
  locality_name?: string;
  neighborhood_id?: string;
  neighborhood_name?: string;
  settlement_id?: string;
  stat_area?: string;
  // פרמטרים חינמיים (מוצגים לכל משתמש)
  parameters: ParamValue[];
  // ציון כדאיות
  opportunity_score?: number;
  score_breakdown?: ScoreItem[];
  // מדדים מספריים לשימור בבסיס הנתונים
  metrics?: Record<string, number | string | null>;
  // מטא
  sources: { key: string; title: string; url: string }[];
}

export interface ParamValue {
  key: string;
  label: string;         // תווית עברית
  value: string | number | null;
  unit?: string;
  impact: string;        // הסבר קצר על ההשפעה על המחיר
  source_key: string;
  source_url: string;
}

export interface ScoreItem {
  factor: string;
  points: number;        // תרומה לציון (חיובי/שלילי)
  note: string;
}

const SRC_URLS: Record<string, { title: string; url: string }> = {
  cbs_socioeconomic: { title: 'מדד חברתי-כלכלי (למ"ס)', url: "https://data.gov.il/dataset/social_economic_cluster" },
  moc_census2022: { title: 'מפקד האוכלוסין 2022 (למ"ס)', url: "https://data.gov.il/dataset/2022" },
  police_crime2024: { title: "עבירות פליליות 2024 (משטרת ישראל)", url: "https://data.gov.il/dataset/crime_records_data" },
  mot_transit_stops: { title: "תחנות תחבורה ציבורית (משרד התחבורה)", url: "https://data.gov.il/dataset/bus_stops" },
  osm_pois: { title: "נקודות עניין (OpenStreetMap)", url: "https://www.openstreetmap.org" },
  moe_school_coords: { title: "מוסדות חינוך (משרד החינוך)", url: "https://data.gov.il/dataset/coordinates" },
  cec_knesset25: { title: "תוצאות בחירות כנסת 25 (ועדת הבחירות)", url: "https://data.gov.il/dataset/votes-knesset" },
  nadlan_gov: { title: 'אתר הנדל"ן הממשלתי (רשות המסים)', url: "https://www.nadlan.gov.il" },
};

// שליפת אגרגט מחיר מהמחבר הקיים (nadlan data.nadlan.gov.il)
async function fetchPriceAggregate(neighborhoodId: string, kind: "buy" | "rent" = "buy") {
  try {
    const resp = await fetch(`https://data.nadlan.gov.il/api/pages/neighborhood/${kind}/${neighborhoodId}.json`);
    if (!resp.ok) return null;
    const d = await resp.json();
    const idx = d?.trends?.indexes ?? {};
    const rooms: any[] = d?.trends?.rooms ?? [];
    const withDeals = rooms.filter((r) => r.hasDeals && r.summary);
    const avg = withDeals.length
      ? Math.round(withDeals.reduce((s, r) => s + (r.summary.lastYearAvgPrice ?? 0), 0) / withDeals.length)
      : null;
    return { yield: idx.yield ?? null, priceIncreases: idx.priceIncreases ?? null, luxury: idx.luxury ?? null, avgPrice: avg };
  } catch {
    return null;
  }
}

export async function buildSmartProfile(address: string): Promise<SmartProfile> {
  const params: ParamValue[] = [];
  const usedSources = new Set<string>();
  const push = (p: Omit<ParamValue, "source_url"> & { source_url?: string }) => {
    const s = SRC_URLS[p.source_key];
    usedSources.add(p.source_key);
    params.push({ ...p, source_url: p.source_url ?? s?.url ?? "" });
  };

  // 1. גיאוקודינג
  const geo = await geocodeAddress(address);
  if (!geo || !geo.lat) {
    return { ok: false, error: "לא נמצאה כתובת תואמת", query_address: address, parameters: [], sources: [] };
  }

  // 2. שיוך אזורי (שכונה/יישוב) דרך nadlan deal-info
  const area = await resolveArea(geo.addressId);
  let localityCode = area?.settlementId ? Number(area.settlementId) : undefined;
  let localityName = area?.settlementName;

  // 2b. Fallback: ערים רבות (למשל באר שבע) אינן מוחזרות מ-deal-info.
  // במקרה זה נשיג את סמל הישוב משם העיר (מתוך מזהה govmap) —
  // כך שאוכלוסין/פשיעה/בחירות/תחבורה עדיין עובדים גם ללא רשומת שכונה בנדל"ן.
  if (!localityCode && geo.cityName) {
    const loc = await resolveLocalityByName(geo.cityName).catch(() => null);
    if (loc) {
      localityCode = Number(loc.localityCode);
      localityName = loc.localityName;
    }
  }

  // 3. שליפות מקבילות מהמקורות הממשלתיים
  const [socio, demo, crime, transit, schools, election, price, synagogues, roads, centrals] = await Promise.all([
    localityCode ? fetchSocioEconomic(localityCode).catch(() => null) : Promise.resolve(null),
    localityCode ? fetchDemographics(localityCode, area?.statArea).catch(() => null) : Promise.resolve(null),
    localityCode ? fetchCrime(localityCode).catch(() => null) : Promise.resolve(null),
    localityCode ? fetchTransitStops(localityCode).catch(() => []) : Promise.resolve([]),
    fetchSchoolsNear(geo.lat, geo.lon, 3000).catch(() => []),
    localityCode ? fetchElectionProfile(localityCode).catch(() => null) : Promise.resolve(null),
    area?.neighborhoodId ? fetchPriceAggregate(area.neighborhoodId, "buy").catch(() => null) : Promise.resolve(null),
    fetchSynagoguesNear(geo.lat, geo.lon, 1500).catch(() => []),
    fetchMajorRoadsNear(geo.lat, geo.lon, 700).catch(() => []),
    fetchCentralPlacesNear(geo.lat, geo.lon, 2500).catch(() => []),
  ]);

  // ----- בניית הפרמטרים -----
  // מדד חברתי-כלכלי (אשכול) — כשזמין
  if (socio?.cluster != null) {
    push({ key: "socioeconomic_cluster", label: "אשכול חברתי-כלכלי (1-10)", value: socio.cluster, impact: "מהמשתנים הדומיננטיים במחיר; אשכול גבוה = מחיר גבוה", source_key: "cbs_socioeconomic" });
  }

  // דמוגרפיה מהמפקד
  if (demo) {
    if (demo.medWage != null) push({ key: "med_wage", label: "שכר חציוני שכירים (שנתי)", value: demo.medWage, unit: "₪", impact: "פרוקסי חברתי-כלכלי מרכזי; שכר גבוה קשור למחירים גבוהים", source_key: "moc_census2022" });
    if (demo.acadmCertPcnt != null) push({ key: "acadm_cert", label: "בעלי תעודה אקדמית", value: demo.acadmCertPcnt, unit: "%", impact: "מדד לרמה חברתית-כלכלית של האזור", source_key: "moc_census2022" });
    if (demo.religiosity) push({ key: "religiosity", label: "מידת דתיות (מְשק בית)", value: demo.religiosity, impact: "מגדיר את תת-השוק המקומי והביקוש", source_key: "moc_census2022" });
    if (demo.religionHe) push({ key: "religion", label: "דת דומיננטית", value: demo.religionHe, impact: "הרכב אוכלוסייה", source_key: "moc_census2022" });
    if (demo.popDensity != null) push({ key: "pop_density", label: "צפיפות אוכלוסייה", value: demo.popDensity, unit: "נפש/קמ\"ר", impact: "צפיפות גבוהה קשורה לביקוש ומחיר גבוהים במרכזים", source_key: "moc_census2022" });
    if (demo.ageMedian != null) push({ key: "age_median", label: "גיל חציוני", value: demo.ageMedian, unit: "שנים", impact: "מאפיין דמוגרפי של האזור", source_key: "moc_census2022" });
    if (demo.ownPcnt != null) push({ key: "own_pcnt", label: "שיעור בעלות על דירה", value: demo.ownPcnt, unit: "%", impact: "בעלות גבוהה = יציבות קהילתית", source_key: "moc_census2022" });
    if (demo.rentPcnt != null) push({ key: "rent_pcnt", label: "שיעור שוכרים", value: demo.rentPcnt, unit: "%", impact: "רלוונטי לתשואת השכרה", source_key: "moc_census2022" });
  }

  // פשיעה
  if (crime) {
    push({ key: "crime_records", label: "רשומות פליליות ביישוב (2024)", value: crime.totalRecords, impact: "פשיעה גבוהה מורידה ביקוש ומחיר", source_key: "police_crime2024" });
  }

  // קרבה לתחבורה ציבורית + רכבת
  let distTransit: number | undefined, distTrain: number | undefined;
  if (transit.length) {
    const dists = transit.map((s) => ({ d: haversineMeters(geo.lat, geo.lon, s.lat, s.lon), s }));
    const nearest = dists.reduce((a, b) => (b.d < a.d ? b : a));
    distTransit = nearest.d;
    push({ key: "dist_transit", label: "מרחק לתחנת תח\"צ קרובה", value: distTransit, unit: "מ'", impact: "קרבה עד 800 מ' מוסיפה 5%-10%", source_key: "mot_transit_stops" });
    const trains = dists.filter((x) => /רכבת/.test(x.s.subtype ?? ""));
    if (trains.length) {
      distTrain = trains.reduce((a, b) => (b.d < a.d ? b : a)).d;
      push({ key: "dist_train", label: "מרחק לתחנת רכבת קרובה", value: distTrain, unit: "מ'", impact: "קרבה לרכבת מעלה ערך (רק\"ל +3.9%)", source_key: "mot_transit_stops" });
    }
  }

  // קרבה לבית ספר
  let distSchool: number | undefined;
  if (schools.length) {
    const dists = schools.map((s) => haversineMeters(geo.lat, geo.lon, s.lat, s.lon));
    distSchool = Math.min(...dists);
    if (distSchool < 20000) {
      push({ key: "dist_school", label: "מרחק למוסד חינוך קרוב", value: distSchool, unit: "מ'", impact: "איכות/קרבת בי\"ס: +1.1% למ\"ר לאחוזון", source_key: "moe_school_coords" });
    }
  }

  // קרבת בתי כנסת / מוסדות דת (בקשת המשתמש)
  let distSynagogue: number | undefined;
  let synagogueCount: number | undefined;
  if (synagogues.length) {
    const dists = synagogues.map((s) => haversineMeters(geo.lat, geo.lon, s.lat, s.lon));
    distSynagogue = Math.min(...dists);
    synagogueCount = synagogues.filter((s, i) => dists[i] <= 500).length;
    push({ key: "dist_synagogue", label: "מרחק לבית כנסת קרוב", value: distSynagogue, unit: "מ'", impact: "קרבה לבית כנסת מעלה ביקוש בקהילות שומרות מצוות", source_key: "osm_pois" });
    push({ key: "synagogues_500m", label: "בתי כנסת ברדיוס 500 מ'", value: synagogueCount, impact: "צפיפות מוסדות דת — מאפיין אופי קהילתי", source_key: "osm_pois" });
  }

  // קרבת כביש ראשי (בקשת המשתמש) — נגישות טובה אך רעש אפשרי
  let distRoad: number | undefined;
  if (roads.length) {
    const dists = roads.map((s) => haversineMeters(geo.lat, geo.lon, s.lat, s.lon));
    distRoad = Math.min(...dists);
    push({ key: "dist_major_road", label: "מרחק לציר תנועה ראשי", value: distRoad, unit: "מ'", impact: "נגישות טובה; קרוב מדי (<80 מ') עלול להפחית ערך בשל רעש", source_key: "osm_pois" });
  }

  // קרבת מרכזים (בקשת המשתמש) — קניונים/מרכזי מסחר
  let distCentral: number | undefined;
  if (centrals.length) {
    const dists = centrals.map((s) => haversineMeters(geo.lat, geo.lon, s.lat, s.lon));
    distCentral = Math.min(...dists);
    push({ key: "dist_central_place", label: "מרחק למרכז מסחר/קניון", value: distCentral, unit: "מ'", impact: "קרבה למרכזים ושירותים מעלה נוחות וערך", source_key: "osm_pois" });
  }

  // בחירות — הרכב סוציו-דתי
  if (election) {
    if (election.turnout != null) push({ key: "turnout", label: "אחוז הצבעה (כנסת 25)", value: election.turnout, unit: "%", impact: "מדד מעורבות אזרחית", source_key: "cec_knesset25" });
    const blocs = Object.entries(election.blocShares).sort((a, b) => b[1] - a[1]);
    if (blocs.length) {
      push({ key: "election_blocs", label: "הרכב סוציו-דתי (לפי בחירות)", value: blocs.map(([k, v]) => `${k} ${v}%`).join(", "), impact: "פרוקסי בזמן-אמת להרכב הקהילה והביקוש המקומי", source_key: "cec_knesset25" });
    }
  }

  // מחיר ותשואה (מהמחבר הקיים)
  if (price) {
    if (price.avgPrice != null) push({ key: "avg_price", label: "מחיר ממוצע בשכונה (שנה אחרונה)", value: price.avgPrice, unit: "₪", impact: "רמת מחירים אזורית", source_key: "nadlan_gov" });
    if (price.yield != null) push({ key: "yield", label: "מדד תשואה", value: price.yield, impact: "תשואה גבוהה = כדאיות השקעה טובה יותר", source_key: "nadlan_gov" });
    if (price.priceIncreases != null) push({ key: "price_increases", label: "מדד עליות מחירים", value: price.priceIncreases, impact: "מגמת מחירים אזורית", source_key: "nadlan_gov" });
  }

  // ----- חישוב ציון כדאיות (0-100) -----
  const breakdown: ScoreItem[] = [];
  let score = 50; // בסיס ניטרלי

  if (socio?.cluster != null) {
    const pts = (socio.cluster - 5) * 3; // אשכול 10 -> +15, אשכול 1 -> -12
    score += pts; breakdown.push({ factor: "אשכול חברתי-כלכלי", points: pts, note: `אשכול ${socio.cluster}` });
  } else if (demo?.medWage != null) {
    // פרוקסי: שכר חציוני (סף ~140k)
    const pts = Math.max(-12, Math.min(15, Math.round((demo.medWage - 140000) / 5000)));
    score += pts; breakdown.push({ factor: "שכר חציוני (פרוקסי חברתי-כלכלי)", points: pts, note: `${demo.medWage?.toLocaleString()} ₪` });
  }
  if (distTransit != null) {
    const pts = distTransit <= 400 ? 8 : distTransit <= 800 ? 5 : distTransit <= 1500 ? 2 : -2;
    score += pts; breakdown.push({ factor: "קרבה לתחבורה ציבורית", points: pts, note: `${distTransit} מ'` });
  }
  if (distTrain != null && distTrain <= 2000) {
    const pts = distTrain <= 1000 ? 6 : 3;
    score += pts; breakdown.push({ factor: "קרבה לרכבת", points: pts, note: `${distTrain} מ'` });
  }
  if (distSchool != null && distSchool < 20000) {
    const pts = distSchool <= 500 ? 5 : distSchool <= 1000 ? 3 : 1;
    score += pts; breakdown.push({ factor: "קרבה למוסד חינוך", points: pts, note: `${distSchool} מ'` });
  }
  if (price?.yield != null) {
    const y = Number(price.yield);
    const pts = y >= 3.5 ? 8 : y >= 3 ? 5 : y >= 2.5 ? 2 : -2;
    score += pts; breakdown.push({ factor: "תשואה", points: pts, note: `מדד ${y}` });
  }
  if (price?.priceIncreases != null) {
    const p = Number(price.priceIncreases);
    const pts = p > 3 ? 4 : p > 0 ? 2 : -3;
    score += pts; breakdown.push({ factor: "מגמת מחירים", points: pts, note: `מדד ${p}` });
  }
  if (crime && demo?.popApprox) {
    const per1000 = (crime.totalRecords / demo.popApprox) * 1000;
    const pts = per1000 > 80 ? -6 : per1000 > 40 ? -3 : per1000 > 15 ? -1 : 2;
    score += pts; breakdown.push({ factor: "רמת פשיעה", points: pts, note: `~${per1000.toFixed(1)} ל-1000 תושבים` });
  }
  if (demo?.ownPcnt != null) {
    const pts = demo.ownPcnt >= 65 ? 3 : demo.ownPcnt >= 45 ? 1 : -1;
    score += pts; breakdown.push({ factor: "יציבות בעלות", points: pts, note: `${demo.ownPcnt}% בעלות` });
  }

  if (distSynagogue != null) {
    const pts = distSynagogue <= 200 ? 3 : distSynagogue <= 500 ? 2 : distSynagogue <= 1000 ? 1 : 0;
    score += pts; breakdown.push({ factor: "קרבה לבית כנסת", points: pts, note: `${distSynagogue} מ'` });
  }
  if (distRoad != null) {
    // נגישות טובה אך לא צמוד מדי (רעש): אופטימום 150-500 מ'
    const pts = distRoad < 80 ? -3 : distRoad <= 500 ? 3 : distRoad <= 1200 ? 1 : 0;
    score += pts; breakdown.push({ factor: "קרבה לציר תנועה ראשי", points: pts, note: `${distRoad} מ'` });
  }
  if (distCentral != null) {
    const pts = distCentral <= 800 ? 4 : distCentral <= 1500 ? 2 : distCentral <= 2500 ? 1 : 0;
    score += pts; breakdown.push({ factor: "קרבה למרכז מסחר", points: pts, note: `${distCentral} מ'` });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  // פשיעה ל-1000 תושבים (לעמודת הבסיס נתונים)
  let crimePer1000: number | undefined;
  if (crime && demo?.popApprox) crimePer1000 = +((crime.totalRecords / demo.popApprox) * 1000).toFixed(1);

  return {
    ok: true,
    query_address: address,
    matched_address: geo.matchedText,
    lat: geo.lat,
    lon: geo.lon,
    locality_code: localityCode,
    locality_name: localityName,
    neighborhood_id: area?.neighborhoodId,
    neighborhood_name: area?.neighborhoodName,
    settlement_id: area?.settlementId,
    stat_area: area?.statArea,
    parameters: params,
    opportunity_score: score,
    score_breakdown: breakdown,
    metrics: {
      socioeconomic_cluster: socio?.cluster ?? null,
      pop_density: demo?.popDensity ?? null,
      age_median: demo?.ageMedian ?? null,
      religiosity: demo?.religiosity ?? null,
      dominant_religion: demo?.religionHe ?? null,
      own_pcnt: demo?.ownPcnt ?? null,
      acadm_cert_pcnt: demo?.acadmCertPcnt ?? null,
      med_wage: demo?.medWage ?? null,
      crime_per_1000: crimePer1000 ?? null,
      dist_transit_m: distTransit ?? null,
      dist_train_m: distTrain ?? null,
      dist_school_m: distSchool ?? null,
      dist_synagogue_m: distSynagogue ?? null,
      dist_major_road_m: distRoad ?? null,
      dist_central_place_m: distCentral ?? null,
      avg_price: price?.avgPrice ?? null,
      index_yield: price?.yield ?? null,
    },
    sources: [...usedSources].map((k) => ({ key: k, title: SRC_URLS[k]?.title ?? k, url: SRC_URLS[k]?.url ?? "" })),
  };
}
