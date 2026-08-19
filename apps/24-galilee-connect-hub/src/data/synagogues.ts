// Background presets for synagogue pages
export const BACKGROUND_PRESETS = [
  { id: 1, name: 'כחול קלאסי', gradient: 'linear-gradient(135deg, hsl(200 50% 18%), hsl(210 45% 25%))' },
  { id: 2, name: 'תכלת וזהב', gradient: 'linear-gradient(135deg, hsl(200 60% 22%), hsl(40 70% 48%))' },
  { id: 3, name: 'ירקרק עמוק', gradient: 'linear-gradient(135deg, hsl(180 40% 18%), hsl(170 50% 30%))' },
  { id: 4, name: 'סגול מלכותי', gradient: 'linear-gradient(135deg, hsl(260 40% 22%), hsl(280 45% 35%))' },
  { id: 5, name: 'חום חם', gradient: 'linear-gradient(135deg, hsl(25 40% 20%), hsl(35 50% 30%))' },
];

// Zmanim are computed, not stored.
//
// There used to be a hardcoded `dailyZmanim` array here — eleven fixed times
// commented "(approximate)" and shown to the town under the heading
// "זמני היום". Fixed times cannot be today's times: against the real sun on
// 6 Aug 2026 that table had sunrise 20 minutes late, sunset 29 minutes early
// and צאת הכוכבים 36 minutes early, and it said the same thing in December.
//
// It now comes from @hebcal/core with Chatzor's coordinates — the same engine
// and the same numbers as apps/16-chatzor-connect, so the two sites for this
// town cannot disagree. See lib/zmanim.ts.
export { getDailyZmanim } from '@/lib/zmanim';
export type { DailyZman } from '@/lib/zmanim';
