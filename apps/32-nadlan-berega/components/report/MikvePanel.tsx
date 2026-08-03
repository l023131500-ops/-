'use client';

import type { Mikve } from '@/lib/mikve';
import { distanceText } from '@/lib/report';
import { CertaintyBadge } from './Bits';

/**
 * מקוואות — מקור ממשלתי, ולכן פאנל נפרד מ-Google Places.
 * מוצגות שעות הפעילות והנגישות, שהן מידע שירות שאין לו תחליף במפות.
 */
export default function MikvePanel({ mikvaot }: { mikvaot: Mikve[] }) {
  if (!mikvaot.length) return null;

  return (
    <div className="mt-6 rounded-2xl border border-line bg-white p-5 shadow-card">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-lg font-black text-navy">מקוואות</h3>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold text-muted">{mikvaot.length} ביישוב</span>
          <CertaintyBadge certainty="verified" small />
        </div>
      </div>

      <ul className="mt-3 divide-y divide-line/70">
        {mikvaot.map((m, i) => (
          <li key={i} className="py-3">
            <div className="flex items-baseline justify-between gap-3">
              <div className="font-semibold text-ink">{m.name}</div>
              <div className="shrink-0 text-sm font-bold text-navy">
                {m.meters != null ? distanceText(m.meters) : '—'}
              </div>
            </div>
            {m.address && <div className="text-[12px] text-muted">{m.address}</div>}
            <div className="mt-1 flex flex-wrap gap-1.5">
              {m.forWomen && <Tag>לנשים</Tag>}
              {m.forMen && <Tag>לגברים</Tag>}
              {m.forDishes && <Tag>לכלים</Tag>}
              {m.brideRoom && <Tag>חדר כלה</Tag>}
              {m.accessibility && <Tag>נגישות: {m.accessibility}</Tag>}
            </div>
            {(m.hoursSummer || m.hoursWinter || m.hoursShabbat) && (
              <div className="mt-1.5 space-y-0.5 text-[12px] leading-relaxed text-muted">
                {m.hoursSummer && <div>קיץ: {m.hoursSummer}</div>}
                {m.hoursWinter && <div>חורף: {m.hoursWinter}</div>}
                {m.hoursShabbat && <div>שבת: {m.hoursShabbat}</div>}
              </div>
            )}
            {m.phone && <div className="mt-1 text-[12px] text-muted">טלפון: {m.phone}</div>}
            {m.meters == null && (
              <div className="mt-1 text-[11px] text-muted">
                המרחק לא נקבע — הכתובת שבמאגר לא אותרה על המפה.
              </div>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-3 border-t border-line/70 pt-2 text-[11px] leading-relaxed text-muted">
        מהמאגר הממשלתי של מקוואות הטהרה. המאגר אינו כולל קואורדינטות, ולכן המרחק
        מחושב מהכתובת הרשומה בו.
      </p>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-ink">
      {children}
    </span>
  );
}
