'use client';

import type { Place } from '@/lib/googlemaps';
import type { ReportTier } from '@/lib/report';
import { distanceText, walkText } from '@/lib/report';

export default function PlacesPanel({
  groups,
  tier,
}: {
  groups: { title: string; places: Place[]; showEmpty?: boolean }[];
  tier: ReportTier;
}) {
  // ⚠️ בדוח מקיף ו-VIP מוצגת **כל** הרשימה. המפרט מחייב "את כולם", וחיתוך
  // ל-12 הציג 12 מתוך 60 בתי כנסת בלי שהלקוח יידע שהרשימה נחתכה.
  const limit = tier === 'basic' ? 3 : Number.POSITIVE_INFINITY;

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      {groups.filter((g) => g.places.length > 0 || g.showEmpty).map((g) => (
        <div key={g.title} className="rounded-2xl border border-line bg-surface p-5 shadow-card">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-lg font-black text-navy">{g.title}</h3>
            {g.places.length > 0 && (
              <span className="shrink-0 text-[12px] font-bold text-muted">
                {g.places.length} בסביבה
              </span>
            )}
          </div>

          {g.places.length === 0 ? (
            <p className="mt-2 text-[14px] leading-relaxed text-muted">
              לא נמצאו תוצאות בסביבה הקרובה.
            </p>
          ) : (
            <>
              <ul className="mt-3 max-h-[420px] divide-y divide-line/70 overflow-y-auto print:max-h-none print:overflow-visible">
                {g.places.slice(0, limit).map((p, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3 py-2.5">
                    <div>
                      <div className="font-semibold text-ink">{p.name}</div>
                      <div className="text-[12px] text-muted">{p.kind}</div>
                    </div>
                    <div className="shrink-0 text-left">
                      <div className="text-sm font-bold text-navy">
                        {distanceText(p.straightMeters)}
                      </div>
                      {p.walkSeconds != null && (
                        <div className="text-[11px] text-muted">
                          {walkText(p.walkSeconds)} הליכה
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              {g.places.length > limit && (
                <p className="mt-2 text-[12px] text-muted">
                  יש עוד {g.places.length - limit} תוצאות — הן נפתחות בדוח המקיף.
                </p>
              )}
            </>
          )}

          <p className="mt-3 border-t border-line/70 pt-2 text-[11px] leading-relaxed text-muted">
            המרחק הוא מרחק אווירי מהנכס. זמן ההליכה מחושב לפי מסלול הליכה אמיתי.
          </p>
        </div>
      ))}
    </div>
  );
}
