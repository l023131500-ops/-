// ==== רקע אנציקלופדי על היישוב והשכונה — ויקיפדיה העברית ====
//
// מה זה פותר: הרקע בדוח היה אחוזי מגזרים ואופי בנייה בלבד. מי שקורא דוח על
// נכס רוצה גם לדעת **לאן הוא נכנס** — מה ההיסטוריה של המקום, במה הוא מוכר,
// מי גר בו, אילו מוסדות יש בו ומה האווירה. זה קיים בכתובים, ואין סיבה לנחש.
//
// המקור: ה-API הפתוח של ויקיפדיה העברית (`he.wikipedia.org/w/api.php`).
// בלי מפתח, בלי captcha, רישיון CC BY-SA.
//
// ⚠️ הכלל היחיד שאסור לשבור כאן: **הערך חייב להיות על המקום הזה.** יש
// עשרות ערכים בעלי שם דומה ("רחובות" הוא גם שם עצם). לכן כל ערך מאומת מול
// הקואורדינטות שלו עצמו מול נקודת הנכס, וערך בלי קואורדינטות מתקבל רק
// בהתאמת שם מדויקת. ערך שלא עבר אימות — לא נכנס לדוח.

import { fetchJson } from './http';
import { haversineKm } from './datagov';

const API = 'https://he.wikipedia.org/w/api.php';
const ARTICLE = 'https://he.wikipedia.org/wiki/';

/** מרחק מרבי בין מרכז הערך לנכס, לפי סוג המקום. */
const MAX_KM = { locality: 25, neighborhood: 6 } as const;

export interface WikiSection {
  title: string;
  paragraphs: string[];
}

export interface WikiPlace {
  /** כותרת הערך בפועל (אחרי הפניות). */
  title: string;
  url: string;
  /** פסקאות הפתיחה — התיאור הכללי של המקום. */
  summary: string[];
  /** פרקים נבחרים: היסטוריה, אוכלוסייה, חינוך, דת, תרבות, כלכלה. */
  sections: WikiSection[];
  /** המרחק שנמדד בין מרכז הערך לנכס, בקילומטרים. null = אומת בשם בלבד. */
  distanceKm: number | null;
  kind: 'locality' | 'neighborhood';
}

/**
 * הפרקים שנכנסים לדוח, לפי הסדר שבו הם מוצגים.
 * מכוון: לא נכנסים "קישורים חיצוניים", "הערות שוליים", "לקריאה נוספת"
 * ולא רשימות של אישים — זה רקע על המקום, לא ביבליוגרפיה.
 */
const WANTED_SECTIONS: { match: RegExp; title: string }[] = [
  { match: /^היסטוריה|^תולדות|^ייסוד|^הקמת/u, title: 'היסטוריה' },
  { match: /^גאוגרפיה|^מיקום|^נוף|^אקלים/u, title: 'מיקום וסביבה' },
  { match: /^אוכלוסי|^דמוגרפי/u, title: 'אוכלוסייה' },
  { match: /^חינוך|^מוסדות חינוך/u, title: 'חינוך' },
  { match: /^דת|^בתי כנסת|^מוסדות דת/u, title: 'דת ומוסדות' },
  { match: /^תרבות|^ספורט|^פנאי/u, title: 'תרבות ופנאי' },
  { match: /^כלכלה|^תעסוקה|^תעשי|^מסחר/u, title: 'כלכלה ותעסוקה' },
  { match: /^תחבורה/u, title: 'תחבורה' },
  { match: /^אתרים|^תיירות|^מבנים/u, title: 'אתרים ומבנים' },
];

const SKIP_SECTIONS =
  /^(קישורים חיצוניים|הערות שוליים|לקריאה נוספת|ראו גם|ביבליוגרפיה|גלריה|מקורות|אישים|בני המקום|קישורים)/u;

interface ApiPage {
  title: string;
  extract?: string;
  coordinates?: { lat: number; lon: number }[];
  missing?: string;
}

