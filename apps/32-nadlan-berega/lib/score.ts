// ==== מנוע ציונים ====
// ציון הזדמנות + ציון איכות עסקה + ציון ביטחון — כולם נגזרים אך ורק מנתונים אמיתיים.
// אם אין מספיק נתונים — הציון null (לא ממציאים).

import type { PropertyProfile } from './types';
import { pricePerSqm } from './format';

export interface DealQuality {
  score: number | null; // 0..100
  flag: 'GO' | 'CAUTION' | 'NO_GO' | null;
  askVsMarketPct: number | null; // פער מחיר מבוקש מול חציון שוק
  reasons: string[];
  confidence: 'high' | 'medium' | 'low';
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const s = [...nums].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

// ציון הזדמנות כללי (0..100): מבוסס נפח עסקאות, מגמת מחיר, ופוטנציאל השבחה.
export function opportunityScore(profile: PropertyProfile, renewalBonus: number): number | null {
  const priced = profile.transactions.filter((t) => t.price && t.areaSqm);
  if (priced.length === 0 && !renewalBonus) return null;

  let score = 50;
  // נפח נתונים -> ביטחון גבוה יותר בהזדמנות
  score += Math.min(priced.length, 20);

  // מגמת מחיר: השוואת רבעון ראשון מול אחרון של מחיר למ"ר
  const pps = priced
    .map((t) => pricePerSqm(t.price, t.areaSqm))
    .filter((v): v is number => v !== null);
  if (pps.length >= 4) {
    const firstHalf = median(pps.slice(0, Math.floor(pps.length / 2))) ?? 0;
    const secondHalf = median(pps.slice(Math.floor(pps.length / 2))) ?? 0;
    if (firstHalf > 0) {
      const trend = (secondHalf - firstHalf) / firstHalf;
      score += Math.round(trend * 30); // מגמת עלייה מגדילה הזדמנות
    }
  }
  score += renewalBonus; // בונוס פוטנציאל השבחה
  return Math.max(0, Math.min(100, Math.round(score)));
}

// ציון איכות עסקה מול מחיר מבוקש.
export function dealQuality(
  profile: PropertyProfile,
  askingPrice: number | null,
  askingArea: number | null,
): DealQuality {
  const priced = profile.transactions.filter((t) => t.price && t.areaSqm);
  const pps = priced
    .map((t) => pricePerSqm(t.price, t.areaSqm))
    .filter((v): v is number => v !== null);
  const marketPpsqm = median(pps);
  const reasons: string[] = [];
  const confidence: DealQuality['confidence'] =
    pps.length >= 8 ? 'high' : pps.length >= 3 ? 'medium' : 'low';

  if (!askingPrice || !askingArea || !marketPpsqm) {
    return {
      score: null,
      flag: null,
      askVsMarketPct: null,
      reasons: ['נדרש מחיר מבוקש + שטח + עסקאות השוואה לחישוב איכות עסקה.'],
      confidence,
    };
  }

  const askPpsqm = askingPrice / askingArea;
  const diffPct = Math.round(((askPpsqm - marketPpsqm) / marketPpsqm) * 1000) / 10;

  let score = 70 - diffPct * 1.5; // מתחת לשוק = ציון גבוה יותר
  score = Math.max(0, Math.min(100, Math.round(score)));

  if (diffPct <= -5) reasons.push(`מחיר מבוקש נמוך ב-${Math.abs(diffPct)}% מחציון השוק — הזדמנות.`);
  else if (diffPct >= 8) reasons.push(`מחיר מבוקש גבוה ב-${diffPct}% מחציון השוק — יקר יחסית.`);
  else reasons.push(`מחיר מבוקש קרוב לשוק (${diffPct > 0 ? '+' : ''}${diffPct}%).`);

  const flag: DealQuality['flag'] = score >= 65 ? 'GO' : score >= 45 ? 'CAUTION' : 'NO_GO';
  return { score, flag, askVsMarketPct: diffPct, reasons, confidence };
}
