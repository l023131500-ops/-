// ==== Google Maps — מוסדות בשם ובמרחק מדויק, זמני הליכה, צילום בניין ====
//
// ⚠️ המפתח הוא סוד צד-שרת. הוא לעולם לא נשלח לדפדפן:
// תמונות (Street View / מפה) עוברות דרך /api/image שמושך אותן בשרת.
//
// בקרת עלות: קריאת Places אחת לכל *קבוצת* סוגים (לא אחת לכל סוג),
// ומרחקי הליכה רק ל-N הקרובים ביותר. המרחק האווירי מחושב אצלנו בחינם.

import { haversineKm } from './datagov';
// יבוא לשימוש מקומי (‎streetViewShot‎ קורא ל-‎aimQuality‎). הייצוא-מחדש למטה
// הוא לטובת שאר המערכת; ייצוא-מחדש לבדו אינו מכניס את השם לתחום הקובץ.
import { aimQuality } from './aim';
import { robustFetch } from './http';
import { env } from './env';

const KEY = () => env('GOOGLE_MAPS_API_KEY') ?? '';

export function googleConfigured(): boolean {
  return KEY().length > 0;
}

export interface Place {
  name: string;
  /** סוג המוסד בעברית מדוברת — "בית ספר יסודי", לא "primary_school". */
  kind: string;
  address: string | null;
  lat: number;
  lng: number;
  /** מרחק אווירי במטרים — מחושב אצלנו, תמיד קיים. */
  straightMeters: number;
  /** התגים שגוגל מחזיר למקום — נחוצים לסינון קבוצה (ראה belongsToGroup). */
  types?: string[];
  /** זמן הליכה בפועל בשניות — רק ל-N הקרובים (עלות). */
  walkSeconds?: number;
  /** אורך מסלול ההליכה בפועל, שאינו המרחק האווירי. */
  walkMeters?: number;
}

/**
 * קבוצות המוסדות שהדוח מכסה.
 *
 * ⚠️ המפרט דורש "בתי כנסת, מקוואות, בי״ס, גנים, מוסדות, מסחר — את כולם".
 * הגרסה הקודמת הכירה שלוש קבוצות בלבד (חינוך / שירותים יומיומיים / תחבורה),
 * ולא היה בה שום בית כנסת, מקווה או גן ילדים. הכל אומת חי שהסוגים תקפים
 * ב-Places API (New) — `place_of_worship` נדחה עם "Unsupported types",
 * ואילו `synagogue` תקף ומחזיר תוצאות.
 */
export const PLACE_GROUPS = {
  education: {
    title: 'מוסדות חינוך',
    types: ['primary_school', 'secondary_school', 'school', 'university'],
  },
  preschool: {
    title: 'גנים ומעונות',
    types: ['preschool', 'child_care_agency'],
  },
  religion: {
    title: 'בתי כנסת ומוסדות דת',
    types: ['synagogue'],
  },
  commerce: {
    title: 'מסחר וקניות',
    types: ['supermarket', 'grocery_store', 'bakery', 'convenience_store', 'shopping_mall'],
  },
  health: {
    title: 'בריאות',
    types: ['pharmacy', 'doctor', 'hospital', 'dental_clinic', 'medical_lab'],
  },
  leisure: {
    title: 'פארקים ופנאי',
    types: ['park', 'playground', 'library', 'gym'],
  },
  transport: {
    title: 'תחבורה',
    types: ['bus_stop', 'bus_station', 'train_station', 'light_rail_station', 'transit_station'],
  },
} as const;

export type PlaceGroupKey = keyof typeof PLACE_GROUPS;