async function queryPages(titles: string[]): Promise<ApiPage[]> {
  const url =
    `${API}?action=query&format=json&formatversion=2&redirects=1` +
    `&prop=extracts|coordinates&explaintext=1&exsectionformat=plain` +
    `&titles=${encodeURIComponent(titles.join('|'))}`;
  try {
    const j = await fetchJson<{ query?: { pages?: ApiPage[] } }>(url, { timeoutMs: 12000, retries: 1 });
    return j.query?.pages ?? [];
  } catch {
    // ויקיפדיה היא העשרה, לא תנאי לדוח.
    return [];
  }
}

/**
 * שמות הפרקים של הערך, מה-API עצמו.
 * ⚠️ לא מזהים כותרות לפי צורת השורה — טקסט רציף מלא בשורות קצרות שנראות
 * ככותרת. הרשימה הרשמית היא היחידה שאפשר לסמוך עליה.
 */
async function sectionTitles(title: string): Promise<string[]> {
  const url = `${API}?action=parse&format=json&formatversion=2&prop=sections&page=${encodeURIComponent(title)}`;
  try {
    const j = await fetchJson<{ parse?: { sections?: { line: string }[] } }>(url, {
      timeoutMs: 12000,
      retries: 1,
    });
    return (j.parse?.sections ?? []).map((s) => (s.line ?? '').trim()).filter(Boolean);
  } catch {
    return [];
  }
}

/** פירוק הטקסט הרציף לפסקאות ולפרקים, לפי שמות הפרקים של הערך. */
function parseExtract(
  extract: string,
  knownHeadings: string[],
): { summary: string[]; sections: WikiSection[] } {
  const headingSet = new Set(knownHeadings.map((h) => h.trim()));
  const blocks = extract
    .split(/\n+/)
    .map((b) => cleanText(b))
    .filter(Boolean);

  const summary: string[] = [];
  const sections: WikiSection[] = [];
  let current: WikiSection | null = null;
  let seenHeading = false;

  for (const block of blocks) {
    if (headingSet.has(block)) {
      seenHeading = true;
      const wanted = WANTED_SECTIONS.find((w) => w.match.test(block));
      current = wanted && !SKIP_SECTIONS.test(block) ? { title: wanted.title, paragraphs: [] } : null;
      if (current) sections.push(current);
      continue;
    }
    // פסקה קצרה מדי היא בדרך כלל שארית טבלה או כיתוב.
    if (block.length < 60) continue;
    if (current) current.paragraphs.push(block);
    else if (!seenHeading) summary.push(block);
  }

  // איחוד פרקים שקיבלו את אותה כותרת (למשל "היסטוריה" ו"תולדות").
  const merged: WikiSection[] = [];
  for (const s of sections) {
    if (!s.paragraphs.length) continue;
    const twin = merged.find((m) => m.title === s.title);
    if (twin) twin.paragraphs.push(...s.paragraphs);
    else merged.push(s);
  }

  return { summary, sections: merged };
}

/**
 * ניקוי שאריות הסימון של ויקיפדיה מהטקסט הפשוט.
 * נמדד על הערך "ירושלים": פסקת הפתיחה הגיעה עם "יְרוּשָׁלַיִם (‏‏Ⓘ‏; בערבית…" —
 * ה-Ⓘ הוא כפתור ההשמעה, והתווים סביבו הם סימני כיווניות. בדוח ללקוח זה
 * נראה כמו תקלה.
 */
// כפתורי ההשמעה מגיעים בטקסט הפשוט כאות בעיגול (U+24BE ואחיותיה).
const ICON = /[①-⓿\u{1F50A}]/gu;

function cleanText(s: string): string {
  return (
    s
      // סוגריים שכל תוכנם הגייה — "ירושלים (Ⓘ; בערבית: Ⓘ, נהגה אל־קֻדְס…)" —
      // יורדים בשלמותם. להסיר רק את הסמל היה משאיר "(; בערבית: , נהגה".
      .replace(/\s*\([^()]*[①-⓿\u{1F50A}][^()]*\)/gu, '')
      .replace(ICON, '')
      .replace(/[‎‏‪-‮⁦-⁩­]/g, '') // סימני כיווניות
      .replace(/\(\s*\)/g, '')
      .replace(/\s+([,.;:])/g, '$1')
      .replace(/[ \t]{2,}/g, ' ')
      .trim()
  );
}

