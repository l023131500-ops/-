'use client';

import { useState } from 'react';
import { hasValuation, type ValuationResult } from '@/lib/valuation';
import { CertaintyBadge } from './Bits';

/**
 * §2 · הערכת שווי.
 *
 * ⚠️ שני דברים שהפאנל הזה מחויב להם, ושבגללם הוא נראה כפי שהוא נראה:
 * 1. **המספר לעולם אינו מוצג לבד.** לצידו החלון שממנו נלקח, מספר העסקאות,
 *    ותאריך העדכנית שבהן. מספר בלי הקשר הוא בדיוק מה שהופך דוח לחשוד.
 * 2. **כשאין די נתונים — אין מספר.** מוצג משפט שמסביר למה, ולא טווח שנשען
 *    על שתי עסקאות ישנות.
 */
export default function ValuationPanel({ valuation }: { valuation: ValuationResult | null }) {
  const [open, setOpen] = useState(false);
  if (!valuation) return null;

  if (!hasValuation(valuation)) {
    const reg = valuation.regional;
    return (
      <section className="mt-6 rounded-2xl border border-line bg-surface p-5 shadow-card">
        <h2 className="text-lg font-black text-navy">הערכת שווי</h2>
        <p className="mt-2 text-[14.5px] leading-relaxed text-ink">{valuation.notEnoughData}</p>
        {reg && (
          <div className="mt-4 rounded-xl border border-line bg-bgsoft p-4">
            <div className="text-[12px] text-muted">מחיר למ״ר באזור, עדכני</div>
            <div className="mt-0.5 text-[24px] font-black text-tealD">
              {new Intl.NumberFormat('he-IL').format(reg.medianPerSqm)} ₪ למ״ר
            </div>
            <div className="mt-1 text-[12.5px] leading-relaxed text-muted">
              חציון של {reg.count} עסקאות בסביבה הקרובה, {reg.windowLabel}
              {reg.latestDate
                ? `. העדכנית שבהן מ-${new Date(reg.latestDate).toLocaleDateString('he-IL')}`
                : ''}
              . מקור: מרשם העסקאות של רשות המסים.
            </div>
          </div>
        )}
      </section>
    );
  }

  const v = valuation;
  const ils = (n: number) => new Intl.NumberFormat('he-IL').format(n);

  return (
    <section className="mt-6 rounded-2xl border-2 border-teal/40 bg-teal/[0.04] p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-navy">הערכת שווי</h2>
          <p className="mt-0.5 text-[13px] text-muted">
            {v.basis.label} · {v.basis.count} עסקאות · {v.basis.windowLabel}
          </p>
        </div>
        <CertaintyBadge certainty="estimate" />
      </div>

      <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[28px] font-black leading-none text-tealD sm:text-[34px]">
          {ils(v.low)} – {ils(v.high)} ₪
        </span>
        <span className="text-[14px] text-muted">אמצע הטווח: {ils(v.mid)} ₪</span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Cell label="מחיר למ״ר בהשוואה" value={`${ils(v.medianPerSqm)} ₪`} />
        <Cell label="שטח שעליו חושב" value={`${ils(v.areaSqm)} מ״ר`} note={v.areaSource} />
        <Cell
          label="העסקה העדכנית שנכללה"
          value={v.basis.latestDate ? new Date(v.basis.latestDate).toLocaleDateString('he-IL') : '—'}
        />
      </div>

      <p className="mt-4 text-[13.5px] leading-relaxed text-ink">{v.explanation}</p>

      {v.wideSpread && (
        <p className="mt-3 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-[13px] leading-relaxed text-[#7a5f1f]">
          {v.wideSpread}
        </p>
      )}

      {v.comparables.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setOpen((x) => !x)}
            aria-expanded={open}
            className="inline-block rounded-lg border border-line bg-surface px-4 py-2 text-[13px] font-bold text-tealD hover:border-teal"
          >
            {open ? 'הסתר את העסקאות שההערכה נשענת עליהן' : `הצג את ${v.comparables.length} העסקאות שההערכה נשענת עליהן`}
          </button>

          {open && (
            <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-surface">
              <table className="w-full min-w-[760px] text-right text-[13px]">
                <thead>
                  <tr className="border-b border-line bg-bgsoft text-[12px] text-muted">
                    <th className="px-3 py-2 font-semibold">תאריך</th>
                    <th className="px-3 py-2 font-semibold">כתובת</th>
                    <th className="px-3 py-2 font-semibold">גוש/חלקה</th>
                    <th className="px-3 py-2 font-semibold">קומה</th>
                    <th className="px-3 py-2 font-semibold">שטח</th>
                    <th className="px-3 py-2 font-semibold">חדרים</th>
                    <th className="px-3 py-2 font-semibold">קרבה לנכס</th>
                    <th className="px-3 py-2 font-semibold">מחיר</th>
                    <th className="px-3 py-2 font-semibold">₪ למ״ר</th>
                  </tr>
                </thead>
                <tbody>
                  {v.comparables.map((d, i) => (
                    <tr key={i} className="border-b border-line/60 last:border-0">
                      <td className="whitespace-nowrap px-3 py-2">
                        {new Date(d.date).toLocaleDateString('he-IL')}
                      </td>
                      <td className="px-3 py-2 text-ink">{d.address ?? '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-muted">{d.parcelLabel ?? '—'}</td>
                      <td className="px-3 py-2">{d.floor ?? '—'}</td>
                      <td className="px-3 py-2">{d.areaSqm ?? '—'}</td>
                      <td className="px-3 py-2">{d.rooms ?? '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-muted">{d.proximityLabel}</td>
                      <td className="whitespace-nowrap px-3 py-2">{d.price ? ils(d.price) : '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-bold text-navy">
                        {d.pricePerSqm ? ils(d.pricePerSqm) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <p className="mt-3 text-[11.5px] leading-relaxed text-muted">
        ההערכה נגזרת ממחירים שנסגרו בפועל ונרשמו במרשם העסקאות של רשות המסים. היא אינה שמאות,
        אינה מחיר של הנכס הזה, ואינה מביאה בחשבון מצב פיזי, שיפוץ, כיווני אוויר או זכויות נוספות.
      </p>
    </section>
  );
}

function Cell({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <div className="text-[12px] text-muted">{label}</div>
      <div className="mt-0.5 text-[16px] font-black text-navy">{value}</div>
      {note && <div className="mt-0.5 text-[11px] leading-relaxed text-muted">{note}</div>}
    </div>
  );
}
