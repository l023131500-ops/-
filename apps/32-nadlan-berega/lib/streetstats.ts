// ==== שכבת "הרחוב" — לוגיקה טהורה, משותפת למסך/מייל/מצגת ====
//
// מחושבת פעם אחת כאן ונצרכת משלושה משטחים (`StreetPanel.tsx` למסך,
// `reporthtml.ts` למייל, `Presentation.tsx` למצגת/PDF) כדי שלא תיסחף — בדיוק
// כמו ש-`ComparablesTrend`/`buildValuationSlide` כבר עושים ל-valuation.
//
// אינה מושכת שום מקור חדש ואינה עולה אגורה: כל מה שכאן נגזר מהעסקאות
// שכבר נמשכו (`report.soldDeals`) ומהכותרת שכבר נבנתה (`report.title`).

import type { PropertyReport, SoldDeal } from './buildreport';

/**
 * השוואת שמות רחוב סלחנית ל-ה' הידיעה, לגרשיים ולרווחים כפולים.
 *
 * ⚠️ הסוגריים נחתכים לפני הכול. `title.streetDisplay` הוא תווית תצוגה ולא שם —
 * "הבעשט (מוכר גם כרחוב הבעל שם טוב)" — ומי שמשווה אותה מול שם הרחוב שבעסקה
 * לא מוצא כלום.
 */
function normStreet(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/\(.*?\)/g, '')
    .replace(/["'`״׳]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^ה/, '')
    .trim();
}

function quantile(sorted: number[], p: number): number {
  if (sorted.length === 1) return sorted[0];
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo));
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return quantile([...nums].sort((a, b) => a - b), 0.5);
}

export interface StreetHouseRow {
  houseNum: number;
  deals: number;
  homeSales: number;
  lastDate: string | null;
  medianPerSqm: number | null;
  isSubject: boolean;
}

export interface StreetStats {
  street: string;
  city: string | null;
  aliases: string[];
  subjectNum: number | null;
  onStreet: SoldDeal[];
  rows: StreetHouseRow[];
  perSqm: { median: number; p25: number; p75: number; count: number } | null;
  span: { from: string; to: string } | null;
  homeSales: number;
  suspect: number;
}

/** `null` = לנכס אין שם רחוב כלל (חיפוש לפי גוש/חלקה, או כתובת שלא נפתרה). */
export function computeStreetStats(report: PropertyReport): StreetStats | null {
  const street = report.title.streetDisplay || report.title.streetOfficial || null;
  if (!street) return null;

  const official = report.title.streetOfficial || report.title.streetDisplay || null;
  const aliases = report.title.streetAliases ?? [];
  const subjectNum =
    report.title.houseNumber != null ? Number(report.title.houseNumber) : null;

  const alias = new Set(
    [official, street, ...aliases].map(normStreet).filter(Boolean),
  );

  const onStreet = (report.soldDeals ?? []).filter((d: SoldDeal) =>
    alias.has(normStreet(d.streetName)),
  );

  if (onStreet.length === 0) {
    return {
      street,
      city: report.title.city ?? null,
      aliases,
      subjectNum,
      onStreet,
      rows: [],
      perSqm: null,
      span: null,
      homeSales: 0,
      suspect: 0,
    };
  }

  /**
   * ⚠️ רשומות חריגות נפסלות מכל חישוב מחיר — ראו הערה זהה ב-`StreetPanel.tsx`.
   */
  const clean = onStreet.filter((d) => !d.suspect);
  const perSqmValues = clean
    .filter((d) => d.isHomeSale && d.pricePerSqm && d.pricePerSqm > 0)
    .map((d) => d.pricePerSqm as number)
    .sort((a, b) => a - b);

  const dates = onStreet.map((d) => d.date).filter(Boolean).sort();

  const byNum = new Map<number, SoldDeal[]>();
  for (const d of clean) {
    if (d.houseNum == null) continue;
    const list = byNum.get(d.houseNum) ?? [];
    list.push(d);
    byNum.set(d.houseNum, list);
  }

  const rows: StreetHouseRow[] = [...byNum.entries()]
    .map(([houseNum, deals]) => ({
      houseNum,
      deals: deals.length,
      homeSales: deals.filter((d) => d.isHomeSale).length,
      lastDate:
        deals
          .map((d) => d.date)
          .filter(Boolean)
          .sort()
          .slice(-1)[0] ?? null,
      medianPerSqm: median(
        deals.filter((d) => d.isHomeSale && d.pricePerSqm).map((d) => d.pricePerSqm as number),
      ),
      isSubject: subjectNum != null && houseNum === subjectNum,
    }))
    .sort((a, b) => {
      if (subjectNum == null) return a.houseNum - b.houseNum;
      const da = Math.abs(a.houseNum - subjectNum);
      const db = Math.abs(b.houseNum - subjectNum);
      return da - db || a.houseNum - b.houseNum;
    });

  return {
    street,
    city: report.title.city ?? null,
    aliases,
    subjectNum,
    onStreet,
    rows,
    perSqm: perSqmValues.length
      ? {
          median: quantile(perSqmValues, 0.5),
          p25: quantile(perSqmValues, 0.25),
          p75: quantile(perSqmValues, 0.75),
          count: perSqmValues.length,
        }
      : null,
    span: dates.length ? { from: dates[0], to: dates[dates.length - 1] } : null,
    homeSales: onStreet.filter((d) => d.isHomeSale).length,
    suspect: onStreet.length - clean.length,
  };
}
