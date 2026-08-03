// ==== דירות המוצעות כרגע — יד2 / מדלן דרך Apify ====
//
// ⚠️ הבחנה שאסור לטשטש: אלה **מחירי בקשה**, לא מחירי סגירה.
// עסקאות שנסגרו מגיעות ממקור ממשלתי אחר לגמרי. הצגה משותפת בלי לסמן
// את ההבדל תיצור רושם שגוי על השוק, ולכן כל שדה כאן מסומן "מקורב".
//
// בלי APIFY_TOKEN — המסך אומר "דורש מקור מורשה". לא ממציאים מודעות.
//
// בקרת עלות: יד2 $0.005 לתוצאה, מדלן $0.002 לתוצאה. APIFY_MAX_ITEMS חוסם את
// התקרה לכל דוח, ומרכז השליטה מציג את העלות בפועל.

import { haversineKm } from './datagov';

const TOKEN = () => process.env.APIFY_TOKEN?.trim() || '';
const YAD2_ACTOR = () => process.env.APIFY_YAD2_ACTOR?.trim() || 'swerve~yad2-scraper';
const MADLAN_ACTOR = () => process.env.APIFY_MADLAN_ACTOR?.trim() || 'swerve~madlan-scraper';
const MAX_ITEMS = () => {
  const n = Number(process.env.APIFY_MAX_ITEMS);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 100) : 20;
};

/** מחיר לתוצאה בדולר — לחישוב עלות ההפקה במרכז השליטה. */
export const APIFY_COST_PER_ITEM_USD = { yad2: 0.005, madlan: 0.002 } as const;

export function apifyConfigured(): boolean {
  return TOKEN().length > 0;
}

export interface Listing {
  source: 'yad2' | 'madlan';
  url: string | null;
  address: string | null;
  street: string | null;
  streetNumber: string | null;
  neighbourhood: string | null;
  price: number | null;
  pricePerSqm: number | null;
  rooms: number | null;
  areaSqm: number | null;
  floor: string | null;
  totalFloors: number | null;
  yearBuilt: number | null;
  lat: number | null;
  lng: number | null;
  hasElevator: boolean | null;
  hasParking: boolean | null;
  hasBalcony: boolean | null;
  hasSecureRoom: boolean | null;
  byAgent: boolean | null;
  /** מתי המודעה נראתה לראשונה — הבסיס ל"כמה זמן באוויר". */
  firstSeen: string | null;
  /** מרחק אווירי מהנכס במטרים, אם יש קואורדינטות לשניהם. */
  meters: number | null;
  /** כמה ימים המודעה באוויר. */
  daysListed: number | null;
}

