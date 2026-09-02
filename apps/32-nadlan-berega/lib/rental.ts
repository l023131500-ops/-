// ==== נתוני שכירות באזור ====
// מקורות: נדל"ן.gov.il (עסקאות שכירות), Yadata (מדד שוק), מדד שכר דירה למ"ס.
// כאן: אומדן שכ"ד חודשי + טווח מתוך עסקאות שכירות (אם זמינות),
// ותשואה שנתית משוערת מול מחיר הנכס.

import type { Transaction } from './types';

export interface RentalEstimate {
  medianMonthly: number | null;
  low: number | null;
  high: number | null;
  perSqm: number | null;
  yieldPct: number | null; // תשואה שנתית משוערת
  sampleSize: number;
  matched: boolean;
}

// נגזר משכ"ד למ"ר * שטח, כשיש עסקאות שכירות; אחרת null (לא ממציאים).
export function estimateRental(
  rentDeals: { monthly: number | null; areaSqm: number | null }[],
  areaSqm: number | null,
  assetPrice: number | null,
): RentalEstimate {
  const perSqmVals = rentDeals
    .map((d) => (d.monthly && d.areaSqm ? d.monthly / d.areaSqm : null))
    .filter((v): v is number => v !== null && Number.isFinite(v));

  if (perSqmVals.length === 0) {
    return { medianMonthly: null, low: null, high: null, perSqm: null, yieldPct: null, sampleSize: 0, matched: false };
  }
  const sorted = [...perSqmVals].sort((a, b) => a - b);
  // ⚠️ במספר זוגי של פריטים יש לממוצע את שני האיברים באמצע, לא לקחת את
  // העליון מביניהם — אותה תקלה שכבר נמצאה ותוקנה ב-buildreport.ts (median()).
  const mid = Math.floor(sorted.length / 2);
  const medPerSqm =
    sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const lowPerSqm = sorted[Math.floor(sorted.length * 0.25)];
  const highPerSqm = sorted[Math.floor(sorted.length * 0.75)];

  const monthly = areaSqm ? Math.round(medPerSqm * areaSqm) : null;
  const low = areaSqm ? Math.round(lowPerSqm * areaSqm) : null;
  const high = areaSqm ? Math.round(highPerSqm * areaSqm) : null;
  const yieldPct =
    monthly && assetPrice && assetPrice > 0 ? Math.round(((monthly * 12) / assetPrice) * 1000) / 10 : null;

  return {
    medianMonthly: monthly,
    low,
    high,
    perSqm: Math.round(medPerSqm),
    yieldPct,
    sampleSize: perSqmVals.length,
    matched: true,
  };
}

// המרת עסקאות שכירות גולמיות (אם המקור מספק) לפורמט אחיד.
export function rentDealsFromRaw(txns: Transaction[]): { monthly: number | null; areaSqm: number | null }[] {
  return txns.map((t) => ({ monthly: t.price, areaSqm: t.areaSqm }));
}
