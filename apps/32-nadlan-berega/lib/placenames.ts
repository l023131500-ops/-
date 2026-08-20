// ==== מנוע שמות מקומות — רחוב / שכונה / צומת ====
//
// הבעיה שזה פותר: אנשים מחפשים לפי השם שהם מכירים, לא לפי השם הרשמי.
// בחצור הגלילית הרחוב הרשמי הוא "דרך מרדכי", אבל התושבים אומרים "האתרוג",
// "הר כנען" או "כנען". חיפוש לפי "האתרוג" חייב להגיע לאותו נכס.
//
// המקור: "רשימת רחובות בישראל — קובץ עם סינונימיים" (data.gov.il, 152,130 שורות).
// כל שורה מסומנת `official` או `synonym of <קוד>`, ושתיהן חולקות `official_code`.
// כך אפשר גם לזהות שם מוכר וגם להציג את השם הרשמי לצידו.
// נבדק חי 28/07/2026: קוד 117 בחצור הגלילית = "דרך מרדכי", ובין הכינויים "אתרוג".
//
// אותו מאגר מכיל גם שכונות (קודים 6500+), ולכן אותו מנגנון משרת גם אותן.
// צמתים מגיעים ממאגר "שמות צמתים ומחלפים" (468 צמתים, קואורדינטות רשת ישראל).

import { datastoreSearch, haversineKm } from './datagov';
import { itmToWgs84 } from './itm';
import { verifyCity } from './geocode';

const STREETS_SYNONYMS =
  process.env.DATAGOV_STREETS_SYNONYMS || 'bf185c7f-1a4e-4662-88c5-fa118a244bda';
const JUNCTIONS = process.env.DATAGOV_JUNCTIONS || '09bbc3b7-7289-4beb-97c7-a10ebc4973c6';
const NEIGHBORHOOD_DICT =
  process.env.DATAGOV_NEIGHBORHOODS || 'd6b9634d-8e79-4fdf-80e4-678cd583a116';

/** קודי רחוב מ-6500 ומעלה במאגר הם שכונות/רבעים, לא רחובות. */
const NEIGHBORHOOD_CODE_FLOOR = 6500;

export interface ResolvedName {
  /** השם הרשמי — מה שמופיע במרשם. */
  official: string;
  /**
   * שמות אחרים **מאומתים** שבהם המקום מוכר — אלה ואלה בלבד מוצגים ללקוח.
   * ריק כשלמקום אין שם אחר, ואז לא מוצג "מוכר גם כ".
   */
  aliases: string[];
  /** כל שורות המרשם, כולל קיצורים וחיתוכים — לחיפוש ולתיעוד בלבד. */
  registryNames: string[];
  /** השם שלפיו המשתמש חיפש, אם נמצא. */
  matchedAs: string | null;
  /** האם המשתמש חיפש דווקא לפי שם לא-רשמי. */
  matchedByAlias: boolean;
  cityName: string;
  cityCode: number;
  code: number;
  kind: 'street' | 'neighborhood';
}

