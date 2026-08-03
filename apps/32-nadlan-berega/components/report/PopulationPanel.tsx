'use client';

import type { PopulationProfile } from '@/lib/elections';
import { CertaintyBadge } from './Bits';

const BAR_COLOR: Record<string, string> = {
  'חילוני וכללי': 'bg-teal',
  חרדי: 'bg-navysurface',
  'דתי-לאומי': 'bg-gold',
  ערבי: 'bg-indigo',
};

export default function PopulationPanel({ population }: { population: PopulationProfile | null }) {
  if (!population) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
        <h2 className="text-lg font-black text-navy">מי גר באזור</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          לא הצלחנו לאפיין את האוכלוסייה באזור הזה ברמת פירוט מספקת.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg font-black text-navy">מי גר באזור</h2>
        {/* פילוח מגזרי הוא תמיד הערכה — לא "מקורב" ובוודאי לא "אמת". */}
        <CertaintyBadge certainty="estimate" small />
      </div>

      <p className="mt-2 text-[15px] font-bold text-ink">{population.headline}</p>

      <div className="mt-3 space-y-2">
        {population.breakdown.map((b) => (
          <div key={b.group}>
            <div className="flex items-baseline justify-between text-[12px]">
              <span className="font-semibold text-ink">{b.label}</span>
              <span className="font-bold text-navy">{b.pct}%</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${BAR_COLOR[b.label] ?? 'bg-slate-400'}`}
                style={{ width: `${Math.min(b.pct, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/*
        ⚠️ "אחוז ההצבעה" הוצג כאן בעבר. הוא נמחק במכוון: הדרישה היא להציג
        אחוזי מגזרים בלבד ולא לחשוף על מה האפיון מבוסס, ושורת אחוז הצבעה
        חושפת זאת מיידית. הערך עדיין נאסף פנימית, אך אינו מוצג ללקוח.
      */}

      <p className="mt-3 border-t border-line/70 pt-2 text-[11px] leading-relaxed text-muted">
        {population.basis}
      </p>
    </div>
  );
}
