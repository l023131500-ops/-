// ==== עלות הפקה לכל דוח ====
// מחירון היחידות של הספקים. משמש גם לחישוב בפועל בזמן ההפקה וגם להצגה
// במרכז השליטה — כדי ששני המספרים לא ייפרדו זה מזה.
// מעודכן לפי מחירוני הספקים ולפי מה שנמדד בהרצה חיה (28/07/2026).

import type { ReportTier } from './report';

export const UNIT_USD = {
  /** Google Places — חיפוש מוסדות סביב נקודה. */
  placesSearch: 0.032,
  /** Google Distance Matrix — לכל יעד. */
  distanceElement: 0.005,
  /** Google Geocoding — לכל בקשה. */
  geocode: 0.005,
  /** Street View — תמונה. הבדיקה אם קיים צילום היא בחינם. */
  streetViewImage: 0.007,
  /** מפה סטטית. */
  staticMap: 0.002,
  /** Apify — לכל מודעה. */
  apifyYad2Item: 0.005,
  apifyMadlanItem: 0.002,
} as const;

export interface CostLine {
  label: string;
  detail: string;
  usd: number;
}

/**
 * פירוט העלות הצפויה לכל רמת דוח.
 * מקורות ממשלתיים (עסקאות, למ"ס, תכנון, בחירות, מרשם רחובות) הם בחינם
 * ולכן אינם מופיעים כאן.
 */
export function costBreakdown(tier: ReportTier, apifyMaxItems = 20): CostLine[] {
  const lines: CostLine[] = [
    {
      label: 'איתור מוסדות ותחנות',
      detail: '3 חיפושים — חינוך, שירותים יומיומיים, תחבורה',
      usd: 3 * UNIT_USD.placesSearch,
    },
  ];

  if (tier === 'basic') {
    lines.push({
      label: 'זמני הליכה',
      detail: '3 יעדים קרובים',
      usd: 3 * UNIT_USD.distanceElement,
    });
  } else {
    lines.push({
      label: 'זמני הליכה',
      detail: '14 יעדים — חינוך, תחבורה ושירותים',
      usd: 14 * UNIT_USD.distanceElement,
    });
  }

  lines.push({
    label: 'איתור הכתובת',
    detail: 'תרגום הכתובת לנקודה על המפה',
    usd: 2 * UNIT_USD.geocode,
  });

  lines.push({
    label: 'איתור הקלפי לאפיון אוכלוסייה',
    detail: 'עד 12 כתובות קלפי — נשמר במטמון ומשותף לכל הדוחות באותו יישוב',
    usd: 12 * UNIT_USD.geocode,
  });

  if (tier !== 'basic') {
    lines.push({
      label: 'דירות מוצעות כרגע — מדלן',
      detail: `עד ${apifyMaxItems} מודעות`,
      usd: apifyMaxItems * UNIT_USD.apifyMadlanItem,
    });
    lines.push({
      label: 'דירות מוצעות כרגע — יד2',
      detail: `עד ${apifyMaxItems} מודעות`,
      usd: apifyMaxItems * UNIT_USD.apifyYad2Item,
    });
  }

  if (tier === 'vip') {
    lines.push({
      label: 'צילום הבניין ומפה אזורית',
      detail: 'תמונת Street View + מפה סטטית',
      usd: UNIT_USD.streetViewImage + UNIT_USD.staticMap,
    });
    lines.push({
      label: 'סיור רחוב',
      detail: 'עד 5 תמונות Street View נוספות לאורך הרחוב (בפועל רק כשיש כיסוי)',
      usd: 5 * UNIT_USD.streetViewImage,
    });
  }

  return lines;
}

export function totalCost(lines: CostLine[]): number {
  return Math.round(lines.reduce((s, l) => s + l.usd, 0) * 10000) / 10000;
}
