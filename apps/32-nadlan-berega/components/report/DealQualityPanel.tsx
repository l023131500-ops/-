'use client';

import { useMemo, useState } from 'react';
import { hasValuation, type ValuationResult } from '@/lib/valuation';
import { dealQuality } from '@/lib/score';
import { CertaintyBadge } from './Bits';

const FLAG_STYLE: Record<'GO' | 'CAUTION' | 'NO_GO', string> = {
  GO: 'bg-[#1a9e6a]',
  CAUTION: 'bg-[#d99a1a]',
  NO_GO: 'bg-[#d6455b]',
};

const FLAG_LABEL: Record<'GO' | 'CAUTION' | 'NO_GO', string> = {
  GO: 'כדאי (GO)',
  CAUTION: 'בזהירות',
  NO_GO: 'לא מומלץ (NO-GO)',
};

/**
 * §2 · דו"ח איכות עסקה (PRODUCT_TIERS.md רמה 2 — פרימיום: "ציון GO/בזהירות/
 * NO-GO + השוואות").
 *
 * מחושב כולו בצד הלקוח מ-`valuation.comparables` — אותן עסקאות השוואה
 * בדיוק שכבר מוצגות בטבלת ההערכה מעל (`ValuationPanel`), ושכבר נשלחו ללקוח
 * כחלק מהדוח. אין קריאת רשת/מקור חדש — רק מחיר מבוקש, שהלקוח מזין כאן ולא
 * חלק מנתוני הנכס עצמו.
 */
export default function DealQualityPanel({ valuation }: { valuation: ValuationResult | null }) {
  const [ask, setAsk] = useState('');
  const [askApplied, setAskApplied] = useState('');
  const usable = valuation && hasValuation(valuation) && valuation.comparables.length > 0 ? valuation : null;

  // ⚠️ Hooks לעולם לא מותנים — מחושב תמיד, גם כש-`usable` הוא null (מחזיר
  // null מיד), כדי לא לשבור את סדר ה-hooks בין רינדורים שונים של אותו
  // קומפוננט (למשל דוח בלי מספיק עסקאות השוואה).
  const dq = useMemo(() => {
    if (!usable) return null;
    const price = askApplied ? Number(askApplied) : null;
    if (!price) return null;
    return dealQuality(usable.comparables, price, usable.areaSqm);
  }, [usable, askApplied]);

  if (!usable) return null;
  const valuationOk = usable;

  return (
    <section className="mt-6 rounded-2xl border border-line bg-surface p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-black text-navy">דו&quot;ח איכות עסקה</h2>
        <CertaintyBadge certainty="estimate" />
      </div>
      <p className="mt-1 text-[13px] text-muted">
        הזן את המחיר המבוקש לנכס — הציון נגזר מהשוואה מול {valuationOk.comparables.length} עסקאות
        ההשוואה שההערכה למעלה כבר נשענת עליהן.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3 print:hidden">
        <div>
          <label className="block text-[12px] font-bold text-muted">מחיר מבוקש (₪)</label>
          <input
            value={ask}
            onChange={(e) => setAsk(e.target.value.replace(/[^\d]/g, ''))}
            placeholder={`לדוגמה ${Math.round(valuationOk.mid)}`}
            className="mt-1 w-48 rounded-lg border border-line px-3 py-2 outline-none focus:border-teal"
          />
        </div>
        <button
          type="button"
          onClick={() => setAskApplied(ask)}
          disabled={!ask}
          className="rounded-lg bg-navysurface px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          חשב איכות עסקה
        </button>
      </div>

      {dq && dq.score !== null ? (
        <div className="mt-4 flex flex-wrap items-center gap-5">
          <div className={`rounded-2xl px-6 py-4 text-center text-white ${FLAG_STYLE[dq.flag!]}`}>
            <div className="text-4xl font-black">{dq.score}</div>
            <div className="text-xs opacity-90">{FLAG_LABEL[dq.flag!]}</div>
          </div>
          <div className="flex-1">
            <div className="text-[14px]">
              פער מול חציון עסקאות ההשוואה:{' '}
              <b className={dq.askVsMarketPct! <= 0 ? 'text-[#1a9e6a]' : 'text-[#d6455b]'}>
                {dq.askVsMarketPct! > 0 ? '+' : ''}
                {dq.askVsMarketPct}%
              </b>
            </div>
            <ul className="mt-1 list-inside list-disc text-[13.5px] text-muted">
              {dq.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        askApplied && (
          <div className="mt-4 rounded-lg bg-bgsoft p-4 text-[13.5px] text-muted">
            {dq?.reasons[0] ?? 'נדרשות עוד עסקאות השוואה לחישוב איכות עסקה.'}
          </div>
        )
      )}

      <p className="mt-3 text-[11.5px] leading-relaxed text-muted">
        הציון נגזר אך ורק מהמחיר שהזנת מול חציון עסקאות ההשוואה שנסגרו בפועל — אינו שמאות ואינו
        מביא בחשבון מצב פיזי, שיפוץ או זכויות נוספות.
      </p>
    </section>
  );
}
