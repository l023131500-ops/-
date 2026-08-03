'use client';

import type { StopWithLines } from '@/lib/gtfs';
import { distanceText } from '@/lib/report';

/**
 * לכל תחנה — אילו קווים באמת עוצרים בה, ולא רק שהיא קיימת.
 * המקור הוא ה-GTFS הרשמי דרך Stride; לכן הוודאות היא "אמת".
 */
export default function TransitLines({ stops }: { stops: StopWithLines[] }) {
  if (!stops.length) {
    return (
      <div className="mt-6 rounded-2xl border border-line bg-surface p-5 shadow-card">
        <h3 className="text-lg font-black text-navy">קווים בכל תחנה</h3>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          לא נמצאו תחנות עם קווים בטווח הליכה מהנקודה הזו.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-line bg-surface p-5 shadow-card">
      <h3 className="text-lg font-black text-navy">קווים בכל תחנה</h3>
      <p className="mt-1 text-[13px] text-muted">
        לכל תחנה בטווח הליכה — הקווים שעוצרים בה בפועל, לפי לוח הזמנים הרשמי.
      </p>

      <ul className="mt-4 space-y-4">
        {stops.map((s) => (
          <li key={s.id} className="border-t border-line/70 pt-3 first:border-0 first:pt-0">
            <div className="flex items-baseline justify-between gap-3">
              <div className="font-bold text-ink">
                {s.name}
                {s.code != null && (
                  <span className="mr-2 text-[11px] font-medium text-muted">
                    תחנה {s.code}
                  </span>
                )}
              </div>
              <div className="shrink-0 text-sm font-bold text-navy">
                {distanceText(s.meters)}
              </div>
            </div>

            {s.linesUnavailable ? (
              <p className="mt-1.5 text-[13px] text-muted">
                רשימת הקווים לתחנה הזו לא נטענה כרגע.
              </p>
            ) : s.lines.length === 0 ? (
              <p className="mt-1.5 text-[13px] text-muted">
                לא נמצאו קווים שעוצרים בתחנה הזו בחלון הנבדק.
              </p>
            ) : (
              <>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {s.lines.map((l) => (
                    <span
                      key={`${l.shortName}|${l.longName ?? ''}`}
                      title={[l.longName, l.operator].filter(Boolean).join(' · ')}
                      className="rounded-lg bg-navy/8 px-2.5 py-1 text-[13px] font-black text-navy"
                    >
                      {l.shortName}
                    </span>
                  ))}
                </div>
                <ul className="mt-2 space-y-0.5">
                  {s.lines.slice(0, 6).map((l) => (
                    <li
                      key={`d-${l.shortName}|${l.longName ?? ''}`}
                      className="text-[12px] leading-relaxed text-muted"
                    >
                      <b className="text-ink">קו {l.shortName}</b>
                      {l.longName ? ` · ${l.longName}` : ''}
                      {l.operator ? ` · ${l.operator}` : ''}
                    </li>
                  ))}
                  {s.lines.length > 6 && (
                    <li className="text-[12px] text-muted">
                      ועוד {s.lines.length - 6} קווים.
                    </li>
                  )}
                </ul>
              </>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-4 border-t border-line/70 pt-2 text-[11px] leading-relaxed text-muted">
        לפי לוחות הזמנים הרשמיים. המרחק הוא מרחק אווירי מהנכס.
      </p>
    </div>
  );
}
