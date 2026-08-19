'use client';

import { CERTAINTY_EXPLAIN, CERTAINTY_LABEL, formatFactValue } from '@/lib/report';
import type { Certainty, Fact } from '@/lib/report';

const CERT_STYLE: Record<Certainty, string> = {
  verified: 'bg-teal/10 text-tealD border-teal/30',
  approx: 'bg-gold/15 text-[#8a6d24] border-gold/40',
  estimate: 'bg-slate-100 text-slate-600 border-slate-300',
};

/** תג הוודאות — אמת / מקורב / הערכה. מופיע ליד כל נתון. */
export function CertaintyBadge({ certainty, small = false }: { certainty: Certainty; small?: boolean }) {
  return (
    <span
      title={CERTAINTY_EXPLAIN[certainty]}
      className={`inline-flex shrink-0 cursor-help items-center rounded-full border font-bold ${
        CERT_STYLE[certainty]
      } ${small ? 'px-1.5 py-0 text-[10px]' : 'px-2 py-0.5 text-[11px]'}`}
    >
      {CERTAINTY_LABEL[certainty]}
    </span>
  );
}

// ⚠️ שורת המקור הוסרה מהדוח ללקוח במכוון. הלקוח מקבל מידע נקי; זהות המקור
// של כל נתון נשמרת בלוג הפנימי (`lib/sourcelog.ts`, נכתב בכל הפקת דוח)
// ובמרכז השליטה. `asOf` עדיין נשמר בנתון ומשמש להצגת תאריך עדכון היכן
// שהתאריך עצמו הוא מידע ללקוח.

/** תאריך העדכון של הנתון — בלי לומר מאיפה הוא הגיע. */
function AsOfLine({ fact }: { fact: Fact }) {
  const date = fact.asOf ? new Date(fact.asOf) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return (
    <div className="mt-2 text-[11px] leading-relaxed text-muted">
      נכון ל-{date.toLocaleDateString('he-IL')}
    </div>
  );
}

// עיצוב הערך משותף למסך, למייל, ל-PDF ולמצגת — כדי שלא ייווצר שוב מצב שבו
// שנה מוצגת כ"2,023" בערוץ אחד ונכון באחר.
const formatValue = formatFactValue;

/** כרטיס נתון בודד. נתון חסר מציג את הסיבה, לא מקף. */
export function FactCard({ fact }: { fact: Fact }) {
  const has = fact.value !== null;

  return (
    <div
      className={`rounded-xl border bg-surface p-4 shadow-card ${
        fact.highlight && has ? 'border-teal/50 ring-1 ring-teal/20' : 'border-line'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-[12px] font-semibold text-muted">{fact.label}</div>
        {has && <CertaintyBadge certainty={fact.certainty} small />}
      </div>

      {has ? (
        <>
          <div
            className={`mt-1.5 font-extrabold leading-tight text-navy ${
              fact.highlight ? 'text-2xl' : 'text-lg'
            }`}
          >
            {formatValue(fact)}
          </div>
          {fact.sourceNote && (
            <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{fact.sourceNote}</p>
          )}
          <AsOfLine fact={fact} />
        </>
      ) : (
        <>
          <div className="mt-1.5 text-lg font-extrabold leading-tight text-slate-400">
            לא זמין
          </div>
          <div className="mt-1.5 rounded-lg bg-slate-50 px-3 py-2 text-[12px] leading-relaxed text-slate-500">
            {fact.missingReason}
          </div>
        </>
      )}
    </div>
  );
}

/** מקרא הוודאות — מוצג פעם אחת בראש הדוח. */
export function CertaintyLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-line bg-surface px-4 py-3 text-[12px] text-muted shadow-card">
      <span className="font-bold text-navy">מה המשמעות של הסימונים:</span>
      {(['verified', 'approx', 'estimate'] as Certainty[]).map((c) => (
        <span key={c} className="inline-flex items-center gap-1.5">
          <CertaintyBadge certainty={c} small />
          <span>{CERTAINTY_EXPLAIN[c]}</span>
        </span>
      ))}
    </div>
  );
}