/** מפתח זהות למקום — לאיחוד תוצאות מכמה קריאות. */
function placeKey(p: Place): string {
  return `${p.name}|${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
}

export function mergePlaces(...lists: Place[][]): Place[] {
  const seen = new Map<string, Place>();
  for (const list of lists) {
    for (const p of list) {
      const k = placeKey(p);
      const prev = seen.get(k);
      // שומרים את הרשומה עם יותר מידע (זמן הליכה, כתובת).
      if (!prev || (prev.walkSeconds == null && p.walkSeconds != null)) seen.set(k, p);
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.straightMeters - b.straightMeters);
}

/** תרגום סוג Google → עברית מדוברת. משמש כשאין primaryTypeDisplayName. */
const TYPE_HE: Record<string, string> = {
  primary_school: 'בית ספר יסודי',
  secondary_school: 'בית ספר תיכון',
  school: 'בית ספר',
  preschool: 'גן ילדים',
  university: 'מוסד להשכלה גבוהה',
  supermarket: 'סופרמרקט',
  grocery_store: 'מכולת',
  pharmacy: 'בית מרקחת',
  hospital: 'בית חולים',
  doctor: 'מרפאה',
  park: 'פארק או גינה',
  synagogue: 'בית כנסת',
  bus_station: 'תחנת אוטובוס',
  bus_stop: 'תחנת אוטובוס',
  train_station: 'תחנת רכבת',
  light_rail_station: 'תחנת רכבת קלה',
  subway_station: 'תחנת רכבת תחתית',
  transit_station: 'תחנת תחבורה ציבורית',
  bakery: 'מאפייה',
  convenience_store: 'מכולת',
  shopping_mall: 'מרכז מסחרי',
  dental_clinic: 'מרפאת שיניים',
  dentist: 'רופא שיניים',
  medical_lab: 'מעבדה רפואית',
  playground: 'גן שעשועים',
  library: 'ספרייה',
  gym: 'חדר כושר',
  sports_coaching: 'חוגי ספורט',
  sports_club: 'מועדון ספורט',
  swimming_pool: 'בריכת שחייה',
  child_care_agency: 'מעון או משפחתון',
  educational_institution: 'מוסד חינוכי',
  store: 'חנות',
  health: 'שירות בריאות',
};

// ⚠️ גוגל מחזיר לפעמים תווית באנגלית גם כשמבקשים עברית (נמדד: "Sports coaching"
// בתוך דוח עברי לגמרי). תווית שאינה בעברית נדחית לטובת התרגום שלנו.
const HAS_HEBREW = /[֐-׿]/;

/**
 * ⚠️ "בית חולים" הוא טענה מהותית על נכס, ואסור שתיווצר מתג של גוגל.
 * נמצא בשני דוחות אמיתיים: `קופת חולים מכבי`, `מרכז לטיפול בשחפת` ואפילו עסק
 * להכשרת עזרה ראשונה בחצור הגלילית — יישוב שאין בו בית חולים — סווגו
 * "בית חולים". קונה שקורא "בית חולים 1.1 ק"מ מהנכס" מקבל מידע שגוי.
 */
function fixHospitalLabel(kind: string, name: string): string {
  if (kind !== 'בית חולים') return kind;
  if (/בית\s*חולים|המרכז\s*הרפואי|מרכז\s*רפואי|בי"?ח\b/.test(name)) return kind;
  if (/קופת\s*חולים|קופ"?ח|מרפאה|מכבי|כללית|מאוחדת|לאומית/.test(name)) return 'מרפאה';
  return 'שירות בריאות';
}

function kindOf(p: any): string {
  const name = p?.displayName?.text ?? '';
  const primary = p?.primaryTypeDisplayName?.text;
  if (primary && HAS_HEBREW.test(primary)) return fixHospitalLabel(primary, name);
  for (const t of p?.types ?? []) {
    if (TYPE_HE[t]) return fixHospitalLabel(TYPE_HE[t], name);
  }
  // ⚠️ **לא** להחזיר את התווית האנגלית כברירת מחדל. נמצא בשני דוחות אמיתיים:
  // "Sports coaching" הופיע בתוך רשימה עברית לגמרי. עדיף תווית גנרית בעברית
  // מתווית נכונה בשפה הלא נכונה.
  return 'מוסד';
}

/**
 * חיפוש מוסדות סביב נקודה — מחזיר **שמות ומרחקים**, לא ספירה.
 * זו הדרישה: "בי"ס אלון, 240 מ'" ולא "39 מוסדות".
 */
const FIELD_MASK =
  'places.displayName,places.location,places.primaryTypeDisplayName,places.formattedAddress,places.types';

function toPlaces(json: any, lat: number, lng: number, radiusM: number | null): Place[] {
  return ((json?.places ?? []) as any[])
    .map((p) => {
      const plat = p?.location?.latitude;
      const plng = p?.location?.longitude;
      if (typeof plat !== 'number' || typeof plng !== 'number') return null;
      return {
        name: p?.displayName?.text ?? 'ללא שם',
        kind: kindOf(p),
        address: p?.formattedAddress ?? null,
        lat: plat,
        lng: plng,
        types: (p?.types ?? []) as string[],
        straightMeters: Math.round(haversineKm(lat, lng, plat, plng) * 1000),
      } as Place;
    })
    .filter((p): p is Place => !!p && (radiusM == null || p.straightMeters <= radiusM))
    .sort((a, b) => a.straightMeters - b.straightMeters);
}

/**
 * סינון תוצאות שגוגל מחזיר לקבוצה אך אינן שייכות לה.
 *
 * ⚠️ נמצא במייל אמיתי: "גן הילדים הקרוב ביותר" היה **חנות מוצרי תינוקות**
 * ("פונפונים הכתובת שלך למוצרי תינוקות"), ו"המרכול הקרוב ביותר" היה מאפייה.
 * הסיבה: `child_care_agency` הוא תג רחב שגוגל תולה גם על חנויות, ובית כנסת
 * שמפעיל תלמוד תורה מתויג גם כ-`school`. הסינון כאן הוא לפי התגים שגוגל
 * עצמו מחזיר, ולא לפי ניחוש מהשם.
 */
const STORE_TYPES = new Set([
  'store',
  'clothing_store',
  'shopping_mall',
  'grocery_store',
  'supermarket',
  'restaurant',
  'cafe',
]);

/**
 * גן/מעון לפי **השם**, כשגוגל תייג אותו כבית ספר.
 *
 * ⚠️ נמצא בדוח אמיתי: "גן ריקי" ו"מעון ילדי חמד" הופיעו בתוך רשימת מוסדות
 * החינוך, ו"גן הילדים הקרוב ביותר" הוצג במרחק 293 מ' בעוד ש"גן ריקי" עמד
 * 269 מ' — כלומר הדוח סתר את עצמו. בעברית זה מזוהה מהשם באמינות גבוהה.
 */
// ⚠️ **לא** להשתמש ב-`\b` עם עברית. אותיות עבריות אינן תווי-מילה ב-RegExp של
// JavaScript, ולכן `/^גן\b/` **אינו** מתאים ל"גן ריקי": אין גבול-מילה בין 'ן'
// לרווח כששניהם נחשבים תווים שאינם מילה. זה בדיוק מה שהשאיר את "גן ריקי"
// ברשימת בתי הספר אחרי התיקון הקודם, ואת "גן הילדים הקרוב ביותר" סותר את עצמו.
const PRESCHOOL_NAME = /^(גן|גנון|מעון|פעוטון|משפחתון|צהרון)(\s|["'׳״]|[-־–]|$)/;

/** ציבורי — buildreport מסווג מחדש תוצאות שהגיעו מקבוצת החינוך. */
export const isPreschoolName = (name: string) => PRESCHOOL_NAME.test((name ?? '').trim());

/** שמות שאינם מוסד חינוך גם כשגוגל תייג אותם school. */
const NOT_EDUCATION_NAME =
  /חשבוניות|הנהלת חשבונות|ראיית חשבון|קורסי נהיגה|בית ספר לנהיגה|מורה ל|שיעורי|גמ"ח|נגריה|מספרה|courses|invoice/i;

function belongsToGroup(p: Place, group: PlaceGroupKey): boolean {
  const t = new Set(p.types ?? []);
  const isStore = [...t].some((x) => STORE_TYPES.has(x));
  const name = (p.name ?? '').trim();

  switch (group) {
    case 'education':
      // מוסד חינוך אמיתי, ולא בית כנסת שגוגל תייג גם כבית ספר, ולא חדר כושר
      // או משרד ראיית חשבון שנושאים גם את התג school.
      if (t.has('synagogue') || t.has('place_of_worship')) return false;
      if (t.has('gym') || t.has('accounting') || t.has('sports_club') || t.has('sports_coaching')) return false;
      // מרפאה, בית עסק פיננסי ובית ספר לנהיגה נושאים לפעמים את התג school.
      if (t.has('health') || t.has('doctor') || t.has('dentist') || t.has('dental_clinic')) return false;
      if (t.has('driving_school') || t.has('finance') || t.has('insurance_agency')) return false;
      if (t.has('store') || t.has('corporate_office')) return false;
      // גן/מעון נמצא בקבוצה שלו. ספירתו גם כאן יצרה כפל: אותם ארבעה גנים
      // הופיעו גם ב"מוסדות חינוך" וגם ב"גנים ומעונות".
      if (t.has('preschool') || t.has('child_care_agency')) return false;
      if (PRESCHOOL_NAME.test(name)) return false; // שייך לקבוצת הגנים
      if (NOT_EDUCATION_NAME.test(name)) return false;
      return (
        t.has('school') ||
        t.has('primary_school') ||
        t.has('secondary_school') ||
        t.has('university') ||
        t.has('educational_institution')
      );
    case 'preschool':
      if (isStore) return false;
      if (t.has('preschool')) return true;
      // גן/מעון שגוגל תייג כבית ספר — לפי השם, ראה PRESCHOOL_NAME.
      if (PRESCHOOL_NAME.test(name)) return true;
      return t.has('child_care_agency');
    case 'commerce':
      return (
        t.has('supermarket') ||
        t.has('grocery_store') ||
        t.has('convenience_store') ||
        t.has('shopping_mall') ||
        t.has('bakery') ||
        t.has('store')
      );
    case 'health':
      return (
        t.has('pharmacy') ||
        t.has('doctor') ||
        t.has('hospital') ||
        t.has('dental_clinic') ||
        t.has('dentist') ||
        t.has('medical_lab') ||
        t.has('health')
      );
    default:
      return true;
  }
}

/**
 * המקום המתאים ביותר לתפקיד "הקרוב ביותר" בקבוצה.
 * לקבוצת המסחר זה מרכול/מכולת ולא מאפייה — מי ששואל "מה המרכול הקרוב"
 * מתכוון למקום שקונים בו מזון לשבוע.
 */
/**
 * בית החולים הקרוב — חיפוש נפרד ברדיוס רחב, ממוין לפי מרחק.
 *
 * ⚠️ נסיון קודם השתמש בחיפוש טקסטואלי, והוא **מדורג לפי רלוונטיות ולא לפי
 * מרחק**: לחצור הגלילית הוא החזיר "מרפאות חוץ" ב-5.7 ק"מ (בכלל לא בית חולים),
 * ולרחובות "שמיר (אסף הרופא)" ב-8.2 ק"מ בעוד שקפלן נמצא בעיר עצמה. חיפוש
 * Nearby עם דירוג לפי מרחק מחזיר את הקרוב באמת, והשם מסונן כדי שמרפאה לא
 * תוצג כבית חולים.
 */
export async function nearestHospitals(
  lat: number,
  lng: number,
  radiusM = 30000,
): Promise<Place[]> {
  if (!googleConfigured()) return [];
  const found = await searchNearbyTypes(lat, lng, ['hospital'], radiusM, 20).catch(() => []);
  // ⚠️ הסינון הוא **לפי השם בלבד**, ובכוונה מחמיר. מקורות המפות מסמנים בישראל
  // מרפאות, מרכזים רפואיים ומכונים כ-`hospital`, ולכן התג עצמו אינו עדות.
  // נמדד: הסינון לפי התג החזיר "מרפאות חוץ" ו"מרכז רפואי רחובות" כבתי חולים,
  // ולא החזיר את קפלן שנמצא באותה עיר. שדה שמחזיר מרפאה בתור בית חולים גרוע
  // מהיעדר השדה, ולכן מוצג רק מה שנושא "בית חולים" בשמו.
  return found.filter((p) => /בית\s*חולים|בי"?ח\s|מרכז\s*רפואי\s*אונ/.test(p.name));
}

export function primaryNearest(list: Place[], group: PlaceGroupKey): Place | null {
  if (!list.length) return null;
  if (group === 'commerce') {
    const food = list.find((p) => {
      const t = new Set(p.types ?? []);
      return t.has('supermarket') || t.has('grocery_store') || t.has('convenience_store');
    });
    if (food) return food;
  }
  if (group === 'preschool') {
    const real = list.find((p) => (p.types ?? []).includes('preschool'));
    if (real) return real;
  }
  return list[0];
}

/** קריאת Nearby אחת לרשימת סוגים. */
async function searchNearbyTypes(
  lat: number,
  lng: number,
  types: readonly string[],
  radius: number,
  max: number,
): Promise<Place[]> {
  const res = await robustFetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    timeoutMs: 20000,
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': KEY(),
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      includedTypes: [...types],
      maxResultCount: max,
      // מבקשים את הקרובים ביותר, לא את "הבולטים" — הדוח מדבר על מרחקים.
      rankPreference: 'DISTANCE',
      languageCode: 'he',
      regionCode: 'IL',
      locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius } },
    }),
  });
  if (!res.ok) throw new Error(`Google Places HTTP ${res.status}`);
  return toPlaces(await res.json(), lat, lng, radius);
}

export async function nearbyPlaces(
  lat: number,
  lng: number,
  group: PlaceGroupKey,
  opts: {
    radiusM?: number;
    max?: number;
    /**
     * קריאה נפרדת לכל סוג, ואיחוד התוצאות.
     *
     * ⚠️ למה זה נחוץ: Nearby מחזיר עד 20 תוצאות לקריאה, ואין בו עימוד. נמדד
     * סביב "הבעש״ט 9 רחובות" — קריאה אחת עם ארבעה סוגי חינוך החזירה בדיוק 20,
     * כלומר התקרה נגעה והרשימה נחתכה בשקט. קריאה לכל סוג בנפרד מרימה את התקרה
     * ל-20 לכל סוג, וזה מה שהמפרט דורש ("את כולם").
     */
    perType?: boolean;
  } = {},
): Promise<Place[]> {
  if (!googleConfigured()) return [];
  const radius = opts.radiusM ?? 1200;
  const max = opts.max ?? 20;
  const types = PLACE_GROUPS[group].types;

  const keep = (list: Place[]) => list.filter((p) => belongsToGroup(p, group));

  if (!opts.perType || types.length === 1) {
    return keep(await searchNearbyTypes(lat, lng, types, radius, max));
  }

  const settled = await Promise.allSettled(
    types.map((t) => searchNearbyTypes(lat, lng, [t], radius, max)),
  );
  return keep(mergePlaces(...settled.map((s) => (s.status === 'fulfilled' ? s.value : []))));
}

/**
 * חיפוש טקסטואלי עם עימוד — הדרך היחידה לעבור את תקרת 20 התוצאות.
 *
 * נבדק חי סביב "הבעש״ט 9 רחובות": שלושה עמודים החזירו **60 בתי כנסת** ייחודיים,
 * הקרוב שבהם במרחק 45 מ'. Nearby החזיר 20 בלבד. באזור חרדי זה ההבדל בין
 * "יש בתי כנסת" לבין תמונה אמיתית של צפיפות מוסדות הדת.
 *
 * ⚠️ ההגבלה הגאוגרפית היא מלבן, ולכן מוחזרות גם תוצאות מחוץ לרדיוס — הסינון
 * לפי המרחק האמיתי נעשה כאן. נמדד: תוצאות עד 1,789 מ' על מלבן של ~1.5 ק"מ.
 */
export async function searchTextPlaces(
  lat: number,
  lng: number,
  opts: { query: string; includedType?: string; radiusM?: number; maxPages?: number },
): Promise<Place[]> {
  if (!googleConfigured()) return [];
  const radiusM = opts.radiusM ?? 1500;
  const maxPages = Math.max(1, opts.maxPages ?? 1);
  // מלבן שמכיל את העיגול המבוקש. 1 מעלה רוחב ≈ 111 ק"מ.
  const dLat = radiusM / 111_000;
  const dLng = radiusM / (111_000 * Math.cos((lat * Math.PI) / 180));

  const pages: Place[][] = [];
  let pageToken: string | undefined;
  for (let i = 0; i < maxPages; i++) {
    const body: Record<string, unknown> = {
      textQuery: opts.query,
      languageCode: 'he',
      regionCode: 'IL',
      pageSize: 20,
      locationRestriction: {
        rectangle: {
          low: { latitude: lat - dLat, longitude: lng - dLng },
          high: { latitude: lat + dLat, longitude: lng + dLng },
        },
      },
    };
    if (opts.includedType) body.includedType = opts.includedType;
    if (pageToken) body.pageToken = pageToken;

    const res = await robustFetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      timeoutMs: 20000,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': KEY(),
        'X-Goog-FieldMask': `${FIELD_MASK},nextPageToken`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) break;
    const json: any = await res.json();
    pages.push(toPlaces(json, lat, lng, radiusM));
    pageToken = json?.nextPageToken;
    if (!pageToken) break;
  }
  return mergePlaces(...pages);
}

/**
 * זמני הליכה אמיתיים ל-N היעדים הקרובים.
 * Distance Matrix מתומחר לכל יעד, ולכן מוגבל במפורש.
 */
export async function addWalkingTimes(
  lat: number,
  lng: number,
  places: Place[],
  limit = 8,
): Promise<Place[]> {
  if (!googleConfigured() || !places.length) return places;
  const targets = places.slice(0, limit);
  const dest = targets.map((p) => `${p.lat},${p.lng}`).join('|');

  try {
    const res = await robustFetch(
      'https://maps.googleapis.com/maps/api/distancematrix/json' +
        `?origins=${lat},${lng}&destinations=${encodeURIComponent(dest)}` +
        `&mode=walking&language=he&key=${KEY()}`,
      { timeoutMs: 20000 },
    );
    const json: any = await res.json();
    const elements: any[] = json?.rows?.[0]?.elements ?? [];
    targets.forEach((p, i) => {
      const el = elements[i];
      if (el?.status === 'OK') {
        p.walkSeconds = el.duration?.value ?? undefined;
        p.walkMeters = el.distance?.value ?? undefined;
      }
    });
  } catch {
    // זמן הליכה הוא שיפור, לא תנאי. המרחק האווירי כבר קיים.
  }
  return places;
}

export interface StreetView {
  available: boolean;
  /** מתי צולם — "2017-05". חשוב: תמונה ישנה עלולה להטעות. */
  date: string | null;
  copyright: string | null;
  lat: number | null;
  lng: number | null;
}

/** בדיקה שיש צילום רחוב לנקודה — לפני שמציגים תמונה שבורה. */
export async function streetViewMeta(lat: number, lng: number): Promise<StreetView> {
  if (!googleConfigured()) return { available: false, date: null, copyright: null, lat: null, lng: null };
  try {
    const res = await robustFetch(
      `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&key=${KEY()}`,
      { timeoutMs: 12000 },
    );
    const json: any = await res.json();
    return {
      available: json?.status === 'OK',
      date: json?.date ?? null,
      copyright: json?.copyright ?? null,
      lat: json?.location?.lat ?? null,
      lng: json?.location?.lng ?? null,
    };
  } catch {
    return { available: false, date: null, copyright: null, lat: null, lng: null };
  }
}

// ---- בניית URL-ים לשרת בלבד. הדפדפן פונה ל-/api/image, לא לגוגל. ----

/**
 * אזימוט אמיתי (0–360°) מנקודה אחת לשנייה.
 * נחוץ כדי לכוון את מצלמת ה-Street View אל הבניין.
 */
// ‎bearingDeg‎, ‎AimQuality‎ ו-‎aimQuality‎ עברו ל-`./aim` — גאומטריה טהורה בלי
// רשת, ולכן ניתנת להרצה בבדיקה. ראה ההסבר שם ואת scripts/qa/streetview-aim.mjs.
// מיוצאות מחדש כאן כדי שכל היבוא הקיים ימשיך לעבוד ללא שינוי.
export { bearingDeg } from './aim';
export { aimQuality };
export type { AimQuality, PanoMeta } from './aim';


export function streetViewImageUrl(
  lat: number,
  lng: number,
  w = 900,
  h = 500,
  opts: { heading?: number; fov?: number; pitch?: number } = {},
): string {
  const parts = [
    `https://maps.googleapis.com/maps/api/streetview?size=${w}x${h}`,
    `location=${lat},${lng}`,
    `fov=${opts.fov ?? 80}`,
    `pitch=${opts.pitch ?? 8}`,
    'source=outdoor',
    `key=${KEY()}`,
  ];
  // בלי heading גוגל בוחר את כיוון ברירת המחדל של הפנורמה, שהוא כיוון הנסיעה
  // ברחוב — ולכן התמונה יוצאת לאורך הרחוב או אל הצד ההפוך.
  if (opts.heading != null) parts.splice(3, 0, `heading=${opts.heading.toFixed(1)}`);
  return parts[0] + '&' + parts.slice(1).join('&');
}