function num(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function bool(v: any): boolean | null {
  return typeof v === 'boolean' ? v : null;
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  const d = Math.floor((Date.now() - t) / 86400000);
  return d >= 0 ? d : null;
}

function mapMadlan(r: any): Listing {
  const firstSeen = r?.firstSeen ?? null;
  return {
    source: 'madlan',
    url: r?.url ?? null,
    address: r?.address ?? null,
    street: r?.streetName ?? null,
    streetNumber: r?.streetNumber != null ? String(r.streetNumber) : null,
    neighbourhood: r?.neighbourhood ?? null,
    price: num(r?.price),
    pricePerSqm: num(r?.pricePerSqm),
    rooms: num(r?.rooms),
    areaSqm: num(r?.areaSqm),
    floor: r?.floor != null ? String(r.floor) : null,
    totalFloors: num(r?.totalFloors),
    yearBuilt: num(r?.yearBuilt),
    lat: Number.isFinite(Number(r?.latitude)) ? Number(r.latitude) : null,
    lng: Number.isFinite(Number(r?.longitude)) ? Number(r.longitude) : null,
    hasElevator: bool(r?.hasElevator),
    hasParking: r?.parking != null ? Number(r.parking) > 0 : null,
    hasBalcony: bool(r?.hasBalcony),
    hasSecureRoom: bool(r?.hasSecureRoom),
    byAgent: bool(r?.hasAgent),
    firstSeen,
    meters: null,
    daysListed: daysSince(firstSeen),
  };
}

function mapYad2(r: any): Listing {
  // ליד2 יש שמות שדות דומים אך לא זהים; נשענים על שניהם בזהירות.
  const firstSeen = r?.firstSeen ?? r?.date ?? null;
  return {
    source: 'yad2',
    url: r?.url ?? r?.link ?? null,
    address: r?.address ?? null,
    street: r?.streetName ?? r?.street ?? null,
    streetNumber: r?.streetNumber != null ? String(r.streetNumber) : null,
    neighbourhood: r?.neighbourhood ?? r?.neighborhood ?? null,
    price: num(r?.price),
    pricePerSqm: num(r?.pricePerSqm),
    rooms: num(r?.rooms),
    areaSqm: num(r?.areaSqm ?? r?.squareMeters),
    floor: r?.floor != null ? String(r.floor) : null,
    totalFloors: num(r?.totalFloors),
    yearBuilt: num(r?.yearBuilt),
    lat: Number.isFinite(Number(r?.latitude)) ? Number(r.latitude) : null,
    lng: Number.isFinite(Number(r?.longitude)) ? Number(r.longitude) : null,
    hasElevator: bool(r?.hasElevator),
    hasParking: r?.parking != null ? Number(r.parking) > 0 : bool(r?.hasParking),
    hasBalcony: bool(r?.hasBalcony),
    hasSecureRoom: bool(r?.hasSecureRoom),
    byAgent: bool(r?.hasAgent),
    firstSeen,
    meters: null,
    daysListed: daysSince(firstSeen),
  };
}

/**
 * כמה זמן מותר לחכות למודעות, בסך הכל.
 *
 * ⚠️ נמדד בפרודקשן: `run-sync-get-dataset-items` לא תמיד מכבד את פרמטר ה-timeout
 * שלו, והבקשה נשארה תלויה עד שהדפדפן ויתר — כלומר **דוח מקיף לא חזר בכלל**.
 * מודעות הן סעיף אחד מתוך שבעה; עדיף להגיש דוח בלי הסעיף הזה, ולומר למה,
 * מאשר לא להגיש דוח. הבלם הזה חייב להיות בצד שלנו ולא בצד הספק.
 */
const DEADLINE_MS = () => {
  const n = Number(process.env.APIFY_TIMEOUT_MS);
  return Number.isFinite(n) && n > 0 ? n : 60_000;
};

/**
 * כמה זמן חייב להישאר בתקציב כדי שיהיה טעם להתחיל שלב נוסף בסולם.
 * הרצת יד2 נמדדה ב-22–33 שניות; להתחיל שלב עם פחות מזה פירושו לשלם עליו
 * ואז לבטל אותו באמצע — בדיוק מה שקרה כשהסולם לא היה מודע לשעון.
 */
const MIN_RUNG_MS = 20_000;

/** המכסה החינמית של החשבון נגמרה — עוצרים ומדווחים, לא מנסים שוב. */
export class ApifyQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApifyQuotaError';
  }
}

/**
 * כשל של Apify עצמו (5xx), להבדיל מחסימה של הלוח.
 * ההבחנה אינה קוסמטית: "הלוח חוסם" על שגיאת 502 של הספק היא האשמה של הצד
 * הלא נכון, והלקוח מקבל הסבר שקרי לתקלה.
 */
export class ApifyProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApifyProviderError';
  }
}

/** אבחון להרצה אחת — מה נדרש בפועל כדי להשיג את התוצאות. */
export interface ActorDiag {
  usedResidentialProxy: boolean;
  blockDetected: boolean;
  /** ויתרנו על סינון הרחוב ומשכנו את כל העיר — התוצאות רחבות מהאזור המבוקש. */
  widenedToCity: boolean;
}

/**
 * ⚠️ שם השדה הוא **`proxyConfig`** — כך בדיוק הוא מוגדר ב-input schema של שני
 * ה-actors (אומת מול הסכמה החיה של הבילד). קודם נשלח כאן `proxyConfiguration`,
 * שהוא השם המקובל ברוב ה-actors של Apify אך **לא** השם שה-actors האלה מכריזים
 * עליו. Apify מתעלם בשקט משדות קלט שאינם בסכמה — ולכן ההסלמה ל-residential
 * מעולם לא יצאה לפועל, וכל הרצה "עם proxy" הייתה בפועל הרצה בלי proxy.
 */
