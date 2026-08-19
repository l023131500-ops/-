// ==== רשות מקרקעי ישראל — קובץ החלטות המועצה ====
//
// רלוונטי לכפתור הקרקעות: כשקרקע חקלאית משנה ייעוד, מי שקובע מה מקבל החוכר,
// מה מושב למדינה ואיזה פיצוי משולם — הוא **קובץ החלטות מועצת מקרקעי ישראל**,
// ובתוכו פרק 8 ("קרקע חקלאית").
//
// ✅ המקור פתוח לגמרי: אתר ההחלטות מגיש קובצי JSON סטטיים, בלי מפתח ובלי
// captcha (בשונה מ-MAVAT). נבדק חי:
//   /assets/data/startDates.json      — 95 גרסאות של הקובץ; האחרונה 15/06/2026
//   /assets/data/<version>/tree.json  — עץ הפרקים והסעיפים (1,349 צמתים)
//   /assets/data/<version>/content.txt — נוסח הסעיפים (8,112 שורות, ~2.2MB)
//
// ⚠️ מה שהמקור הזה **אינו**: הוא מדיניות כללית, לא החלטה על חלקה מסוימת.
// הוא לא יגיד אם החלקה שלך תופשר. הצפי הפרטני נגזר מתכניות בהליך ב-XPLAN.
// לכן כל דבר שמגיע מכאן מסומן במפורש כמסגרת מדיניות ולא כעובדה על הנכס.
//
// ⚠️ content.txt שוקל ~2.2MB ולכן נמשך **רק** כשבאמת מציגים דוח קרקע, ונשמר
// בזיכרון התהליך לפי מספר גרסה (הגרסה משתנה אולי פעם בחודש).

import { robustFetch } from './http';

const BASE = 'https://apps.land.gov.il/CouncilDecisions';
export const RAMI_DECISIONS_URL = `${BASE}/#/main`;

export interface RamiSection {
  /** מספר הסעיף כפי שהוא בקובץ, למשל "8.4". */
  number: string | null;
  title: string;
  /** המסלול המלא בעץ — הפרק שאליו הסעיף שייך. */
  path: string;
  /** נוסח הסעיף, כשנמשך. */
  text: string | null;
}

export interface RamiPolicy {
  /** מספר הגרסה של קובץ ההחלטות ותאריכה — הקובץ מתעדכן. */
  version: number;
  versionDate: string | null;
  /** הסעיפים בפרק "קרקע חקלאית" שנוגעים לשינוי ייעוד והשבת קרקע. */
  sections: RamiSection[];
  url: string;
  note: string;
  warnings: string[];
}

const POLICY_NOTE =
  'קובץ החלטות מועצת מקרקעי ישראל הוא מסגרת המדיניות שחלה על קרקע בבעלות המדינה. ' +
  'הוא קובע מה קורה כשקרקע חקלאית משנה ייעוד — מה מושב לרשות, מה נשאר לחוכר ומה הפיצוי. ' +
  'הוא אינו אומר דבר על חלקה מסוימת ואינו קובע אם היא תופשר.';

/**
 * מה בפרק 8 נוגע בפועל לשינוי ייעוד — ולא לחכירה חקלאית שוטפת.
 *
 * ⚠️ `פיצוי` לבדו הוסר מהרשימה אחרי בדיקה על שתי כתובות הבקרה: הוא גרר סעיפים
 * כמו "8.2.10 פיצוי" (פיצוי לסוכנות על השקעות) ו"8.6.20 פיצוי סופי" (הרחבה
 * קהילתית), שאין להם דבר עם שינוי ייעוד. פרק שמוצג ללקוח כ"מה קורה כשמפשירים
 * קרקע" חייב להכיל רק את מה שבאמת עונה על זה — אחרת הרשימה נראית ארוכה ומלומדת
 * ורובה לא רלוונטי. `פיצוי` נשאר כשהוא צמוד להשבה או לשינוי ייעוד.
 */
const REZONING_RE =
  /שינוי\s*יי?עוד|הפשר|השבת\s*קרקע|רה[- ]?תכנון|קרקע\s*ששונה|פיצוי\s*(בגין|עבור|על)\s*(שינוי|השבה|הפקעה)/;

interface TreeNode {
  versionComponentId: number;
  label: string;
  children?: TreeNode[];
}