export interface StreetShot {
  url: string;
  /** לאן המצלמה מופנית, במעלות מצפון. */
  heading: number;
  /** כמה רחוקה עמדת הצילום מהבניין. */
  panoMeters: number;
  /** מיקום המצלמה עצמה — כדי שאפשר יהיה לאמת את הכיוון ולא רק להאמין לו. */
  panoLat: number | null;
  panoLng: number | null;
  date: string | null;
}

/**
 * צילום הבניין — מכוון אל הבניין, לא לאן שהמצלמה במקרה הביטה.
 *
 * ⚠️ הבאג שזה מתקן, ושהמפרט מציין בשמו: "דורש טוב 17 ירושלים" הראה את **הצד
 * השני של הרחוב**. הסיבה: `streetViewImageUrl` נתן ל-Google רק `location`,
 * וגוגל מצמיד את הבקשה לפנורמה הקרובה ומצלם בכיוון ברירת המחדל שלה — כיוון
 * הנסיעה ברחוב. עמדת הצילום כמעט תמיד **על הכביש**, כלומר לא בקואורדינטה של
 * הבניין, ולכן "בלי heading" פירושו "לאן שיצא".
 *
 * התיקון: שולפים מה-metadata את המיקום האמיתי של הפנורמה, ומחשבים את האזימוט
 * ממנה **אל** קואורדינטות הבניין. ה-metadata חינמי, ולכן זה לא מוסיף עלות.
 *
 * ה-fov נגזר מהמרחק: מעמדה צמודה (עד ~12 מ') נדרש שדה ראייה רחב כדי שהבניין
 * ייכנס למסגרת, וממרחק גדול שדה צר ממרכז אותו במקום להטביע אותו ברחוב.
 */