/** גזירה לאורך סביר לדוח, בלי לחתוך באמצע משפט. */
function trimParagraphs(paragraphs: string[], maxChars: number): string[] {
  const out: string[] = [];
  let used = 0;
  for (const p of paragraphs) {
    if (used >= maxChars) break;
    if (used + p.length <= maxChars) {
      out.push(p);
      used += p.length;
      continue;
    }
    const room = maxChars - used;
    const cut = p.slice(0, room);
    const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('.\n'), cut.lastIndexOf('! '));
    if (lastStop > 120) out.push(cut.slice(0, lastStop + 1));
    break;
  }
  return out;
}

function normTitle(s: string): string {
  return (s ?? '')
    .replace(/["'`״׳]/g, '')
    .replace(/[-–—־]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * ערך ויקיפדיה על מקום, מאומת מול נקודת הנכס.
 * מחזיר null כשאין ערך, כשהוא ריק, או כשהוא על מקום אחר.
 */
async function resolvePlace(
  candidates: string[],
  wantName: string,
  at: { lat: number; lng: number } | null,
  kind: 'locality' | 'neighborhood',
): Promise<WikiPlace | null> {
  const unique = [...new Set(candidates.map((c) => c.trim()).filter(Boolean))];
  if (!unique.length) return null;

  const pages = await queryPages(unique);
  for (const title of unique) {
    // ההתאמה נעשית לפי סדר המועמדים, לא לפי סדר התשובה.
    const page = pages.find(
      (p) => normTitle(p.title) === normTitle(title) || p.title === title,
    ) ?? pages.find((p) => !p.missing && normTitle(p.title).startsWith(normTitle(title)));
    if (!page || page.missing || !page.extract) continue;

    const coord = page.coordinates?.[0];
    let distanceKm: number | null = null;
    if (coord && at) {
      distanceKm = haversineKm(at.lat, at.lng, coord.lat, coord.lon);
      if (distanceKm > MAX_KM[kind]) continue; // ערך על מקום אחר בעל שם דומה
    } else if (normTitle(page.title) !== normTitle(wantName)) {
      // בלי קואורדינטות אין אימות מרחק — אז נדרשת התאמת שם מדויקת.
      continue;
    }

    const { summary, sections } = parseExtract(page.extract, await sectionTitles(page.title));
    if (!summary.length && !sections.length) continue;

    return {
      title: page.title,
      url: `${ARTICLE}${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
      summary: trimParagraphs(summary, kind === 'locality' ? 1400 : 1100),
      sections: sections
        .map((s) => ({ title: s.title, paragraphs: trimParagraphs(s.paragraphs, 900) }))
        .filter((s) => s.paragraphs.length),
      distanceKm: distanceKm == null ? null : Math.round(distanceKm * 10) / 10,
      kind,
    };
  }
  return null;
}

/** הערך על היישוב. */
export function localityArticle(
  cityName: string,
  at: { lat: number; lng: number } | null,
): Promise<WikiPlace | null> {
  if (!cityName) return Promise.resolve(null);
  return resolvePlace([cityName, `${cityName} (עיר)`, `${cityName} (יישוב)`], cityName, at, 'locality');
}

/** הערך על השכונה, אם קיים לה ערך משלה. */
export function neighborhoodArticle(
  neighborhoodName: string | null,
  cityName: string | null,
  at: { lat: number; lng: number } | null,
): Promise<WikiPlace | null> {
  if (!neighborhoodName) return Promise.resolve(null);
  const city = cityName ?? '';
  return resolvePlace(
    [
      `${neighborhoodName} (שכונה)`,
      city ? `${neighborhoodName}, ${city}` : '',
      city ? `${neighborhoodName} (${city})` : '',
      neighborhoodName,
    ].filter(Boolean),
    neighborhoodName,
    at,
    'neighborhood',
  );
}