const stripTags = (s: unknown): string =>
  String(s ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** "<b>8.4.</b> השבת קרקע" → number "8.4", title "השבת קרקע" */
function splitLabel(label: string): { number: string | null; title: string } {
  const m = /^(\d+(?:\.\d+)*)\.?\s*(.*)$/.exec(label);
  return m ? { number: m[1], title: m[2].trim() || label } : { number: null, title: label };
}

async function getJson<T>(path: string, timeoutMs: number): Promise<T> {
  const res = await robustFetch(`${BASE}${path}`, { timeoutMs, retries: 1 });
  const text = await res.text();
  if (!res.ok) throw new Error(`רמ"י HTTP ${res.status}`);
  return JSON.parse(text) as T;
}

/** מטמון לכל חיי התהליך — הקובץ מתעדכן בתדירות של שבועות, לא של בקשות. */
let contentCache: { version: number; byNumber: Map<string, string> } | null = null;

/**
 * ⚠️ הנוסח **אינו** יושב על שורת הסעיף. שורת הסעיף (`t=6`) נושאת רק כותרת
 * ומספר, ו-`c` שלה ריק; הנוסח מפוזר על שורות ההמשך (`t>6`), אחת לכל סעיף
 * קטן, בסדר המסמך. נמדד על סעיף 8.14.5: שורת הכותרת ריקה ואחריה שבע שורות
 * "(א)"–"(ד)" ובהן הטקסט. לכן הצמדה לפי מזהה שורה מחזירה מחרוזת ריקה,
 * וההרכבה חייבת ללכת לפי **רצף** השורות.
 */
async function loadContent(version: number): Promise<Map<string, string>> {
  if (contentCache?.version === version) return contentCache.byNumber;
  const rows = await getJson<any[]>(`/assets/data/${version}/content.txt`, 30000);
  const byNumber = new Map<string, string>();

  const SECTION_ROW = 6;
  let current: string | null = null;
  let buffer: string[] = [];
  const flush = () => {
    if (current && buffer.length) byNumber.set(current, buffer.join('\n'));
    buffer = [];
  };

  for (const r of rows) {
    const t = Number(r?.t);
    if (t <= SECTION_ROW) {
      flush();
      // "8.14.5." → "8.14.5"
      const n = stripTags(r?.n).replace(/\.$/, '');
      current = t === SECTION_ROW && /^\d+(\.\d+)*$/.test(n) ? n : null;
      continue;
    }
    if (!current) continue;
    const body = stripTags(r?.c);
    if (!body) continue;
    const marker = stripTags(r?.n);
    buffer.push(marker ? `${marker} ${body}` : body);
  }
  flush();

  contentCache = { version, byNumber };
  return byNumber;
}

/**
 * מדיניות רמ"י לשינוי ייעוד של קרקע חקלאית — הסעיפים עצמם, מהגרסה התקפה.
 * `withText=false` מחזיר רק כותרות (זול); `true` מוסיף את נוסח הסעיף.
 */
export async function fetchAgriculturalRezoningPolicy(withText = true): Promise<RamiPolicy> {
  const warnings: string[] = [];

  const dates = await getJson<{ id: number; date: string }[]>('/assets/data/startDates.json', 15000);
  const latest = dates.reduce((a, b) => (b.id > a.id ? b : a), dates[0]);
  const version = latest.id;

  const tree = await getJson<TreeNode[]>(`/assets/data/${version}/tree.json`, 20000);

  // איתור פרק "קרקע חקלאית" וכל צאצאיו הרלוונטיים לשינוי ייעוד.
  const sections: RamiSection[] = [];
  const chapterRe = /קרקע\s*חקלאית/;

  const walk = (nodes: TreeNode[] | undefined, path: string[], insideChapter: boolean) => {
    for (const n of nodes ?? []) {
      const label = stripTags(n.label);
      const here = [...path, label];
      const isChapter = insideChapter || chapterRe.test(label);
      if (isChapter && !chapterRe.test(label) && REZONING_RE.test(label)) {
        const { number, title } = splitLabel(label);
        sections.push({ number, title, path: here.slice(0, -1).join(' › '), text: null });
      }
      walk(n.children, here, isChapter);
    }
  };
  walk(tree, [], false);

  if (sections.length === 0) {
    warnings.push('לא נמצאו סעיפים בפרק "קרקע חקלאית" שנוגעים לשינוי ייעוד — ייתכן שמבנה הקובץ השתנה.');
  }

  if (withText && sections.length) {
    try {
      const byNumber = await loadContent(version);
      for (const s of sections) {
        if (s.number) s.text = byNumber.get(s.number) ?? null;
      }
    } catch {
      warnings.push('נוסח הסעיפים של רמ"י לא נטען כרגע — מוצגים שמות הסעיפים והקישור למקור.');
    }
  }

  return {
    version,
    versionDate: latest.date ?? null,
    sections,
    url: RAMI_DECISIONS_URL,
    note: POLICY_NOTE,
    warnings,
  };
}
