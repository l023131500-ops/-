// ==== עסקאות מכר סגורות (רשות המסים / כרמ"ן) ====
//
// ⚠️ ה-API הישן מת. `https://www.nadlan.gov.il/Nadlan.REST/Main/GetDataByQuery`
// ו-`/GetAssestAndDeals` מחזירים HTTP 200 עם דף ה-SPA (HTML) במקום JSON.
// שים לב לסכנה: מכיוון שהסטטוס הוא 200, בדיקת `res.ok` עוברת והכשל מתגלה רק
// בפרסינג. `lib/http.ts` חוסם את זה במפורש.
//
// הנתונים עברו ל-GovMap, ללא אימות כלשהו (נבדק חי):
//   1) GET /api/real-estate/deals/{x},{y}/{radius}   — נקודת 3857 -> בניינים עם polygon_id
//   2) GET /api/real-estate/street-deals/{polygon_id} — polygon_id -> רשומות עסקה מלאות
//
// כל רשומת עסקה כוללת gushNum/parcelNum/subParcelNum — כלומר המפתח האחיד
// של המערכת מגיע יחד עם העסקה, וזו הדרך היחידה חינם לקשר עסקה לתת-חלקה.

import { fetchJson } from './http';
import { wgs84ToMercator } from './itm';
import type { Transaction } from './types';

const BASE = 'https://www.govmap.gov.il/api/real-estate';

export interface DealPolygon {
  polygonId: string;
  dealsCount: number;
  settlement: string | null;
  street: string | null;
  houseNum: number | null;
}

