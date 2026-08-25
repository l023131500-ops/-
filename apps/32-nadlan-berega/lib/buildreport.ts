// ==== הרכבת הדוח המלא ====
// כאן נפגשים כל המקורות. הכלל: כל שדה יוצא מכאן עם ודאות מוצהרת,
// ושדה בלי נתון יוצא עם משפט הסבר — לא עם "—" יבש ולא עם ניחוש.

import { geocodeAddress, verifyCity } from './geocode';
import {
  geocodeGoogle,
  googleConfigured,
  nearbyPlaces,
  searchTextPlaces,
  addWalkingTimes,
  streetViewMeta,
  aimQuality,
  mergePlaces,
  primaryNearest,
  isPreschoolName,
  nearestHospitals,
} from './googlemaps';
import type { Place, StreetView, PlaceGroupKey } from './googlemaps';
import { mikvaotNear, type Mikve } from './mikve';
import { parcelAtPoint, parcelByGushHelka, parcelValidity } from './cadastre';
import { stopsWithLinesDetailed, type StopWithLines } from './gtfs';
import {
  buildingCharacter,
  detectPropertyKind,
  type BuildingCharacter,
  type PropertyKindResult,
} from './buildingchar';
import { itmToWgs84, wgs84ToItm, isPlausibleItm } from './itm';
import {
  fetchDealsAtPoint,
  parseStreetAndNumber,
  filterToParcel,
  filterToBuilding,
  filterToAddress,
  isHomeSale,
  isCommercialDeal,
  isLandDeal,
  parcelLabel,
  nadlanAddressRef,
} from './nadlan';
import { buildingAge, type BuildingAge } from './buildingage';
import { fetchHousingIndex, fetchRentIndex } from './cbs';
import type { HousingIndex } from './cbs';
import { queryPlanningAtPoint, queryPlansAtPoint, queryLandUseNear } from './xplan';
import type { PlanRecord } from './xplan';
import { composePermits } from './permits';
import type { NearbyPlanning, PermitsResult, PlanWithDocs } from './permits';
import { valuate } from './valuation';
import type { ValuationResult } from './valuation';
import { parcelConstraints } from './planentities';
import type { ParcelConstraints } from './planentities';
import { buildFeasibility } from './feasibility';
import type { Feasibility } from './feasibility';
import { fetchAgriculturalRezoningPolicy } from './rami';
import type { RamiPolicy } from './rami';
import { nearbyConstructionPlans } from './nearbyplans';
import type { NearbyPlan } from './nearbyplans';
import {
  ASSET_CATEGORY,
  ASSET_DEAL_TYPE,
  ASSET_HIDDEN_CATEGORIES,
  ASSET_LABEL,
  isAssetType,
} from './assettype';
import type { AssetType } from './assettype';
import { checkRenewal } from './hitchadshut';
import { fetchListings } from './apify';
import type { Listing, ListingsResult } from './apify';
import { populationProfile, publicPopulation } from './elections';
import type { PopulationProfile } from './elections';
import { resolveStreet, neighborhoodInfo, nearestJunction, displayName } from './placenames';
import type { ResolvedName, NeighborhoodInfo, Junction } from './placenames';
import { localityArticle, neighborhoodArticle } from './wikipedia';
import type { WikiPlace } from './wikipedia';
import { pricePerSqm } from './format';
import { fact, needsLicensedSource, distanceText, walkText, walkApprox, countText } from './report';
import type { CategoryKey, Fact, ReportCategory, ReportTier } from './report';
import { CATEGORY_ORDER, CATEGORY_SUBTITLE, CATEGORY_TITLE } from './report';
import { tierMayUsePaidSources, tierMayUseImagery } from './report';
import { nearestPoiFromCache } from './store';
import type { Transaction } from './types';

export interface ReportTitle {
  streetOfficial: string | null;
  streetAliases: string[];
  /** "דרך מרדכי (מוכר גם כרחוב האתרוג)" */
  streetDisplay: string | null;
  houseNumber: string | null;
  city: string | null;
  gush: string | null;
  helka: string | null;
  /** שורת הכותרת המלאה להצגה. */
  headline: string;
}

export interface ReportBackground {
  neighborhoodName: string | null;
  neighborhoodAliases: string[];
  neighborhoodDisplay: string | null;
  neighborhoodDescription: string | null;
  population: PopulationProfile | null;
  junction: Junction | null;
  /** אופי הבנייה באזור, נגזר מסוגי הנכסים בעסקאות שנרשמו בו. */
  buildingCharacter: BuildingCharacter | null;
  /**
   * רקע כתוב על המקום — היסטוריה, אופי, אוכלוסייה, מוסדות.
   * מגיע מוויקיפדיה העברית ומאומת מול נקודת הנכס. `null` = אין ערך מאומת.
   */
  localityArticle: WikiPlace | null;
  neighborhoodArticle: WikiPlace | null;
}

/**
 * השם שלפיו מחפשים את השכונה בוויקיפדיה.
 * שמות השכונות במרשם העסקאות מקוצרים ("שכ אבני חן"), ולכן מעדיפים את השם
 * הרשמי מהמרשם, ומנקים תחילית "שכונת"/"שכ".
 */