/** נרמול עברי להשוואה: בלי גרשיים, מקפים, רווחים כפולים ו-ה' הידיעה. */
function norm(s: string | null | undefined): string {
  return (s ?? '')
    .replace(/["'`״׳]/g, '')
    .replace(/[-–—־]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** נרמול אגרסיבי יותר — מוריד גם ה' ידיעה ותחיליות נפוצות. */
function loose(s: string | null | undefined): string {
  let v = norm(s);
  v = v.replace(/^(רחוב|רח|שדרות|שד|סמטה|סמ|מבוא|דרך|מעלה|שכונה|שכ|קרית|קריית)\s+/u, '');
  v = v.replace(/^ה/u, '');
  return v.replace(/\s+/g, '');
}

// ==== סינון כינויים: מה באמת שם אחר, ומה רק שורת אינדקס ====
//
// ⚠️ שורות ה-synonym במרשם **אינן רשימת שמות מתועדים** אלא אינדקס חיפוש:
// כתיבים חלופיים, ראשי תיבות וקיצורים שנחתכו לרוחב השדה. נמדד חי על
// `official_code 116` בירושלים ("שמואל הנביא") — שמונה שורות synonym, ומתוכן:
//   "ש חסכ ש נבי" · "ש מפון ש נב" · "עמידר ש נבי"  → קיצורים חתוכים
//   "שמואל נביא ש" · "שמואל"                        → חיתוך באמצע
//   "שמואל הנבאי"                                    → שגיאת כתיב במרשם
//   "הנביא שמואל" · "שמואל נביא"                     → אותו שם, סדר/ה' הידיעה
// כלומר: **לרחוב הזה אין שם אחר**, והצגת "מוכר גם כ" עליו היא ג'יבריש.
// לעומת זאת ב"הבעשט" ברחובות הכינוי "הבעל שם טוב" הוא השם האמיתי במלואו.
//
// לכן כינוי מוצג רק אם הוא **שם אחר של ממש**: לא וריאציה של הרשמי, לא חתוך
// ולא מקוצר. אין כאן ניחוש ואין פרמוטציות — רק פסילה של שורות שאינן שם.

/**
 * מילות השם לצורך השוואה: בלי ה' הידיעה, ובאותיות סופיות מקופלות.
 *
 * ⚠️ ה' יורדת רק אם נשארת מילה — אחרת "הר" (ב"הר כנען") הופך ל-"ר"
 * ונפסל כאילו היה קיצור.
 * ⚠️ קיפול אותיות סופיות הוא הכרחי: "שכון" נגמר ב-ן ו"שכוני" ב-נ, ולכן
 * בלי קיפול המרחק ביניהן 2 והן נספרות כשני שמות שונים.
 */
const FINALS: Record<string, string> = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };

function nameWords(s: string): string[] {
  return norm(s)
    .replace(/[ךםןףץ]/g, (c) => FINALS[c])
    .split(' ')
    .map((w) => (w.length > 2 ? w.replace(/^ה/u, '') : w))
    .filter(Boolean);
}

/** מרחק דמראו-לוינשטיין — כדי ש"נבאי" ו"נביא" ייחשבו לאותה מילה. */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      // החלפת שתי אותיות סמוכות = טעות אחת, לא שתיים.
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][n];
}

/** האם שתי מילים הן אותה מילה, עד כדי שגיאת כתיב אחת. */
function sameWord(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 4) return false;
  return editDistance(a, b) <= 1;
}

/**
 * שם אחר של ממש, או שורת אינדקס?
 * נפסל כינוי ש:
 *  1. מכיל מילה בת אות אחת — סימן ההיכר של הקיצורים במרשם ("ש נבי");
 *  2. מכיל מילה קצרה שהיא רק תחילית של מילה בשם הרשמי ("נבי" מתוך "נביא");
 *  3. כל מילותיו כלולות בשם הרשמי — כלומר חיתוך או סדר אחר, לא שם אחר.
 */
function isDistinctName(alias: string, official: string): boolean {
  const a = nameWords(alias);
  const o = nameWords(official);
  if (!a.length || !o.length) return false;
  if (norm(alias).length < 3) return false;

  for (const w of a) {
    if (w.length <= 1) return false;
    if (w.length <= 3 && o.some((ow) => ow.length > w.length && ow.startsWith(w))) return false;
  }

  // כל מילה בכינוי מופיעה בשם הרשמי → אותו שם, לא שם אחר.
  return !a.every((w) => o.some((ow) => sameWord(w, ow)));
}

/**
 * הכינויים שמותר להציג ללקוח. מחזיר רשימה ריקה כשאין שם אחר מאומת —
 * ואז לא מוצג "מוכר גם כ" בכלל.
 */
export function verifiedAliases(aliases: string[], official: string): string[] {
  const kept: string[] = [];
  for (const raw of aliases) {
    const alias = norm(raw);
    if (!alias || !isDistinctName(alias, official)) continue;
    // כינויים שהם אותו שם בינם לבין עצמם ("בעל שם טוב" / "הבעל שם טוב") —
    // נשמר הארוך מביניהם.
    const twin = kept.findIndex((k) => !isDistinctName(alias, k) || !isDistinctName(k, alias));
    if (twin >= 0) {
      if (alias.length > kept[twin].length) kept[twin] = alias;
      continue;
    }
    kept.push(alias);
  }
  return kept;
}

interface StreetRow {
  city_code: number;
  city_name: string;
  street_code: string;
  street_name: string;
  street_name_status: string;
  official_code: number;
}

function clean(r: any): StreetRow {
  return {
    city_code: Number(r.city_code),
    city_name: String(r.city_name ?? '').trim(),
    street_code: String(r.street_code ?? '').trim(),
    street_name: String(r.street_name ?? '').trim(),
    street_name_status: String(r.street_name_status ?? '').trim(),
    official_code: Number(r.official_code),
  };
}