const RESIDENTIAL_PROXY = {
  useApifyProxy: true,
  apifyProxyGroups: ['RESIDENTIAL'],
} as const;

async function callActor(
  actor: string,
  input: Record<string, unknown>,
  maxItems: number,
  signal: AbortSignal,
): Promise<{ ok: true; items: any[] } | { ok: false; status: number; body: string }> {
  const seconds = Math.max(10, Math.floor(DEADLINE_MS() / 1000));
  const url =
    `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items` +
    `?timeout=${seconds}&maxItems=${maxItems}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN()}` },
    body: JSON.stringify(input),
    signal,
    // @ts-ignore — תמיד חי, בלי מטמון של Next
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return { ok: false, status: res.status, body: body.slice(0, 500) };
  }
  const json = await res.json();
  return { ok: true, items: Array.isArray(json) ? json : [] };
}

/** מכסה שנגמרה מזוהה בנפרד מחסימה — התגובה אליה הפוכה: לעצור, לא להסלים. */
function isQuotaExhausted(status: number, body: string): boolean {
  if (status === 402) return true;
  return /monthly usage|usage limit|exceeded|quota|not enough|insufficient/i.test(body);
}

/**
 * חסימה — או כל כשל שיש טעם לנסות אחריו שוב בשלב הבא של הסולם.
 *
 * ⚠️ `run-failed` נכלל בכוונה. ל-actor של יד2 יש שומר פנימי
 * (`SILENT_SUCCESS_GUARD`) שמפיל את ההרצה כשהיא מסתיימת ב-0 תוצאות ואחד
 * ממסלולי המשיכה שלו נחסם בדרך. מבחוץ זה נראה `HTTP 400` עם גוף
 * `{"type":"run-failed"}` — **בלי** המילה "blocked". בלי השורה הזו הסולם
 * לא נכנס לפעולה כלל, והמשתמש קיבל "הלוח חוסם" על כשל שהיה ניתן להתאוששות.
 */
function isBlockSignal(status: number, body: string): boolean {
  if (status === 403 || status === 429) return true;
  if (/run-failed|did not succeed/i.test(body)) return true;
  return /blocked|captcha|forbidden|access denied|rate.?limit/i.test(body);
}

/** תקלה זמנית אצל Apify — שווה ניסיון נוסף, אך אינה חסימה של הלוח. */
function isProviderGlitch(status: number): boolean {
  return status >= 500;
}

/** שלב אחד בסולם הניסיונות. */
interface Rung {
  residential: boolean;
  /** להחיל את סינון הרחוב/שכונה, או למשוך את כל העיר ולסנן לפי מרחק אצלנו. */
  withFilter: boolean;
  /** ניסיון חוזר מכוון על אותו קלט — לא מכווצים אותו גם כשאין סינון. */
  retry?: boolean;
}

/**
 * יד2 — residential, ובכוונה **בלי** סינון רחוב: משיכה עירונית אחת שאנחנו
 * מסננים לפי מרחק אווירי בעצמנו.
 *
 * ⚠️ הממצא שקבע את זה, מדוד מול ה-actor החי (רחובות, רחוב "הבעש״ט"):
 * הרצה על העיר **בלי** סינון מחזירה מודעות אמיתיות; אותה הרצה **עם** שם
 * הרחוב בשדה `neighbourhood` נופלת ב-`run-failed`. הלוג מסביר למה — ה-actor
 * מושך 80 מודעות במסלול אחד, הסינון לפי הרחוב מוריד אותן ל-0, והשומר הפנימי
 * רואה "0 תוצאות + מסלול חסום" ומפיל את כל ההרצה. כלומר מה שדווח כ"יד2 חוסם
 * אותנו" היה ברובו **סינון שמחזיר ריק**, לא חסימה.
 *
 * ולכן שלב מסונן אינו שווה את מחירו: הוא עולה ~25 שניות מתוך תקציב של 45,
 * נכשל באופן צפוי, ולא משאיר זמן לשלב שכן מחזיר נתונים. סינון גאומטרי אצלנו
 * (haversine מול קואורדינטות הנכס) גם מדויק יותר מהתאמת מחרוזת של ה-actor.
 */
