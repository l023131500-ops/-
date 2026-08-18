'use client';

import type { PopulationProfile } from '@/lib/elections';
import { CertaintyBadge } from './Bits';

const BAR_COLOR: Record<string, string> = {
  'חילוני וכללי': 'bg-teal',
  חרדי: 'bg-navysurface',
  'דתי-לאומי': 'bg-gold',
  ערבי: 'bg-indigo',
};

// סף מינימלי כדי לתייג "מתאים במיוחד ל" — קהילה שולית (למשל 4%) אינה
// הופכת שכונה למתאימה לה. הסף הנמוך יותר לחילוני נובע מזה שזו קבוצת שארית
// רחבה (ראה ההערה על headlineOf ב-lib/elections.ts): רוב מוחלט בה כן אומר משהו.
const OBSERVANT_THRESHOLD = 15;
const SECULAR_THRESHOLD = 45;

/**
 * תגיות "מתאים במיוחד ל" — נגזרות אך ורק מהתפלגות המגזרים שכבר נטענה,
 * בלי לבקש נתון נוסף. במכוון לא מתייגת "משפחות" סתם או "צעירים": אין כאן
 * נתון גיל/הרכב משפחה לפי כתובת (ראה CLAUDE.md — "מיפוי כתובת→קלפי לא
 * קיים, לכן אפיון האוכלוסייה תמיד מקורב"), ותיוג כזה היה נתון מומצא.
 */
function lifestyleTags(breakdown: PopulationProfile['breakdown']): string[] {
  const pctOf = (label: string) => breakdown.find((b) => b.label === label)?.pct ?? 0;
  const tags: string[] = [];
  if (pctOf('חרדי') >= OBSERVANT_THRESHOLD) tags.push('משפחות חרדיות');
  if (pctOf('דתי-לאומי') >= OBSERVANT_THRESHOLD) tags.push('משפחות דתיות-לאומיות');
  if (pctOf('חילוני וכללי') >= SECULAR_THRESHOLD) tags.push('אורח חיים חילוני-מסורתי');
  return tags;
}

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

  const tags = lifestyleTags(population.breakdown);

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

      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-muted">מתאים במיוחד ל:</span>
          {tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-teal/10 px-2.5 py-1 text-[11px] font-bold text-tealD"
            >
              {t}
            </span>
          ))}
        </div>
      )}
      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        התאמה למשפחות עם ילדים ולאוכלוסייה צעירה דורשת נתוני גיל לפי כתובת שאינם זמינים
        כרגע — לא זמין.
      </p>

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