/**
 * ניקוי מונח לחיפוש החופשי של CKAN.
 * ⚠️ הכרחי: מקף שובר את החיפוש לגמרי. `q="תל אביב-יפו"` מחזיר 0 תוצאות,
 * בעוד `q="תל אביב יפו"` מחזיר את היישוב. נבדק חי.
 */
function searchTerm(s: string): string {
  return norm(s).replace(/["'`״׳]/g, '').trim();
}

// מטמון קודי יישוב — נשאלים בכל דוח ואינם משתנים.
const cityCodeCache = new Map<string, number | null>();

/** קוד היישוב במרשם הרחובות. */
async function findCityCode(cityName: string): Promise<number | null> {
  const key = norm(cityName);
  if (!key) return null;
  if (cityCodeCache.has(key)) return cityCodeCache.get(key)!;

  let code: number | null = null;
  try {
    const res = await datastoreSearch(STREETS_SYNONYMS, { q: searchTerm(cityName), limit: 100 });
    // התאמה מדויקת קודמת; אחרת התאמה חלקית (למשל "תל אביב" מול "תל אביב - יפו").
    // ⚠️ לא includes() גולמי — אותה מלכודת-הכלה שתועדה ב-geocode.ts (verifyCity):
    // "פת" מוכל ב-"צפת" בלי קשר ליישוב. השוואה ברמת טוקן שלם דרך verifyCity בלבד.
    let partial: number | null = null;
    for (const raw of res.records) {
      const r = clean(raw);
      const n = norm(r.city_name);
      if (!n || !Number.isFinite(r.city_code)) continue;
      if (n === key) { code = r.city_code; break; }
      if (partial == null && verifyCity(key, n)) partial = r.city_code;
    }
    if (code == null) code = partial;
  } catch {
    code = null;
  }
  cityCodeCache.set(key, code);
  return code;
}

/**
 * חיפוש שורות רחוב במאגר.
 * ⚠️ החיפוש החופשי של CKAN אינו מבין ה' הידיעה: `q="האתרוג"` לא מוצא את
 * הרשומה "אתרוג". לכן מחפשים גם בגרסה בלי ה' ומאחדים את התוצאות —
 * בלי זה, חיפוש לפי שם מוכר נכשל בשקט.
 */
async function searchStreetRows(cityCode: number, streetQuery: string): Promise<StreetRow[]> {
  const terms = new Set<string>();
  const base = searchTerm(streetQuery);
  if (base) terms.add(base);
  const noHey = base.replace(/(^|\s)ה/g, '$1').trim();
  if (noHey && noHey !== base) terms.add(noHey);
  // גם הצורה עם ה' — למקרה ההפוך (הוקלד "אתרוג", במאגר "האתרוג").
  if (base && !base.startsWith('ה')) terms.add(`ה${base}`);

  const byId = new Map<number, StreetRow>();
  for (const t of terms) {
    try {
      const res = await datastoreSearch(STREETS_SYNONYMS, {
        filters: { city_code: cityCode },
        q: t,
        limit: 200,
      });
      for (const raw of res.records) {
        const id = Number(raw._id);
        if (!byId.has(id)) byId.set(id, clean(raw));
      }
    } catch {
      /* מונח אחד שנכשל לא מפיל את השאר */
    }
  }
  return [...byId.values()];
}

/**
 * זיהוי רחוב לפי כל שם שהוא — רשמי, ישן, או מוכר בפי הבריות.
 * מחזיר את השם הרשמי יחד עם כל הכינויים.
 *
 * ⚠️ אסור לטעון "את כל רחובות העיר" ולסנן בזיכרון: לתל אביב יש יותר משורות
 * ה-limit, והחיתוך היה משמיט את הרחוב המבוקש בשקט. לכן מסננים לפי קוד יישוב
 * ומחפשים את הרחוב בשאילתה עצמה.
 */
export async function resolveStreet(
  cityName: string,
  streetQuery: string,
): Promise<ResolvedName | null> {
  const cityCode = await findCityCode(cityName);
  if (cityCode == null) return null;

  const rows = await searchStreetRows(cityCode, streetQuery);
  if (!rows.length) return null;

  const wantExact = norm(streetQuery);
  const wantLoose = loose(streetQuery);
  if (!wantLoose) return null;

  // דירוג התאמה: מדויק > ללא ה' ידיעה/תחילית > הכלה.
  let best: { row: StreetRow; score: number } | null = null;
  for (const r of rows) {
    const nExact = norm(r.street_name);
    const nLoose = loose(r.street_name);
    let score = 0;
    if (nExact === wantExact) score = 1000;
    else if (nLoose === wantLoose) score = 800;
    else if (nLoose && (nLoose.includes(wantLoose) || wantLoose.includes(nLoose))) {
      // התאמה חלקית שווה משהו רק אם היא לא זעירה ביחס לשם.
      const ratio = Math.min(nLoose.length, wantLoose.length) / Math.max(nLoose.length, wantLoose.length);
      if (ratio >= 0.6) score = 400 + Math.round(ratio * 100);
    }
    if (score && (!best || score > best.score)) best = { row: r, score };
  }
  if (!best) return null;

  const code = best.row.official_code;

  // המשפחה המלאה נמשכת בשאילתה נפרדת: חיפוש לפי כינוי אחד לא בהכרח החזיר את
  // שאר הכינויים של אותו רחוב.
  let family = rows.filter((r) => r.official_code === code);
  try {
    const fam = await datastoreSearch(STREETS_SYNONYMS, {
      filters: { city_code: cityCode, official_code: code },
      limit: 100,
    });
    const full = fam.records.map(clean);
    if (full.length > family.length) family = full;
  } catch {
    // נשארים עם מה שכבר נמצא.
  }

  const officialRow = family.find((r) => r.street_name_status === 'official');
  const official = officialRow?.street_name ?? best.row.street_name;

  const aliases = family
    .filter((r) => r.street_name_status !== 'official')
    .map((r) => r.street_name)
    .filter((n) => norm(n) !== norm(official));

  // כפילויות נפוצות במאגר ("תשח" מופיע פעמיים) — מסננים.
  const uniqueAliases = [...new Map(aliases.map((a) => [norm(a), a])).values()];

  return {
    official,
    // רק שמות אחרים של ממש. ראה `verifiedAliases`: רוב שורות ה-synonym במרשם
    // הן קיצורים וחיתוכים, ואינן שם שאפשר להציג ללקוח.
    aliases: verifiedAliases(uniqueAliases, official),
    /** כל מה שהמרשם מחזיר — לחיפוש ולתיעוד פנימי, לא לתצוגה. */
    registryNames: uniqueAliases,
    matchedAs: best.row.street_name,
    matchedByAlias: best.row.street_name_status !== 'official',
    cityName: best.row.city_name,
    cityCode: best.row.city_code,
    code,
    kind: code >= NEIGHBORHOOD_CODE_FLOOR ? 'neighborhood' : 'street',
  };
}

/** כל השכונות של יישוב, עם הכינויים שלהן. */
export async function neighborhoodsOfCity(cityName: string): Promise<ResolvedName[]> {
  const cityCode = await findCityCode(cityName);
  if (cityCode == null) return [];
  const res = await datastoreSearch(STREETS_SYNONYMS, {
    filters: { city_code: cityCode },
    limit: 1000,
  });
  const rows = res.records.map(clean);
  const byCode = new Map<number, StreetRow[]>();
  for (const r of rows) {
    if (r.official_code < NEIGHBORHOOD_CODE_FLOOR) continue;
    const list = byCode.get(r.official_code) ?? [];
    list.push(r);
    byCode.set(r.official_code, list);
  }

  const out: ResolvedName[] = [];
  for (const [code, family] of byCode) {
    const officialRow = family.find((r) => r.street_name_status === 'official') ?? family[0];
    const aliases = family
      .filter((r) => r !== officialRow && r.street_name_status !== 'official')
      .map((r) => r.street_name);
    const unique = [...new Map(aliases.map((a) => [norm(a), a])).values()];
    out.push({
      official: officialRow.street_name,
      aliases: verifiedAliases(unique, officialRow.street_name),
      registryNames: unique,
      matchedAs: null,
      matchedByAlias: false,
      cityName: officialRow.city_name,
      cityCode: officialRow.city_code,
      code,
      kind: 'neighborhood',
    });
  }
  return out;
}

export interface NeighborhoodInfo {
  name: string;
  /** שם באנגלית מהמילון הרשמי. */
  nameEnglish: string | null;
  /** תיאור מילולי רשמי — למשל "שכונה דתית-לאומית בדרום-מערב העיר". */
  description: string | null;
}

/**
 * תיאור שכונה ממילון השכונות הרשמי.
 * שמות במילון כוללים לעיתים את השם החלופי בסוגריים — "אבו תור (גבעת חנניה)" —
 * ולכן ההשוואה נעשית גם מול מה שבתוך הסוגריים.
 */
export async function neighborhoodInfo(
  cityName: string,
  neighborhoodName: string,
): Promise<NeighborhoodInfo | null> {
  if (!neighborhoodName) return null;
  try {
    const res = await datastoreSearch(NEIGHBORHOOD_DICT, { q: neighborhoodName, limit: 60 });
    const want = loose(neighborhoodName);
    const city = norm(cityName);

    for (const r of res.records) {
      const nm = String(r.Name_Neighborhood_Hebrew ?? '').trim();
      const rc = norm(String(r.Name_City_Hebrew ?? ''));
      if (city && rc && rc !== city) continue;
      // "אבו תור (גבעת חנניה)" → ["אבו תור", "גבעת חנניה"]
      const variants = [nm.replace(/\s*\(.*?\)\s*/g, ' ').trim(), ...(nm.match(/\(([^)]+)\)/g) ?? []).map((s) => s.slice(1, -1))];
      if (variants.some((v) => loose(v) === want)) {
        return {
          name: nm,
          nameEnglish: String(r.Name_Neighborhood_English ?? '').trim() || null,
          description: String(r.Description_Hebrew ?? '').trim() || null,
        };
      }
    }
  } catch {
    // מילון השכונות הוא העשרה, לא תנאי.
  }
  return null;
}

export interface Junction {
  name: string;
  nameLatin: string | null;
  kind: string | null;
  roads: string | null;
  status: string | null;
  meters: number;
}

/** הצומת הנקראת הקרובה ביותר — כך מתארים מיקום כמו שמדברים עליו בפועל. */
export async function nearestJunction(lat: number, lng: number, maxMeters = 3000): Promise<Junction | null> {
  try {
    const res = await datastoreSearch(JUNCTIONS, { limit: 500 });
    let best: Junction | null = null;
    for (const r of res.records) {
      const x = Number(r.X);
      const y = Number(r.Y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      const p = itmToWgs84(x, y);
      const meters = Math.round(haversineKm(lat, lng, p.lat, p.lng) * 1000);
      if (meters > maxMeters) continue;
      if (!best || meters < best.meters) {
        best = {
          name: String(r.HEBREW ?? '').trim(),
          nameLatin: String(r.LATIN ?? '').trim() || null,
          kind: String(r.CURRENT ?? '').trim() || null,
          roads: String(r.RAODS ?? '').trim() || null,
          status: String(r.STATUS ?? '').trim() || null,
          meters,
        };
      }
    }
    return best?.name ? best : null;
  } catch {
    return null;
  }
}

/**
 * תצוגת שם מלאה: רשמי + מוכר-גם-כ.
 * "הבעשט (מוכר גם כרחוב הבעל שם טוב)"
 *
 * כשאין שם אחר מאומת מוחזר השם הרשמי לבדו — **בלי** "מוכר גם כ".
 */
export function displayName(
  resolved: ResolvedName | null,
  fallback: string,
  opts: { maxAliases?: number; prefix?: string } = {},
): string {
  if (!resolved) return fallback;
  const { maxAliases = 2, prefix = 'רחוב' } = opts;
  if (!resolved.aliases.length) return resolved.official;

  // אם המשתמש חיפש לפי שם אחר — אותו שם מוצג ראשון, כי זה מה שהוא מכיר.
  // רק אם הוא עצמו מאומת; חיפוש שנתפס על שורת אינדקס לא מדפיס אותה ללקוח.
  const matched = resolved.matchedAs && resolved.aliases.includes(norm(resolved.matchedAs))
    ? norm(resolved.matchedAs)
    : null;
  const ordered = matched
    ? [matched, ...resolved.aliases.filter((a) => a !== matched)]
    : resolved.aliases;

  const shown = ordered.slice(0, maxAliases);
  const label = shown.map((a) => `${prefix} ${a}`.trim()).join(' או ');
  return `${resolved.official} (מוכר גם כ${label})`;
}

/**
 * כל השמות שאפשר לחפש לפיהם — כולל שורות האינדקס של המרשם.
 * לחיפוש בלבד; לתצוגה משתמשים ב-`aliases`.
 */
export function allNames(resolved: ResolvedName | null): string[] {
  if (!resolved) return [];
  return [...new Set([resolved.official, ...resolved.aliases, ...resolved.registryNames])];
}