const YAD2_LADDER: Rung[] = [
  { residential: true, withFilter: false },
  // ניסיון חוזר זהה — יד2 נחסם לסירוגין, ו-Apify מחזיר 502 מדי פעם. שניהם
  // חולפים עם IP חדש. השלב הזה רץ רק אם נשאר לו זמן בתקציב.
  { residential: true, withFilter: false, retry: true },
];

/**
 * מדלן — עובד ללא proxy ב-3 שניות ומטפל בסינון רחוב כמו שצריך, ולכן הוא
 * נשאר על הסלמה-בתגובה-לחסימה: residential יקר, ואין סיבה לשלם עליו כברירת
 * מחדל למקור שאינו חסום.
 */
const MADLAN_LADDER: Rung[] = [
  { residential: false, withFilter: true },
  { residential: true, withFilter: true },
  { residential: true, withFilter: false },
];

/**
 * הרצת actor לפי סולם ניסיונות, עד הראשון שמחזיר תוצאות.
 *
 * "כשל" כולל גם הצלחה עם אפס פריטים: זה בדיוק איך שחסימה של לוח מודעות
 * נראית מבחוץ — הרצה תקינה שמחזירה רשימה ריקה, בלי שום שגיאה.
 */
async function runActor(
  actor: string,
  baseInput: Record<string, unknown>,
  filter: Record<string, unknown>,
  ladder: Rung[],
  maxItems: number,
  signal: AbortSignal,
  diag: ActorDiag,
  deadlineAt: number,
): Promise<any[]> {
  const hasFilter = Object.keys(filter).length > 0;
  const rungs = ladder.filter((r, i, all) => {
    if (hasFilter || r.retry) return true;
    // בלי סינון, שלב נבדל רק ב-residential — שכפול כזה הוא בזבוז של קריאה
    // בתשלום, בניגוד לשלב שסומן במפורש כניסיון חוזר.
    return all.findIndex((x) => !x.retry && x.residential === r.residential) === i;
  });

  let lastError: Error | null = null;
  // "הרחבנו" נכון לומר רק אחרי שניסינו מסונן ונכשלנו. מקור שמושך עירוני
  // מלכתחילה (יד2) אינו "מורחב" — זו שיטת המשיכה שלו, ואין מה להתנצל עליה.
  let triedFiltered = false;

  for (const [i, rung] of rungs.entries()) {
    if (signal.aborted) break;
    // שלב שאין לו זמן להסתיים אינו שווה את מחירו — הוא ייגבה ואז יבוטל.
    if (i > 0 && deadlineAt - Date.now() < MIN_RUNG_MS) break;

    const input: Record<string, unknown> = { ...baseInput };
    if (rung.withFilter) {
      Object.assign(input, filter);
      triedFiltered = true;
    }
    if (rung.residential) {
      input.proxyConfig = RESIDENTIAL_PROXY;
      diag.usedResidentialProxy = true;
    }

    const res = await callActor(actor, input, maxItems, signal);

    if (res.ok && res.items.length > 0) {
      diag.widenedToCity = hasFilter && triedFiltered && !rung.withFilter;
      return res.items;
    }

    if (!res.ok) {
      // מכסה שנגמרה אינה חסימה — התגובה אליה הפוכה: לעצור, לא להסלים.
      if (isQuotaExhausted(res.status, res.body)) {
        throw new ApifyQuotaError(
          `מכסת השימוש ב-Apify נגמרה (HTTP ${res.status}). לא בוצעו ניסיונות נוספים.`,
        );
      }
      const glitch = isProviderGlitch(res.status);
      if (!glitch && !isBlockSignal(res.status, res.body)) {
        // שגיאה שאינה חסימה ואינה תקלת ספק — שלב נוסף לא יעזור לה.
        throw new Error(`Apify HTTP ${res.status}`);
      }
      const tag =
        `${rung.residential ? ' (residential)' : ''}${rung.withFilter ? '' : ' (city-wide)'}`;
      // 5xx חוזר כ-ApifyProviderError כדי שההודעה ללקוח לא תאשים את הלוח.
      lastError = glitch
        ? new ApifyProviderError(`Apify HTTP ${res.status}${tag}`)
        : new Error(`Apify HTTP ${res.status}${tag}`);
    } else {
      lastError = new Error(`Apify 0 items${rung.withFilter ? '' : ' (city-wide)'}`);
    }
    diag.blockDetected = true;
  }

  throw lastError ?? new Error('Apify: no attempt succeeded');
}

