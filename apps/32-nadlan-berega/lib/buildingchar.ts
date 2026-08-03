// ==== אופי הבנייה באזור ====
//
// אין מאגר ציבורי שמתאר "וילות" או "שיכונים" לפי כתובת. מה שכן קיים הוא
// **סוג הנכס בכל עסקה** שנרשמה באזור (`dealNatureDescription`), וממנו אפשר
// לגזור את אופי הבנייה בפועל — לא לפי התרשמות אלא לפי מה שבאמת נמכר שם.
//
// נבדק חי על שלוש נקודות עם אופי שונה במובהק:
//   דיזנגוף 100 ת"א  — 352 "דירה בבית קומות"  → בנייה רוויה
//   סביון            —  22 "קוטג' חד משפחתי" + "בית בודד" → צמודי קרקע
//   קריית אונו       — 804 "דירה בבית קומות"  → בנייה רוויה
//
// ⚠️ הוודאות היא "מקורב" ולא "אמת": זהו תיאור של הסביבה הנגזר מהעסקאות
// שנרשמו בה, ולא סקר מבנים ולא נתון על הבניין המסוים.

import type { Transaction } from './types';

export type BuildKind = 'ravuya' | 'tzmudei_karka' | 'du_mishpachti' | 'bne_beitcha';

const KIND_LABEL: Record<BuildKind, string> = {
  ravuya: 'בנייה רוויה — בתים משותפים',
  tzmudei_karka: 'צמודי קרקע — וילות ובתים פרטיים',
  du_mishpachti: 'דו-משפחתי',
  bne_beitcha: 'מגרשים לבנייה עצמית',
};

/**
 * סיווג סוג הנכס שבעסקה.
 * מחזיר null לכל מה שאינו מגורים — חנות, משרד, מחסן. הכללתם הייתה מעוותת
 * את התמונה ברחובות מסחריים, שבהם חלק ניכר מהעסקאות אינו דירות כלל.
 */
export function classifyDealType(raw: string | null | undefined): BuildKind | null {
  const s = (raw ?? '').trim();
  if (!s) return null;

  // הסדר חשוב: "דו משפחתי" מכיל "משפחתי" שמופיע גם ב"קוטג' חד משפחתי".
  if (/דו\s*[-]?\s*משפחתי/.test(s)) return 'du_mishpachti';
  if (/קוטג|בית\s*בודד|וילה|חד\s*משפחתי/.test(s)) return 'tzmudei_karka';
  if (/קרקע\s*למגורים|מגרש/.test(s)) return 'bne_beitcha';
  if (/דירה|בית\s*קומות|דירת\s*גן|פנטהאוז|דופלקס/.test(s)) return 'ravuya';

  return null; // חנות, משרד, מחסנים, בנין, קומבינציה, קרקע חקלאית...
}

/** מה נבדק בפועל — דירה בתוך בניין, או בית שהנכס הוא כולו. */
export type PropertyKind = 'apartment' | 'house' | 'unknown';

export interface PropertyKindResult {
  kind: PropertyKind;
  /** על מה ההכרעה נשענת, בעברית מדוברת. */
  reason: string;
}

/**
 * בית פרטי מול דירה — נקבע לפי סוגי הנכסים שנמכרו **בחלקה עצמה**, לא באזור.
 *
 * ⚠️ בכוונה לפי החלקה ולא לפי הסביבה: בשכונת וילות עם בניין אחד, סיווג לפי
 * הסביבה היה הופך את הדירה בבניין ל"בית פרטי". רוב פשוט בתוך החלקה מספיק —
 * חלקה של בית פרטי כמעט לעולם אינה מכילה גם דירות.
 */
export function detectPropertyKind(parcelTxns: Transaction[]): PropertyKindResult {
  let house = 0;
  let apartment = 0;

  for (const t of parcelTxns) {
    const k = classifyDealType(t.dealType);
    if (k === 'tzmudei_karka' || k === 'du_mishpachti') house++;
    else if (k === 'ravuya') apartment++;
  }

  if (house === 0 && apartment === 0) {
    return {
      kind: 'unknown',
      reason: 'לא נרשמו בחלקה הזו עסקאות שמאפשרות לזהות אם מדובר בבית פרטי או בדירה.',
    };
  }
  if (house > apartment) {
    return {
      kind: 'house',
      reason: `בחלקה נרשמו ${house} עסקאות של בית צמוד קרקע, ולכן הדוח מתייחס לבית כולו ולא לדירה בודדת.`,
    };
  }
  return {
    kind: 'apartment',
    reason: `בחלקה נרשמו ${apartment} עסקאות של דירות בבית משותף, ולכן הדוח מתייחס לדירה בתוך הבניין.`,
  };
}

export interface BuildingCharacter {
  /** משפט מדובר: "בנייה רוויה ברובה המכריע". */
  headline: string;
  breakdown: { kind: BuildKind; label: string; pct: number; count: number }[];
  /** כמה עסקאות מגורים נכללו בחישוב. */
  sampleSize: number;
}

/**
 * ⚠️ מדגם קטן מדי אינו מאפיין דבר. מתחת לסף — לא מוחזר כלום, ולא מוצג
 * אחוז שנשען על שלוש עסקאות.
 */
const MIN_SAMPLE = 8;

export function buildingCharacter(txns: Transaction[]): BuildingCharacter | null {
  const counts = new Map<BuildKind, number>();
  let total = 0;

  for (const t of txns) {
    const kind = classifyDealType(t.dealType);
    if (!kind) continue;
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
    total++;
  }

  if (total < MIN_SAMPLE) return null;

  const breakdown = Array.from(counts.entries())
    .map(([kind, count]) => ({
      kind,
      label: KIND_LABEL[kind],
      count,
      pct: Math.round((count / total) * 1000) / 10,
    }))
    .sort((a, b) => b.pct - a.pct);

  const top = breakdown[0];
  const second = breakdown[1];
  let headline: string;
  if (top.pct >= 85) headline = `${top.label} — כמעט בלעדית`;
  else if (top.pct >= 60) headline = `${top.label} — האופי הדומיננטי`;
  else if (second) headline = `אזור מעורב — ${top.label} לצד ${second.label}`;
  else headline = top.label;

  return { headline, breakdown, sampleSize: total };
}