/** נרמול עברי להשוואת שמות רחוב/יישוב. */
function norm(s: string | null | undefined): string {
  return (s ?? '').replace(/["'`״׳]/g, '').replace(/[-–—־]/g, '').replace(/\s+/g, '');
}

/** שלב 1: נקודה -> פוליגוני בניין/חלקה שיש בהם עסקאות. */
export async function dealPolygonsNearPoint(
  lat: number,
  lng: number,
  radiusM = 60,
): Promise<DealPolygon[]> {
  const { x, y } = wgs84ToMercator(lat, lng);
  const json = await fetchJson<any[]>(
    `${BASE}/deals/${x.toFixed(2)},${y.toFixed(2)}/${radiusM}`,
    { timeoutMs: 25000 },
  );
  if (!Array.isArray(json)) return [];
  return json.map((d) => ({
    polygonId: String(d?.polygon_id ?? ''),
    dealsCount: Number(d?.dealscount) || 0,
    settlement: d?.settlementNameHeb ?? null,
    street: d?.streetNameHeb ?? null,
    houseNum: Number.isFinite(Number(d?.houseNum)) ? Number(d.houseNum) : null,
  })).filter((p) => p.polygonId);
}

/**
 * בחירת הפוליגון הרלוונטי.
 *
 * ⚠️ קריטי: אסור לקחת את האיבר הראשון במערך. נבדק בפועל על "הרצל 42 תל אביב" —
 * האיבר הראשון היה `6931-168`, עסקה בודדת מ-2001 על "בנין", בעוד ההתאמה הנכונה
 * (`51663854`, הרצל 37/43) הופיעה רק רביעית. המערך אינו ממויין לפי רלוונטיות.
 *
 * הדירוג: התאמת שם רחוב > קרבת מספר בית > מספר עסקאות.
 */
export function rankPolygons(
  polygons: DealPolygon[],
  street?: string | null,
  houseNum?: number | null,
  /** כינויי הרחוב (ישן/חדש) — מרשם העסקאות רושם לפי הכינוי, לא לפי השם הרשמי. */
  aliases: string[] = [],
): { p: DealPolygon; score: number }[] {
  const wanted = [street, ...aliases].map(norm).filter(Boolean);

  const scored = polygons.map((p) => {
    let score = 0;
    const pStreet = norm(p.street);
    if (pStreet && wanted.length) {
      // ⚠️ ההתאמה נבדקת מול **כל** הכינויים ולא רק מול השם הרשמי. עסקאות
      // ב"דרך מרדכי" רשומות תחת "אתרוג", והשוואה לשם הרשמי בלבד מפספסת אותן.
      if (wanted.some((w) => w === pStreet)) score += 1000;
      else if (wanted.some((w) => pStreet.includes(w) || w.includes(pStreet))) score += 600;
    }
    if (houseNum != null && p.houseNum != null) {
      const diff = Math.abs(p.houseNum - houseNum);
      if (diff === 0) score += 400;
      else if (diff <= 4) score += 200 - diff * 20;
    }
    score += Math.min(p.dealsCount, 50); // שובר שוויון בלבד
    return { p, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

export function pickBestPolygon(
  polygons: DealPolygon[],
  street?: string | null,
  houseNum?: number | null,
): DealPolygon | null {
  if (!polygons.length) return null;
  return rankPolygons(polygons, street, houseNum)[0].p;
}

/**
 * מפתח זהות לעסקה — לאיחוד תוצאות מכמה פוליגונים.
 * אותה עסקה מוחזרת יותר מפעם אחת כשפוליגונים גובלים חופפים.
 */
export function dealKey(t: Transaction): string {
  return [t.gush, t.helka, t.tatHelka, t.dealDate, t.price, t.areaSqm, t.address]
    .map((v) => v ?? '')
    .join('|');
}

function toTransaction(d: any): Transaction {
  const price = Number(d?.dealAmount);
  const area = Number(d?.assetArea);
  const rooms = Number(d?.assetRoomNum);
  const gush = d?.gushNum, helka = d?.parcelNum, tat = d?.subParcelNum;
  const street = d?.streetNameHeb;
  const house = d?.houseNum;

  return {
    dealDate: d?.dealDate ? String(d.dealDate) : '',
    price: Number.isFinite(price) && price > 0 ? price : null,
    areaSqm: Number.isFinite(area) && area > 0 ? area : null,
    // 0 חדרים במקור פירושו "לא דווח", לא דירת אפס חדרים.
    rooms: Number.isFinite(rooms) && rooms > 0 ? rooms : null,
    floor: d?.floorNo ? String(d.floorNo) : null,
    // שנת בנייה אינה מוחזרת בשירות הזה. היא נגזרת מהיסטוריית העסקאות
    // של הבניין עצמו — ראה lib/buildingage.ts.
    buildYear: null,
    dealType: d?.dealNatureDescription ?? d?.propertyTypeDescription ?? null,
    propertyType: d?.propertyTypeDescription ?? null,
    address: street ? `${street}${house != null ? ' ' + house : ''}` : null,
    streetName: street ? String(street) : null,
    houseNum: Number.isFinite(Number(house)) && String(house).trim() !== '' ? Number(house) : null,
    settlement: d?.settlementNameHeb ? String(d.settlementNameHeb) : null,
    settlementId: Number.isFinite(Number(d?.settlementId)) ? Number(d.settlementId) : null,
    gush: gush != null ? String(gush) : null,
    helka: helka != null ? String(helka) : null,
    tatHelka: tat != null ? String(tat) : null,
    sourceOrder: Number.isFinite(Number(d?.sourceorder)) ? Number(d.sourceorder) : null,
    polygonId: d?.polygonId != null ? String(d.polygonId) : null,
    neighborhood: d?.neighborhood ?? null,
    raw: d,
  };
}

/**
 * האם לעסקה יש **זהות מלאה**: גוש, חלקה, רחוב, מספר בית ותאריך.
 *
 * ⚠️ זהו התנאי להצגה, ולא קישוט. עסקה בלי גוש/חלקה אי אפשר לאמת מול
 * nadlan.gov.il ואי אפשר לשייך לחלקה; עסקה בלי רחוב ומספר בית אי אפשר לשייך
 * לבניין, והיא הופכת ל"עסקה באזור" בלי שאפשר להראות ללקוח היכן. שורה כזו
 * נספרת ומדווחת בנפרד — אבל **לא מוצגת כעסקה מאומתת**.
 *
 * נמדד: `street-deals` מחזיר בפועל את חמשת השדות האלה בכל הרשומות שנבדקו
 * (0 חסרים מתוך 508 רשומות בשתי כתובות הבקרה), ולכן זהו סינון של מקרי קצה —
 * אבל בלעדיו מקרה הקצה מוצג כעובדה.
 */
export function hasFullIdentity(t: Transaction): boolean {
  return (
    !!t.gush &&
    !!t.helka &&
    !!t.streetName &&
    t.houseNum != null &&
    !!t.dealDate &&
    Number.isFinite(new Date(t.dealDate).getTime())
  );
}

/** "7091-7-13" — בדיוק הצורה שבה nadlan.gov.il מציג גוש/חלקה/תת-חלקה. */
export function parcelLabel(t: {
  gush?: string | null;
  helka?: string | null;
  tatHelka?: string | null;
}): string | null {
  if (!t.gush || !t.helka) return null;
  const tat = t.tatHelka && t.tatHelka !== '0' ? `-${t.tatHelka}` : '';
  return `${t.gush}-${t.helka}${tat}`;
}

/** שלב 2: polygon_id -> עסקאות. `shape` מושמט מה-raw (MULTIPOLYGON כבד). */
export async function fetchDealsByPolygon(polygonId: string, limit = 100): Promise<Transaction[]> {
  const json = await fetchJson<any>(
    `${BASE}/street-deals/${encodeURIComponent(polygonId)}?limit=${limit}`,
    { timeoutMs: 30000 },
  );
  const rows: any[] = json?.data ?? [];
  const txns = rows.map((r) => {
    const { shape, ...rest } = r ?? {};
    return toTransaction(rest);
  });
  txns.sort((a, b) => (a.dealDate < b.dealDate ? 1 : -1)); // חדש -> ישן
  return txns;
}

export interface DealsLookup {
  transactions: Transaction[];
  polygon: DealPolygon | null;
  /**
   * הפוליגון שהכתובת שלו **זהה** לכתובת שהתבקשה — רחוב ומספר בית.
   *
   * ⚠️ נפרד מ-`polygon` בכוונה, וזו הבחנה שמונעת שגיאה חמורה: `polygon` הוא
   * ההתאמה הטובה ביותר, וכשאין עסקאות בכתובת המבוקשת ההתאמה "הטובה ביותר"
   * היא בניין אחר באותו רחוב. נמדד על "הדקל 22 חצור הגלילית", שאין בו עסקאות:
   * הדירוג בחר את "הדקל 38", ושיוך העסקאות שלו לבניין המבוקש ייצר שנת בנייה,
   * גוש וחלקה של נכס אחר לגמרי. רק `exactPolygon` מתאים לשאלה "הבניין הזה".
   */
  exactPolygon: DealPolygon | null;
  /** כמה פוליגונים נמצאו בסביבה — לשקיפות מול המשתמש. */
  candidatesFound: number;
  /** רשומות שנפסלו בגלל תאריך עתידי (שגיאת מקור). */
  droppedFutureDated: number;
  /**
   * רשומות שנפסלו כי חסרה להן זהות מלאה (גוש/חלקה/רחוב/מספר בית).
   * מדווח ללקוח — "הוסתרו N רשומות שלא ניתן לאמת" ולא נעלם בשקט.
   */
  droppedNoIdentity: number;
  /** דיווחים כפולים של אותה עסקה שאוחדו (ראה mergeDuplicateReports). */
  duplicatesRemoved: number;
  /** כמה פוליגונים נשאלו בפועל — לשקיפות על היקף האיסוף. */
  polygonsQueried: number;
  /** הרדיוס שנבחר בפועל (מסתגל לצפיפות העסקאות באזור). */
  radiusUsedM: number;
}

/**
 * סינון עסקאות לחלקה מסוימת.
 *
 * ⚠️ הכרחי לנכונות: `street-deals` מחזיר עסקאות בהיקף רחוב/גוש-עיר שלם ולא
 * ברמת הבניין. נבדק על "הרצל 42 תל אביב" — התשובה כללה את הרצל 7, 19, 74,
 * 84, 102, 116 ו-176, פרוסים על יותר מ-15 גושים. הצגת החציון שלהם כשוויו של
 * הנכס הייתה מטעה: רחוב הרצל חוצה שכונות שונות בתכלית.
 * לכן מפרידים בין עסקאות בחלקה עצמה לבין עסקאות השוואה באזור.
 */
export function filterToParcel(
  txns: Transaction[],
  gush?: string | null,
  helka?: string | null,
): Transaction[] {
  if (!gush || !helka) return [];
  return txns.filter((t) => t.gush === String(gush) && t.helka === String(helka));
}

/**
 * סינון עסקאות לבניין אחד לפי מזהה הבניין של המקור.
 *
 * ⚠️ זהו התיקון של התקלה המהותית ביותר שהייתה במערכת. הבניין **אינו** מזוהה
 * לפי הגוש/חלקה שהקדסטר מחזיר לנקודת הכתובת: נבדק בפועל על "הבעש\"ט 9 רחובות" —
 * הקדסטר מחזיר גוש 3704 חלקה 741, אבל כל 12 העסקאות באותה כתובת רשומות בחלקה
 * 331 (חלוקה מחדש). התוצאה הייתה שהדוח הכריז "לא נרשמה עסקה בבניין הזה" על
 * בניין שנמכרו בו 11 דירות, וגם מחיר הדירה, המחיר למ"ר וגיל הבניין יצאו ריקים.
 *
 * מזהה הבניין (`polygonId`) הוא מה שהמקור עצמו מקבץ לפיו — הוא נכון גם כשמספר
 * החלקה השתנה, והוא מגיע יחד עם כל עסקה.
 */
export function filterToBuilding(txns: Transaction[], polygonId?: string | null): Transaction[] {
  if (!polygonId) return [];
  return txns.filter((t) => t.polygonId === String(polygonId));
}

/** מילות-סוג רחוב שמקורות שונים מוסיפים/משמיטים בחוסר-עקביות. */
const STREET_TYPE_WORDS = new Set([
  'רחוב', 'רח', 'שדרות', 'שדרה', 'שד', 'דרך', 'סמטה', 'סמטת', 'שביל', 'ככר', 'כיכר', 'מבוא',
]);

/**
 * נרמול שם רחוב להשוואה: "הבעש\"ט 9" ו-"הבעשט 9" הם אותה כתובת, וגם
 * "אלנבי" ו-"שדרות אלנבי" הן אותו רחוב (מילת-סוג מובילה מוסרת כטוקן שלם,
 * לפני איחוד הרווחים — לא בהכלת-תת-מחרוזת).
 *
 * ⚠️ בכוונה **לא** משתמש ב-`includes()` על המחרוזת המאוחדת: "אלנבי" מוכל
 * תת-מחרוזתית ב"שדרותאלנבי" (שדרות אלנבי) וגם "ביאליק" מוכל ב"ביאליקהחדש"
 * (ביאליק החדש) — שני רחובות שונים לגמרי. הכלה גורפת כזו זיהתה בעבר "רחוב
 * אחר" כאותו רחוב רק כי מספר הבית תאם במקרה. ההשוואה חייבת להיות שוויון
 * מדויק אחרי הסרת מילת-הסוג, לא הכלה — אותו עיקרון בדיוק כמו `verifyCity`
 * ב-`lib/geocode.ts`.
 */
export function normStreetName(s: string | null | undefined): string {
  const cleaned = (s ?? '').replace(/["'`״׳]/g, '').replace(/[-–—־]/g, ' ');
  let tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length > 1 && STREET_TYPE_WORDS.has(tokens[0])) tokens = tokens.slice(1);
  return tokens.join('');
}

/**
 * סינון לעסקאות באותה כתובת בדיוק (רחוב + מספר בית) — מסלול הגיבוי
 * כשאין `polygonId` (רשומות בפורמט הישן, שבהן מזהה הפוליגון הוא "גוש-חלקה").
 */
export function filterToAddress(
  txns: Transaction[],
  streetNames: (string | null | undefined)[],
  houseNum: number | null,
): Transaction[] {
  if (houseNum == null) return [];
  const wanted = new Set(streetNames.map(normStreetName).filter(Boolean));
  if (!wanted.size) return [];
  return txns.filter((t) => {
    // ⚠️ השוואה מול השדות המקוריים של הרשומה, לא מול פענוח של המחרוזת
    // המחורזת. הפענוח נכשל על "הבעש\"ט 9" ועל כתובות ללא מספר.
    if (t.houseNum == null || t.houseNum !== houseNum) return false;
    const st = normStreetName(t.streetName);
    return !!st && wanted.has(st);
  });
}

/**
 * האם העסקה היא מכירה של יחידת מגורים בפועל.
 *
 * ⚠️ הכרחי לנכונות המחירים: באותה כתובת מופיעות גם עסקאות קרקע, קומבינציה
 * וניוד זכויות בנייה. נבדק על "הבעש\"ט 9 רחובות" — עסקת קומבינציה על 834 מ״ר
 * ב-4,000,000 ₪ נכנסה לחישוב המחיר למ״ר יחד עם דירות של 130 מ״ר, והציגה
 * "עסקה אחרונה" שאינה דירה כלל.
 */
export function isHomeSale(t: Transaction): boolean {
  const pt = (t.propertyType ?? '').trim();
  const nature = (t.dealType ?? '').trim();
  if (/קרקע|מגרש|חקלא|מחסן|חני[יה]|משרד|חנות|מבנה\s*תעשיה|בנין/.test(pt)) return false;
  if (/קומבינציה|ניוד\s*זכויות|העברה\s*ללא\s*תמורה|איחוד\s*וחלוקה/.test(nature)) return false;
  if (pt === 'דירה') return true;
  if (
    /דירה|בית\s*קומות|קוטג|וילה|בית\s*בודד|חד\s*משפחתי|דו\s*[-]?\s*משפחתי|דירת\s*גן|פנטהאוז|דופלקס/.test(
      nature,
    )
  ) {
    return true;
  }

  // ⚠️ המקור משאיר את שני שדות התיאור **ריקים** בחלק מהרשומות. נמדד בהבעש"ט 9
  // רחובות: חמש מכירות דירות אמיתיות (130 מ"ר, 5 חדרים, קומות 2–4, 2.8 מ' ₪)
  // הגיעו עם `propertyTypeDescription=null` ו-`dealNatureDescription=null`,
  // ולכן סווגו כ"לא מכירת דירה" — הן סומנו כחריגות בדוח והוצאו מחישוב המחיר
  // למ"ר, כלומר חצי מהעסקאות של בניין חדש נעלמו מהמחיר שהלקוח רואה.
  // כשאין תיאור, מסתמכים על המבנה עצמו: דיווח על מספר חדרים בשטח מגורים סביר
  // אינו קיים בעסקאות קרקע, מחסן או חנייה.
  if (!pt && !nature) {
    return t.rooms != null && t.rooms > 0 && t.areaSqm != null && t.areaSqm >= 20 && t.areaSqm <= 400;
  }
  return false;
}

/**
 * האם העסקה היא של נכס מסחרי — משרד, חנות, מבנה תעשייה או מלונאות.
 *
 * ⚠️ אותו מרשם עסקאות מחזיק את כל סוגי הנכסים יחד; זה מה שמאפשר דוח מסחרי
 * בלי מקור נוסף. הסיווג נשען על **שני** שדות התיאור של המקור, כי בחלק
 * מהרשומות מלא רק אחד מהם — בדיוק כמו ב-`isHomeSale`.
 *
 * ⚠️ רשומה בלי שני התיאורים **אינה** מסווגת מסחרית. אין ממה להסיק, וניחוש
 * לפי שטח היה מכניס דירות גדולות לחציון המחיר של משרדים.
 */
export function isCommercialDeal(t: Transaction): boolean {
  const both = `${t.propertyType ?? ''} ${t.dealType ?? ''}`.trim();
  if (!both) return false;
  if (/חני[יה]|מחסן/.test(both) && !/משרד|חנות|מסחר/.test(both)) return false;
  return /משרד|חנות|מסחר|תעשי|מלאכה|תעסוקה|מלון|קניון|אולם/.test(both);
}

/**
 * האם העסקה היא של קרקע או מגרש (ולא של מבנה בנוי).
 *
 * ⚠️ עסקת **קומבינציה** נכללת בכוונה: זו עסקה במגרש עצמו, והיא מהעדויות
 * החזקות ביותר לכך שקרקע באזור נסחרת לבנייה. היא מסומנת בנפרד בהצגה, כי
 * התמורה בה אינה מחיר מלא של הקרקע.
 */
export function isLandDeal(t: Transaction): boolean {
  const pt = (t.propertyType ?? '').trim();
  const nature = (t.dealType ?? '').trim();
  if (/קרקע|מגרש|חקלא|נחלה/.test(pt)) return true;
  return /קרקע|מגרש|חקלא|קומבינציה/.test(nature);
}

/**
 * איחוד דיווחים כפולים של אותה עסקה.
 *
 * ⚠️ נמצא באימות על "הבעש״ט 9 רחובות". המקור מחזיר את אותה עסקה פעמיים, ביום
 * עוקב, עם `dealId` אחר, בלי שדות תיאור, ו**עם מספר תת-חלקה אחר**:
 *   05/07/2023 · 2,700,000 ₪ · 125 מ״ר · שלישית · תת-חלקה 11
 *   04/07/2023 · 2,700,000 ₪ · 125 מ״ר · שלישית · תת-חלקה 3
 *   05/07/2023 · 2,660,000 ₪ · 125 מ״ר · שלישית · תת-חלקה 11   ← אותה תת-חלקה, מחיר אחר
 *   04/07/2023 · 2,660,000 ₪ · 125 מ״ר · שלישית · תת-חלקה 4
 * תת-חלקה 11 מופיעה בשני מחירים שונים באותו יום, ולכן היא אינה מזהה אמיתי כאן —
 * מדובר בדיווח כפול. בלי איחוד הדוח הכריז "11 דירות נמכרו בבניין" על בניין
 * שנמכרו בו 6, וכל החציונים, "העסקה האחרונה" ורשימת תתי-החלקה נבנו על כפילויות.
 *
 * המפתח הוא מה שבאמת מזהה עסקה: מחיר, שטח, קומה ומספר חדרים בבניין אחד, בתוך
 * חלון של ארבעה ימים. הרשומה שנשמרת היא זו שיש בה תיאור סוג נכס — היא העשירה.
 */
export function mergeDuplicateReports(txns: Transaction[]): {
  merged: Transaction[];
  duplicatesRemoved: number;
} {
  const DAYS = 4 * 24 * 3600 * 1000;
  const kept: Transaction[] = [];
  let removed = 0;

  for (const t of txns) {
    const ts = new Date(t.dealDate).getTime();
    const twin = kept.find((k) => {
      if (k.polygonId !== t.polygonId) return false;
      if (k.price !== t.price || k.areaSqm !== t.areaSqm) return false;
      if ((k.floor ?? '') !== (t.floor ?? '')) return false;
      if ((k.rooms ?? null) !== (t.rooms ?? null)) return false;
      const kts = new Date(k.dealDate).getTime();
      if (!Number.isFinite(ts) || !Number.isFinite(kts)) return false;
      return Math.abs(kts - ts) <= DAYS;
    });

    if (!twin) {
      kept.push(t);
      continue;
    }
    removed++;
    // מעדיפים את הרשומה שיש בה תיאור סוג נכס, ואת התאריך המוקדם — הדיווח
    // המקורי הוא הקובע, והשני הוא רישום מחדש.
    const twinHasType = !!twin.propertyType || !!twin.dealType;
    const thisHasType = !!t.propertyType || !!t.dealType;
    if (thisHasType && !twinHasType) {
      kept[kept.indexOf(twin)] = { ...t, dealDate: twin.dealDate < t.dealDate ? twin.dealDate : t.dealDate };
    } else if (t.dealDate < twin.dealDate) {
      kept[kept.indexOf(twin)] = { ...twin, dealDate: t.dealDate };
    }
  }

  return { merged: kept, duplicatesRemoved: removed };
}

/**
 * פסילת עסקאות בתאריך עתידי — שגיאת נתונים במקור.
 * נצפתה בפועל רשומה בתאריך 2027-10-14. הכללתה כ"עסקה אחרונה" הייתה
 * מציגה נתון שגוי, ולכן היא נפסלת ונספרת בנפרד.
 */
export function dropFutureDated(txns: Transaction[]): { kept: Transaction[]; dropped: number } {
  const now = Date.now();
  const kept = txns.filter((t) => {
    if (!t.dealDate) return true;
    const ts = new Date(t.dealDate).getTime();
    return !Number.isFinite(ts) || ts <= now;
  });
  return { kept, dropped: txns.length - kept.length };
}

/**
 * זרימה מלאה: נקודה + כתובת מבוקשת -> עסקאות הבניין **והסביבה**.
 *
 * ⚠️ למה יותר מפוליגון אחד: `deals/{x},{y}/{radius}` מחזיר פוליגון נפרד לכל
 * בניין ברדיוס, ו-`street-deals` נשאל לפי פוליגון בודד. שאילתה על הפוליגון
 * המדורג ראשון בלבד מחזירה את הבניין המבוקש — ומשמיטה בשקט את כל העסקאות
 * בבניינים הסמוכים, שהן בדיוק עסקאות ההשוואה שהקונה צריך. לכן נשאלים N
 * הפוליגונים המדורגים הגבוה ביותר במקביל, והתוצאות מאוחדות ומנוכות כפילויות.
 *
 * הדירוג נשמר: `polygon` הוא עדיין ההתאמה הטובה ביותר, וסיווג הקרבה של כל
 * עסקה נעשה במעלה הזרם לפי גוש/חלקה ומספר בית.
 */
export async function fetchDealsAtPoint(
  lat: number,
  lng: number,
  opts: {
    street?: string | null;
    houseNum?: number | null;
    radiusM?: number;
    limit?: number;
    /** כמה פוליגונים לשאול. תקרה מפורשת — כל פוליגון הוא קריאת רשת. */
    maxPolygons?: number;
    aliases?: string[];
  } = {},
): Promise<DealsLookup> {
  // רדיוס מסתגל.
  //
  // ⚠️ רדיוס קבוע נותן תוצאה גרועה בשני הקצוות. נמדד: סביב "הבעש״ט 9 רחובות"
  // יש 47 בנייני-עסקאות ב-150 מ' — שם רדיוס גדול רק מדלל את ההשוואה ברחובות
  // אחרים. סביב "הדקל 22 חצור הגלילית" אותו רדיוס החזיר 24 עסקאות בלבד, כלומר
  // דוח בתשלום כמעט בלי בסיס השוואה. לכן מרחיבים רק כשצריך.
  const MIN_POLYGONS = 12;
  const radii = opts.radiusM ? [opts.radiusM] : [150, 400, 900];
  let polygons: DealPolygon[] = [];
  let radiusUsed = radii[0];
  for (const r of radii) {
    radiusUsed = r;
    polygons = await dealPolygonsNearPoint(lat, lng, r);
    if (polygons.length >= MIN_POLYGONS) break;
  }

  const ranked = rankPolygons(polygons, opts.street, opts.houseNum, opts.aliases ?? []);
  const best = ranked[0]?.p ?? null;

  // התאמה מדויקת: אותו מספר בית, ואותו רחוב לפי השם הרשמי או אחד הכינויים.
  const wantedStreets = [opts.street, ...(opts.aliases ?? [])].map(norm).filter(Boolean);
  const exactPolygon =
    opts.houseNum != null
      ? polygons.find(
          (p) =>
            p.houseNum === opts.houseNum &&
            !!norm(p.street) &&
            wantedStreets.some((w) => {
              const ps = norm(p.street);
              return ps === w || ps.includes(w) || w.includes(ps);
            }),
        ) ?? null
      : null;

  if (!best) {
    return {
      transactions: [],
      polygon: null,
      exactPolygon: null,
      candidatesFound: polygons.length,
      droppedFutureDated: 0,
      droppedNoIdentity: 0,
      duplicatesRemoved: 0,
      polygonsQueried: 0,
      radiusUsedM: radiusUsed,
    };
  }

  const chosen = ranked.slice(0, Math.max(1, opts.maxPolygons ?? 6)).map((r) => r.p);
  // ההתאמה המדויקת חייבת להישאל תמיד, גם אם הדירוג לא הציב אותה בראש התקרה —
  // בלעדיה "הבניין הזה" יוצא ריק למרות שיש לו עסקאות.
  if (exactPolygon && !chosen.some((p) => p.polygonId === exactPolygon.polygonId)) {
    chosen.unshift(exactPolygon);
  }
  const settled = await Promise.allSettled(
    chosen.map((p) => fetchDealsByPolygon(p.polygonId, opts.limit ?? 300)),
  );

  // פוליגון שנכשל אינו מפיל את הדוח — הוא פשוט תורם פחות עסקאות.
  const merged: Transaction[] = [];
  const seen = new Set<string>();
  for (const s of settled) {
    if (s.status !== 'fulfilled') continue;
    for (const t of s.value) {
      const k = dealKey(t);
      if (seen.has(k)) continue;
      seen.add(k);
      merged.push(t);
    }
  }
  merged.sort((a, b) => (a.dealDate < b.dealDate ? 1 : -1));

  const { kept, dropped } = dropFutureDated(merged);
  // ⚠️ שער הזהות. רשומה שאי אפשר לאמת — גוש/חלקה/רחוב/מספר בית — אינה
  // נכנסת לדוח בכלל: לא לטבלה, לא לחציונים, ולא לספירת "עסקאות באזור".
  const identified = kept.filter(hasFullIdentity);
  const deduped = mergeDuplicateReports(identified);
  return {
    transactions: deduped.merged,
    duplicatesRemoved: deduped.duplicatesRemoved,
    polygon: best,
    exactPolygon,
    candidatesFound: polygons.length,
    droppedFutureDated: dropped,
    droppedNoIdentity: kept.length - identified.length,
    polygonsQueried: settled.filter((s) => s.status === 'fulfilled').length,
    radiusUsedM: radiusUsed,
  };
}

/**
 * קישור ישיר לעמוד העסקאות של הכתובת ב-nadlan.gov.il — לאימות במקור.
 *
 * ⚠️ למה זה נחוץ ולא קישוט: מרשם העסקאות שזמין לנו לקריאה חופשית
 * (`govmap/real-estate`) הוא אותו מרשם, אבל **לא תמיד אותה שליפה**. נמדד על
 * "דיזנגוף 100 תל אביב": ב-nadlan.gov.il רשומות 10 עסקאות בגוש 7091 חלקה 7,
 * ובשליפה החופשית — 47 פוליגונים ו-9,704 עסקאות ברדיוס 150 מ' — **אין אף אחת
 * מהן**. הנתיב הרשמי לאותן רשומות (`api.nadlan.gov.il/deal-data`) חסום מאחורי
 * reCAPTCHA, ולכן אינו נגיש לשרת. במצב כזה הדוח אומר את האמת — "לא נמצאו
 * עסקאות במקור שאנחנו קוראים" — ונותן קישור לעמוד הרשמי כדי שהלקוח יראה
 * במו עיניו. מה שאסור הוא להשלים את החסר בעסקאות של בניין שכן.
 *
 * מזהה הכתובת מגיע מה-autocomplete הפתוח של GovMap, בפורמט
 * `address|ADDR|53921561|דיזנגוף|100|תל אביב`.
 */
export async function nadlanAddressRef(
  query: string,
  /**
   * קוד יישוב הלמ"ס (5000 ת"א, 8400 רחובות). ⚠️ **חובה בפועל** לחלק מהכתובות:
   * נבדק בדפדפן — `?view=address&id=53921561&page=deals` (ת"א) נפתח, ואותו
   * קישור ל-53633441 (רחובות) הופנה ל-`view=notfound`; עם `&setlCode=8400` הוא
   * נפתח והציג את העסקאות. קישור אימות שנוחת ב"לא נמצא" גרוע מאין קישור.
   * הקוד מגיע חינם עם כל עסקה (`settlementId`).
   */
  setlCode?: number | null,
): Promise<{ addressId: string; label: string; url: string } | null> {
  try {
    const json = await fetchJson<any>('https://www.govmap.gov.il/api/search-service/autocomplete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ searchText: query, language: 'he', isAccurate: false, maxResults: 10 }),
      timeoutMs: 15000,
    });
    for (const r of json?.results ?? []) {
      if (String(r?.type) !== 'address') continue;
      const parts = String(r?.id ?? '').split('|');
      const id = parts[2];
      if (!/^\d+$/.test(id ?? '')) continue;
      const setl = Number.isFinite(Number(setlCode)) && Number(setlCode) > 0 ? `&setlCode=${Number(setlCode)}` : '';
      return {
        addressId: id,
        label: String(r?.originalText ?? r?.text ?? query),
        url: `https://www.nadlan.gov.il/?view=address&id=${id}&page=deals${setl}`,
      };
    }
  } catch {
    /* קישור אימות הוא תוספת — היעדרו אינו מפיל דוח */
  }
  return null;
}

/** חילוץ רחוב ומספר בית מכתובת חופשית, להזנת הבורר. */
export function parseStreetAndNumber(address: string): { street: string | null; houseNum: number | null } {
  const m = /^\s*(.+?)\s+(\d+)\b/.exec(address ?? '');
  if (m) return { street: m[1].trim(), houseNum: Number(m[2]) };
  return { street: (address ?? '').trim() || null, houseNum: null };
}