export interface ListingsResult {
  configured: boolean;
  listings: Listing[];
  /** מה נמשך בפועל — בסיס לחישוב העלות. */
  fetched: { yad2: number; madlan: number };
  costUsd: number;
  /** אילו מקורות הצליחו בפועל — להצגה ללקוח. */
  sourcesOk: ('yad2' | 'madlan')[];
  /** הודעות בעברית מדוברת, מיועדות למסך הלקוח. */
  notices: string[];
  /** פירוט טכני — למרכז השליטה בלבד. לא מוצג ללקוח. */
  technical: string[];
  /** לאילו מקורות נדרשה הסלמה ל-residential proxy (לא ברירת מחדל). */
  usedResidentialProxy: ('yad2' | 'madlan')[];
  /** לאילו מקורות הורחב החיפוש מהרחוב לכל העיר. */
  widenedToCity: ('yad2' | 'madlan')[];
  /** המכסה נגמרה — עצירה מכוונת, לא כשל רגעי. */
  quotaExhausted: boolean;
}

/**
 * תרגום כשל של ספק להודעה שאפשר להראות ללקוח.
 * ⚠️ לעולם לא מעבירים הודעת שגיאה גולמית למסך: "Apify HTTP 400" אינו
 * מידע שימושי ללקוח, והוא גם ז'רגון טכני שאסור שיופיע באתר.
 */
/** מכסה שנגמרה אינה תקלה רגעית — לא מציעים "לנסות שוב בעוד כמה דקות". */
const QUOTA_NOTICE =
  'מכסת השימוש החודשית של שירות איסוף המודעות נוצלה במלואה, ולכן לא נמשכו מודעות. ' +
  'שאר סעיפי הדוח מלאים. יש לחדש את המכסה כדי להחזיר את הסעיף הזה.';

function friendlyFailure(
  source: 'yad2' | 'madlan',
  timedOut = false,
  providerFailed = false,
): string {
  const name = source === 'yad2' ? 'יד2' : 'מדלן';
  if (providerFailed && !timedOut) {
    // ⚠️ לא לכתוב כאן "הלוח חוסם": 5xx מגיע משירות איסוף המודעות, לא מהלוח.
    return (
      `שירות איסוף המודעות לא הגיב כרגע, ולכן המודעות מ${name} לא נמשכו. ` +
      'זו תקלה זמנית של השירות ולא חסימה של הלוח. שאר סעיפי הדוח מלאים.'
    );
  }
  if (timedOut) {
    return (
      `המודעות מ${name} לא הגיעו בזמן, ולכן הדוח הופק בלעדיהן. ` +
      'שאר הסעיפים מלאים. שווה לנסות שוב בעוד כמה דקות.'
    );
  }
  return (
    `לא הצלחנו למשוך כרגע את המודעות מ${name}. הלוח חוסם מדי פעם משיכה אוטומטית, ` +
    'וזה בדרך כלל נפתר מעצמו כעבור זמן קצר. לא הצגנו כאן מודעות משוערות.'
  );
}

/**
 * לא הצלחנו להוכיח שאף מודעה היא באזור הנכס. חובה לומר זאת: כותרת הסעיף
 * מבטיחה "באזור", והרשימה בפועל עירונית.
 */
const CITY_WIDE_NOTICE =
  'לא נמצאו מודעות שניתן לאמת שהן ברחוב או בשכונה של הנכס, ולכן מוצגות כאן מודעות ' +
  'מכל העיר. אלה אינן בהכרח בסביבה הקרובה.';