export async function streetViewShot(
  lat: number,
  lng: number,
  w = 900,
  h = 500,
): Promise<StreetShot | null> {
  const meta = await streetViewMeta(lat, lng);
  const aim = aimQuality(meta, lat, lng);
  if (!aim.ok) return null;

  const { heading, panoMeters } = aim;
  const fov = panoMeters! <= 12 ? 90 : panoMeters! <= 30 ? 75 : 62;
  // ⚠️ הפיץ' הונמך מ-14. §3 דורש ש**כניסת הבניין** תיראה, והכניסה נמצאת בגובה
  // הקרקע: מבט שמורם ב-14° מקרוב מקצץ אותה ומראה קומות וגג. 8° מספיק כדי
  // שהבניין לא ייחתך למעלה, ועדיין משאיר את הכניסה בפריים.
  const pitch = panoMeters! <= 12 ? 8 : panoMeters! <= 30 ? 5 : 2;

  return {
    url: streetViewImageUrl(lat, lng, w, h, { heading: heading!, fov, pitch }),
    heading: heading!,
    panoMeters: panoMeters!,
    panoLat: meta.lat!,
    panoLng: meta.lng!,
    date: meta.date,
  };
}


export interface MapMarker {
  lat: number;
  lng: number;
  /** תווית להצגה על הסימון. Google מקבל **תו יחיד** A-Z או 0-9 בלבד. */
  label?: string;
  color?: string;
}