function localityWikiName(fromDeals: string | null, official?: string | null): string | null {
  const raw = (official ?? fromDeals ?? '').trim();
  if (!raw) return null;
  const clean = raw
    .replace(/^(שכונת|שכונה|שכ['׳"״]?)\s+/u, '')
    .replace(/\s*\/\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.length >= 3 ? clean : null;
}

export interface PropertyReport {
  query: string;
  tier: ReportTier;
  /** מגורים / שכירות / מסחרי / קרקע — קובע אילו סעיפים נבנים ומה נמשך מהלוחות. */
  assetType: AssetType;
  /**
   * מה מותר לבנות כאן, לפי איזו תכנית, ואיפה המסמכים.
   * נבנה לכל סוגי הנכס — זה אותו מנוע.
   */
  permits: PermitsResult | null;
  /** §2 · הערכת שווי, או אמירה כנה שאין די נתונים. */
  valuation: ValuationResult | null;
  /** המגבלות שמסומנות על התשריט של החלקה — קווי בניין, הריסה, שימור, עתיקות. */
  constraints: ParcelConstraints | null;
  /** §7 · התשובה ל"האם אפשר להוסיף כאן בנייה, ומה נחשב חריגה". */
  feasibility: Feasibility | null;
  /**
   * מדיניות רמ"י לשינוי ייעוד של קרקע חקלאית. נמשך **רק** בדוח קרקע:
   * קובץ ההחלטות שוקל ~2MB, ואין לו מה לתרום לדוח דירה.
   */
  ramiPolicy: RamiPolicy | null;
  /** מדד שכר הדירה של הלמ"ס — נמשך רק בדוח שכירות. */
  rentIndex: HousingIndex | null;
  /**
   * §12 · תוכניות בנייה ברדיוס סביב הנכס, כל אחת עם מיקום ממוקם. פרימיום
   * ומעלה בלבד (`null` בדוח החינמי — לא נשאל כלל, לא רק מוסתר).
   */
  nearbyPlans: NearbyPlan[] | null;
  title: ReportTitle;
  background: ReportBackground;
  categories: ReportCategory[];
  location: { lat: number | null; lng: number | null; itmX: number | null; itmY: number | null };
  streetView: (StreetView & { precise: boolean; aimReason: string | null }) | null;
  /** דירה בבניין או בית שהנכס הוא כולו — משנה את מה שהדוח מתאר. */
  propertyKind: PropertyKindResult;
  /** איך הבניין זוהה, ומה נמצא בו. שקיפות מלאה — כולל אי-התאמות. */
  building: BuildingIdentity;
  /** ההמרה בשני הכיוונים — כתובת ↔ גוש/חלקה — עם מצב האימות של כל צד. */
  parcelIdentity: ParcelIdentity;
  /** גיל הבניין, נגזר מהיסטוריית העסקאות שלו. */
  buildingAge: BuildingAge | null;
  /** מה שהמשתמש הזין בשדות הרשות, כפי שהוזן. */
  propertyInput: PropertyInput;
  /**
   * הדירה הספציפית, כשהיא זוהתה מתוך הקומה/מספר החדרים שהוזנו.
   * `tatHelka` הוא מה שמאפשר לשייך נסח טאבו לדירה הנכונה בבית משותף.
   */
  unit: {
    tatHelka: string | null;
    areaSqm: number | null;
    rooms: number | null;
    floor: string | null;
  } | null;
  soldDeals: SoldDeal[];
  listings: Listing[];
  listingsStatus: {
    configured: boolean;
    costUsd: number;
    sourcesOk: ('yad2' | 'madlan')[];
    notices: string[];
    /** המכסה נגמרה — עצירה מכוונת ולא כשל רגעי. */
    quotaExhausted: boolean;
    /** לאילו מקורות נדרשה הסלמה ל-residential proxy. */
    usedResidentialProxy: ('yad2' | 'madlan')[];
  };
  /**
   * כל קבוצות המוסדות, כל אחת עם השם, הסוג והמרחק במטרים.
   * `daily` נשמר לתאימות אחורה ומאגד מסחר, בריאות ופנאי.
   */
  places: {
    education: Place[];
    preschool: Place[];
    religion: Place[];
    commerce: Place[];
    health: Place[];
    leisure: Place[];
    transport: Place[];
    daily: Place[];
  };
  /** מקוואות מהמאגר הממשלתי, כולל שעות ונגישות. */
  mikvaot: Mikve[];
  /** תחנות בטווח הליכה, כל אחת עם הקווים שעוברים בה בפועל. */
  transitStops: StopWithLines[];
  priceTrend: { period: string; value: number }[];
  generatedAt: string;
  /** אזהרות אמת — מוצגות ללקוח בשפה מדוברת. */
  warnings: string[];
  /** עלות הפקה בפועל בדולר — למרכז השליטה. */
  costUsd: number;
  /**
   * מזהי העסקאות שמהן חושבו החציונים המוצגים.
   * הטבלה מבטיחה שהשורות האלה מופיעות, כדי שכל מספר בדוח יהיה ניתן לאימות.
   */
  comparableKeys: string[];
}

/**
 * איך זוהה "הבניין הזה" — ומה זה אומר על אמינות הנתונים ברמת הבניין.
 *
 * ⚠️ ההבחנה הזו היא לב הדיוק של הדוח. עד שהיא נוספה, "הבניין" הוגדר לפי הגוש
 * והחלקה שהקדסטר מחזיר לנקודת הכתובת, וכל בניין שעבר חלוקה מחדש הוצג כאילו
 * לא נמכרה בו אף דירה.
 */
export interface BuildingIdentity {
  /**
   * `polygon`  — לפי מזהה הבניין של המקור הממשלתי (הכי אמין)
   * `parcel`   — לפי גוש/חלקה מהקדסטר
   * `address`  — לפי רחוב + מספר בית זהים
   * `none`     — לא נמצאו עסקאות בבניין
   */
  matchedBy: 'polygon' | 'parcel' | 'address' | 'none';
  /** מזהה הבניין במקור, כשקיים. */
  polygonId: string | null;
  /** הכתובת שהמקור רושם לבניין הזה. */
  sourceAddress: string | null;
  /** גוש/חלקה כפי שהם רשומים **בעסקאות** של הבניין. */
  registeredGush: string | null;
  registeredHelka: string | null;
  /** הקדסטר והעסקאות חולקים על מספר החלקה — נאמר ללקוח במפורש. */
  parcelMismatch: boolean;
  /** מספרי תת-החלקה שנמכרו בבניין — מגיעים חינם עם כל עסקה. */
  subParcels: string[];
  dealsInBuilding: number;
  homeSalesInBuilding: number;
  /** הסבר בעברית מדוברת על אופן הזיהוי. */
  note: string;
}

/**
 * ההמרה בשני הכיוונים: כתובת ↔ גוש/חלקה, וכמה אפשר לסמוך על כל צד.
 *
 * ⚠️ למה זה טיפוס בפני עצמו ולא שני שדות: עד עכשיו הגוש והחלקה הוצגו בלי לומר
 * **מאיפה הם הגיעו**, ולכן כשהקדסטר נפל (ראה `lib/cadastre.ts`) הדוח פשוט לקח
 * גוש/חלקה מ**עסקאות של בניין שכן** והציג אותם כעובדה על הנכס. "דיזנגוף 100
 * תל אביב" הוצג כגוש 7091 חלקה 203 — החלקה של דיזנגוף 102. הקדסטר החי אומר
 * חלקה 7, וכך גם nadlan.gov.il לאותה כתובת.
 *
 * הכלל: ערך בלי מקור מזוהה אינו מוצג כמאומת.
 */
export interface ParcelIdentity {
  gush: string | null;
  helka: string | null;
  /** מאיפה הגיעו הגוש והחלקה. */
  parcelSource: 'cadastre' | 'user-input' | 'deals' | null;
  /**
   * אומת מול nadlan.gov.il (`parcel-valid`) — מקור עצמאי מהקדסטר.
   * `null` = שירות האימות לא ענה, ולא שהחלקה שגויה.
   */
  parcelVerified: boolean | null;
  /** מספר תתי-החלקות הרשומות בחלקה, לפי nadlan.gov.il. */
  subParcelCount: number | null;
  /** חלקה שאליה עבר הרישום אחרי חלוקה/איחוד, כשקיימת. */
  leadGush: string | null;
  leadHelka: string | null;
  /** הכתובת (רחוב + מספר) שהחלקה הזו נושאת. */
  street: string | null;
  houseNum: number | null;
  city: string | null;
  /**
   * מאיפה הגיעה הכתובת: `user-input` = כך הוזן · `deals` = כך רשומות העסקאות
   * בחלקה עצמה (המקור החזק ביותר לכיוון ההפוך) · `geocode` = שירות איתור.
   */
  addressSource: 'user-input' | 'deals' | 'geocode' | null;
  /** שני הכיוונים מסכימים זה עם זה. */
  crossChecked: boolean;
  /** קישור לעמוד העסקאות של הכתובת ב-nadlan.gov.il — אימות במקור בלחיצה. */
  officialUrl: string | null;
  /** הסבר בעברית מדוברת — מוצג ללקוח כשיש אי-התאמה. */
  note: string | null;
}

/** עסקה שנמכרה, כפי שהיא מוצגת ללקוח. */
export interface SoldDeal {
  address: string | null;
  /** שם הרחוב ומספר הבית כפי שרשומים בעסקה — לא פענוח של מחרוזת. */
  streetName: string | null;
  houseNum: number | null;
  /** היישוב כפי שרשום בעסקה. */
  settlement: string | null;
  date: string;
  price: number | null;
  areaSqm: number | null;
  pricePerSqm: number | null;
  rooms: number | null;
  floor: string | null;
  gush: string | null;
  helka: string | null;
  /** תת-חלקה — מזהה את הדירה הספציפית בבית משותף. מגיע חינם עם העסקה. */
  tatHelka: string | null;
  /** "7091-7-13" — בדיוק הצורה של nadlan.gov.il. תמיד קיים (שער הזהות). */
  parcelLabel: string | null;
  /** "דירה בבית קומות" / "קומבינציה" / "ניוד זכויות בניה" — כפי שדווח. */
  dealType: string | null;
  /** "דירה" / "קרקע" / "מחסן" — כפי שדווח. */
  propertyType: string | null;
  /** האם זו מכירת יחידת מגורים בפועל (ולא קרקע/קומבינציה/מחסן). */
  isHomeSale: boolean;
  /** 0 = באותו בניין. אחרת הפרש מספרי בית באותו רחוב, או null. */
  proximityRank: number;
  proximityLabel: string;
  /** רשומה שנראית חריגה — מוצגת, אך עם הסבר כדי שלא תטעה. */
  suspect?: boolean;
  suspectReason?: string;
}

/**
 * האם היישוב שהוזן מופיע כרכיב שלם בכתובת שהוחזרה.
 *
 * נחוץ לעיריות מאוחדות: מי שמחפש "יפו" מקבל מגוגל "תל אביב-יפו".
 * ⚠️ ההשוואה היא על **רכיב שלם** ולא על הכלה. הכלה הייתה מחזירה את התקלה
 * הישנה שבה "פת" התקבל כהתאמה ל"צפת"; שוויון רכיבים אינו סובל מכך.
 */
function cityAppearsAsToken(queryCity: string | null, formatted: string): boolean {
  if (!queryCity) return false;
  const split = (s: string) =>
    s
      .replace(/["'`״׳]/g, '')
      .split(/[\s,\-–—־]+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 3);

  const wanted = split(queryCity);
  if (!wanted.length) return false;
  const got = new Set(split(formatted));
  return wanted.every((t) => got.has(t));
}

/** ניקוי שם יישוב לתצוגה: "תל אביב -יפו" → "תל אביב-יפו". */
export function tidyCity(name: string | null): string | null {
  if (!name) return null;
  return name.replace(/\s*-\s*/g, '-').replace(/\s+/g, ' ').trim();
}

// ---------- קלט: כתובת או גוש/חלקה ----------

export interface ParsedQuery {
  kind: 'address' | 'parcel';
  gush?: string;
  helka?: string;
  street?: string | null;
  houseNum?: number | null;
  city?: string | null;
  raw: string;
}

/** "גוש 7091 חלקה 203", "7091/203", או כתובת חופשית. */
export function parseQuery(q: string): ParsedQuery {
  const raw = (q ?? '').trim();

  const labeled = /גוש\s*(\d{3,6})\D{0,12}?חלקה\s*(\d{1,5})/.exec(raw);
  if (labeled) return { kind: 'parcel', gush: labeled[1], helka: labeled[2], raw };

  const slashed = /^\s*(\d{3,6})\s*[\/\-]\s*(\d{1,5})\s*$/.exec(raw);
  if (slashed) return { kind: 'parcel', gush: slashed[1], helka: slashed[2], raw };

  const { street, houseNum } = parseStreetAndNumber(raw);
  // העיר היא בדרך כלל מה שאחרי מספר הבית.
  let city: string | null = null;
  const afterNum = houseNum != null ? raw.split(String(houseNum)).slice(1).join(' ').trim() : '';
  if (afterNum) city = afterNum.replace(/^[,\s]+/, '').trim() || null;
  return { kind: 'address', street, houseNum, city, raw };
}

// ---------- מיון עסקאות מהקרוב לבניין והלאה ----------

function houseNumOf(address: string | null | undefined): number | null {
  const m = /(\d+)\s*$/.exec((address ?? '').trim());
  return m ? Number(m[1]) : null;
}

function streetOf(address: string | null | undefined): string {
  return (address ?? '').replace(/\s*\d+\s*$/, '').replace(/["'`״׳]/g, '').trim();
}

/**
 * מיון כמו באתר הממשלתי: קודם העסקאות בחלקה של הנכס, אחר כך אותו רחוב
 * לפי קרבת מספר הבית, ולבסוף השאר.
 *
 * ⚠️ `streetNames` חייב לכלול את **כל** שמות הרחוב — הרשמי והכינויים.
 * נבדק בפועל בחצור הגלילית: הרחוב הרשמי הוא "דרך מרדכי", אבל מרשם העסקאות
 * הממשלתי רושם את אותן עסקאות תחת "אתרוג". השוואה מול השם הרשמי בלבד
 * סיווגה את כל העסקאות כ"בסביבה" והמיון יצא שגוי.
 */
export function sortByProximity(
  txns: Transaction[],
  gush: string | null,
  helka: string | null,
  streetNames: (string | null | undefined)[],
  houseNum: number | null,
  /**
   * מזהה הבניין של המקור. כשהוא קיים הוא קובע מה "בבניין הזה" — ולא הגוש/חלקה,
   * שיכולים להיות שונים ברישום העסקה אחרי חלוקה מחדש (ראה `filterToBuilding`).
   */
  buildingPolygonId: string | null = null,
  /** שנת הבנייה מחדש, אם הייתה. עסקאות שקדמו לה שייכות למבנה שנהרס. */
  rebuiltFromYear: number | null = null,
): SoldDeal[] {
  // ⚠️ שני הצדדים חייבים לעבור את אותו נרמול. עד לתיקון הזה רק צד אחד נוקה
  // מגרשיים: המרשם רושם `הבעש"ט` ואילו הרשימה המבוקשת הכילה `הבעשט`, ולכן
  // `includes` נכשל לשני הכיוונים וכל עסקה **באותו רחוב** סווגה "בסביבה".
  // נמדד על "הבעש\"ט 9 רחובות": הבעש"ט 11 הוצג כעסקה בסביבה ולא כעסקה ברחוב,
  // וכך היא גם לא נכללה בחציון הרחוב.
  const tidy = (s: string | null | undefined) => (s ?? '').replace(/["'`״׳]/g, '').trim();
  const wanted = streetNames.map(tidy).filter(Boolean);

  const matchesStreet = (rawStreet: string): boolean => {
    const tStreet = tidy(rawStreet);
    return !!tStreet && wanted.some((w) => tStreet === w || tStreet.includes(w) || w.includes(tStreet));
  };

  const mapped = txns.map((t) => {
    const samePolygon = !!buildingPolygonId && t.polygonId === buildingPolygonId;
    const sameParcel = gush && helka && t.gush === String(gush) && t.helka === String(helka);
    // ⚠️ השדות המקוריים של הרשומה קודמים לפענוח המחרוזת. הפענוח נשאר רק
    // כגיבוי לרשומות ישנות שבהן `streetNameHeb`/`houseNum` לא הוחזרו.
    const tStreet = t.streetName ?? streetOf(t.address);
    const tNum = t.houseNum ?? houseNumOf(t.address);
    const sameStreet = matchesStreet(tStreet);

    /**
     * §6 · "הבניין המדויק — לא בניין שכן".
     *
     * 🔴 מזהה הפוליגון של המקור **והחלקה** שניהם מקבצים יותר מבניין אחד, ולכן
     * אף אחד מהם אינו הגדרה של בניין. נמדד על שתי כתובות מהמפרט:
     *   · "דורש טוב 17 ירושלים" — חלקה 30240/88 מחזיקה גם את מספרי 4 ו-10.
     *     ארבע עסקאות משם הוצגו כ"בבניין הזה", בעוד **23 העסקאות שרשומות
     *     במספר 17 עצמו** סווגו "באותו רחוב". כלומר שגיאה לשני הכיוונים.
     *   · "שמואל הנביא 86 ירושלים" — פוליגון אחד חולש על מספרים 78–92
     *     ועל חמש חלקות (42,43,45,46,48); 47 עסקאות סומנו "בבניין הזה"
     *     במקום 11 העסקאות שרשומות במספר 86.
     *
     * לכן: כשידוע מספר הבית של הנכס וגם של העסקה — **הם מכריעים**, ורק אז
     * הפוליגון והחלקה משמשים. מספרים שאינם מסכימים פוסלים "בבניין הזה" גם
     * כשהחלקה זהה; והתאמת רחוב+מספר מספיקה גם כשהחלקה שונה — וזה בדיוק המקרה
     * של "הבעש\"ט 9 רחובות", שבו הקדסטר מחזיר חלקה 741 והעסקאות רשומות ב-331.
     */
    const numsKnown = houseNum != null && tNum != null;
    const sameBuilding = numsKnown
      ? sameStreet && tNum === houseNum
      : samePolygon || !!sameParcel;

    let rank: number;
    let label: string;
    if (sameBuilding) {
      rank = 0;
      // ⚠️ עסקה שקדמה לבנייה מחדש היא של המבנה שנהרס, ואסור שתסומן "בבניין הזה"
      // לצד ספירה שאינה כוללת אותה — נמצא בדוח אמיתי: הכרטיס אמר 6 עסקאות
      // בבניין ובטבלה היו 7 שורות שסומנו כך.
      if (rebuiltFromYear != null && Number(String(t.dealDate).slice(0, 4)) < rebuiltFromYear) {
        label = 'בבניין שקדם, לפני הבנייה מחדש';
      } else {
        label = 'בבניין הזה';
      }
    } else if (sameStreet && tNum != null && houseNum != null) {
      rank = 10 + Math.abs(tNum - houseNum);
      label = `באותו רחוב, מספר ${tNum}`;
    } else if (sameStreet) {
      rank = 500;
      label = 'באותו רחוב';
    } else {
      rank = 1000;
      label = 'בסביבה';
    }

    return {
      address: t.address,
      streetName: tStreet || null,
      houseNum: tNum ?? null,
      settlement: t.settlement ?? null,
      date: t.dealDate,
      price: t.price,
      areaSqm: t.areaSqm,
      pricePerSqm: pricePerSqm(t.price, t.areaSqm),
      rooms: t.rooms,
      floor: t.floor,
      gush: t.gush ?? null,
      helka: t.helka ?? null,
      tatHelka: t.tatHelka ?? null,
      parcelLabel: parcelLabel(t),
      dealType: t.dealType ?? null,
      propertyType: t.propertyType ?? null,
      isHomeSale: isHomeSale(t),
      proximityRank: rank,
      proximityLabel: label,
    } as SoldDeal;
  });

  // סימון רשומות שאינן מכירת דירה, או שנראות חריגות. הן נשארות בדוח — זה נתון
  // אמיתי מהמרשם — אבל בלי הסבר הן נראות כמו תקלה, וגרוע מכך: הן מוצגות
  // כ"עסקה אחרונה" ומטעות. שני מקרים אמיתיים שנצפו:
  //   דיזנגוף 100 — 225,000 ₪ על 1 מ"ר (העברת חלק בנכס).
  //   הבעש"ט 9 רחובות — 4,000,000 ₪ על 834 מ"ר, שהיא עסקת **קומבינציה** על
  //   המגרש כולו ולא מכירת דירה; היא נכנסה לחישוב המחיר למ"ר של דירות.
  // ⚠️ סף החריגות נמדד מול **החלון האחרון** ולא מול כל ההיסטוריה. נמצא בדוח
  // אמיתי: עסקה מ-2007 ב-1,600 ₪ למ"ר סומנה כחריגה, בעוד שעסקה מ-2022 ב-3,799
  // נשארה בלי סימון — **וגם נכנסה לחציון** — כי חציון כל ההיסטוריה נמוך בהרבה
  // מחציון השנים האחרונות.
  const RECENT = Date.now() - 60 * 30.44 * 24 * 3600 * 1000;
  const recentPpsqm = mapped
    .filter((d) => d.isHomeSale && new Date(d.date).getTime() >= RECENT)
    .map((d) => d.pricePerSqm)
    .filter((v): v is number => v !== null);
  const allPpsqm = mapped
    .filter((d) => d.isHomeSale)
    .map((d) => d.pricePerSqm)
    .filter((v): v is number => v !== null);
  const mid = recentPpsqm.length >= 5 ? median(recentPpsqm) : median(allPpsqm);
  for (const d of mapped) {
    if (d.proximityLabel === 'בבניין שקדם, לפני הבנייה מחדש') {
      d.suspect = true;
      d.suspectReason =
        'העסקה הזו קדמה לבנייה מחדש במקום, ולכן היא של המבנה שעמד כאן קודם ולא של הבניין הנוכחי. היא מוצגת כי היא נתון אמיתי על החלקה, ואינה נכללת בספירת הדירות בבניין ולא בחישוב המחיר.';
    } else if (!d.isHomeSale) {
      d.suspect = true;
      const what = [d.propertyType, d.dealType].filter(Boolean).join(' · ');
      d.suspectReason =
        `זו אינה מכירת דירה${what ? ` אלא ${what}` : ''}. הרשומה מוצגת כי היא אמיתית, ` +
        'אך היא אינה נכללת בחישוב המחיר למ"ר ואינה נחשבת "העסקה האחרונה".';
    } else if (d.areaSqm != null && d.areaSqm < 15) {
      d.suspect = true;
      d.suspectReason =
        'השטח הרשום קטן מאוד — בדרך כלל מדובר בהעברת חלק בנכס, בחניה או במחסן, ולא במכירת דירה. הרשומה אינה נכללת בחישוב המחיר למ"ר.';
    } else if (
      mid &&
      d.pricePerSqm &&
      // ⚠️ הסימון חל **רק על עסקאות מהתקופה שנמדדה**. נמצא בדוח אמיתי: עסקה
      // מ-2007 ב-1,600 ₪ למ"ר סומנה "רחוק מאוד מהמקובל בסביבה" — בעוד שזה היה
      // בדיוק המקובל ב-2007. השוואת מחיר מ-2003 לחציון של 2026 אינה מזהה חריגה,
      // היא מזהה אינפלציה, ומסמנת כחשודות עסקאות תקינות לגמרי.
      new Date(d.date).getTime() >= RECENT &&
      (d.pricePerSqm > mid * 2.5 || d.pricePerSqm < mid / 2.5)
    ) {
      d.suspect = true;
      d.suspectReason =
        'המחיר למ"ר רחוק מאוד מהמקובל בסביבה בשנים האחרונות. ייתכן שזו עסקה בין קרובים, מכירת חלק בנכס, או טעות דיווח. הרשומה מוצגת כי היא אמיתית, אך אינה נכללת בחישוב המחיר למ"ר.';
    }
  }

  mapped.sort((a, b) => {
    if (a.proximityRank !== b.proximityRank) return a.proximityRank - b.proximityRank;
    return a.date < b.date ? 1 : -1; // בתוך אותה קרבה — מהחדש לישן
  });
  return mapped;
}

/**
 * חציון.
 *
 * ⚠️ תוקן אחרי שנמצא בדוח אמיתי: עבור שתי מכירות ב-19,000 וב-21,538 ₪ למ"ר
 * הוצג 21,538 — כלומר הגבוה מהשניים ולא החציון (20,269). המימוש הקודם לקח
 * תמיד את האיבר באמצע, ובמספר זוגי של פריטים זה מטה את התוצאה כלפי מעלה.
 */
function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  if (s.length % 2 === 1) return s[mid];
  return Math.round((s[mid - 1] + s[mid]) / 2);
}

/** מזהה עסקה לצורך הצלבה בין חישוב לתצוגה. */
export function dealIdentity(
  date: string | null | undefined,
  price: number | null | undefined,
  area: number | null | undefined,
): string {
  return `${String(date ?? '').slice(0, 10)}|${price ?? ''}|${area ?? ''}`;
}

export interface PriceBand {
  median: number | null;
  count: number;
  /**
   * שטחי העסקאות שנכללו בחלון — **אותה קבוצה** שממנה חושב החציון.
   *
   * ⚠️ נוסף אחרי כשל אמיתי: אזהרת תמהיל הגדלים חישבה את הגודל החציוני על כל
   * ההיסטוריה בעוד שהמחיר חושב על חלון של חמש שנים, והתוצאה הייתה אזהרה
   * **שקרית** — "הגודל החציוני באזור 130 מ״ר מול 213 מ״ר בנכס" כשבפועל
   * הגודל החציוני בעסקאות שנכללו היה 200 מ״ר, כלומר כמעט זהה לנכס. אזהרה
   * שגויה גרועה מהיעדר אזהרה: היא שולחת את הקונה להוריד מספר שהיה תקין.
   */
  areas: number[];
  /**
   * מזהי העסקאות שנכללו — כדי שהטבלה תוכל להבטיח שהן מוצגות.
   *
   * ⚠️ נמצא בדוח אמיתי: "מחיר למ"ר ברחוב 22,222" הוצג כחציון של חמש מכירות,
   * ואף שורה בטבלה לא נשאה את המספר הזה — כלומר הלקוח לא יכול לאמת את המספר
   * שהדוח מבסס עליו את ההשוואה. אם מספר מוצג, העסקאות שמאחוריו חייבות להיות
   * בטבלה.
   */
  keys: string[];
  /** חלון הזמן שנבחר בפועל, בחודשים. null = כל ההיסטוריה. */
  months: number | null;
  /** תיאור החלון בעברית מדוברת, להצגה ליד המספר. */
  windowLabel: string;
}

/**
 * חציון מחיר למ"ר בחלון זמן — עם הרחבת החלון עד שיש די עסקאות.
 *
 * ⚠️ בלי חלון זמן המספר הוא חסר משמעות. נמדד בפועל בהבעש"ט 9 רחובות: חציון על
 * כל ההיסטוריה יצא 11,867 ₪ למ"ר, כי הוא ערבב עסקאות מ-2001 (6,431 ₪ למ"ר)
 * עם עסקאות מ-2026 (21,538 ₪ למ"ר). לקוח שמשלם על דוח ורואה "מחיר למ"ר באזור
 * 11,867" מול מחיר מבוקש של 21,000 יסיק בדיוק את המסקנה ההפוכה מהנכונה.
 */
const WINDOW_LABEL: Record<number, string> = {
  12: 'בשנה האחרונה',
  24: 'בשנתיים האחרונות',
  36: 'בשלוש השנים האחרונות',
  60: 'בחמש השנים האחרונות',
};

export function priceBand(
  txns: Transaction[],
  opts: {
    minCount?: number;
    now?: Date;
    /**
     * חלון זמן מועדף. משמש כדי ששלוש שכבות ההשוואה (בניין / רחוב / אזור)
     * יימדדו באותו חלון — אחרת "באזור 24,286" מול "ברחוב 21,923" נראה כפער
     * גיאוגרפי בעוד שהוא פער של שנה בין החלונות, וזו מסקנה שגויה ללקוח.
     */
    windowMonths?: number | null;
  } = {},
): PriceBand {
  const minCount = opts.minCount ?? 5;
  const now = (opts.now ?? new Date()).getTime();
  const MONTH = 30.44 * 24 * 3600 * 1000;

  /** אותה קבוצת עסקאות מחזירה גם את המחירים למ"ר וגם את השטחים. */
  const setIn = (months: number | null): { values: number[]; areas: number[]; keys: string[] } => {
    const cutoff = months == null ? -Infinity : now - months * MONTH;
    const values: number[] = [];
    const areas: number[] = [];
    const keys: string[] = [];
    for (const t of txns) {
      const ts = new Date(t.dealDate).getTime();
      if (months != null && (!Number.isFinite(ts) || ts < cutoff)) continue;
      const p = pricePerSqm(t.price, t.areaSqm);
      if (p === null) continue;
      values.push(p);
      if (t.areaSqm != null) areas.push(t.areaSqm);
      keys.push(dealIdentity(t.dealDate, t.price, t.areaSqm));
    }
    return { values, areas, keys };
  };

  const pack = (s: { values: number[]; areas: number[]; keys: string[] }, months: number | null, label: string): PriceBand => ({
    median: median(s.values),
    count: s.values.length,
    areas: s.areas,
    keys: s.keys,
    months,
    windowLabel: label,
  });

  // חלון מועדף — נשתמש בו אם יש בו לפחות שתי עסקאות.
  if (opts.windowMonths) {
    const s = setIn(opts.windowMonths);
    if (s.values.length >= Math.min(minCount, 2)) {
      return pack(
        s,
        opts.windowMonths,
        WINDOW_LABEL[opts.windowMonths] ?? `ב-${opts.windowMonths} החודשים האחרונים`,
      );
    }
  }

  for (const m of [12, 24, 36, 60]) {
    const s = setIn(m);
    if (s.values.length >= minCount) return pack(s, m, WINDOW_LABEL[m]);
  }

  // פחות מ-minCount גם בחמש שנים — לוקחים מה שיש ואומרים זאת.
  const recent = setIn(60);
  if (recent.values.length) return pack(recent, 60, WINDOW_LABEL[60]);

  const all = setIn(null);
  return pack(all, null, 'בכל ההיסטוריה שנרשמה — אין עסקאות מחמש השנים האחרונות');
}

// ---------- הרכבה ----------

/** פרטי נכס אופציונליים שהמשתמש הזין. אף אחד מהם אינו חובה. */
export interface PropertyInput {
  entrance?: string | null;
  floor?: string | null;
  rooms?: string | null;
  /**
   * תת-חלקה כפי שהוזנה בטופס (§1 במפרט).
   *
   * ⚠️ אין מקור ציבורי שממפה תת-חלקה לדירה — הרישום הזה חי בטאבו בלבד. לכן
   * הערך נשמר, מוצג בכותרת ומשמש לשיוך נסח טאבו לנכס, אך **אינו** מסנן
   * עסקאות: סינון לפיו היה מציג "אין עסקאות" בבניין שיש בו עשרות.
   */
  tatHelka?: string | null;
  /** מספר הדירה בכניסה, כפי שהוזן. משמש לזיהוי הנכס ולקישור הקבוע. */
  apartment?: string | null;
  /**
   * לדלג על משיכת המודעות (Apify) — סעיף בתשלום.
   *
   * ⚠️ אין כאן מטמון: כל רינדור של הדוח בונה אותו מחדש, כולל הקריאות בתשלום.
   * המצגת אינה מציגה מודעות **באף שקופית**, ולכן `/api/deck` היה משלם על
   * משיכה שאיש לא רואה — בכל לחיצה על "הורדת המצגת". הדגל הזה מיועד למסלול
   * הזה בלבד; המסך וה-PDF כן מציגים את הסעיף וממשיכים למשוך אותו.
   */
  skipListings?: boolean;
  /** ברירת המחדל היא מגורים — כך התנהג הדוח מאז ומתמיד. */
  assetType?: AssetType | string | null;
}

export async function buildReport(
  q: string,
  tier: ReportTier = 'basic',
  input: PropertyInput = {},
): Promise<PropertyReport> {
  const now = new Date().toISOString();
  const warnings: string[] = [];
  const parsed = parseQuery(q);
  let costUsd = 0;
  const assetType: AssetType = isAssetType(input.assetType) ? input.assetType : 'residential';

  // --- שלב 0: פענוח שם הרחוב לפני האיתור ---
  //
  // ⚠️ הסדר הזה קריטי. אם מחפשים קודם את הכתובת כפי שהוקלדה, שם מוכר-בפי-הבריות
  // שאינו קיים במרשם הרשמי שולח את שירות האיתור לרחוב אחר לגמרי.
  // נבדק בפועל: "האתרוג 5 חצור הגלילית" הגיע לגוש 14052 במקום לגוש 13893,
  // כי הרחוב הרשמי הוא "דרך מרדכי" ו"אתרוג" הוא רק כינוי שלו.
  // לכן: קודם מתרגמים לשם הרשמי, ורק אז מאתרים.
  let streetResolved: ResolvedName | null = null;
  if (parsed.city && parsed.street) {
    try {
      streetResolved = await resolveStreet(parsed.city, parsed.street);
    } catch {
      /* נמשיך עם מה שהוקלד */
    }
  }

  const searchAddress =
    streetResolved && streetResolved.matchedByAlias
      ? [streetResolved.official, parsed.houseNum ?? '', parsed.city ?? ''].join(' ').replace(/\s+/g, ' ').trim()
      : parsed.raw;

  if (streetResolved?.matchedByAlias) {
    warnings.push(
      `חיפשת לפי "${streetResolved.matchedAs}" — זהו שם מוכר של הרחוב, ` +
        `אבל השם הרשמי שלו הוא "${streetResolved.official}". הדוח מתייחס לרחוב הנכון.`,
    );
  }

  // --- מיקום ---
  let lat: number | null = null;
  let lng: number | null = null;
  let itmX: number | null = null;
  let itmY: number | null = null;
  let matchedLabel: string | null = null;
  /** האם היישוב בתוצאת האיתור אומת מול מה שהוזן. */
  let geoCityVerified = false;

  // הזנת גוש/חלקה עוקפת את שירות האיתור לגמרי — החלקה עצמה נותנת את הנקודה.
  let parcelDirect: Awaited<ReturnType<typeof parcelByGushHelka>> = null;
  if (parsed.kind === 'parcel' && parsed.gush && parsed.helka) {
    try {
      parcelDirect = await parcelByGushHelka(parsed.gush, parsed.helka);
      if (parcelDirect?.centroidItm) {
        itmX = parcelDirect.centroidItm.x;
        itmY = parcelDirect.centroidItm.y;
        const wgs = itmToWgs84(itmX, itmY);
        lat = wgs.lat;
        lng = wgs.lng;
        matchedLabel = `גוש ${parsed.gush} חלקה ${parsed.helka}`;
      } else {
        warnings.push(
          `לא נמצאה חלקה רשומה בגוש ${parsed.gush} חלקה ${parsed.helka}. ` +
            'כדאי לבדוק שהמספרים נכונים.',
        );
      }
    } catch {
      warnings.push('מרשם החלקות לא היה זמין כרגע.');
    }
  }

  if (parsed.kind === 'address') {
    try {
      let candidates = await geocodeAddress(searchAddress);
      let chosen = candidates.find((c) => c.cityVerified) ?? candidates[0] ?? null;

      // ⚠️ החלפה לשם הרשמי עלולה להזיק כששם הרחוב מכיל שם של יישוב אחר.
      // נבדק: "שדרות ירושלים 30 יפו" הפך ל"שד' ירושלים 30 יפו", ושירות האיתור
      // נתפס למילה "ירושלים" והחזיר כתובת בירושלים. לכן אם התוצאה לא אומתה
      // מול היישוב המבוקש — חוזרים ומנסים עם מה שהוקלד במקור.
      if ((!chosen || !chosen.cityVerified) && searchAddress !== parsed.raw) {
        const retry = await geocodeAddress(parsed.raw);
        const better = retry.find((c) => c.cityVerified);
        if (better) {
          candidates = retry;
          chosen = better;
        }
      }

      if (chosen) {
        lat = chosen.lat;
        lng = chosen.lng;
        itmX = chosen.itmX;
        itmY = chosen.itmY;
        matchedLabel = chosen.label;
        geoCityVerified = chosen.cityVerified;
        if (!chosen.cityVerified) {
          warnings.push(
            `לא הצלחנו לאמת שהכתובת שנמצאה היא בדיוק זו שחיפשת. המערכת זיהתה "${chosen.label}". כדאי לבדוק שזו אכן הכתובת הנכונה.`,
          );
        }
      }
    } catch {
      warnings.push('שירות איתור הכתובות לא היה זמין כרגע, ולכן חלק מהנתונים חסרים.');
    }
  }

  // גוגל כמקור גיבוי ואימות צולב.
  //
  // ⚠️ נדרש לא רק כשאין תוצאה, אלא גם כשהתוצאה הממשלתית שגויה: נבדק על
  // "שדרות ירושלים 30 יפו", ששירות האיתור הממשלתי החזיר עבורו כתובת בירושלים.
  // אם גוגל מחזיר תוצאה שהיישוב בה כן תואם את מה שהוזן — היא עדיפה.
  //
  // ⚠️ ברמה החינמית גוגל אינו נקרא כלל — גיאוקוד שלו נגבה לכל בקשה, ו-§2
  // במפרט מחייב שהדוח החינמי לא יעלה לנו דבר. במקומו מנוסה Nominatim/OSM,
  // שהוא חינמי לחלוטין; אם גם הוא לא מאמת, הדוח אומר זאת במפורש במקום לשלם.
  if (
    googleConfigured() &&
    tierMayUsePaidSources(tier) &&
    parsed.kind === 'address' &&
    (lat == null || !geoCityVerified)
  ) {
    const g = await geocodeGoogle(searchAddress === parsed.raw ? parsed.raw : searchAddress);
    if (g) {
      // ⚠️ גוגל מסיים כל כתובת ב", ישראל". אימות היישוב בודק את סוף המחרוזת,
      // ולכן בלי הסרת שם המדינה הוא משווה מול "ישראל" ותמיד נכשל.
      const formattedNoCountry = g.formatted.replace(/,\s*(ישראל|Israel)\s*$/, '').trim();
      const googleVerifies = parsed.city
        ? verifyCity(parsed.raw, formattedNoCountry) ||
          cityAppearsAsToken(parsed.city, formattedNoCountry)
        : false;
      if (lat == null || googleVerifies) {
        lat = g.lat;
        lng = g.lng;
        // הנקודה מגוגל היא WGS84; צריך להמיר לרשת ישראל בשביל הקדסטר והתכנון.
        const p = wgs84ToItm(g.lat, g.lng);
        if (isPlausibleItm(p.x, p.y)) {
          itmX = p.x;
          itmY = p.y;
        }
        matchedLabel = g.formatted;
        if (googleVerifies) {
          geoCityVerified = true;
          // האזהרה הקודמת על זיהוי לא ודאי כבר אינה נכונה.
          const i = warnings.findIndex((w) => w.startsWith('לא הצלחנו לאמת'));
          if (i >= 0) warnings.splice(i, 1);
        }
      }
    }
  }

  // הגיבוי החינמי לרמה החינמית: Nominatim/OSM. הוא פחות מדויק מגוגל ולכן הוא
  // מתקבל רק כשאין נקודה בכלל, או כשהוא מצליח לאמת את היישוב שהוזן.
  if (!tierMayUsePaidSources(tier) && parsed.kind === 'address' && (lat == null || !geoCityVerified)) {
    try {
      const [osm] = await geocodeAddress(searchAddress, { skipGovmap: true });
      if (osm && (lat == null || osm.cityVerified)) {
        lat = osm.lat;
        lng = osm.lng;
        if (isPlausibleItm(osm.itmX, osm.itmY)) {
          itmX = osm.itmX;
          itmY = osm.itmY;
        }
        matchedLabel = osm.label;
        if (osm.cityVerified) {
          geoCityVerified = true;
          const i = warnings.findIndex((w) => w.startsWith('לא הצלחנו לאמת'));
          if (i >= 0) warnings.splice(i, 1);
        }
      }
    } catch {
      /* המסלול הראשי כבר נתן נקודה או שכבר נרשמה אזהרה */
    }
  }

  // --- גוש/חלקה ---
  let gush: string | null = parsed.gush ?? null;
  let helka: string | null = parsed.helka ?? null;
  let cityFromParcel: string | null = null;
  let parcelAreaSqm: number | null = null;
  /** מאיפה הגיעו הגוש והחלקה בפועל — נשמר במפורש, ולא מנוחש בדיעבד. */
  let parcelSource: ParcelIdentity['parcelSource'] = null;

  if (parcelDirect) {
    // הגיע ישירות מהזנת גוש/חלקה — אין צורך לשאול שוב לפי נקודה.
    gush = parcelDirect.gush;
    helka = parcelDirect.helka;
    cityFromParcel = parcelDirect.localityName ?? null;
    parcelAreaSqm = parcelDirect.legalAreaSqm ?? null;
    parcelSource = 'user-input';
  } else if (itmX != null && itmY != null) {
    try {
      const parcel = await parcelAtPoint(itmX, itmY);
      if (parcel) {
        gush = parcel.gush ?? gush;
        helka = parcel.helka ?? helka;
        cityFromParcel = parcel.localityName ?? null;
        parcelAreaSqm = parcel.legalAreaSqm ?? null;
        parcelSource = 'cadastre';
      } else {
        warnings.push(
          'לא נמצאה חלקה רשומה בנקודה הזו. זה קורה בכבישים, בשטחים ציבוריים ובאזורים שטרם הוסדרו.',
        );
      }
    } catch {
      warnings.push('מרשם החלקות לא היה זמין כרגע.');
    }
  }

  const city = tidyCity(cityFromParcel || parsed.city || null);

  if (
    city &&
    matchedLabel &&
    parsed.city &&
    !verifyCity(parsed.raw, city) &&
    // "יפו" מול "תל אביב-יפו" הוא אותו יישוב, ואין על מה להזהיר.
    !cityAppearsAsToken(parsed.city, city)
  ) {
    warnings.push(
      `היישוב שחיפשת אינו תואם את היישוב שבו נמצאת הנקודה (${city}). ייתכן שזוהתה כתובת אחרת.`,
    );
  }

  // --- שמות מקומות: רשמי + מוכר בפי הבריות ---
  let neighborhood: ResolvedName | null = null;
  let nbInfo: NeighborhoodInfo | null = null;
  let junction: Junction | null = null;

  // אם לא הייתה עיר בשאילתה, לא היה אפשר לפענח את הרחוב מראש.
  // עכשיו מרשם החלקות מסר את היישוב האמיתי — אפשר לנסות שוב.
  if (!streetResolved && city && parsed.street) {
    try {
      streetResolved = await resolveStreet(city, parsed.street);
    } catch {
      /* שמות חלופיים הם העשרה, לא תנאי */
    }
  }

  if (lat != null && lng != null) {
    junction = await nearestJunction(lat, lng).catch(() => null);
  }

  // --- מקורות במקביל ---
  //
  // ⚠️ `queryPlansAtPoint` (מרשם התכניות) נמשך כאן ולא בתוך `buildPermits`, כדי
  // שסעיף ההיתרים יקבל את **אותה** תשובת ייעוד קרקע שכל שאר הדוח מסתמך עליה.
  // שתי שאילתות נפרדות לאותה נקודה יכולות לחזור שונות, ואז אותו דוח מציג שני
  // ייעודים לאותו מגרש.
  const [
    dealsRes,
    cbsRes,
    planningRes,
    renewalRes,
    popRes,
    svRes,
    plansRes,
    rentRes,
    ramiRes,
    nearbyPlansRes,
  ] = await Promise.allSettled([
    lat != null && lng != null
      ? fetchDealsAtPoint(lat, lng, {
          street: parsed.street,
          houseNum: parsed.houseNum,
          // הכינויים כבר פוענחו למעלה — בלעדיהם בורר הפוליגונים משווה מול
          // השם הרשמי בלבד ומפספס עסקאות שנרשמו תחת הכינוי.
          aliases: streetResolved?.aliases ?? [],
          // ⚠️ "אל תפספס עסקאות" מחייב היקף גדול. נמדד בפועל סביב
          // "הבעש״ט 9 רחובות": 47 בנייני-עסקאות ברדיוס 150 מ'. שאילתה על 6
          // מהם בלבד השמיטה בשקט את רוב עסקאות ההשוואה בסביבה.
          maxPolygons: tier === 'basic' ? 10 : 26,
        })
      : Promise.resolve(null),
    fetchHousingIndex(24),
    itmX != null && itmY != null ? queryPlanningAtPoint(itmX, itmY) : Promise.resolve(null),
    itmX != null && itmY != null ? checkRenewal(itmX, itmY) : Promise.resolve(null),
    city ? populationProfile(city, { lat, lng, street: parsed.street }) : Promise.resolve(null),
    // צילום הבניין הוא פריט VIP (§2), ולכן גם בדיקת הזמינות שלו נשאלת רק שם —
    // אין טעם להצהיר "יש צילום" ברמה שלא מציגה אותו.
    lat != null && lng != null && googleConfigured() && tierMayUseImagery(tier)
      ? streetViewMeta(lat, lng)
      : Promise.resolve(null),
    itmX != null && itmY != null ? queryPlansAtPoint(itmX, itmY) : Promise.resolve([] as PlanRecord[]),
    assetType === 'rental' ? fetchRentIndex(24) : Promise.resolve(null),
    assetType === 'land' ? fetchAgriculturalRezoningPolicy(true) : Promise.resolve(null),
    // §12 · פרימיום ומעלה בלבד — כמו צילום הבניין (tierMayUseImagery), הבדיקה
    // עצמה נשאלת רק ברמה שמציגה אותה, כדי שלא תוכל להתקיים "יש תוכניות
    // בסביבה" ברמה שלא מציגה את הסעיף.
    itmX != null && itmY != null && tierMayUsePaidSources(tier)
      ? nearbyConstructionPlans(itmX, itmY)
      : Promise.resolve(null),
  ]);

  const deals = dealsRes.status === 'fulfilled' ? dealsRes.value : null;
  const cbs = cbsRes.status === 'fulfilled' ? cbsRes.value : null;
  const planning = planningRes.status === 'fulfilled' ? planningRes.value : null;
  const renewal = renewalRes.status === 'fulfilled' ? renewalRes.value : null;
  const population = popRes.status === 'fulfilled' ? popRes.value : null;
  const streetViewMetaRes = svRes.status === 'fulfilled' ? svRes.value : null;
  /**
   * §3 · ההחלטה אם בכלל להציג צילום נלקחת כאן, ולא בזמן ההצגה: המסך צריך
   * לדעת מראש אם יש תמונה שאפשר לסמוך עליה, כדי לכתוב "צילום מדויק לא זמין"
   * ואת הסיבה — במקום לנסות לטעון תמונה ולגלות בדיעבד.
   */
  const svAim =
    streetViewMetaRes && lat != null && lng != null
      ? aimQuality(streetViewMetaRes, lat, lng)
      : null;
  const streetView: (StreetView & { precise: boolean; aimReason: string | null }) | null =
    streetViewMetaRes
      ? {
          ...streetViewMetaRes,
          precise: !!svAim?.ok,
          aimReason: svAim?.ok ? null : svAim?.reason ?? null,
        }
      : null;
  const plans: PlanRecord[] = plansRes.status === 'fulfilled' ? plansRes.value : [];
  const rentIndex = rentRes.status === 'fulfilled' ? rentRes.value : null;
  const ramiPolicy = ramiRes.status === 'fulfilled' ? ramiRes.value : null;
  const nearbyPlans = nearbyPlansRes.status === 'fulfilled' ? nearbyPlansRes.value : null;

  // סעיף ההיתרים נבנה מאותה משיכה — בלי שאילתה נוספת.
  //
  // חריג יחיד: כשהנקודה עצמה אינה מכוסה כלל במפה המקוונת, נשאלת שאלה שנייה
  // ברדיוס 150 מ' — לא כדי לייחס למגרש את הייעוד של השכן, אלא כדי להוכיח
  // ללקוח שמדובר בחור כיסוי ולא ב"אין תכניות כאן". ההבחנה הזו היא ההבדל בין
  // "אין מידע" לבין "אין תכנית", ושני המשפטים אומרים דברים הפוכים.
  let nearbyPlanning: NearbyPlanning | null = null;
  const gap =
    itmX != null &&
    itmY != null &&
    plansRes.status === 'fulfilled' &&
    planningRes.status === 'fulfilled' &&
    plans.length === 0 &&
    (planning?.appliedPlans.length ?? 0) === 0;
  if (gap && itmX != null && itmY != null) {
    const NEAR_M = 150;
    const [nearLand, nearPlans] = await Promise.allSettled([
      queryLandUseNear(itmX, itmY, NEAR_M),
      queryPlansAtPoint(itmX, itmY, NEAR_M),
    ]);
    if (nearLand.status === 'fulfilled') {
      // הוועדה נלקחת רק מתכנית שתחום השיפוט שלה הוא היישוב עצמו — כך ועדה
      // מרחבית של יישוב שכן אינה מוצגת כוועדה של הנכס.
      const single = (v: string | null) => !!v && !v.includes(',');
      const sameCity = (v: string | null) =>
        !!v && !!city && (v.trim() === city.trim() || v.includes(city.trim()));
      const localPlan = (nearPlans.status === 'fulfilled' ? nearPlans.value : []).find(
        (p) => single(p.committee) && sameCity(p.jurisdiction),
      );
      nearbyPlanning = {
        ...nearLand.value,
        plans: nearPlans.status === 'fulfilled' ? nearPlans.value.length : 0,
        committee: localPlan?.committee ?? null,
        planningSpace: localPlan?.planningSpace ?? null,
      };
    }
  }

  const permits =
    itmX != null && itmY != null
      ? composePermits(plans, planning, {
          failed: {
            plans: plansRes.status === 'rejected',
            land: planningRes.status === 'rejected',
          },
          nearby: nearbyPlanning,
          city,
        })
      : null;

  // §7 · "היתכנות להיתר נוסף" — המגבלות שמסומנות בפועל על התשריט של החלקה
  // (קווי בניין, הריסה, שימור, עתיקות), ומהן התשובה לשאלה מה אפשר להוסיף.
  const constraints =
    itmX != null && itmY != null ? await parcelConstraints(itmX, itmY).catch(() => null) : null;
  const feasibility = buildFeasibility(permits, constraints, { city });

  if (dealsRes.status === 'rejected') warnings.push('נתוני העסקאות לא נטענו כרגע.');
  if (cbsRes.status === 'rejected') warnings.push('מדד מחירי הדירות לא נטען כרגע.');
  if (assetType === 'rental' && rentRes.status === 'rejected') {
    warnings.push('מדד שכר הדירה של הלמ"ס לא נטען כרגע.');
  }
  if (assetType === 'land' && ramiRes.status === 'rejected') {
    warnings.push('קובץ החלטות מועצת מקרקעי ישראל לא נטען כרגע, ולכן פרק המדיניות חסר בדוח הזה.');
  }

  const allTxns: Transaction[] = deals?.transactions ?? [];
  const parcelTxns = filterToParcel(allTxns, gush, helka);

  // כל שמות הרחוב — הרשמי, מה שהוקלד, וכל הכינויים.
  const streetNames = [
    streetResolved?.official,
    parsed.street,
    ...(streetResolved?.aliases ?? []),
  ].filter(Boolean) as string[];

  // --- זיהוי הבניין ---
  //
  // שרשרת שלושה שלבים, מהאמין לפחות אמין. הסדר הזה הוא התיקון של התקלה
  // המהותית שהתגלתה באימות: הקדסטר והעסקאות יכולים לחלוק על מספר החלקה,
  // ואז "הבניין הזה" לפי הקדסטר יוצא ריק למרות שנמכרו בו דירות.
  // ⚠️ `exactPolygon` ולא `polygon`: הראשון הוא בניין באותה כתובת בדיוק, השני
  // הוא רק ההתאמה הטובה ביותר. ראה ההסבר ב-DealsLookup — שימוש ב-`polygon`
  // שייך את העסקאות של "הדקל 38" לכתובת "הדקל 22" שאין בה עסקאות כלל.
  const buildingPolygonId = deals?.exactPolygon?.polygonId ?? null;
  const byPolygon = filterToBuilding(allTxns, buildingPolygonId);
  const byAddress = filterToAddress(allTxns, streetNames, parsed.houseNum ?? null);

  /**
   * 🔴 סדר השרשרת התהפך, ומדידה היא הסיבה.
   *
   * גם `exactPolygon` וגם החלקה מתגלים כמקבצים **כמה בניינים** (ראה ההסבר
   * המלא ב-`sortByProximity`). כשידוע מספר הבית, ההתאמה לפי רחוב+מספר היא
   * ההגדרה של "הבניין המדויק" שהמפרט דורש, והיא קודמת לשתיהן. הפוליגון
   * והחלקה נשארים כגיבוי — אבל מסוננים כך שלא יגררו עסקאות ממספר בית אחר.
   */
  const hasHouseNum = parsed.houseNum != null;
  const sameHouseOnly = (list: Transaction[]) =>
    hasHouseNum ? list.filter((t) => t.houseNum == null || t.houseNum === parsed.houseNum) : list;
  const polygonSameHouse = sameHouseOnly(byPolygon);
  const parcelSameHouse = sameHouseOnly(parcelTxns);

  let buildingTxns: Transaction[];
  let matchedBy: BuildingIdentity['matchedBy'];
  if (hasHouseNum && byAddress.length) {
    buildingTxns = byAddress;
    matchedBy = 'address';
  } else if (polygonSameHouse.length) {
    buildingTxns = polygonSameHouse;
    matchedBy = 'polygon';
  } else if (parcelSameHouse.length) {
    buildingTxns = parcelSameHouse;
    matchedBy = 'parcel';
  } else if (byAddress.length) {
    buildingTxns = byAddress;
    matchedBy = 'address';
  } else {
    buildingTxns = [];
    matchedBy = 'none';
  }

  const registeredGush = buildingTxns.find((t) => t.gush)?.gush ?? null;
  const registeredHelka = buildingTxns.find((t) => t.helka)?.helka ?? null;
  const parcelMismatch =
    !!registeredHelka && !!helka && String(registeredHelka) !== String(helka);

  // --- גיל הבניין ---
  const ageInfo = buildingAge(buildingTxns);

  /**
   * עסקאות **הבניין הנוכחי**.
   *
   * ⚠️ נמצא בדוח אמיתי: הדוח קבע שהבניין נבנה מחדש ב-2023 אחרי עסקת קומבינציה
   * ב-2020, ובאותה נשימה ספר מכירת דירה מ-2001 בתוך "כמה דירות נמכרו בבניין"
   * וברשימת תתי-החלקה. מכירה מ-2001 היא של המבנה **שנהרס**, ולא של הבניין
   * שהלקוח שוקל לקנות בו. היא נשארת בטבלת העסקאות — היא נתון אמיתי על החלקה —
   * אבל אינה נספרת כדירה בבניין הנוכחי.
   */
  const currentBuildingTxns =
    ageInfo?.redevelopmentYear != null
      ? buildingTxns.filter(
          (t) => Number(String(t.dealDate).slice(0, 4)) >= ageInfo.redevelopmentYear!,
        )
      : buildingTxns;
  const priorBuildingSales = buildingTxns.length - currentBuildingTxns.length;
  const buildingHomeSales = currentBuildingTxns.filter(isHomeSale);

  const subParcels = Array.from(
    new Set(
      currentBuildingTxns
        .map((t) => t.tatHelka)
        .filter((v): v is string => !!v && v !== '0')
        .map(String),
    ),
  ).sort((a, b) => Number(a) - Number(b));

  const building: BuildingIdentity = {
    matchedBy,
    polygonId: buildingPolygonId,
    sourceAddress: buildingTxns.find((t) => t.address)?.address ?? null,
    registeredGush,
    registeredHelka,
    parcelMismatch,
    subParcels,
    dealsInBuilding: currentBuildingTxns.length,
    homeSalesInBuilding: buildingHomeSales.length,
    note:
      matchedBy === 'polygon'
        ? 'הבניין זוהה לפי מזהה הבניין של מרשם העסקאות הממשלתי — כלומר בדיוק אותו קיבוץ שהמרשם עצמו עושה לעסקאות של הבניין הזה.'
        : matchedBy === 'parcel'
          ? 'הבניין זוהה לפי הגוש והחלקה שמרשם החלקות מחזיר לנקודת הכתובת.'
          : matchedBy === 'address'
            ? 'הבניין זוהה לפי התאמת רחוב ומספר בית מדויקת בעסקאות עצמן.'
            : 'לא נמצאו עסקאות שניתן לשייך לבניין הזה.',
  };

  // --- ההמרה בשני הכיוונים, עם אימות בלתי תלוי ---
  //
  // הכיוון הראשון (כתובת → גוש/חלקה) מגיע מהקדסטר. הכיוון השני (גוש/חלקה →
  // רחוב ומספר) נלקח **מהעסקאות הרשומות בחלקה עצמה** — הן נושאות את הכתובת
  // כפי שהמרשם רשם אותה, וזה המקור החזק ביותר לכיוון הזה. שירות האיתור הוא
  // גיבוי בלבד, ומסומן ככזה.
  const parcelForAddress = gush && helka ? filterToParcel(allTxns, gush, helka) : [];
  const addressFromDeals = parcelForAddress.find((t) => t.streetName && t.houseNum != null) ?? null;
  // בהזנת גוש/חלקה אין כתובת לחפש איתה — הכתובת עצמה היא התוצר של הכיוון
  // ההפוך, ולכן הקישור לאתר הרשמי נבנה מהכתובת שהעסקאות בחלקה מסרו.
  const cityFromDeals = tidyCity(addressFromDeals?.settlement ?? null);
  const cityFinal = city ?? cityFromDeals;
  const refQuery =
    parsed.kind === 'parcel'
      ? addressFromDeals
        ? `${addressFromDeals.streetName} ${addressFromDeals.houseNum} ${cityFinal ?? ''}`.trim()
        : null
      : searchAddress === parsed.raw
        ? parsed.raw
        : searchAddress;

  // קוד היישוב לקישור הרשמי — מהעסקה בחלקה עצמה, ואם אין, מהיישוב הנפוץ
  // ביותר בעסקאות שנשלפו (כולן באותו אזור).
  const setlCode =
    addressFromDeals?.settlementId ??
    (() => {
      const tally = new Map<number, number>();
      for (const t of allTxns) {
        if (t.settlementId == null) continue;
        tally.set(t.settlementId, (tally.get(t.settlementId) ?? 0) + 1);
      }
      let best: number | null = null;
      let bestN = 0;
      for (const [id, n] of tally) if (n > bestN) { best = id; bestN = n; }
      return best;
    })();

  const [validity, officialRef] = await Promise.all([
    gush && helka ? parcelValidity(gush, helka) : Promise.resolve(null),
    refQuery ? nadlanAddressRef(refQuery, setlCode) : Promise.resolve(null),
  ]);

  const identityStreet = addressFromDeals?.streetName ?? streetResolved?.official ?? parsed.street ?? null;
  const identityHouse = addressFromDeals?.houseNum ?? parsed.houseNum ?? null;
  const identityAddressSource: ParcelIdentity['addressSource'] = addressFromDeals
    ? 'deals'
    : parsed.kind === 'address'
      ? 'user-input'
      : matchedLabel
        ? 'geocode'
        : null;

  // ההצלבה: הכתובת שהמשתמש ביקש והכתובת שהחלקה נושאת הן אותה כתובת.
  const crossChecked =
    parsed.kind === 'parcel'
      ? !!addressFromDeals
      : !!addressFromDeals &&
        addressFromDeals.houseNum === parsed.houseNum &&
        streetNames.some((s) => {
          const a = (addressFromDeals.streetName ?? '').replace(/["'`״׳]/g, '');
          const b = (s ?? '').replace(/["'`״׳]/g, '');
          return !!a && !!b && (a === b || a.includes(b) || b.includes(a));
        });

  const parcelIdentity: ParcelIdentity = {
    gush,
    helka,
    parcelSource,
    parcelVerified: validity ? validity.exists : null,
    subParcelCount: validity?.subParcelCount ?? null,
    leadGush: validity?.leadGush ?? null,
    leadHelka: validity?.leadHelka ?? null,
    street: identityStreet,
    houseNum: identityHouse,
    city: cityFinal,
    addressSource: identityAddressSource,
    crossChecked,
    officialUrl: officialRef?.url ?? null,
    note: null,
  };

  if (parcelIdentity.parcelVerified === false) {
    parcelIdentity.note =
      `מרשם המקרקעין של אתר הנדל"ן הממשלתי אינו מכיר גוש ${gush} חלקה ${helka}. ` +
      'הגוש והחלקה מוצגים כפי שהתקבלו ממרשם החלקות, אבל הם לא אוששו במקור שני — ' +
      'כדאי לאמת בנסח טאבו לפני כל החלטה.';
    warnings.push(parcelIdentity.note);
  } else if (parcelIdentity.leadGush && parcelIdentity.leadHelka) {
    parcelIdentity.note =
      `החלקה הזו אוחדה או חולקה מחדש, והרישום מוביל לגוש ${parcelIdentity.leadGush} ` +
      `חלקה ${parcelIdentity.leadHelka}. חלק מהעסקאות עשויות להיות רשומות שם.`;
    warnings.push(parcelIdentity.note);
  } else if (gush && helka && !crossChecked && parcelForAddress.length === 0) {
    // לא סתירה — פשוט אין עסקאות בחלקה שאפשר לאמת מולן את הכתובת.
    parcelIdentity.note =
      'לא נרשמו עסקאות בחלקה הזו, ולכן אי אפשר היה לאמת את הכתובת מול מרשם העסקאות. ' +
      'הגוש והחלקה מוצגים לפי מרשם החלקות בלבד.';
  }

  // ⚠️ כשאין ולו עסקה אחת שניתן לשייך לבניין — אומרים זאת במפורש ומפנים
  // לעמוד הרשמי, במקום להשלים את החסר מעסקאות של בניין שכן.
  if (matchedBy === 'none' && parcelIdentity.officialUrl) {
    warnings.push(
      'לא נמצאה אף עסקה שניתן לשייך לבניין הזה במרשם העסקאות שאנחנו קוראים. ' +
        'זה קורה בבניינים חדשים, בנכסים שלא נמכרו בהם דירות, ולעיתים גם כשהרישום ' +
        'מופיע רק בעמוד הרשמי של הכתובת. אפשר לבדוק זאת ישירות: ' +
        parcelIdentity.officialUrl,
    );
  }

  if (deals && deals.droppedNoIdentity > 0) {
    warnings.push(
      `הוסתרו ${deals.droppedNoIdentity} רשומות עסקה שחסרים בהן פרטי זיהוי מלאים ` +
        '(גוש, חלקה, רחוב ומספר בית). אי אפשר לאמת אותן מול המקור, ולכן הן אינן מוצגות ' +
        'ואינן נכללות בשום חישוב בדוח.',
    );
  }

  if (parcelMismatch) {
    warnings.push(
      `שימו לב לאי-התאמה אמיתית בין שני מרשמים רשמיים: מרשם החלקות מציב את ` +
        `הכתובת בחלקה ${helka}, ואילו עסקאות המכר בכתובת רשומות בחלקה ${registeredHelka} ` +
        `(אותו גוש ${registeredGush ?? gush}). זה קורה אחרי חלוקה מחדש של חלקות. ` +
        'הדוח מציג את עסקאות הבניין לפי מרשם העסקאות, ואת מספר החלקה לפי שני המרשמים — ' +
        'לפני חתימה על חוזה חשוב לאמת את מספר החלקה בנסח טאבו.',
    );
  }

  // --- דירה או בית פרטי? ---
  const propertyKind = detectPropertyKind(currentBuildingTxns);
  if (propertyKind.kind === 'house' && (input.floor || input.entrance)) {
    // ⚠️ לא מתעלמים בשקט מקלט של המשתמש — אומרים למה הוא לא רלוונטי כאן.
    warnings.push(
      'הנכס זוהה כבית צמוד קרקע, ולכן הדוח מתייחס לבית כולו. מספר הכניסה והקומה שהוזנו אינם משנים את התוצאה.',
    );
  }

  // הסימון "בבניין הזה" נגזר ממזהה הבניין — לא רק מגוש/חלקה, שיכולים לחלוק
  // על העסקאות (ראה BuildingIdentity).
  const soldDeals = sortByProximity(
    allTxns,
    gush,
    helka,
    streetNames,
    parsed.houseNum ?? null,
    buildingPolygonId,
    ageInfo?.redevelopmentYear ?? null,
  );

  // איזה כינוי באמת בשימוש? הכינוי שמופיע ברישומי העסקאות הרשמיים הוא זה
  // שהציבור והרשויות משתמשים בו בפועל, ולכן הוא מוצג ראשון.
  if (streetResolved?.aliases.length) {
    const inRecords = new Set(
      allTxns.map((t) => streetOf(t.address)).filter(Boolean),
    );
    const used = streetResolved.aliases.filter((a) =>
      [...inRecords].some((rec) => rec === a || rec.includes(a) || a.includes(rec)),
    );
    if (used.length) {
      streetResolved = {
        ...streetResolved,
        aliases: [...used, ...streetResolved.aliases.filter((a) => !used.includes(a))],
      };
    }
  }

  if (deals?.droppedFutureDated) {
    warnings.push(
      `${deals.droppedFutureDated} עסקאות הושמטו כי התאריך שלהן עתידי — זו שגיאה במקור הממשלתי.`,
    );
  }
  if (!allTxns.length) warnings.push('לא נמצאו עסקאות מכר שנסגרו בסביבת הנכס.');
  else if (!buildingTxns.length) {
    warnings.push(
      'לא נמצאו עסקאות בבניין הזה עצמו. המחירים שמוצגים הם של נכסים אחרים בסביבה, ' +
        'ולכן גם שנת הבנייה וגיל הבניין אינם ניתנים לגזירה.',
    );
  } else if (!buildingHomeSales.length) {
    warnings.push(
      `בבניין הזה נרשמו ${buildingTxns.length} עסקאות, אך אף אחת מהן אינה מכירת דירה ` +
        '(למשל עסקת קרקע או קומבינציה). המחירים שמוצגים הם של נכסים אחרים בסביבה.',
    );
  }

  // --- שכונה: שם מקומי מול רשמי ---
  //
  // ⚠️ השכונה נלקחת מעסקאות **הבניין** לפני שהיא נלקחת מהאזור. אחרי שהיקף
  // האיסוף הורחב ל-26 בנייני-עסקאות, "העסקה הראשונה במערך" הפכה להיות של בניין
  // שכן, והשכונה שהוצגה הייתה של מקום אחר (נצפה: "שכ אבני חן" במקום
  // "וייסבורג/שקולניק" שהיא השכונה של הבניין).
  // גם הלוכסן שהמקור שם בשם ("וייסבורג\\ שקולניק") מנוקה — הוא נראה כמו תקלה.
  const rawNb =
    buildingTxns.find((t) => t.neighborhood)?.neighborhood ??
    allTxns.find((t) => t.neighborhood)?.neighborhood ??
    null;
  const nbFromDeals = rawNb ? rawNb.replace(/\s*[\\\/]\s*/g, ' / ').replace(/\s+/g, ' ').trim() : null;
  if (city && nbFromDeals) {
    try {
      neighborhood = await resolveStreet(city, nbFromDeals);
      nbInfo = await neighborhoodInfo(city, nbFromDeals);
    } catch {
      /* לא קריטי */
    }
  }

  // --- רקע אנציקלופדי על היישוב והשכונה ---
  //
  // מי שקורא דוח על נכס רוצה לדעת לאן הוא נכנס, ולא רק מה אחוזי המגזרים.
  // שני הערכים נמשכים במקביל ומאומתים מול נקודת הנכס (ראה `lib/wikipedia.ts`);
  // ערך שלא אומת פשוט אינו נכנס, ואז הסעיף מציג את מה שכן ידוע.
  const wikiAt = lat != null && lng != null ? { lat, lng } : null;
  const [localityWiki, neighborhoodWiki] = await Promise.all([
    city ? localityArticle(city, wikiAt).catch(() => null) : Promise.resolve(null),
    localityWikiName(nbInfo?.name ?? nbFromDeals, neighborhood?.official)
      ? neighborhoodArticle(
          localityWikiName(nbInfo?.name ?? nbFromDeals, neighborhood?.official),
          city,
          wikiAt,
        ).catch(() => null)
      : Promise.resolve(null),
  ]);

  // --- מוסדות ותחבורה ---
  //
  // ⚠️ המפרט דורש "את כולם": בתי כנסת, מקוואות, בי״ס, גנים, מוסדות ומסחר, כל
  // אחד בסוגו, בשמו ובמרחקו במטרים. קודם לכן היו שלוש קבוצות בלבד ובלי אף בית
  // כנסת, מקווה או גן. בתי הכנסת נשלפים בחיפוש עם עימוד ולא ב-Nearby, כי
  // Nearby חסום ב-20 תוצאות: נמדד שבאזור הזה יש 60 בתי כנסת, הקרוב ב-45 מ'.
  let education: Place[] = [];
  let preschool: Place[] = [];
  let religion: Place[] = [];
  let commerce: Place[] = [];
  let health: Place[] = [];
  let leisure: Place[] = [];
  let transport: Place[] = [];
  let mikvaot: Mikve[] = [];

  /**
   * ברמה החינמית סעיף הסביבה נבנה מהמרשמים הפתוחים ששמורים אצלנו במטמון —
   * מוסדות החינוך של משרד החינוך, מוסדות ההשכלה של מפ"י ותחנות התחבורה
   * הארציות — ולא מ-Google Places, שנגבה לכל שאילתה.
   *
   * מה שלא ניתן לקבל בחינם נאמר במפורש: המרחק כאן הוא **אווירי**, ואין
   * זמני הליכה אמיתיים; אלה דורשים מטריצת מרחקים בתשלום, והם ברמה המקיפה.
   */
  let freeSurroundings = false;
  if (lat != null && lng != null && itmX != null && itmY != null && !tierMayUsePaidSources(tier)) {
    freeSurroundings = true;
    const toPlace =
      (kind: string) =>
      (p: { name: string | null; meters: number; lat: number | null; lng: number | null }): Place => ({
        name: p.name ?? 'ללא שם',
        kind,
        address: null,
        lat: p.lat ?? 0,
        lng: p.lng ?? 0,
        straightMeters: p.meters,
      });

    const [schools, higher, stops] = await Promise.all([
      nearestPoiFromCache('school', itmX, itmY, { radiusM: 1500, limit: 10 }).catch(() => []),
      nearestPoiFromCache('education_gis', itmX, itmY, { radiusM: 2000, limit: 4 }).catch(() => []),
      nearestPoiFromCache('transport', itmX, itmY, { radiusM: 900, limit: 8 }).catch(() => []),
    ]);
    education = mergePlaces(
      schools.map(toPlace('מוסד חינוך')),
      higher.map(toPlace('מוסד השכלה')),
    );
    transport = stops.map(toPlace('תחנת תחבורה ציבורית'));
    if (!education.length && !transport.length) {
      warnings.push(
        'סעיף הסביבה בדוח הזה נבנה מהמרשמים הפתוחים בלבד, ולא נמצאו בהם מוסדות או תחנות ' +
          'ברדיוס שנבדק. רשימה מלאה של מוסדות, מסחר ובריאות עם זמני הליכה אמיתיים מופיעה בדוח המקיף.',
      );
    }
  } else if (lat != null && lng != null && googleConfigured()) {
    const deep = tier !== 'basic';
    const [ed, pre, rel, com, hea, lei, tr] = await Promise.allSettled([
      nearbyPlaces(lat, lng, 'education', { radiusM: 1500, perType: deep }),
      nearbyPlaces(lat, lng, 'preschool', { radiusM: 1000, perType: deep }),
      deep
        ? searchTextPlaces(lat, lng, {
            query: 'בית כנסת',
            includedType: 'synagogue',
            radiusM: 1500,
            maxPages: 3,
          })
        : nearbyPlaces(lat, lng, 'religion', { radiusM: 1000 }),
      nearbyPlaces(lat, lng, 'commerce', { radiusM: 1200, perType: deep }),
      nearbyPlaces(lat, lng, 'health', { radiusM: 1500, perType: deep }),
      nearbyPlaces(lat, lng, 'leisure', { radiusM: 1200, perType: deep }),
      nearbyPlaces(lat, lng, 'transport', { radiusM: 900 }),
    ]);
    education = ed.status === 'fulfilled' ? ed.value : [];
    preschool = pre.status === 'fulfilled' ? pre.value : [];
    religion = rel.status === 'fulfilled' ? rel.value : [];
    commerce = com.status === 'fulfilled' ? com.value : [];
    health = hea.status === 'fulfilled' ? hea.value : [];
    leisure = lei.status === 'fulfilled' ? lei.value : [];
    transport = tr.status === 'fulfilled' ? tr.value : [];

    // ⚠️ סיווג מחדש לפי שם: גן/מעון שגוגל תייג כבית ספר מגיע בשליפת החינוך
    // ולא בשליפת הגנים, ולכן הוא נשאר ברשימה הלא נכונה — נמצא בדוח אמיתי שבו
    // "גן ריקי" הופיע תחת מוסדות חינוך והיה קרוב יותר מ"גן הילדים הקרוב ביותר".
    const movedToPreschool = education.filter((p) => isPreschoolName(p.name));
    if (movedToPreschool.length) {
      education = education.filter((p) => !isPreschoolName(p.name));
      preschool = mergePlaces(preschool, movedToPreschool);
    }

    // ספירת עלות אמיתית: קריאה לכל סוג במצב מעמיק, ושלושה עמודי חיפוש טקסט.
    const placeCalls = deep ? 4 + 2 + 5 + 5 + 4 + 1 + 3 : 7;
    costUsd += placeCalls * 0.032;

    // זמני הליכה — רק לקרובים בכל קבוצה. כל יעד מתומחר בנפרד.
    if (deep) {
      await Promise.allSettled([
        addWalkingTimes(lat, lng, education, 5),
        addWalkingTimes(lat, lng, preschool, 4),
        addWalkingTimes(lat, lng, religion, 5),
        addWalkingTimes(lat, lng, commerce, 4),
        addWalkingTimes(lat, lng, health, 4),
        addWalkingTimes(lat, lng, leisure, 3),
        addWalkingTimes(lat, lng, transport, 5),
      ]);
      costUsd += 30 * 0.005;
    } else {
      await Promise.allSettled([
        addWalkingTimes(lat, lng, transport, 3),
        addWalkingTimes(lat, lng, education, 2),
      ]);
      costUsd += 5 * 0.005;
    }
  } else if (!googleConfigured()) {
    warnings.push('שירות המפות אינו מחובר, ולכן אין רשימת מוסדות ומרחקים.');
  }

  // ⚠️ בית חולים אינו בטווח הליכה, ולכן חיפוש הבריאות ברדיוס של קילומטר וחצי
  // אינו מוצא אותו — והדוח שתק לגמרי בנושא. נמצא בדוח על חצור הגלילית: אפס
  // אזכורים של בית חולים ואף שדה שאומר מה המרחק לאחד. שתיקה נקראת כאילו אין
  // בעיה, בעוד שהמרחק לבית החולים הוא שיקול אמיתי בקנייה בפריפריה.
  let hospitals: Place[] = [];
  if (lat != null && lng != null && googleConfigured() && tier !== 'basic') {
    hospitals = await nearestHospitals(lat, lng, 30000).catch(() => []);
    costUsd += 0.032;
  }

  // מקוואות — מקור ממשלתי ייעודי, לא Google (ראה lib/mikve.ts).
  if (city) {
    mikvaot = await mikvaotNear(city, lat, lng, { radiusM: 4000 }).catch(() => []);
  }

  // --- אילו קווים עוברים בכל תחנה (GTFS דרך Stride) ---
  // מקור נפרד מ-Google: Places מוסר שם ומיקום של תחנה, לא את הקווים שבה.
  let transitStops: StopWithLines[] = [];
  let transitNote: string | null = null;
  if (lat != null && lng != null && city) {
    const lookup = await stopsWithLinesDetailed(city, lat, lng, {
      radiusM: 700,
      maxStops: tier === 'basic' ? 3 : 6,
    });
    transitStops = lookup.stops;
    transitNote = lookup.note;
    // אזהרה רק כששני המקורות ריקים. אזהרה "לא נמצאו תחנות" לצד רשימה של 20
    // תחנות היא בדיוק סוג הסתירה שהופכת דוח בתשלום ללא אמין.
    if (!transitStops.length && !transport.length) {
      warnings.push(
        transitNote ?? 'לא נמצאו תחנות תחבורה ציבורית בטווח הליכה מהנקודה.',
      );
    } else if (!transitStops.length && lookup.status === 'source_unavailable') {
      warnings.push(
        'רשימת הקווים בכל תחנה חסרה בדוח הזה: לוח הזמנים הארצי של התחבורה הציבורית לא היה זמין בזמן ההפקה. שמות התחנות והמרחקים אליהן כן מוצגים.',
      );
    }
  }

  // --- דירות מוצעות כרגע (פרימיום ומעלה — עולה כסף לכל הפקה) ---
  let listingsResult: ListingsResult = {
    configured: false,
    listings: [],
    fetched: { yad2: 0, madlan: 0 },
    costUsd: 0,
    sourcesOk: [],
    notices: [],
    technical: [],
    usedResidentialProxy: [],
    widenedToCity: [],
    quotaExhausted: false,
  };
  // בדוח קרקע לא נמשכות מודעות: מודעות דירות למכירה אינן מתארות מגרש, והסעיף
  // מוסתר ממילא — משיכה כזו הייתה תשלום על נתון שאיש לא רואה.
  if (tier !== 'basic' && city && !input.skipListings && assetType !== 'land') {
    listingsResult = await fetchListings(city, {
      street: streetResolved?.official ?? parsed.street,
      neighbourhood: nbFromDeals,
      lat,
      lng,
      // דוח שכירות שואל את הלוחות על שכירות, ודוח מסחרי על נכסים מסחריים.
      // בלי זה שלושת הכפתורים החדשים היו מציגים את אותן דירות למכירה.
      dealType: ASSET_DEAL_TYPE[assetType],
    });
    costUsd += listingsResult.costUsd;
    // ⚠️ ההודעות נשארות בתוך הקטגוריה של המודעות ואינן נדחפות לאזהרות הראשיות:
    // כשלוח אחד חסום והשני עובד, הדוח אינו "בעייתי" ואין להבהיל את הלקוח.
    // כשכל הלוחות נכשלו — זו כן אזהרה אמיתית שצריכה להופיע למעלה.
    if (listingsResult.notices.length && !listingsResult.sourcesOk.length) {
      warnings.push(listingsResult.notices[0]);
    }
  }

  // ---------- בניית הקטגוריות ----------

  // מה נכלל בחישוב מחירים: רק מכירות של יחידות מגורים בפועל.
  //
  // ⚠️ שני מסננים, ושניהם הכרחיים:
  // 1. `isHomeSale` — פוסל קרקע, קומבינציה, ניוד זכויות, מחסן, חניה ומשרד.
  //    בלעדיו עסקת קומבינציה של 834 מ"ר ב-4,000,000 ₪ בהבעש"ט 9 נכנסה
  //    לחציון המחיר למ"ר של דירות, וגם הוצגה כ"העסקה האחרונה".
  // 2. שטח מינימלי — פוסל העברות חלק בנכס (1 מ"ר) שנצפו בדיזנגוף.
  // ⚠️ עסקה שהדוח עצמו מסמן "ייתכן שזו טעות דיווח" אינה יכולה להיכנס לחציון
  // שהדוח מציג כמחיר האזור. נמצא בדוח אמיתי: עסקה של 3,799 ₪ למ"ר סומנה כחריגה
  // **ונכללה** באותו חציון, והוציאה אותו 5.6% למטה — כלומר האזהרה הופיעה
  // ללקוח, והמספר שהוא באמת מסתמך עליו כבר הושפע מהרשומה שהוזהר עליה.
  // ההודעה על ההחרגה מופיעה ליד השורה בטבלה, כמו בעסקאות הקרקע.
  const suspectKeys = new Set(
    soldDeals.filter((d) => d.suspect).map((d) => dealIdentity(d.date, d.price, d.areaSqm)),
  );
  const realDeal = (t: Transaction) =>
    isHomeSale(t) &&
    t.areaSqm != null &&
    t.areaSqm >= 15 &&
    !suspectKeys.has(dealIdentity(t.dealDate, t.price, t.areaSqm));
  const areaHomeSales = allTxns.filter(realDeal);
  const buildingRealSales = currentBuildingTxns.filter(realDeal);

  // מכירות דירות באותו רחוב — שכבת ההשוואה הרלוונטית ביותר אחרי הבניין עצמו.
  //
  // ⚠️ **בלי** הבניין עצמו. נמצא בדוח אמיתי: "חציון של שתי מכירות דירות באותו
  // רחוב" נשען על מכירה אחת ברחוב ועל מכירה בבניין הנבדק — כלומר חצי משכבת
  // ההשוואה "החוצה" הייתה הנכס עצמו, בעוד שהטקסט הצהיר שזו השכבה שאחרי הבניין.
  const streetHomeSales = areaHomeSales.filter((t) => {
    if (buildingPolygonId && t.polygonId === buildingPolygonId) return false;
    const st = streetOf(t.address);
    return (
      !!st &&
      streetNames.some((w) => {
        const n = w.replace(/["'`״׳]/g, '').trim();
        return !!n && (st === n || st.includes(n) || n.includes(st));
      })
    );
  });

  // כל חציון מחיר מחושב בחלון זמן, ולא על כל ההיסטוריה (ראה priceBand).
  // האזור קובע את החלון המשותף, והרחוב והבניין נמדדים באותו חלון כדי שהשוואה
  // ביניהם תהיה השוואה גיאוגרפית ולא השוואה בין תקופות.
  const areaBand = priceBand(areaHomeSales, { minCount: 8 });
  const streetBand = priceBand(streetHomeSales, { minCount: 5, windowMonths: areaBand.months });
  const buildingBand = priceBand(buildingRealSales, { minCount: 3, windowMonths: areaBand.months });
  const buildingPpsqm = buildingRealSales
    .map((t) => pricePerSqm(t.price, t.areaSqm))
    .filter((v): v is number => v !== null);
  const medianArea = areaBand.median;
  const medianBuilding = buildingBand.median;
  // "אחרונה" = העסקה האחרונה שהיא באמת מכירת דירה. buildingTxns/allTxns
  // ממוינים מהחדש לישן במעלה הזרם.
  const lastBuildingDeal = buildingRealSales[0] ?? null;
  const lastAreaDeal = areaHomeSales[0] ?? null;
  const cbsLast = cbs?.points.at(-1) ?? null;

  /** הדירה הספציפית, אם המשתמש הזין קומה ו/או מספר חדרים. */
  const matchedUnit =
    input.floor || input.rooms
      ? buildingRealSales.find((t) => {
          const floorOk = input.floor
            ? String(t.floor ?? '').replace(/\s/g, '') === String(input.floor).replace(/\s/g, '')
            : true;
          const roomsOk = input.rooms ? Number(t.rooms) === Number(input.rooms) : true;
          return floorOk && roomsOk;
        }) ?? null
      : null;

  /** שטח הנכס הנבדק — מהדירה שזוהתה, אחרת מהעסקה האחרונה בבניין, אחרת מהאזור. */
  const unitArea =
    matchedUnit?.areaSqm ?? lastBuildingDeal?.areaSqm ?? lastAreaDeal?.areaSqm ?? null;

  /**
   * §2 · הערכת השווי.
   *
   * ⚠️ השטח שנמסר להערכה הוא **רק** של הנכס עצמו או של הבניין — לא של האזור.
   * `unitArea` נופל עד `lastAreaDeal`, כלומר עד לגודל של דירה כלשהי בסביבה,
   * ולתמחר לפיו את "הנכס" זו בדיוק הקפיצה שהמפרט אוסר. כשאין שטח מהבניין,
   * מודול ההערכה גוזר גודל אופייני מעסקאות הבניין ואומר זאת במפורש.
   */
  const valuationArea = matchedUnit?.areaSqm ?? lastBuildingDeal?.areaSqm ?? null;
  const valuation = valuate(soldDeals, {
    subjectArea: valuationArea,
    subjectRooms: input.rooms ? Number(input.rooms) : null,
    radiusM: deals?.radiusUsedM ?? null,
  });

  // בכותרת מוצג שם אחד נוסף — הרשמי והמוכר, כמו "דרך מרדכי (מוכר גם כרחוב האתרוג)".
  // הרשימה המלאה נשמרת ב-title.streetAliases ומוצגת בגוף הדוח.
  const streetDisplay = streetResolved
    ? displayName(streetResolved, parsed.street ?? '', { maxAliases: 1 })
    : parsed.street ?? null;

  // ⚠️ כשלא ניתן לדעת אם מדובר בדירה או בבית, אסור לכתוב "שטח הדירה". נמצא
  // בדוח אמיתי: הכותרת אמרה במפורש שלא ניתן לזהות, והשדות המשיכו לקרוא לנכס
  // "דירה" — כולל "שווי משוער של הדירה" שחושב במודל של מחיר למ"ר של דירה.
  const unitNoun =
    propertyKind.kind === 'house' ? 'הבית' : propertyKind.kind === 'apartment' ? 'הדירה' : 'הנכס';

  const facts: Record<CategoryKey, Fact[]> = {
    property: [],
    building: [],
    sold: [],
    listings: [],
    surroundings: [],
    transport: [],
    potential: [],
    permits: [],
    rental: [],
    commercial: [],
    land: [],
  };

  // ===== הנכס =====
  facts.property.push(
    fact('רחוב', streetDisplay, {
      certainty: streetResolved ? 'verified' : 'approx',
      sourceKey: streetResolved ? 'datagov' : 'govmap',
      sourceNote: streetResolved
        ? 'מרשם הרחובות הרשמי, כולל השמות שבהם הרחוב מוכר בפי התושבים.'
        : 'לפי הכתובת שהוזנה.',
      missingReason: 'לא זוהה שם רחוב בשאילתה.',
    }),
    fact('מספר בית', parsed.houseNum ?? null, {
      certainty: 'verified',
      sourceKey: 'user_input',
      sourceNote: 'מהכתובת שהוזנה.',
      missingReason: 'לא הוזן מספר בית — בלעדיו הזיהוי הוא ברמת הרחוב בלבד.',
    }),
    fact('יישוב', city, {
      certainty: cityFromParcel ? 'verified' : 'approx',
      sourceKey: cityFromParcel ? 'govmap' : 'datagov',
      sourceNote: cityFromParcel
        ? 'לפי מרשם החלקות הרשמי — מקור בלתי תלוי בכתובת שהוזנה.'
        : 'לפי הכתובת שהוזנה.',
      missingReason: 'לא זוהה יישוב.',
    }),
    fact('גוש', gush, {
      certainty: 'verified',
      sourceKey: 'govmap',
      sourceNote: 'מרשם החלקות הרשמי.',
      missingReason: 'הנקודה אינה בתוך חלקה רשומה.',
    }),
    fact('חלקה', helka, {
      certainty: 'verified',
      sourceKey: 'govmap',
      sourceNote: parcelMismatch
        ? `כך רשום במרשם החלקות לנקודת הכתובת. שימו לב: בעסקאות המכר בכתובת הזו רשומה חלקה ${registeredHelka} — ראה ההסבר למעלה.`
        : 'מרשם החלקות הרשמי.',
      missingReason: 'הנקודה אינה בתוך חלקה רשומה.',
    }),
    // אי-התאמה בין המרשמים אינה "פרט קטן": היא משנה איזה נסח טאבו מזמינים.
    fact('חלקה לפי מרשם העסקאות', parcelMismatch ? registeredHelka : null, {
      certainty: 'verified',
      sourceKey: 'carmen',
      sourceNote:
        'מספר החלקה כפי שהוא רשום בעסקאות המכר של הבניין הזה. הוא נבדל ממספר החלקה שמרשם החלקות מחזיר לנקודת הכתובת — מצב שנוצר אחרי חלוקה מחדש.',
      missingReason: 'שני המרשמים מסכימים על מספר החלקה — אין אי-התאמה לדווח עליה.',
    }),
    // ⚠️ תיקון הצהרה שגויה: עד כה הדוח כתב שתת-חלקה "דורשת נסח טאבו".
    // בפועל `subParcelNum` מגיע חינם עם כל עסקה במרשם העסקאות.
    fact(
      'תתי-החלקה שנמכרו בבניין',
      subParcels.length ? subParcels.join(' · ') : null,
      {
        certainty: 'verified',
        sourceKey: 'carmen',
        sourceNote: `${subParcels.length} תתי-חלקה (דירות) נמכרו בבניין הזה. תת-חלקה היא המזהה של הדירה הספציפית בבית משותף.`,
        missingReason:
          building.dealsInBuilding > 0
            ? 'העסקאות בבניין הזה אינן נושאות מספר תת-חלקה — כך קורה בבית פרטי שאינו רשום כבית משותף.'
            : 'לא נרשמו עסקאות בבניין הזה, ולכן אין תתי-חלקה לדווח עליהם.',
      },
    ),
    fact(
      `תת-החלקה של ${unitNoun} שלך`,
      matchedUnit?.tatHelka ?? null,
      {
        certainty: 'approx',
        sourceKey: 'carmen',
        sourceNote: matchedUnit
          ? `זוהתה עסקה בבניין שתואמת את מה שהזנת (${[input.floor && `קומה ${input.floor}`, input.rooms && `${input.rooms} חדרים`].filter(Boolean).join(', ')}): ${matchedUnit.areaSqm ?? '—'} מ"ר. ייתכן שיש בבניין יותר מדירה אחת בקומה ובגודל האלה, ולכן זו התאמה ולא ודאות.`
          : undefined,
        // ⚠️ לא להציע פעולה שלא תעזור. נמצא בדוח אמיתי: השדה ביקש להזין קומה
        // ומספר חדרים בדוח שאומר שורה מעל שלא נרשמה בבניין אף עסקה — כלומר
        // אין שום מה להתאים אליו, וההנחיה שולחת את הלקוח לכלום.
        missingReason: !buildingRealSales.length
          ? 'לא נרשמו בבניין הזה מכירות דירות מאז 1998, ולכן אין עסקה שממנה אפשר לשלוף את מספר תת-החלקה. המספר מופיע בנסח הטאבו של הנכס.'
          : input.floor || input.rooms
            ? 'לא נמצאה בבניין עסקה שתואמת את הקומה ומספר החדרים שהזנת. ייתכן שהדירה שלך טרם נמכרה מאז 1998.'
            : 'כדי לזהות את הדירה המסוימת צריך להזין מספר קומה ו/או מספר חדרים בטופס.',
      },
    ),
    // תת-חלקה היא מזהה הדירה הספציפית (ראה ההערה למעלה) — אם אותה תת-חלקה
    // נמכרה יותר מפעם אחת, זו ההיסטוריה של הדירה הזו עצמה, לא של הבניין.
    // בכוונה לא נבנה מ-`currentBuildingTxns` (כולל עסקאות שאינן מכירת דירה)
    // אלא מ-`buildingRealSales`, אותו סינון "עסקה אמיתית" שכל שאר הדוח סומך
    // עליו. פחות משתי מכירות = אין סיפור היסטוריה לספר; המכירה היחידה כבר
    // מוצגת למעלה כ"מחיר אחרון שנסגר בבניין".
    fact(
      `היסטוריית מכירות של ${unitNoun} שלך`,
      (() => {
        if (!matchedUnit?.tatHelka || matchedUnit.tatHelka === '0') return null;
        const sameUnit = buildingRealSales
          .filter((t) => t.tatHelka === matchedUnit.tatHelka)
          .slice()
          .reverse(); // buildingRealSales ממוין מהחדש לישן; ההיסטוריה מסופרת מהישן לחדש
        if (sameUnit.length < 2) return null;
        return sameUnit
          .map(
            (t) =>
              `${new Date(t.dealDate).toLocaleDateString('he-IL')} · ${t.price != null ? `${t.price.toLocaleString('he-IL')} ₪` : 'מחיר לא דווח'}`,
          )
          .join(' ← ');
      })(),
      {
        certainty: 'approx',
        sourceKey: 'carmen',
        sourceNote: `כל המכירות שנרשמו במרשם עבור תת-חלקה ${matchedUnit?.tatHelka ?? ''} בבניין הזה — כלומר אותה דירה ממש, ולא הבניין כולו — ממוינות לפי תאריך.`,
        missingReason: !matchedUnit
          ? 'לא זוהתה הדירה הספציפית שלך (הזינו קומה ו/או מספר חדרים בטופס), ולכן אין ממה לבנות היסטוריה לדירה עצמה.'
          : 'נמצאה רק מכירה אחת של הדירה הזו במרשם מאז 1998 — ראו "מחיר אחרון שנסגר בבניין" למעלה.',
      },
    ),
    fact('שטח החלקה כולה', parcelAreaSqm, {
      certainty: 'verified',
      unit: 'מ"ר',
      sourceKey: 'govmap',
      sourceNote: 'זהו שטח כל החלקה — לא שטח הדירה.',
      missingReason: 'שטח החלקה לא הוחזר עבור החלקה הזו.',
    }),
    fact(
      `שטח ${unitNoun}`,
      matchedUnit?.areaSqm ?? lastBuildingDeal?.areaSqm ?? lastAreaDeal?.areaSqm ?? null,
      {
        certainty: matchedUnit || lastBuildingDeal ? 'approx' : 'estimate',
        unit: 'מ"ר',
        sourceKey: 'carmen',
        sourceNote: matchedUnit
          ? 'לפי העסקה בבניין שתואמת את הקומה ומספר החדרים שהזנת. לאימות מדויק צריך נסח טאבו.'
          : lastBuildingDeal
            ? 'לפי מה שדווח בעסקה האחרונה בבניין הזה. לאימות מדויק צריך נסח טאבו.'
            : 'אין עסקה בבניין עצמו — הנתון לקוח מדירה אחרת בסביבה ולכן הוא רק אינדיקציה.',
        missingReason: 'אין עסקה מדווחת שממנה אפשר ללמוד על שטח הדירה.',
      },
    ),
    fact(
      'מספר חדרים',
      input.rooms ?? matchedUnit?.rooms ?? lastBuildingDeal?.rooms ?? lastAreaDeal?.rooms ?? null,
      {
        certainty: input.rooms ? 'verified' : matchedUnit || lastBuildingDeal ? 'approx' : 'estimate',
        sourceKey: input.rooms ? 'user_input' : 'carmen',
        // ⚠️ ההערה חייבת להתאים למקור בפועל. נמצא במייל אמיתי: נכתב "לפי דיווח
        // בעסקה האחרונה שהיא מכירת דירה בבניין" בדוח שאומר במקום אחר שלא נרשמה
        // בבניין אף עסקה — כלומר ההערה סתרה את הדוח עצמו.
        sourceNote: input.rooms
          ? 'כפי שהוזן בטופס.'
          : matchedUnit || lastBuildingDeal
            ? 'לפי דיווח בעסקה האחרונה שהיא מכירת דירה בבניין הזה.'
            : 'אין עסקה בבניין עצמו — הנתון לקוח מדירה אחרת בסביבה, ולכן הוא אינדיקציה בלבד ולא נתון על הנכס.',
        missingReason: 'לא דווח מספר חדרים בעסקאות שנמצאו.',
      },
    ),
    fact('מחיר אחרון שנסגר בבניין', lastBuildingDeal?.price ?? null, {
      certainty: 'verified',
      unit: '₪',
      highlight: true,
      sourceKey: 'carmen',
      asOf: lastBuildingDeal?.dealDate,
      sourceNote: lastBuildingDeal
        ? `מחיר שנרשם בפועל ברשות המסים — לא מחיר בקשה. ${lastBuildingDeal.areaSqm ?? '—'} מ"ר, ${lastBuildingDeal.rooms ?? '—'} חדרים, קומה ${lastBuildingDeal.floor ?? '—'}.`
        : undefined,
      missingReason:
        building.dealsInBuilding > 0
          ? 'בבניין הזה נרשמו עסקאות, אך אף אחת מהן אינה מכירת דירה (למשל קרקע או קומבינציה).'
          : 'לא נרשמה עסקה בבניין הזה. ראה עסקאות בסביבה בקטגוריית "עסקאות שנמכרו".',
    }),
    fact('מחיר למ"ר בבניין', buildingBand.median, {
      certainty: buildingBand.count >= 3 ? 'approx' : 'estimate',
      unit: '₪ למ"ר',
      highlight: true,
      sourceKey: 'carmen',
      sourceNote: buildingBand.count
        ? `חציון של ${countText(buildingBand.count, 'מכירת דירה', 'מכירות דירות')} בבניין הזה ${buildingBand.windowLabel}.` +
          (buildingBand.count < 3 ? ' מדגם קטן — זו אינדיקציה, לא ממוצע מייצג.' : '')
        : undefined,
      missingReason: buildingRealSales.length
        ? 'אין מספיק מכירות דירות בבניין עצמו כדי לחשב מחיר למ"ר.'
        : 'לא נרשמה בבניין הזה אף מכירת דירה, ולכן אין ממה לחשב מחיר למ"ר.',
    }),
    fact('מחיר למ"ר ברחוב', streetBand.median, {
      certainty: streetBand.count >= 3 ? 'approx' : 'estimate',
      unit: '₪ למ"ר',
      highlight: true,
      sourceKey: 'carmen',
      sourceNote: streetBand.count
        ? `חציון של ${countText(streetBand.count, 'מכירת דירה', 'מכירות דירות')} באותו רחוב ${streetBand.windowLabel}. זו שכבת ההשוואה הרלוונטית ביותר אחרי הבניין עצמו.`
        : undefined,
      missingReason: 'לא נמצאו מכירות דירות באותו רחוב.',
    }),
    fact('מחיר למ"ר באזור', areaBand.median, {
      certainty: areaBand.count >= 8 ? 'approx' : 'estimate',
      unit: '₪ למ"ר',
      sourceKey: 'carmen',
      // ⚠️ תמהיל הגדלים משנה את המחיר למ"ר יותר מהמיקום. נמצא בדוח אמיתי:
      // "מחיר למ"ר באזור 26,316" היה 22% מעל הבניין והרחוב, כי הוא נשלט על ידי
      // דירות של 32–52 מ"ר שהמחיר למ"ר שלהן גבוה מהותית — ליד דירה של 130 מ"ר.
      // בלי אזהרה על כך ההשוואה מטעה לרעת הקונה.
      sourceNote: (() => {
        if (!areaBand.count) return undefined;
        const base = `חציון של ${countText(areaBand.count, 'מכירת דירה', 'מכירות דירות')} בסביבה ${areaBand.windowLabel}. האזור עשוי לכלול רחובות שונים מאוד באופיים.`;
        // הגודל החציוני נמדד על **אותן** עסקאות שמהן חושב המחיר, ולא על כל
        // ההיסטוריה — אחרת האזהרה עצמה שגויה (ראה PriceBand.areas).
        const medArea = median(areaBand.areas);
        const subject = unitArea;
        if (!medArea || !subject) return base;
        const ratio = medArea / subject;
        if (ratio < 0.7 || ratio > 1.4) {
          return (
            base +
            ` שימו לב לתמהיל הגדלים: הגודל החציוני בעסקאות האזור הוא ${Math.round(medArea)} מ"ר מול ${subject} מ"ר בנכס הזה. ` +
            'דירות קטנות נמכרות במחיר גבוה יותר למ"ר, ולכן השוואה ישירה בין הגדלים האלה מטה את התוצאה.'
          );
        }
        return base;
      })(),
      missingReason: 'לא נמצאו עסקאות בסביבה.',
    }),
    needsLicensedSource(
      'בעלות, משכנתאות ועיקולים',
      'tabu',
      'נסח טאבו רשמי. אין דרך חוקית לקבל את המידע הזה בלי הזמנת נסח.',
    ),
  );

  // ===== הבניין והכניסה =====
  //
  // ⚠️ הקומות נגזרות מעסקאות **הבניין** ולא מהאזור. בגרסה קודמת השדה חושב על
  // כל העסקאות בסביבה, כך ש"מספר קומות בבניין" שיקף את הבניין הגבוה ברחוב.
  // הקומות במרשם רשומות בעברית ("שניה", "רביעית") ולא כמספר.
  const FLOOR_WORDS: Record<string, number> = {
    קרקע: 0,
    ראשונה: 1,
    שניה: 2,
    שנייה: 2,
    שלישית: 3,
    רביעית: 4,
    חמישית: 5,
    שישית: 6,
    שביעית: 7,
    שמינית: 8,
    תשיעית: 9,
    עשירית: 10,
  };
  const floorNumber = (raw: string | null | undefined): number | null => {
    const s = String(raw ?? '').trim();
    if (!s) return null;
    const n = Number(s);
    if (Number.isFinite(n)) return n;
    for (const [word, val] of Object.entries(FLOOR_WORDS)) {
      if (s.includes(word)) return val;
    }
    return null;
  };
  const buildingFloors = buildingTxns
    .map((t) => floorNumber(t.floor))
    .filter((n): n is number => n !== null);
  const maxFloor = buildingFloors.length ? Math.max(...buildingFloors) : null;

  facts.building.push(
    // גיל הבניין — דרישת חובה במפרט. נגזר מהיסטוריית העסקאות של הבניין עצמו,
    // כי אין מאגר ציבורי ארצי של היתרי בנייה (ראה lib/buildingage.ts).
    fact('שנת בנייה', ageInfo?.buildYear ?? null, {
      kind: 'year',
      certainty: ageInfo?.isLowerBound ? 'approx' : 'estimate',
      sourceKey: 'carmen',
      sourceNote: ageInfo?.basis,
      missingReason:
        building.dealsInBuilding > 0
          ? 'העסקאות בבניין אינן מאפשרות להסיק שנת בנייה. שנת הבנייה המדויקת מופיעה בהיתר הבנייה בתיק הבניין בוועדה המקומית.'
          : 'לא נרשמו עסקאות בבניין הזה, ואין מאגר ציבורי ארצי של היתרי בנייה שממנו אפשר לשלוף שנת בנייה.',
      highlight: true,
    }),
    fact('גיל הבניין', ageInfo?.ageYears ?? null, {
      certainty: ageInfo?.isLowerBound ? 'approx' : 'estimate',
      unit: 'שנים',
      highlight: true,
      sourceKey: 'carmen',
      sourceNote: ageInfo?.headline,
      missingReason: 'ללא שנת בנייה אין ממה לגזור גיל.',
    }),
    fact(
      'האם הבניין נבנה מחדש',
      ageInfo?.redevelopmentYear
        ? `כן — ${ageInfo.redevelopmentNature ?? 'עסקת קרקע'} בשנת ${ageInfo.redevelopmentYear}`
        : ageInfo
          ? 'לא נמצאה עדות לבנייה מחדש'
          : null,
      {
        certainty: 'verified',
        sourceKey: 'carmen',
        sourceNote: ageInfo?.redevelopmentYear
          ? 'נרשמה עסקה על המגרש עצמו, ואחריה נמכרו דירות — זו החתימה של בניין שהוקם מחדש במקום בניין קודם. שיפוץ שאינו כולל עסקת מגרש אינו נרשם באף מרשם ציבורי.'
          : 'בדקנו את כל היסטוריית העסקאות של הבניין ולא נמצאה בה עסקת קרקע או קומבינציה.',
        missingReason: 'אין היסטוריית עסקאות לבניין הזה.',
      },
    ),
    fact(
      ageInfo?.redevelopmentYear
        ? 'המכירה הראשונה בכתובת (כולל המבנה שקדם)'
        : 'הדירה הראשונה בבניין נמכרה',
      ageInfo?.firstHomeSaleYear ?? null,
      {
        kind: 'year',
        certainty: 'verified',
        sourceKey: 'carmen',
        // ⚠️ הכיתוב הקודם, "העסקה הראשונה של דירה **בבניין הזה**", היה שקרי
        // בבניין שנבנה מחדש: הוא הצביע על מכירה במבנה שנהרס, שורות ספורות
        // מתחת ל"שנת בנייה 2023".
        sourceNote: ageInfo?.redevelopmentYear
          ? `זו המכירה הראשונה שנרשמה בכתובת הזו במרשם (שמתחיל ב-1998), והיא של המבנה שעמד כאן לפני הבנייה מחדש ב-${ageInfo.redevelopmentYear}. הבניין הנוכחי חדש ממנה.`
          : 'זו העסקה הראשונה של דירה בבניין הזה במרשם, שמתחיל בשנת 1998.',
        missingReason: 'לא נרשמה מכירת דירה בבניין הזה.',
      },
    ),
    fact(propertyKind.kind === 'house' ? 'קומות בבית' : 'קומת הדירה', input.floor ?? matchedUnit?.floor ?? lastBuildingDeal?.floor ?? null, {
      certainty: input.floor ? 'verified' : matchedUnit || lastBuildingDeal ? 'approx' : 'estimate',
      sourceKey: input.floor ? 'user_input' : 'carmen',
      sourceNote: input.floor ? 'כפי שהוזן בטופס.' : 'לפי דיווח בעסקה האחרונה בבניין.',
      missingReason: 'לא הוזנה קומה ולא דווחה קומה בעסקאות הבניין.',
    }),
    fact('מספר קומות בבניין (לפחות)', maxFloor, {
      certainty: 'estimate',
      sourceKey: 'carmen',
      sourceNote:
        'הקומה הגבוהה ביותר שמופיעה בעסקאות של הבניין הזה. ייתכן שיש קומות גבוהות יותר שטרם נמכרו.',
      missingReason: currentBuildingTxns.length
        ? 'אין מספיק עסקאות בבניין כדי להעריך את גובה הבניין.'
        : 'לא נרשמו עסקאות בבניין הזה, ולכן אין ממה להעריך את גובה הבניין.',
    }),
    fact('כמה דירות נמכרו בבניין', building.homeSalesInBuilding || null, {
      certainty: 'verified',
      sourceKey: 'carmen',
      sourceNote:
        `${countText(building.homeSalesInBuilding, 'מכירת דירה', 'מכירות דירות')} מתוך ${building.dealsInBuilding} עסקאות שנרשמו בבניין הנוכחי. ` +
        (priorBuildingSales
          ? priorBuildingSales === 1
            ? 'עוד עסקה אחת בחלקה קדמה לבנייה מחדש, ולכן היא של המבנה שעמד כאן קודם — היא מופיעה בטבלת העסקאות ואינה נספרת כאן. '
            : `עוד ${priorBuildingSales} עסקאות בחלקה קדמו לבנייה מחדש, ולכן הן של המבנה שעמד כאן קודם — הן מופיעות בטבלת העסקאות ואינן נספרות כאן. `
          : '') +
        building.note,
      missingReason: 'לא נרשמו מכירות דירות בבניין הזה.',
    }),
    fact('מספר הכניסה', input.entrance ?? null, {
      certainty: 'verified',
      sourceKey: 'user_input',
      sourceNote:
        'כפי שהוזן בטופס. מרשם העסקאות אינו רושם מספר כניסה — הכניסה משמשת לשיוך נסח טאבו מרוכז לדירה הנכונה.',
      missingReason: 'לא הוזן מספר כניסה. בבניין עם כמה כניסות כדאי להזין אותו.',
    }),
    // ⚠️ צילום שקדם לבניין אינו "ייתכן שהשתנה" — הוא בוודאות לא הבניין הזה.
    // נמצא בדוח אמיתי: צילום מ-11/2017 הוצג כצילום של בניין ששנת הבנייה
    // המשוערת שלו 2023, באותו דוח שאומר שהמגרש נמכר בקומבינציה ב-2020.
    fact('צילום הבניין', streetView?.available ? 'קיים' : null, {
      certainty: 'verified',
      tier: 'vip',
      sourceKey: 'google_maps',
      asOf: streetView?.date ?? undefined,
      sourceNote: (() => {
        if (!streetView?.date) return undefined;
        const shotYear = Number(String(streetView.date).slice(0, 4));
        const built = ageInfo?.buildYear ?? null;
        const monthYear = /^\d{4}-\d{2}$/.test(String(streetView.date))
          ? `${Number(String(streetView.date).slice(5, 7))}/${String(streetView.date).slice(0, 4)}`
          : String(streetView.date);
        if (built && Number.isFinite(shotYear) && shotYear < built && !ageInfo?.isLowerBound) {
          return (
            `הצילום הוא מ-${monthYear}, כלומר לפני שהבניין הנוכחי נבנה (${built}). ` +
            'הוא מראה את מה שעמד כאן קודם ולא את הבניין הזה — כדאי לראות את הנכס בעיניים.'
          );
        }
        return `צילום רחוב מ-${monthYear}. ייתכן שהבניין השתנה מאז.`;
      })(),
      missingReason: 'אין צילום רחוב זמין בנקודה הזו.',
    }),
    needsLicensedSource(
      'היתרי בנייה וחריגות',
      'rishui',
      'מערכת רישוי זמין סגורה לציבור. הבדיקה נעשית ידנית בתיק הבניין בוועדה המקומית.',
    ),
  );

  // ===== עסקאות שנמכרו =====
  facts.sold.push(
    fact('עסקאות בבניין הזה', building.dealsInBuilding || null, {
      certainty: 'verified',
      sourceKey: 'carmen',
      sourceNote: `${building.note}${building.sourceAddress ? ` הכתובת כפי שהמקור רושם אותה: ${building.sourceAddress}.` : ''}${
        registeredGush && registeredHelka ? ` גוש ${registeredGush} חלקה ${registeredHelka}.` : ''
      }`,
      missingReason: 'לא נרשמו עסקאות בבניין הזה.',
    }),
    fact('מתוכן — מכירות דירות', building.homeSalesInBuilding || null, {
      certainty: 'verified',
      sourceKey: 'carmen',
      sourceNote:
        'השאר הן עסקאות שאינן מכירת דירה: קרקע, קומבינציה, ניוד זכויות, מחסן או חניה. הן מוצגות ברשימה עם הסבר, ואינן נכללות בחישוב מחירים.',
      missingReason: 'לא נרשמו מכירות דירות בבניין הזה.',
    }),
    fact('עסקאות בסביבה', allTxns.length || null, {
      certainty: 'verified',
      sourceKey: 'carmen',
      // שקיפות על היקף האיסוף וגם על מה שנשאר בחוץ — "אל תפספס" מחייב לומר
      // מה כן פוספס, ולא רק להרחיב את הרדיוס בשקט.
      sourceNote:
        `נאספו מ-${deals?.polygonsQueried ?? 0} בנייני-עסקאות ברדיוס ${deals?.radiusUsedM ?? 0} מ' מהנכס` +
        `${(deals?.candidatesFound ?? 0) > (deals?.polygonsQueried ?? 0) ? `, מתוך ${deals?.candidatesFound} בניינים שנמצאו ברדיוס — הנותרים לא נשאלו כדי לא לחרוג מזמן ההפקה` : ''}. ` +
        (deals?.duplicatesRemoved
          ? `${deals.duplicatesRemoved} דיווחים כפולים של אותה עסקה אוחדו. `
          : '') +
        'הרדיוס מתרחב אוטומטית באזורים שבהם נרשמות מעט עסקאות, כדי שיהיה בסיס השוואה.',
      missingReason: 'לא נמצאו עסקאות בסביבה.',
    }),
    fact('העסקה האחרונה בבניין', lastBuildingDeal?.dealDate ?? null, {
      kind: 'date',
      certainty: 'verified',
      sourceKey: 'carmen',
      sourceNote: 'תאריך מכירת הדירה העדכנית ביותר בבניין הזה — לא של עסקת קרקע.',
      missingReason: 'לא נרשמה מכירת דירה בבניין הזה.',
    }),
    fact('העסקה האחרונה בסביבה', lastAreaDeal?.dealDate ?? null, {
      kind: 'date',
      certainty: 'verified',
      sourceKey: 'carmen',
      sourceNote: lastAreaDeal
        ? `מכירת הדירה העדכנית ביותר שנרשמה בסביבה: ${lastAreaDeal.address ?? '—'}, ${lastAreaDeal.areaSqm ?? '—'} מ"ר. עסקאות קרקע וקומבינציה אינן נחשבות כאן.`
        : undefined,
      missingReason: 'לא נמצאו מכירות דירות בסביבה.',
    }),
    fact(
      cbs?.seriesName ? `מדד ${cbs.seriesName}` : 'מדד מחירי הדירות בישראל',
      cbsLast?.value ?? null,
      {
        certainty: 'verified',
        sourceKey: 'cbs',
        asOf: cbsLast?.period,
        tier: 'premium',
        sourceNote: cbs?.baseDesc ? `בסיס המדד: ${cbs.baseDesc}.` : undefined,
        missingReason: 'מדד המחירים לא נטען.',
      },
    ),
    fact('שינוי במדד בשנה האחרונה', cbs?.yearChangePct ?? null, {
      certainty: 'verified',
      unit: '%',
      tier: 'premium',
      sourceKey: 'cbs',
      sourceNote: 'מגמת השוק הארצית — לא של הנכס הזה.',
      missingReason: 'לא ניתן לחשב שינוי שנתי.',
    }),
  );

  // ===== דירות מוצעות כרגע =====
  if (!listingsResult.configured) {
    facts.listings.push(
      needsLicensedSource(
        'דירות המוצעות למכירה כרגע',
        'apify_yad2',
        'המידע מגיע מלוחות המודעות (יד2 / מדלן) דרך ספק מורשה. כרגע אין חיבור פעיל, ולכן אין מה להציג.',
      ),
    );
  } else {
    const prices = listingsResult.listings.map((l) => l.pricePerSqm).filter((v): v is number => !!v);
    const askMedian = median(prices);
    const days = listingsResult.listings.map((l) => l.daysListed).filter((v): v is number => v != null);
    facts.listings.push(
      fact('כמה דירות מוצעות באזור', listingsResult.listings.length || null, {
        certainty: 'approx',
        tier: 'premium',
        sourceKey: 'apify_madlan',
        sourceNote: 'מודעות פעילות בלוחות. מספר המודעות אינו מספר הדירות — ייתכנו כפילויות.',
        missingReason: 'לא נמצאו מודעות פעילות באזור הזה.',
      }),
      fact('מחיר בקשה חציוני למ"ר', askMedian, {
        certainty: 'approx',
        unit: '₪ למ"ר',
        tier: 'premium',
        sourceKey: 'apify_madlan',
        sourceNote:
          'זה מה שמוכרים מבקשים, לא מה שנסגר בפועל. בדרך כלל מחיר הסגירה נמוך יותר.',
        missingReason: 'אין מספיק מודעות עם מחיר ושטח.',
      }),
      fact('זמן ממוצע של מודעה באוויר', days.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null, {
        certainty: 'approx',
        unit: 'ימים',
        tier: 'premium',
        sourceKey: 'apify_madlan',
        sourceNote: 'מודעות שיושבות זמן רב עשויות להעיד על מחיר גבוה מדי או על ביקוש נמוך.',
        missingReason: 'אין נתוני תאריך פרסום.',
      }),
    );

    // פער בין בקשה לסגירה — חישוב שלנו.
    if (askMedian && medianArea) {
      const gapPct = Math.round(((askMedian - medianArea) / medianArea) * 1000) / 10;
      facts.listings.push(
        fact('פער בין מחיר הבקשה למחיר שנסגר בפועל', gapPct, {
          certainty: 'estimate',
          unit: '%',
          tier: 'premium',
          sourceKey: 'carmen',
          sourceNote:
            'השוואה בין מה שמבקשים היום לבין החציון של העסקאות שנסגרו באזור. פער חיובי גדול מרמז על ציפיות מוכרים גבוהות.',
        }),
      );
    }
  }

  // ===== סביבה ומוסדות =====
  //
  // ⚠️ "את כולם" הוא ניסוח מחייב במפרט. הרשימות המלאות יוצאות ב-`notes` של
  // הקטגוריה ומוצגות בממשק בלי חיתוך; השדות עצמם נושאים את הקרוב ביותר ואת
  // הספירה, כדי שכרטיס הנתון יישאר קריא.
  const namedList = (list: Place[], n: number) =>
    list.slice(0, n).map((p) => `${p.kind} ${p.name} — ${distanceText(p.straightMeters)}`).join(' · ');

  /**
   * אורך מסלול ההליכה — מוצג רק כשהוא הגיוני.
   *
   * ⚠️ נמצא בדוח אמיתי: "45 מ' מרחק אווירי; בהליכה בפועל 37 מ' מסלול". מסלול
   * הליכה אינו יכול להיות קצר מהקו האווירי. הסיבה: שירות המרחקים מודד מנקודת
   * הגישה לכביש ולא מהקואורדינטה שלפיה חושב המרחק האווירי. במקרה כזה עדיף לא
   * להציג את אורך המסלול מלהציג מספר שנראה שגוי.
   */
  const routeText = (p: Place): string =>
    p.walkMeters != null && p.walkMeters >= p.straightMeters ? ` (${p.walkMeters} מ' מסלול)` : '';

  const fullList = (list: Place[]) =>
    list.map(
      (p) =>
        `${p.kind} · ${p.name} · ${p.straightMeters} מ'` +
        (p.walkSeconds != null ? ` · ${walkText(p.walkSeconds)} הליכה` : ''),
    );

  /** שדה "הקרוב ביותר" + שדה ספירה, לכל קבוצת מוסדות. */
  const nearestAndCount = (
    label: string,
    countLabel: string,
    list: Place[],
    emptyReason: string,
    group?: PlaceGroupKey,
  ): Fact[] => {
    // ⚠️ "הקרוב ביותר" אינו בהכרח האיבר הראשון: בקבוצת המסחר מאפייה יכולה
    // להיות קרובה יותר ממרכול, ומי ששואל על מרכול לא מתכוון למאפייה.
    const nearest = group ? primaryNearest(list, group) : list[0] ?? null;
    return [
      fact(label, nearest ? `${nearest.name} (${nearest.kind})` : null, {
        certainty: 'verified',
        sourceKey: 'google_maps',
        sourceNote: nearest
          ? `${distanceText(nearest.straightMeters)} מהנכס במרחק אווירי` +
            (nearest.walkSeconds ? `; בהליכה בפועל ${walkApprox(nearest.walkSeconds)}${routeText(nearest)}.` : '.')
          : undefined,
        missingReason: googleConfigured() ? emptyReason : 'שירות המפות אינו מחובר.',
      }),
      fact(countLabel, list.length || null, {
        certainty: 'approx',
        tier: 'premium',
        sourceKey: 'google_maps',
        sourceNote: list.length
          ? `הרשימה המלאה מופיעה למטה — כל אחד בסוגו, בשמו ובמרחקו במטרים. הקרוב: ${distanceText(list[0].straightMeters)}, הרחוק: ${distanceText(list[list.length - 1].straightMeters)}.`
          : undefined,
        missingReason: googleConfigured() ? emptyReason : 'שירות המפות אינו מחובר.',
      }),
    ];
  };

  facts.surroundings.push(
    ...nearestAndCount(
      'מוסד החינוך הקרוב ביותר',
      'מוסדות חינוך בסביבה',
      education,
      'לא נמצא מוסד חינוך ברדיוס של קילומטר וחצי.',
      'education',
    ),
    ...nearestAndCount(
      'גן הילדים הקרוב ביותר',
      'גנים ומעונות בסביבה',
      preschool,
      'לא נמצא גן ילדים או מעון ברדיוס של קילומטר.',
      'preschool',
    ),
    ...nearestAndCount(
      'בית הכנסת הקרוב ביותר',
      'בתי כנסת ומוסדות דת בסביבה',
      religion,
      'לא נמצא בית כנסת ברדיוס של קילומטר וחצי.',
    ),
    // מקוואות — מקור ממשלתי ייעודי ולא Google.
    fact(
      'המקווה הקרוב ביותר',
      mikvaot[0] ? `${mikvaot[0].name}${mikvaot[0].address ? ` — ${mikvaot[0].address}` : ''}` : null,
      {
        certainty: 'verified',
        sourceKey: 'datagov',
        sourceNote: mikvaot[0]
          ? (mikvaot[0].meters != null ? `${distanceText(mikvaot[0].meters)} מהנכס. ` : '') +
            [
              mikvaot[0].forWomen && 'לנשים',
              mikvaot[0].forMen && 'לגברים',
              mikvaot[0].forDishes && 'לכלים',
            ]
              .filter(Boolean)
              .join(', ') +
            (mikvaot[0].accessibility ? `. נגישות: ${mikvaot[0].accessibility}` : '')
          : undefined,
        missingReason: city
          ? `במאגר המקוואות הממשלתי אין רשומה ל${city}. ייתכן שקיים מקווה שלא דווח למאגר.`
          : 'לא זוהה יישוב, ולכן לא ניתן לחפש מקוואות.',
      },
    ),
    fact('מקוואות ביישוב', mikvaot.length || null, {
      certainty: 'verified',
      tier: 'premium',
      sourceKey: 'datagov',
      sourceNote: mikvaot.length
        ? 'מהמאגר הממשלתי, כולל שעות פעילות ונגישות. הרשימה המלאה למטה.'
        : undefined,
      missingReason: 'אין רשומות מקוואות ליישוב הזה במאגר הממשלתי.',
    }),
    ...nearestAndCount(
      'המרכול הקרוב ביותר',
      'מסחר וקניות בסביבה',
      commerce,
      'לא נמצאה חנות מזון ברדיוס של קילומטר ומאתיים.',
      'commerce',
    ),
    ...nearestAndCount(
      'שירות הבריאות הקרוב ביותר',
      'שירותי בריאות בסביבה',
      health,
      'לא נמצא בית מרקחת או מרפאה ברדיוס של קילומטר וחצי.',
      'health',
    ),
    fact(
      'בית החולים הקרוב ביותר',
      hospitals[0] ? `${hospitals[0].name} — ${distanceText(hospitals[0].straightMeters)}` : null,
      {
        certainty: 'verified',
        tier: 'premium',
        sourceKey: 'google_maps',
        sourceNote: hospitals[0]
          ? 'מרחק אווירי. בית חולים אינו בטווח הליכה, ולכן הוא נבדק בנפרד ברדיוס רחב — זהו שיקול אמיתי בקנייה מחוץ למרכזי הערים.'
          : undefined,
        // ⚠️ **לא** לכתוב "לא נמצא בית חולים ברדיוס 30 ק"מ" — זו טענה על העולם,
        // ובחצור הגלילית היא הייתה שגויה (זיו בצפת נמצא בטווח). מקור המפות מסמן
        // בישראל גם מרפאות ומרכזים רפואיים כבית חולים, ולכן הזיהוי אינו אמין
        // דיו כדי לקבוע היעדר. אומרים מה שנכון: לא אימתנו.
        missingReason:
          'לא אימתנו מהו בית החולים הקרוב. מקורות המפות מסמנים בישראל גם מרפאות ומרכזים רפואיים כ"בית חולים", ולכן אנחנו לא מציגים כאן ניחוש. זהו שיקול אמיתי — כדאי לבדוק את המרחק לבית החולים הקרוב לפני קנייה.',
      },
    ),
    ...nearestAndCount(
      'הפארק הקרוב ביותר',
      'פארקים ופנאי בסביבה',
      leisure,
      'לא נמצא פארק, גינה או ספרייה ברדיוס של קילומטר ומאתיים.',
    ),
  );

  // ===== תחבורה =====
  //
  // ⚠️ תיקון של אמירה שקרית בדוח. השדות האלה נשענו על Places בלבד, וכשהוא
  // מחזיר אפס תחנות (נמדד ברחובות) הדוח הכריז "לא נמצאה תחנת תחבורה ציבורית
  // ברדיוס 900 מטר" — בעוד שבאותה הרצה עצמה נשלפו **שש** תחנות דרך GTFS,
  // הקרובה במרחק 22 מ', עם הקווים שעוצרים בהן. השדה על הקווים הודיע במקביל
  // שרשימת הקווים "אינה ניתנת לשאילתה", וזה כבר לא נכון מאז שחובר Stride.
  // המקור הראשי הוא עכשיו GTFS, ו-Places הוא גיבוי.
  const nearestGtfs = transitStops[0] ?? null;
  const nearestPlaceStop = transport[0] ?? null;
  const linesTotal = new Set(transitStops.flatMap((s) => s.lines.map((l) => l.shortName)));
  const todayIso = new Date().toISOString().slice(0, 10);
  const timetableDay = transitStops.find((s) => s.timetableDate)?.timetableDate ?? null;

  facts.transport.push(
    fact(
      'התחנה הקרובה ביותר',
      nearestGtfs ? nearestGtfs.name : nearestPlaceStop ? `${nearestPlaceStop.name} (${nearestPlaceStop.kind})` : null,
      {
        certainty: 'verified',
        sourceKey: nearestGtfs ? 'datagov' : 'google_maps',
        sourceNote: nearestGtfs
          ? `${distanceText(nearestGtfs.meters)} מהנכס (מרחק אווירי). ${
              nearestGtfs.lines.length
                ? `עוצרים בה ${countText(new Set(nearestGtfs.lines.map((l) => l.shortName)).size, 'קו', 'קווים', false)}: ${[...new Set(nearestGtfs.lines.map((l) => l.shortName))].join(', ')}.`
                : 'לא נמצאו קווים שעוצרים בה בלוח הזמנים של היום.'
            }`
          : nearestPlaceStop
            ? `${distanceText(nearestPlaceStop.straightMeters)} מהנכס במרחק אווירי` +
              // ⚠️ להציג גם את אורך מסלול ההליכה. נמצא במייל אמיתי: "157 מ'"
              // לצד "כ-8 דקות הליכה" נראה כמו חישוב שבור, בעוד שההליכה בפועל
              // עוקפת בניינים וארוכה בהרבה מהקו האווירי.
              (nearestPlaceStop.walkSeconds
                ? `; בהליכה בפועל ${walkApprox(nearestPlaceStop.walkSeconds)}${
                    nearestPlaceStop.walkMeters ? ` (${nearestPlaceStop.walkMeters} מ' מסלול)` : ''
                  }.`
                : '.')
            : undefined,
        missingReason: 'לא נמצאה תחנת תחבורה ציבורית בטווח הליכה מהנקודה.',
      },
    ),
    fact('תחנות בטווח הליכה', transitStops.length || transport.length || null, {
      certainty: 'approx',
      sourceKey: transitStops.length ? 'datagov' : 'google_maps',
      sourceNote: transitStops.length
        ? 'מלוח הזמנים הארצי של התחבורה הציבורית. הרשימה המלאה מופיעה למטה' +
          (linesTotal.size ? ', עם הקווים שעוצרים בכל תחנה.' : '. הקווים לא נשלפו — ראה השדה הבא.') +
          (timetableDay && timetableDay !== todayIso
            ? ` לוח הזמנים נלקח מ-${new Date(timetableDay).toLocaleDateString('he-IL')}, כי לוח היום טרם פורסם במקור.`
            : '')
        : transport.length
          ? 'ממפות גוגל. המקור הזה מוסר שם ומיקום של תחנה — לא אילו קווים עוצרים בה.'
          : undefined,
      missingReason: 'לא נמצאו תחנות בטווח הליכה.',
    }),
    fact('קווים שעוצרים בסביבה', linesTotal.size || null, {
      certainty: 'verified',
      tier: 'premium',
      sourceKey: 'datagov',
      sourceNote: linesTotal.size
        ? `${[...linesTotal].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b, 'he')).join(', ')} — מלוח הזמנים בפועל${
            timetableDay ? ` של ${new Date(timetableDay).toLocaleDateString('he-IL')}` : ''
          }, ולא מרשימה סטטית.`
        : undefined,
      // ⚠️ אסור לומר "לא נמצאו תחנות" כשמוצגות 20 תחנות שורה מעל. שלושת המצבים
      // שונים לגמרי, וההסבר חייב לתאר את מה שבאמת קרה.
      // ⚠️ לא לקבוע סיבה שלא נבדקה. הנוסח הקודם הכריז "תחנות שיצאו משימוש" על
      // כל התחנות בשני יישובים — שזו קביעה עובדתית על העולם שנשענה על תשובה
      // ריקה מהמקור, והיא הייתה שגויה (חלון השאילתה היה בעתיד).
      missingReason: transitStops.length
        ? 'נמצאו תחנות, אך לוח הזמנים הארצי לא החזיר קווים שעוצרים בהן — לא ליום הבדיקה ולא ליום שלפניו. ייתכן שהן יצאו משימוש, וייתכן שזו תקלה זמנית במקור.'
        : transport.length
          ? `רשימת הקווים נשלפת מלוח הזמנים הארצי, והוא לא החזיר תחנות לנקודה הזו${transitNote ? ` — ${transitNote}` : ''} התחנות שמופיעות למעלה מגיעות ממפות, שאינן כוללות אילו קווים עוצרים בהן.`
          : transitNote ?? 'לא נמצאו תחנות, ולכן אין קווים לדווח עליהם.',
    }),
    fact('הצומת הקרובה', junction ? junction.name : null, {
      certainty: 'verified',
      sourceKey: 'datagov',
      sourceNote: junction
        ? `${junction.kind ?? 'צומת'}${junction.roads ? ` בין כבישים ${junction.roads}` : ''}, ${distanceText(junction.meters)} מהנכס.`
        : undefined,
      missingReason:
        'אין צומת בין-עירונית מוכרת בטווח שלושה קילומטרים. במרכזי ערים זה המצב הרגיל — ' +
        'מרשם הצמתים הארצי מתאר צמתים בין-עירוניים.',
    }),
  );

  // ===== פוטנציאל =====
  facts.potential.push(
    fact(
      'שייך למתחם התחדשות עירונית',
      renewal?.inCompound ? renewal.compoundName || 'כן — במתחם מוכרז' : renewal?.matched ? 'לא' : null,
      {
        certainty: 'verified',
        sourceKey: 'hitchadshut',
        sourceNote: renewal?.inCompound
          ? 'הנכס נמצא בתוך מתחם פינוי-בינוי שהוכרז רשמית. זה משפיע מהותית על השווי העתידי.'
          : renewal?.matched
            ? 'בדקנו מול מפת המתחמים המוכרזים של משרד הבינוי — הנכס אינו בתוך מתחם.'
            : undefined,
        missingReason: 'מפת ההתחדשות העירונית לא נטענה.',
      },
    ),
    fact('מסלול ההתחדשות', renewal?.track ?? null, {
      certainty: 'verified',
      sourceKey: 'hitchadshut',
      missingReason: 'לא רלוונטי — הנכס אינו במתחם מוכרז.',
    }),
    fact('יחידות דיור מתוכננות במתחם', renewal?.units ?? null, {
      certainty: 'verified',
      tier: 'premium',
      sourceKey: 'hitchadshut',
      missingReason: 'לא רלוונטי — הנכס אינו במתחם מוכרז.',
    }),
    fact('ייעוד הקרקע', planning?.landUse ?? null, {
      certainty: 'verified',
      sourceKey: 'xplan',
      asOf: planning?.lastUpdated ?? undefined,
      sourceNote: 'מה מותר לבנות כאן לפי התוכנית התקפה.',
      // ⚠️ הבחנה בין "לא נמצאה תכנית" לבין "נמצאו תכניות, וכולן מפנות לאחרת".
      // בלעדיה הוצג ללקוח "יעוד עפ"י תכנית מאושרת אחרת" כאילו זהו הייעוד.
      missingReason: planning?.landUseDeferred
        ? `נמצאו ${planning.appliedPlans.length} תוכניות שחלות על הנקודה, אך אף אחת מהן אינה קובעת ייעוד בעצמה — כולן מפנות לתוכנית מאושרת אחרת. הייעוד המחייב נמצא בהוראות התוכניות עצמן.`
        : 'לא נמצאה תוכנית תקפה בנקודה הזו.',
    }),
    fact(
      'תוכניות שחלות על הנכס',
      planning?.appliedPlans?.length
        ? planning.appliedPlans
            .slice(0, 12)
            .map((p) => `${p.planNumber ?? 'ללא מספר'}${p.status ? ` (${p.status})` : ''}`)
            .join(' · ')
        : null,
      {
        certainty: 'verified',
        tier: 'premium',
        sourceKey: 'xplan',
        // ⚠️ השדה חתך ל-12 בעוד שהשדה שמעליו הכריז "נמצאו 13 תוכניות" — שתי
        // שורות סמוכות באותו דוח עם שני מספרים שונים לאותו דבר.
        sourceNote:
          (planning && planning.appliedPlans.length > 12
            ? `מוצגות 12 מתוך ${planning.appliedPlans.length} התוכניות שחלות על הנקודה. `
            : 'כל התוכניות שחלות על הנקודה. ') +
          'מהספציפית לרחבה: תוכנית עם פוליגון קטן נוגעת לנכס עצמו; פוליגון בהיקף עירוני הוא תוכנית כוללנית.',
        missingReason: 'לא נמצאו תוכניות שחלות על הנקודה.',
      },
    ),
    fact('זכויות בנייה', null, {
      certainty: 'verified',
      tier: 'premium',
      sourceKey: 'xplan',
      // אין מקור ציבורי כמותי. אומרים זאת במפורש ומפנים לאן ללכת.
      missingReason:
        planning?.buildingRightsNote ??
        'זכויות בנייה כמותיות אינן מתפרסמות בממשק ציבורי. הן מופיעות בהוראות התוכנית ב"תכנון זמין".',
    }),
    fact('מספר התוכנית', planning?.planNumber ?? null, {
      certainty: 'verified',
      tier: 'premium',
      sourceKey: 'xplan',
      missingReason: 'לא נמצאה תוכנית תקפה בנקודה הזו.',
    }),
    fact('שם התוכנית', planning?.planName ?? null, {
      certainty: 'verified',
      tier: 'vip',
      sourceKey: 'xplan',
      missingReason: 'לא נמצאה תוכנית תקפה בנקודה הזו.',
    }),
    fact('הגבלות נוספות על הקרקע', planning?.overlays?.length ? planning.overlays.join(' · ') : null, {
      certainty: 'verified',
      tier: 'vip',
      sourceKey: 'xplan',
      sourceNote:
        'למשל שימור מבנים או אתר עתיקות — דברים שמגבילים בנייה. שכבת ההגבלות ' +
        'נפרדת משכבת התוכניות, ולכן היא יכולה להחזיר נתון גם כשלא נמצאה תוכנית ' +
        'תקפה בנקודה.',
      missingReason: 'לא נמצאו הגבלות נוספות.',
    }),
    needsLicensedSource(
      'זכויות בנייה מדויקות (אחוזים, קומות, יח"ד)',
      'xplan',
      'המספרים המדויקים מופיעים רק בהוראות התוכנית עצמה במערכת מבא"ת, ולא בשירות המפות.',
    ),
  );

  // --- שווי משוער (VIP) ---
  // המחיר למ"ר של **הבניין** עדיף על זה של האזור: האזור עשוי לכלול רחובות
  // שונים לגמרי באופיים, ומכפלה בו נותנת מספר שנראה מדויק ואינו.
  // ⚠️ שני תיקונים כאן, שניהם ממצאים מדוחות אמיתיים:
  // 1. דיוק מדומה: המכפלה יצאה 2,799,940 ₪ — שישים שקל מתחת לעסקה האחרונה
  //    שממנה היא נגזרה. מספר עד השקל האחרון מציג הערכה גסה כאילו היא שמאות.
  //    ההערכה מעוגלת לעשרות אלפים, וזה מה שמוצג.
  // 2. השדה נעלם לגמרי בדוח על נכס בלי עסקאות בבניין, למרות שהיו לו גם מחיר
  //    למ"ר וגם שטח — כלומר שני דוחות באותה רמה יצאו במבנה שונה.
  const valueBand = buildingBand.median ? buildingBand : streetBand.median ? streetBand : areaBand;
  const areaFromBuilding = !!(matchedUnit?.areaSqm ?? lastBuildingDeal?.areaSqm);

  /**
   * העסקה האחרונה בגודל דומה — העוגן הטוב ביותר שיש.
   *
   * ⚠️ נמצא בדוח אמיתי: ההערכה יצאה 2,850,000 ₪ בעוד שדירה **זהה בגודל** באותו
   * בניין נמכרה בינואר 2026 ב-2,800,000 ₪, ובאותו דוח נכתב שהמדד ירד ב-2%
   * בשנה האחרונה. חציון תלת-שנתי מייצר מספר שמתעלם גם מהעסקה הטרייה וגם
   * מהמגמה שהדוח עצמו מדפיס. כשקיימת עסקה טרייה בגודל דומה — היא העוגן,
   * והחציון מוצג לצידה.
   */
  // ⚠️ החיפוש חייב לכלול גם את האזור, ולא רק את הבניין והרחוב. נמצא בדוח אמיתי:
  // לנכס בן 213 מ"ר נמכרה דירה של **213 מ"ר בדיוק** באזור בתאריך 16/10/2025,
  // וההערכה בכל זאת נשענה על חציון רחוב של מכירה אחת מ-2024 ויצאה 11% מעליה.
  const similarRecent =
    unitArea != null
      ? [...buildingRealSales, ...streetHomeSales, ...areaHomeSales].find(
          (t) =>
            t.areaSqm != null &&
            Math.abs(t.areaSqm - unitArea) / unitArea <= 0.12 &&
            new Date(t.dealDate).getTime() >= Date.now() - 18 * 30.44 * 24 * 3600 * 1000,
        ) ?? null
      : null;
  const anchorPpsqm = similarRecent ? pricePerSqm(similarRecent.price, similarRecent.areaSqm) : null;
  const ppsqmForValue = anchorPpsqm ?? valueBand.median;
  const rawValue = ppsqmForValue && unitArea ? ppsqmForValue * unitArea : null;
  const estimatedValue = rawValue ? Math.round(rawValue / 10_000) * 10_000 : null;
  if (estimatedValue) {
    const scopeLabel = anchorPpsqm
      ? `לפי עסקה מ-${new Date(similarRecent!.dealDate).toLocaleDateString('he-IL')} על ${similarRecent!.areaSqm} מ"ר — הגודל הדומה ביותר לנכס שנמכר לאחרונה`
      : valueBand === buildingBand
        ? 'לפי מכירות הדירות בבניין הזה'
        : valueBand === streetBand
          ? 'לפי מכירות הדירות באותו רחוב'
          : 'לפי חציון העסקאות באזור';
    facts.potential.push(
      fact(`שווי משוער של ${unitNoun}`, estimatedValue, {
        certainty: 'estimate',
        unit: '₪',
        tier: 'vip',
        sourceKey: 'carmen',
        sourceNote:
          `חישוב שלנו: ${Math.round(ppsqmForValue!).toLocaleString('he-IL')} ₪ למ"ר ${scopeLabel}, ` +
          `כפול ${unitArea} מ"ר` +
          (areaFromBuilding ? '' : ' (השטח נלקח מדירה אחרת בסביבה, כי אין עסקה בבניין עצמו)') +
          '. מעוגל לעשרות אלפים בכוונה — זו הערכה גסה ואינה שמאות.' +
          // ⚠️ להגיד **איזה** חציון. "החציון בחמש השנים האחרונות" בלי היקף
          // התנגש בדוח אמיתי עם "מחיר למ"ר באזור" שהיה מספר אחר לגמרי, באותו
          // חלון זמן ובאותו מייל.
          (anchorPpsqm && valueBand.median
            ? ` לשם השוואה, ${
                valueBand === buildingBand
                  ? 'חציון הבניין'
                  : valueBand === streetBand
                    ? 'חציון הרחוב'
                    : 'חציון האזור'
              } ${valueBand.windowLabel} הוא ${Math.round(valueBand.median).toLocaleString('he-IL')} ₪ למ"ר.`
            : ''),
      }),
    );
  }

  // ===== היתרים, זכויות ומסמכים (בכל ארבעת סוגי הנכס) =====
  //
  // ⚠️ הסעיף הזה **אינו** חוזר על מה שכבר בסעיף הפוטנציאל (ייעוד הקרקע, מספר
  // התוכנית והתוכניות שחלות). הוא מוסיף את מה שמרשם התכניות מחזיק ושכבת
  // ייעודי הקרקע אינה מחזיקה: מי הוועדה, אילו תוכניות מכוחן ניתן להוציא היתר,
  // מה בהליך, ואיפה התקנון והתשריט.
  const permitPlans: PlanWithDocs[] = permits
    ? [...permits.approved, ...permits.inProcess, ...permits.policy]
    : [];
  /** התוכנית המאושרת הספציפית ביותר — הרשימה ממוינת מהשטח הקטן לגדול. */
  const leadPlan = permits?.approved.find((p) => p.canIssuePermits) ?? permits?.approved[0] ?? null;
  const nextObjection = (permits?.inProcess ?? [])
    .map((p) => p.dates.objectionsDeadline)
    .filter((d): d is string => !!d && new Date(d).getTime() > Date.now())
    .sort()[0];

  facts.permits.push(
    fact('הוועדה המקומית לתכנון ולבנייה', permits?.committee ?? null, {
      // ⚠️ כשהשם נלקח מתכנית סמוכה — הוודאות יורדת ל"מקורב", והמשפט אומר זאת.
      certainty: permits?.committeeFromNearby ? 'approx' : 'verified',
      sourceKey: 'xplan',
      sourceNote: permits?.committeeFromNearby
        ? 'זו הכתובת להגשת בקשה להיתר ולעיון בתיק הבניין. אין תכנית מקוונת על המגרש עצמו, ולכן השם נלקח מתכנית סמוכה שתחום השיפוט שלה הוא אותו יישוב.'
        : 'זו הכתובת להגשת בקשה להיתר ולעיון בתיק הבניין. השם נלקח מהתוכניות שחלות על הנקודה עצמה.',
      missingReason: permits?.coverageGap
        ? 'אין תכנית מקוונת על המגרש, וגם בתכניות שבסביבה לא נמצא שם ועדה יחיד. הוועדה המקומית של היישוב היא הכתובת.'
        : 'התוכניות שחלות על הנקודה אינן מציינות ועדה מקומית יחידה.',
    }),
    fact('מרחב התכנון', permits?.planningSpace ?? null, {
      certainty: permits?.committeeFromNearby ? 'approx' : 'verified',
      tier: 'premium',
      sourceKey: 'xplan',
      sourceNote: permits?.committeeFromNearby
        ? 'נלקח מתכנית סמוכה באותו יישוב — אין תכנית מקוונת על המגרש עצמו.'
        : undefined,
      missingReason: 'לא צוין מרחב תכנון בתוכניות שחלות על הנקודה.',
    }),
    fact('תוכניות מאושרות שחלות על הנכס', permits?.approved.length || null, {
      certainty: 'verified',
      sourceKey: 'xplan',
      sourceNote:
        'תוכנית מאושרת היא זו שמכוחה אפשר להוציא היתר בנייה היום. הרשימה המלאה, עם המסמכים, מופיעה מתחת.',
      missingReason: 'לא נמצאה תוכנית מאושרת שהקו הכחול שלה חולש על הנקודה.',
    }),
    // ⚠️ הכותרת אינה "התכנית שחלה על המגרש". התכניות ממוינות מהשטח הקטן לגדול,
    // ובחלק מהיישובים הקטנה ביותר היא עדיין תכנית בהיקף עירוני (18,000 דונם
    // ברחובות). לקרוא לה "של המגרש" זו הבטחת דיוק שאין לה כיסוי — ולכן שטח
    // התכנית מוצג בשורה עצמה.
    fact('התוכנית המאושרת הספציפית ביותר', leadPlan ? leadPlan.planNumber ?? leadPlan.planName : null, {
      certainty: 'verified',
      sourceKey: 'xplan',
      sourceNote: leadPlan
        ? [
            leadPlan.planName,
            leadPlan.areaDunam
              ? `התכנית משתרעת על ${new Intl.NumberFormat('he-IL').format(Math.round(leadPlan.areaDunam))} דונם`
              : null,
            leadPlan.plainSummary,
          ]
            .filter(Boolean)
            .join(' — ')
        : undefined,
      asOf: leadPlan?.dates.gazette ?? undefined,
      missingReason: 'לא נמצאה תוכנית מאושרת בנקודה הזו.',
    }),
    fact('תוכניות בהליך (טרם אושרו)', permits?.inProcess.length || null, {
      certainty: 'verified',
      sourceKey: 'xplan',
      sourceNote:
        'תוכנית בהליך אינה מקנה זכויות היום. היא מלמדת מה עשוי להשתנות כאן, וזה צפי ולא מצב.' +
        (nextObjection
          ? ` המועד הקרוב להגשת התנגדויות שנרשם: ${new Date(nextObjection).toLocaleDateString('he-IL')}.`
          : ''),
      missingReason: 'אין תוכנית בהליך שחלה על הנקודה.',
    }),
    fact('מסמכי מדיניות שחלים על האזור', permits?.policy.length || null, {
      certainty: 'verified',
      tier: 'premium',
      sourceKey: 'xplan',
      sourceNote: 'מנחים את הוועדה בשיקול הדעת שלה, אך אינם מקנים זכויות בנייה בעצמם.',
      missingReason: 'לא נמצאו מסמכי מדיניות שחלים על הנקודה.',
    }),
    fact(
      'תוכניות שהתקנון והתשריט שלהן זמינים',
      permitPlans.filter((p) => p.documents.length).length || null,
      {
        certainty: 'verified',
        sourceKey: 'xplan',
        sourceNote: permits?.documentsAccessNote,
        missingReason: 'לא נמצאה תוכנית עם עמוד מסמכים במרשם.',
      },
    ),
    // מוצג רק כשיש חור כיסוי — ואז הוא הנתון החשוב ביותר בסעיף.
    ...(permits?.coverageGap
      ? [
          fact(
            'ייעוד הקרקע במגרשים הסמוכים',
            permits.nearby?.landUse ?? null,
            {
              certainty: 'approx',
              sourceKey: 'xplan',
              sourceNote: permits.nearby?.landUse
                ? `⚠️ זה **אינו** הייעוד של המגרש הזה. המפה המקוונת אינה מכסה את החלקה עצמה, וזהו הייעוד של מגרש שכן במרחק של עד ${permits.nearby.radiusM} מ'${
                    permits.nearby.planNumber ? `, לפי תכנית ${permits.nearby.planNumber}` : ''
                  }. הייעוד המחייב של המגרש נמצא בתיק בוועדה המקומית.`
                : undefined,
              missingReason:
                'גם ברדיוס של 150 מ׳ אין כיסוי במפה המקוונת. במקרה כזה המצב התכנוני מתברר בוועדה המקומית בלבד.',
            },
          ),
        ]
      : []),
    // ⚠️ לא "לא נמצא היתר" — אין מרשם ארצי לשאול בו, ומשפט כזה נקרא כאילו
    // נבדק ונמצא שאין. במקום זה: איפה בודקים בפועל ומול מי.
    fact('היתר בנייה על הנכס', null, {
      certainty: 'verified',
      tier: 'premium',
      sourceKey: 'xplan',
      missingReason: permits?.permitGuidance ?? 'לא ניתן היה לזהות את הוועדה המקומית לנכס הזה.',
    }),
  );

  for (const w of permits?.warnings ?? []) warnings.push(w);

  /**
   * למה אין ייעוד קרקע — משפט אחד לכל הסעיפים.
   * ⚠️ שלושת המצבים שונים לחלוטין זה מזה, ולקוח שקורא "לא נמצא ייעוד" בלי
   * להבחין ביניהם מסיק מסקנה שגויה על הנכס שלו.
   */
  const landUseMissing = permits?.coverageGap
    ? `המפה המקוונת של מינהל התכנון אינה מכסה את החלקה הזו כלל.${
        permits.nearby?.landUse
          ? ` במגרשים שכנים, עד ${permits.nearby.radiusM} מ' מכאן, הייעוד הוא "${permits.nearby.landUse}" — אבל זה הייעוד שלהם ולא של המגרש הזה.`
          : ''
      } את הייעוד המחייב יש לברר בוועדה המקומית.`
    : permits?.landUseDeferred
      ? 'התוכניות שחלות על הנקודה אינן קובעות ייעוד בעצמן — כולן מפנות לתוכנית מאושרת אחרת. הייעוד המחייב נמצא בהוראות התוכניות עצמן.'
      : 'לא נמצאה תוכנית תקפה שקובעת ייעוד לנקודה הזו.';

  /** שורה אחת לכל תוכנית — לרשימה המלאה במייל וב-PDF. */
  const planLine = (p: PlanWithDocs): string =>
    [
      p.approved ? 'מאושרת' : p.isPolicyDocument ? 'מסמך מדיניות' : 'בהליך',
      p.planNumber ?? 'ללא מספר',
      p.planName,
      p.planType,
      p.areaDunam ? `שטח התוכנית ${new Intl.NumberFormat('he-IL').format(Math.round(p.areaDunam))} דונם` : null,
      p.plainSummary,
      ...p.quantityLines,
      p.mavatUrl ? `המסמכים: ${p.mavatUrl}` : null,
    ]
      .filter(Boolean)
      .join(' · ');

  // ===== שכירות =====
  if (assetType === 'rental') {
    const rentLast = rentIndex?.points.at(-1) ?? null;
    // מודעות שכירות שיש בהן גם מחיר וגם שטח — רק מהן אפשר לגזור שכ"ד למ"ר.
    const rentPerSqm = listingsResult.listings
      .map((l) => (l.price && l.areaSqm ? l.price / l.areaSqm : null))
      .filter((v): v is number => v !== null && Number.isFinite(v) && v > 0)
      .sort((a, b) => a - b);
    const medRentPerSqm = median(rentPerSqm);
    const estMonthly = medRentPerSqm && unitArea ? Math.round((medRentPerSqm * unitArea) / 50) * 50 : null;
    // תשואה ברוטו: שכ"ד שנתי חלקי מחיר הנכס. שני האגפים חייבים לבוא מאותו
    // אזור, ולכן המכנה הוא חציון המחיר למ"ר של האזור כפול אותו שטח.
    const priceForYield = valueBand.median && unitArea ? valueBand.median * unitArea : null;
    const yieldPct =
      estMonthly && priceForYield ? Math.round(((estMonthly * 12) / priceForYield) * 1000) / 10 : null;
    const rentQuotaNote = listingsResult.quotaExhausted
      ? 'מכסת השימוש החודשית במושך המודעות נוצלה במלואה, ולכן לא נמשכו מודעות שכירות להפקה הזו.'
      : 'לא נמצאו מודעות שכירות עם מחיר ושטח באזור הזה.';

    facts.rental.push(
      fact('מדד שכר הדירה', rentLast ? rentLast.value : null, {
        certainty: 'verified',
        sourceKey: 'cbs',
        asOf: rentLast?.period,
        sourceNote: rentIndex
          ? `${rentIndex.seriesName ?? 'שכר דירה'} — סדרה חודשית של הלמ"ס${
              rentIndex.baseDesc ? `, בסיס ${rentIndex.baseDesc}` : ''
            }. זהו מדד ארצי: הוא מתאר את כיוון השוק, לא את הנכס הזה.`
          : undefined,
        missingReason: 'מדד שכר הדירה לא נטען כרגע.',
      }),
      fact('שינוי בשכר הדירה בשנה האחרונה', rentIndex?.yearChangePct ?? null, {
        certainty: 'verified',
        unit: '%',
        sourceKey: 'cbs',
        asOf: rentLast?.period,
        missingReason: 'מדד שכר הדירה לא נטען כרגע.',
      }),
      fact('מודעות שכירות שנמצאו באזור', listingsResult.listings.length || null, {
        certainty: 'approx',
        tier: 'premium',
        sourceKey: 'apify',
        sourceNote: listingsResult.listings.length
          ? 'מודעות שמפורסמות כרגע בלוחות. מחיר מבוקש — לא מחיר שנסגר.'
          : undefined,
        missingReason: rentQuotaNote,
      }),
      fact('שכר דירה חציוני למ"ר באזור', medRentPerSqm ? Math.round(medRentPerSqm) : null, {
        certainty: 'approx',
        unit: '₪',
        tier: 'premium',
        sourceKey: 'apify',
        sourceNote: medRentPerSqm
          ? `חציון של ${countText(rentPerSqm.length, 'מודעה', 'מודעות')} שיש בהן גם מחיר וגם שטח.`
          : undefined,
        missingReason: rentQuotaNote,
      }),
      // ⚠️ `unitNoun` נושא ה' הידיעה ("הדירה"), ולכן "ל${unitNoun}" הפיק
      // "להדירה". בעברית המילית בולעת את ה' הידיעה.
      fact(`שכר דירה חודשי משוער ל${unitNoun.replace(/^ה/, '')}`, estMonthly, {
        certainty: 'estimate',
        unit: '₪',
        tier: 'premium',
        sourceKey: 'apify',
        highlight: true,
        sourceNote: estMonthly
          ? `חישוב שלנו: ${Math.round(medRentPerSqm!).toLocaleString('he-IL')} ₪ למ"ר כפול ${unitArea} מ"ר, מעוגל לחמישים שקלים. הערכה גסה, לא הצעת מחיר.`
          : undefined,
        missingReason: medRentPerSqm
          ? 'אין שטח ידוע לנכס, ולכן אי אפשר לגזור ממנו שכר דירה.'
          : rentQuotaNote,
      }),
      fact('תשואה שנתית ברוטו', yieldPct, {
        certainty: 'estimate',
        unit: '%',
        tier: 'premium',
        sourceKey: 'carmen',
        highlight: true,
        sourceNote: yieldPct
          ? `שכר הדירה המשוער כפול 12, חלקי שווי משוער של ${Math.round(priceForYield!).toLocaleString('he-IL')} ₪ (${Math.round(valueBand.median!).toLocaleString('he-IL')} ₪ למ"ר ${valueBand.windowLabel} כפול ${unitArea} מ"ר). ברוטו — לפני ארנונה, ועד בית, תחזוקה ותקופות ריקות.`
          : undefined,
        missingReason: estMonthly
          ? 'אין חציון מחיר מכירה באזור, ולכן אין מול מה לחשב תשואה.'
          : rentQuotaNote,
      }),
    );
  }

  // ===== מסחרי =====
  if (assetType === 'commercial') {
    const commercialTxns = allTxns.filter(isCommercialDeal);
    const commercialPpsqm = commercialTxns
      .map((t) => pricePerSqm(t.price, t.areaSqm))
      .filter((v): v is number => v !== null)
      .sort((a, b) => a - b);
    const medCommercial = median(commercialPpsqm);
    const lastCommercial = commercialTxns[0] ?? null;
    const commerceRights = permitPlans
      .filter((p) => p.quantities.deltaCommerceSqm || p.quantities.deltaEmploymentSqm)
      .slice(0, 6);
    const nearestCommerce = commerce[0] ?? null;
    // תחנה עם קווים ידועים עדיפה; אין כזו — לפחות שם ומרחק מהמפות.
    const nearestStop: { name: string; meters: number } | null = transitStops[0]
      ? { name: transitStops[0].name, meters: transitStops[0].meters }
      : transport[0]
        ? { name: transport[0].name, meters: transport[0].straightMeters }
        : null;

    facts.commercial.push(
      fact(
        'ייעוד הקרקע כולל שימוש מסחרי',
        permits?.landUse ? (/מסחר|תעסוק|משרד|תעשי|מלאכה|מעורב/.test(permits.landUse) ? `כן — ${permits.landUse}` : `לא — הייעוד הוא ${permits.landUse}`) : null,
        {
          certainty: 'verified',
          sourceKey: 'xplan',
          sourceNote:
            'ייעוד הקרקע קובע אילו שימושים מותרים כאן. שימוש מסחרי בייעוד שאינו מתיר אותו דורש הליך תכנוני.',
          missingReason: landUseMissing,
        },
      ),
      fact(
        'תוכניות שמוסיפות שטחי מסחר או תעסוקה',
        commerceRights.length || null,
        {
          certainty: 'verified',
          tier: 'premium',
          sourceKey: 'xplan',
          sourceNote: commerceRights.length
            ? 'הכמויות הן לכל שטח התוכנית ולא למגרש הזה — הפירוט המלא מופיע ברשימת התוכניות.'
            : undefined,
          missingReason: 'אף תוכנית שחלה על הנקודה אינה מדווחת שינוי בשטחי מסחר או תעסוקה.',
        },
      ),
      fact('עסקאות מסחריות שנרשמו באזור', commercialTxns.length || null, {
        certainty: 'verified',
        sourceKey: 'nadlan',
        sourceNote: commercialTxns.length
          ? 'משרדים, חנויות ומבני תעשייה מתוך מרשם העסקאות — אותו מרשם של עסקאות המגורים.'
          : undefined,
        missingReason:
          'מרשם העסקאות לא החזיר אף עסקה מסחרית באזור הזה. באזורי מגורים מובהקים זה המצב הרגיל.',
      }),
      fact('מחיר חציוני למ"ר בעסקאות המסחריות', medCommercial, {
        certainty: 'approx',
        unit: '₪',
        tier: 'premium',
        sourceKey: 'nadlan',
        highlight: true,
        sourceNote: medCommercial
          ? `חציון של ${countText(commercialPpsqm.length, 'עסקה', 'עסקאות')} מסחריות שיש בהן מחיר ושטח. סוגי נכס מסחריים שונים מאוד זה מזה — זהו סדר גודל, לא הערכת שווי.`
          : undefined,
        missingReason: 'אין עסקאות מסחריות עם מחיר ושטח באזור.',
      }),
      fact(
        'העסקה המסחרית האחרונה',
        lastCommercial ? lastCommercial.dealDate : null,
        {
          certainty: 'verified',
          kind: 'date',
          sourceKey: 'nadlan',
          sourceNote: lastCommercial
            ? [
                lastCommercial.propertyType ?? lastCommercial.dealType,
                lastCommercial.address,
                lastCommercial.price ? `${lastCommercial.price.toLocaleString('he-IL')} ₪` : null,
                lastCommercial.areaSqm ? `${lastCommercial.areaSqm} מ"ר` : null,
              ]
                .filter(Boolean)
                .join(' · ')
            : undefined,
          missingReason: 'לא נרשמה עסקה מסחרית באזור.',
        },
      ),
      fact('נכסים מסחריים המוצעים כרגע', listingsResult.listings.length || null, {
        certainty: 'approx',
        tier: 'premium',
        sourceKey: 'apify',
        sourceNote: listingsResult.listings.length
          ? 'נמשכים מלוח יד2 בלבד — הלוח השני אינו מגיש קטגוריה מסחרית.'
          : undefined,
        missingReason: listingsResult.quotaExhausted
          ? 'מכסת השימוש החודשית במושך המודעות נוצלה במלואה, ולכן לא נמשכו מודעות מסחריות להפקה הזו.'
          : 'לא נמצאו נכסים מסחריים המוצעים כרגע באזור.',
      }),
      fact('עסקים ומסחר בסביבה הקרובה', commerce.length || null, {
        certainty: 'verified',
        sourceKey: 'google',
        sourceNote: nearestCommerce
          ? `הקרוב ביותר: ${nearestCommerce.name}, ${distanceText(nearestCommerce.straightMeters)}. סביבה מסחרית פעילה היא מה שמביא לקוחות עוברים ושבים.`
          : undefined,
        missingReason: 'לא נמצאו עסקים בסביבה — או ששירות המפות אינו מחובר.',
      }),
      fact('נגישות בתחבורה ציבורית', nearestStop?.name ?? null, {
        certainty: 'verified',
        sourceKey: 'gtfs',
        sourceNote: nearestStop
          ? `${distanceText(nearestStop.meters)} מהנכס — נגישות לעובדים וללקוחות.`
          : undefined,
        missingReason: 'לא נמצאה תחנה בטווח הליכה מהנקודה.',
      }),
    );
  }

  // ===== קרקעות ומגרשים =====
  if (assetType === 'land') {
    const landTxns = allTxns.filter(isLandDeal);
    const landPpsqm = landTxns
      .map((t) => pricePerSqm(t.price, t.areaSqm))
      .filter((v): v is number => v !== null)
      .sort((a, b) => a - b);
    const medLand = median(landPpsqm);
    const lastLand = landTxns[0] ?? null;
    /** תוכניות בהליך שהן העדות היחידה לשינוי ייעוד אפשרי — צפי, לא מצב. */
    const rezoning = (permits?.inProcess ?? []).slice(0, 8);
    const isAgricultural = !!permits?.landUse && /חקלא/.test(permits.landUse);

    facts.land.push(
      fact('שטח החלקה', parcelAreaSqm, {
        certainty: 'verified',
        unit: 'מ"ר',
        sourceKey: 'cadastre',
        highlight: true,
        sourceNote: 'השטח הרשום של החלקה כולה במרשם החלקות — לא של יחידה בתוכה.',
        missingReason: 'מרשם החלקות לא החזיר שטח רשום לחלקה הזו.',
      }),
      fact('ייעוד הקרקע היום', permits?.landUse ?? null, {
        certainty: 'verified',
        sourceKey: 'xplan',
        sourceNote:
          'זה מה שמותר במגרש **היום**, לפי התוכנית התקפה. כל שינוי לייעוד אחר מחייב הליך תכנוני מלא.',
        missingReason: landUseMissing,
      }),
      fact('תוכניות בהליך שעשויות לשנות את הייעוד', rezoning.length || null, {
        certainty: 'verified',
        sourceKey: 'xplan',
        sourceNote: rezoning.length
          ? 'תוכנית בהליך אינה מקנה זכויות ואינה מבטיחה שינוי. זהו צפי, והוא יכול להשתנות או להיעצר.'
          : undefined,
        missingReason: 'אין תוכנית בהליך שחלה על המגרש הזה.',
      }),
      fact('עסקאות קרקע שנרשמו באזור', landTxns.length || null, {
        certainty: 'verified',
        sourceKey: 'nadlan',
        sourceNote: landTxns.length
          ? 'עסקאות שסווגו כקרקע, מגרש או קומבינציה — לא מכירת דירות.'
          : undefined,
        missingReason: 'מרשם העסקאות לא החזיר עסקאות קרקע באזור הזה.',
      }),
      fact('מחיר חציוני למ"ר קרקע', medLand, {
        certainty: 'approx',
        unit: '₪',
        tier: 'premium',
        sourceKey: 'nadlan',
        highlight: true,
        sourceNote: medLand
          ? `חציון של ${countText(landPpsqm.length, 'עסקה', 'עסקאות')} קרקע. ⚠️ בעסקת קומבינציה התמורה אינה מחיר מלא של הקרקע, ולכן היא מושכת את החציון כלפי מטה.`
          : undefined,
        missingReason: 'אין עסקאות קרקע עם מחיר ושטח באזור.',
      }),
      fact('עסקת הקרקע האחרונה', lastLand ? lastLand.dealDate : null, {
        certainty: 'verified',
        kind: 'date',
        sourceKey: 'nadlan',
        sourceNote: lastLand
          ? [
              lastLand.propertyType ?? lastLand.dealType,
              lastLand.address,
              lastLand.price ? `${lastLand.price.toLocaleString('he-IL')} ₪` : null,
              lastLand.areaSqm ? `${lastLand.areaSqm} מ"ר` : null,
            ]
              .filter(Boolean)
              .join(' · ')
          : undefined,
        missingReason: 'לא נרשמה עסקת קרקע באזור.',
      }),
      fact(
        'מדיניות רמ"י לשינוי ייעוד קרקע חקלאית',
        ramiPolicy?.sections.length ? `${ramiPolicy.sections.length} סעיפים רלוונטיים` : null,
        {
          certainty: 'verified',
          tier: 'premium',
          sourceKey: 'rami',
          asOf: ramiPolicy?.versionDate ?? undefined,
          sourceNote: ramiPolicy
            ? `${ramiPolicy.note} מתוך קובץ ההחלטות בגרסה ${ramiPolicy.version}${
                ramiPolicy.versionDate ? ` (${new Date(ramiPolicy.versionDate).toLocaleDateString('he-IL')})` : ''
              }.` +
              (isAgricultural
                ? ' הייעוד כאן חקלאי — הפרק הזה נוגע ישירות למגרש.'
                : ' הייעוד כאן אינו חקלאי, ולכן הפרק מובא כרקע בלבד.')
            : undefined,
          missingReason: 'קובץ החלטות מועצת מקרקעי ישראל לא נטען כרגע.',
        },
      ),
    );
    for (const w of ramiPolicy?.warnings ?? []) warnings.push(w);
  }

  // הרשימות המלאות. הן יוצאות כ-`notes` כדי שגם ה-PDF, המצגת והמייל יקבלו
  // אותן — ולא רק המסך, שבו יש רכיבי תצוגה ייעודיים.
  const notes: Partial<Record<CategoryKey, string[]>> = {
    permits: permitPlans.length
      ? [
          `התוכניות שחלות על הנקודה (${permitPlans.length}), מהספציפית לרחבה:`,
          ...permitPlans.map(planLine),
          permits?.documentsAccessNote ?? '',
        ].filter(Boolean)
      : [],
    land:
      assetType === 'land' && ramiPolicy?.sections.length
        ? [
            `מדיניות רמ"י — פרק "קרקע חקלאית", סעיפים שנוגעים לשינוי ייעוד (גרסה ${ramiPolicy.version}):`,
            ...ramiPolicy.sections.map((s) =>
              [`${s.number ?? ''} ${s.title}`.trim(), s.path, s.text ? s.text.replace(/\s+/g, ' ').slice(0, 600) : null]
                .filter(Boolean)
                .join(' · '),
            ),
            `המקור המלא: ${ramiPolicy.url}`,
          ]
        : [],
    surroundings: [
      ...(education.length ? [`מוסדות חינוך (${education.length}):`, ...fullList(education)] : []),
      ...(preschool.length ? [`גנים ומעונות (${preschool.length}):`, ...fullList(preschool)] : []),
      ...(religion.length ? [`בתי כנסת ומוסדות דת (${religion.length}):`, ...fullList(religion)] : []),
      ...(mikvaot.length
        ? [
            `מקוואות (${mikvaot.length}):`,
            ...mikvaot.map(
              (m) =>
                `מקווה · ${m.name}` +
                (m.address ? ` · ${m.address}` : '') +
                (m.meters != null ? ` · ${m.meters} מ'` : ' · המרחק לא נקבע — הכתובת לא אותרה') +
                ' · ' +
                [m.forWomen && 'לנשים', m.forMen && 'לגברים', m.forDishes && 'לכלים']
                  .filter(Boolean)
                  .join(', ') +
                (m.hoursSummer ? ` · קיץ: ${m.hoursSummer}` : '') +
                (m.hoursWinter ? ` · חורף: ${m.hoursWinter}` : '') +
                (m.accessibility ? ` · נגישות: ${m.accessibility}` : ''),
            ),
          ]
        : []),
      ...(commerce.length ? [`מסחר וקניות (${commerce.length}):`, ...fullList(commerce)] : []),
      ...(health.length ? [`בריאות (${health.length}):`, ...fullList(health)] : []),
      ...(leisure.length ? [`פארקים ופנאי (${leisure.length}):`, ...fullList(leisure)] : []),
    ],
    transport: transitStops.length
      ? [
          `תחנות בטווח הליכה (${transitStops.length}):`,
          ...transitStops.map(
            (s) =>
              `${s.name} · ${s.meters} מ'` +
              (s.linesUnavailable
                ? ' · רשימת הקווים לא נטענה לתחנה הזו'
                : s.lines.length
                  ? ` · קווים: ${[...new Set(s.lines.map((l) => l.shortName))].join(', ')}`
                  : ' · לא נמצאו קווים בלוח הזמנים של היום'),
          ),
        ]
      : [],
  };

  /**
   * אילו סעיפים מוצגים בסוג הנכס הזה.
   *
   * הסעיף הייעודי של כל סוג נכס מוצג רק בסוג שלו — דוח מגורים אינו מציג סעיף
   * "הקרקע והמצב התכנוני" ריק. ובקרקע מוסתר גם "הבניין והכניסה": אין בניין,
   * ולכן כל שדותיו היו יוצאים "אין נתון" ומעמיסים על הדוח בלי לומר דבר.
   */
  const assetOnly = new Set<CategoryKey>(['rental', 'commercial', 'land']);
  const hidden = new Set<CategoryKey>(ASSET_HIDDEN_CATEGORIES[assetType]);
  const categories: ReportCategory[] = CATEGORY_ORDER.filter((key) => {
    if (hidden.has(key)) return false;
    if (assetOnly.has(key)) return ASSET_CATEGORY[assetType] === key;
    return true;
  }).map((key) => ({
    key,
    title: CATEGORY_TITLE[key],
    subtitle: CATEGORY_SUBTITLE[key],
    facts: facts[key],
    notes: notes[key]?.length ? notes[key] : undefined,
  }));

  // --- כותרת ---
  const streetLine = [streetDisplay, parsed.houseNum != null ? String(parsed.houseNum) : null]
    .filter(Boolean)
    .join(' ');
  const parcelLine = gush && helka ? `גוש ${gush} חלקה ${helka}` : '';
  // ⚠️ בהזנת גוש/חלקה אין רחוב בשאילתה — אבל יש כתובת: העסקאות הרשומות בחלקה
  // נושאות אותה. זהו הכיוון ההפוך של ההמרה, והכותרת מציגה אותו רק כשהוא
  // מאומת (`crossChecked`), כדי שכתובת משוערת לא תוצג ככתובת הנכס.
  const reverseLine =
    parsed.kind === 'parcel' && parcelIdentity.crossChecked && parcelIdentity.street
      ? [
          `${parcelIdentity.street}${parcelIdentity.houseNum != null ? ` ${parcelIdentity.houseNum}` : ''}`,
          parcelIdentity.city,
        ]
          .filter(Boolean)
          .join(', ')
      : '';
  const headline =
    [[streetLine, city].filter(Boolean).join(', ') || reverseLine, parcelLine]
      .filter(Boolean)
      .join(' · ') || parsed.raw;

  const nbDisplay = neighborhood
    ? displayName(neighborhood, nbFromDeals ?? '', { prefix: '' })
    : nbInfo?.name ?? nbFromDeals;

  return {
    query: parsed.raw,
    tier,
    assetType,
    permits,
    valuation,
    constraints,
    feasibility,
    ramiPolicy,
    rentIndex,
    nearbyPlans,
    title: {
      streetOfficial: streetResolved?.official ?? parsed.street ?? null,
      streetAliases: streetResolved?.aliases ?? [],
      streetDisplay,
      houseNumber: parsed.houseNum != null ? String(parsed.houseNum) : null,
      city,
      gush,
      helka,
      headline,
    },
    background: {
      neighborhoodName: nbInfo?.name ?? nbFromDeals,
      neighborhoodAliases: neighborhood?.aliases ?? [],
      neighborhoodDisplay: nbDisplay ?? null,
      neighborhoodDescription: nbInfo?.description ?? null,
      population: publicPopulation(population),
      junction,
      buildingCharacter: buildingCharacter(allTxns),
      localityArticle: localityWiki,
      neighborhoodArticle: neighborhoodWiki,
    },
    categories,
    location: { lat, lng, itmX, itmY },
    streetView,
    propertyKind,
    building,
    parcelIdentity,
    buildingAge: ageInfo,
    propertyInput: {
      entrance: input.entrance ?? null,
      floor: input.floor ?? null,
      rooms: input.rooms ?? null,
      tatHelka: input.tatHelka ?? null,
      apartment: input.apartment ?? null,
    },
    unit: matchedUnit
      ? {
          tatHelka: matchedUnit.tatHelka ?? null,
          areaSqm: matchedUnit.areaSqm ?? null,
          rooms: matchedUnit.rooms ?? null,
          floor: matchedUnit.floor ?? null,
        }
      : null,
    soldDeals,
    listings: listingsResult.listings,
    listingsStatus: {
      configured: listingsResult.configured,
      costUsd: listingsResult.costUsd,
      sourcesOk: listingsResult.sourcesOk,
      // ⚠️ ייחוד. ההודעה נרשמת פעם אחת לכל מקור, ולכן כשהמכסה נגמרה שני
      // הלוחות מייצרים את **אותו משפט בדיוק** והוא הוצג ללקוח פעמיים.
      notices: Array.from(new Set(listingsResult.notices)),
      quotaExhausted: listingsResult.quotaExhausted,
      usedResidentialProxy: listingsResult.usedResidentialProxy,
    },
    places: {
      education,
      preschool,
      religion,
      commerce,
      health,
      leisure,
      transport,
      daily: mergePlaces(commerce, health, leisure),
    },
    mikvaot,
    transitStops,
    priceTrend: cbs?.points ?? [],
    generatedAt: now,
    warnings,
    costUsd: Math.round(costUsd * 10000) / 10000,
    comparableKeys: Array.from(
      new Set([...buildingBand.keys, ...streetBand.keys, ...areaBand.keys]),
    ),
  };
}