/** נרמול שם רחוב/שכונה להשוואה — כל מקור כותב גרשיים ותארים אחרת. */
function normalizeName(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/[״"'׳`]/g, '')
    .replace(/^(רח|שד)['׳]?\s+|^(רחוב|שדרות|סמטת)\s+/u, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * האם שני שמות מציינים את אותו רחוב/שכונה.
 *
 * ⚠️ `\b` אינו עובד על עברית — אותיות עבריות אינן `\w`, ולכן `/הר\b/` היה
 * מתאים ל"הרצל". גבול המילה נבדק כאן במפורש מול רווח או קצה מחרוזת.
 */
function nameMatches(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (short.length < 3) return false;
  const i = long.indexOf(short);
  if (i < 0) return false;
  const atStart = i === 0 || long[i - 1] === ' ';
  const atEnd = i + short.length === long.length || long[i + short.length] === ' ';
  return atStart && atEnd;
}

/**
 * משיכת דירות המוצעות כרגע סביב הנכס.
 * מסננים לפי רחוב/שכונה כדי לקבל תוצאות רלוונטיות ולא את כל העיר.
 */
/**
 * סוג העסקה שמבקשים מהלוחות.
 *
 * ⚠️ הערכים אינם המצאה שלנו — הם ה-enum של `dealType` ב-input schema החי של
 * שני ה-actors (נקרא מהבילד, לא נוחש):
 *   יד2  — rent | buy | commercial
 *   מדלן — rent | buy   ← **אין מסחרי**, ולכן דוח מסחרי נשען על יד2 בלבד
 *                          והדוח אומר זאת במקום להציג רשימה חלקית כאילו היא מלאה.
 */
export type ListingDealType = 'buy' | 'rent' | 'commercial';

/** מקורות שיודעים לשרת את סוג העסקה הזה. */
export function sourcesForDealType(dealType: ListingDealType): ('yad2' | 'madlan')[] {
  return dealType === 'commercial' ? ['yad2'] : ['madlan', 'yad2'];
}

export async function fetchListings(
  city: string,
  opts: {
    street?: string | null;
    neighbourhood?: string | null;
    lat?: number | null;
    lng?: number | null;
    /** רדיוס סינון סופי במטרים סביב הנכס. */
    radiusM?: number;
    sources?: ('yad2' | 'madlan')[];
    /** ברירת המחדל היא מכירה — כך התנהג הדוח מאז ומתמיד. */
    dealType?: ListingDealType;
  } = {},
): Promise<ListingsResult> {
  const out: ListingsResult = {
    configured: apifyConfigured(),
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
  if (!out.configured || !city) return out;

  const cap = MAX_ITEMS();
  const dealType: ListingDealType = opts.dealType ?? 'buy';
  const sources = opts.sources ?? sourcesForDealType(dealType);

  // מדלן אינו מגיש נכסים מסחריים כלל. לומר זאת עדיף מלהציג רשימה חסרה בשקט.
  if (dealType === 'commercial' && !sources.includes('madlan')) {
    out.notices.push(
      'נכסים מסחריים המוצעים כרגע נמשכים מלוח יד2 בלבד — מדלן אינו מגיש קטגוריה מסחרית.',
    );
  }
  // מסננים לפי הרחוב אם ידוע, אחרת לפי השכונה — כך התוצאות באמת מהאזור.
  const filterTerm = opts.street || opts.neighbourhood || undefined;

  // שעון עצר אחד לשני המקורות יחד — הם רצים במקביל, ולכן התקציב משותף.
  const clock = new AbortController();
  const deadlineAt = Date.now() + DEADLINE_MS();
  const alarm = setTimeout(() => clock.abort(), DEADLINE_MS());
  const timedOut = () => clock.signal.aborted;

  const jobs: Promise<void>[] = [];

  if (sources.includes('madlan')) {
    jobs.push(
      (async () => {
        const diag: ActorDiag = {
          usedResidentialProxy: false,
          blockDetected: false,
          widenedToCity: false,
        };
        try {
          const rows = await runActor(
            MADLAN_ACTOR(),
            { city, dealType, maxItems: cap },
            filterTerm ? { neighbourhood: filterTerm } : {},
            MADLAN_LADDER,
            cap,
            clock.signal,
            diag,
            deadlineAt,
          );
          out.fetched.madlan = rows.length;
          out.costUsd += rows.length * APIFY_COST_PER_ITEM_USD.madlan;
          out.listings.push(...rows.map(mapMadlan));
          out.sourcesOk.push('madlan');
          if (diag.widenedToCity) out.widenedToCity.push('madlan');
        } catch (e: any) {
          if (e instanceof ApifyQuotaError) {
            out.quotaExhausted = true;
            out.notices.push(QUOTA_NOTICE);
          } else {
            out.notices.push(
              friendlyFailure('madlan', timedOut(), e instanceof ApifyProviderError),
            );
          }
          out.technical.push(`madlan actor: ${timedOut() ? 'deadline' : e?.message ?? e}`);
        } finally {
          if (diag.usedResidentialProxy) out.usedResidentialProxy.push('madlan');
        }
      })(),
    );
  }

  if (sources.includes('yad2')) {
    jobs.push(
      (async () => {
        const diag: ActorDiag = {
          usedResidentialProxy: false,
          blockDetected: false,
          widenedToCity: false,
        };
        try {
          const rows = await runActor(
            YAD2_ACTOR(),
            {
              city,
              dealType,
              maxItems: cap,
              enrichListings: false, // ההעשרה מייקרת ואינה נחוצה לדוח
            },
            filterTerm ? { neighbourhood: filterTerm } : {},
            YAD2_LADDER,
            cap,
            clock.signal,
            diag,
            deadlineAt,
          );
          out.fetched.yad2 = rows.length;
          out.costUsd += rows.length * APIFY_COST_PER_ITEM_USD.yad2;
          out.listings.push(...rows.map(mapYad2));
          out.sourcesOk.push('yad2');
          if (diag.widenedToCity) out.widenedToCity.push('yad2');
        } catch (e: any) {
          // נצפה בפועל: יד2 מגיש דף חסימה ל-IP של הספק, והמושך נכשל בכוונה
          // במקום להחזיר "אין מודעות" — כי אין מודעות זה לא אותו דבר כמו חסימה.
          if (e instanceof ApifyQuotaError) {
            out.quotaExhausted = true;
            out.notices.push(QUOTA_NOTICE);
          } else {
            out.notices.push(
              friendlyFailure('yad2', timedOut(), e instanceof ApifyProviderError),
            );
          }
          out.technical.push(`yad2 actor: ${timedOut() ? 'deadline' : e?.message ?? e}`);
        } finally {
          if (diag.usedResidentialProxy) out.usedResidentialProxy.push('yad2');
        }
      })(),
    );
  }

  await Promise.all(jobs);
  clearTimeout(alarm);

  // מרחק אווירי מהנכס, לכל מודעה שיש לה קואורדינטות.
  if (opts.lat != null && opts.lng != null) {
    for (const l of out.listings) {
      if (l.lat != null && l.lng != null) {
        l.meters = Math.round(haversineKm(opts.lat, opts.lng, l.lat, l.lng) * 1000);
      }
    }
  }

  // --- מה נחשב "באזור" ---
  // ⚠️ אומת מול ה-actor: **יד2 אינו מחזיר קואורדינטות בכלל** (אין
  // latitude/longitude בפלט; יש streetName ו-neighbourhood). לכן סינון רדיוס
  // לבדו, שמעביר כל מודעה חסרת-מיקום, היה מציג את **כל** מודעות העיר כאילו הן
  // ליד הנכס — וזו בדיוק הטענה שהדוח אינו רשאי לטעון. מודעה בלי קואורדינטות
  // נבחנת לפי התאמת רחוב/שכונה, ומודעה שאין עליה לא מיקום ולא שם תואם
  // אינה "באזור" ואסור להציג אותה ככזו בלי לומר.
  const radius = opts.radiusM ?? 1500;
  const streetKey = normalizeName(opts.street);
  const nbKey = normalizeName(opts.neighbourhood);

  const provablyNear = (l: Listing): boolean => {
    if (l.meters != null) return l.meters <= radius;
    if (streetKey && nameMatches(normalizeName(l.street), streetKey)) return true;
    if (nbKey && nameMatches(normalizeName(l.neighbourhood), nbKey)) return true;
    return false;
  };

  const near = out.listings.filter(provablyNear);
  if (near.length) {
    out.listings = near;
  } else if (out.listings.length) {
    // עדיף רשימה עירונית עם אמירה מפורשת, מאשר מסך ריק או הבטחת קרבה שקרית.
    out.notices.push(CITY_WIDE_NOTICE);
  }

  out.listings.sort((a, b) => {
    if (a.meters != null && b.meters != null) return a.meters - b.meters;
    if (a.meters != null) return -1;
    if (b.meters != null) return 1;
    return (b.price ?? 0) - (a.price ?? 0);
  });

  return out;
}