/** האותיות שמחלקים לסימונים, לפי הסדר. גם התקרה למספר הסימונים המתויגים. */
export const MARKER_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function staticMapUrl(
  lat: number,
  lng: number,
  opts: {
    zoom?: number;
    w?: number;
    h?: number;
    markers?: MapMarker[];
    /** `satellite` = תצלום אוויר/לוויין. `hybrid` = לוויין עם שמות רחובות. */
    mapType?: 'roadmap' | 'satellite' | 'hybrid';
  } = {},
): string {
  const { zoom = 16, w = 900, h = 560, markers = [], mapType = 'roadmap' } = opts;
  const parts = [
    `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}`,
    `zoom=${zoom}`,
    `size=${w}x${h}`,
    'scale=2',
    'language=he',
    'region=IL',
    `maptype=${mapType}`,
    // ⚠️ הנכס עצמו — בלי תווית. Google מקבל תווית של תו יחיד לטיני/ספרה בלבד,
    // ותווית עברית (היה כאן "נ") נבלעת בשקט: התמונה חוזרת 200 והסימון מצויר
    // בלי שום תווית. במקום זה — צבע נפרד וגודל גדול, והמקרא מסביר מה זה.
    `markers=${encodeURIComponent(`color:0x0ea5a4|size:mid|${lat},${lng}`)}`,
  ];
  for (const m of markers.slice(0, MARKER_LABELS.length)) {
    // ⚠️ אסור `size:small` לסימון מתויג — Google מצייר תוויות רק על סימון
    // בגודל ברירת המחדל או `mid`. עם `size:small` התווית לא מופיעה כלל.
    const label = m.label && /^[A-Z0-9]$/.test(m.label) ? `label:${m.label}|` : '';
    parts.push(
      `markers=${encodeURIComponent(`color:${m.color ?? '0xc8a24a'}|${label}${m.lat},${m.lng}`)}`,
    );
  }
  parts.push(`key=${KEY()}`);
  return parts[0] + '&' + parts.slice(1).join('&');
}

/** גיאוקוד דרך גוגל — מדויק יותר מהמקור הממשלתי, משמש כאימות צולב. */
export async function geocodeGoogle(
  address: string,
): Promise<{ lat: number; lng: number; formatted: string } | null> {
  if (!googleConfigured()) return null;
  try {
    const res = await robustFetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}` +
        `&language=he&region=IL&key=${KEY()}`,
      { timeoutMs: 15000 },
    );
    const json: any = await res.json();
    const r = json?.results?.[0];
    if (!r) return null;
    return {
      lat: r.geometry.location.lat,
      lng: r.geometry.location.lng,
      formatted: r.formatted_address,
    };
  } catch {
    return null;
  }
}
