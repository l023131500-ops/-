'use client';

import { useState } from 'react';
import type { NearbyPlan } from '@/lib/nearbyplans';
import type { ReportTier } from '@/lib/report';
import { distanceText } from '@/lib/report';

/**
 * §12 · "אתרי בנייה ותכנון באזור הנכס" (NADLAN_SPEC_V2 §12).
 *
 * מוצג רק בדוח פרימיום ו-VIP, מאחורי כפתור "מה נבנה באזור?" — כמו הכפתור
 * הקיים ב-FeasibilityPanel. `plans` הוא `null` ברמה חינמית (השכבה לא נשאלת
 * כלל, ראה buildreport.ts §12), ולכן אין צורך לבדוק את הרמה שוב כאן חוץ
 * מלמנוע פתיחה של כפתור ריק ברמה שלא מציגה את הסעיף.
 *
 * המיקום המדויק של כל תוכנית כבר מסומן על המפה האינטראקטיבית (ריבועים
 * זהובים, InteractiveMap.tsx) — הפאנל הזה הוא הרשימה המלאה מאחורי הכפתור,
 * עם הפרטים שהמפרט דורש: מספר/שם תוכנית, סטטוס, ומרחק.
 */
export default function NearbyPlansPanel({
  plans,
  tier,
}: {
  plans: NearbyPlan[] | null;
  tier: ReportTier;
}) {
  const [open, setOpen] = useState(false);
  if (tier === 'basic') return null;

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`w-full rounded-2xl border-2 px-5 py-4 text-right transition ${
          open
            ? 'border-teal bg-teal/[0.07] shadow-card'
            : 'border-teal/60 bg-surface hover:border-teal hover:shadow-card'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-[17px] font-black text-navy">מה נבנה באזור?</span>
          <span className="shrink-0 text-[13px] font-bold text-tealD">
            {open ? 'סגור ▲' : 'פתח ▼'}
          </span>
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">
          תוכניות בנייה ותכנון מאושרות ברדיוס 400 מ&apos; מהנכס, עם מיקום מדויק וסטטוס.
        </p>
      </button>

      {open && (
        <div className="mt-3 rounded-2xl border border-line bg-surface p-5 shadow-card">
          {plans === null && (
            <p className="text-[14px] leading-relaxed text-muted">
              לא זמין — לא הצלחנו לשלוף את שכבת התוכניות עבור הנכס הזה כרגע.
            </p>
          )}

          {plans !== null && plans.length === 0 && (
            <p className="text-[14px] leading-relaxed text-muted">
              לא אותרו תוכניות בנייה מאושרות ברדיוס 400 מ&apos; מהנכס במרשם התכנון.
            </p>
          )}

          {plans !== null && plans.length > 0 && (
            <div className="space-y-2">
              {plans.map((p, i) => (
                <div
                  key={`${p.planNumber ?? 'ללא-מספר'}-${i}`}
                  className="flex items-baseline justify-between gap-3 rounded-xl border border-line bg-bgsoft p-3"
                >
                  <div>
                    <div className="text-[14px] font-bold text-navy">
                      {p.planNumber ?? 'תוכנית ללא מספר'}
                      {p.planName && <span className="mr-2 font-semibold text-ink">{p.planName}</span>}
                    </div>
                    {p.status && (
                      <p className="mt-1 text-[13px] leading-relaxed text-muted">מצב: {p.status}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-left text-sm font-bold text-navy">
                    {distanceText(p.distanceM)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
