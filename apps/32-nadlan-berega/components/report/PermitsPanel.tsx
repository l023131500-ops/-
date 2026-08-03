'use client';

import { useState } from 'react';
import type { PermitsResult, PlanWithDocs } from '@/lib/permits';

/**
 * התוכניות שחלות על הנקודה, עם המסמכים שלהן.
 *
 * ⚠️ הקישור מוביל לעמוד התוכנית באתר "מידע תכנוני" ולא לקובץ עצמו. ההורדה שם
 * מוגנת ב-reCAPTCHA, כלומר היא מתבצעת בדפדפן — אנחנו לא עוקפים אותה ולא
 * מציגים קישור שנשבר. זה נאמר ללקוח במפורש בתחתית הסעיף.
 */
export default function PermitsPanel({ permits }: { permits: PermitsResult | null }) {
  const [showAll, setShowAll] = useState(false);
  if (!permits) return null;

  const groups: { title: string; hint: string; plans: PlanWithDocs[] }[] = [
    {
      title: 'תוכניות מאושרות',
      hint: 'מכוחן אפשר להוציא היתר בנייה היום.',
      plans: permits.approved,
    },
    {
      title: 'תוכניות בהליך',
      hint: 'עדיין לא אושרו. מלמדות מה עשוי להשתנות כאן — צפי, לא מצב קיים.',
      plans: permits.inProcess,
    },
    {
      title: 'מסמכי מדיניות',
      hint: 'מנחים את הוועדה בשיקול הדעת שלה, ואינם מקנים זכויות בנייה בעצמם.',
      plans: permits.policy,
    },
  ].filter((g) => g.plans.length > 0);

  if (!groups.length) {
    return (
      <div className="mt-5 rounded-2xl border border-line bg-surface p-5 text-[14px] leading-relaxed text-muted shadow-card">
        לא נמצאה אף תוכנית שהקו הכחול שלה חולש על הנקודה הזו.
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-5">
      {groups.map((g) => {
        const visible = showAll ? g.plans : g.plans.slice(0, 4);
        return (
          <div key={g.title}>
            <div className="flex flex-wrap items-baseline gap-x-3">
              <h3 className="text-[17px] font-black text-navy">
                {g.title} <span className="text-muted">({g.plans.length})</span>
              </h3>
              <span className="text-[12px] text-muted">{g.hint}</span>
            </div>

            <div className="mt-3 space-y-3">
              {visible.map((p, i) => (
                <PlanCard key={`${p.planNumber ?? 'x'}-${i}`} plan={p} />
              ))}
            </div>

            {!showAll && g.plans.length > visible.length && (
              <button
                onClick={() => setShowAll(true)}
                className="mt-3 rounded-lg border border-line bg-surface px-4 py-2 text-[13px] font-bold text-tealD hover:border-teal"
              >
                הצג את כל {g.plans.length} התוכניות
              </button>
            )}
          </div>
        );
      })}

      <div className="rounded-xl border border-line bg-bgsoft px-4 py-3 text-[12px] leading-relaxed text-muted">
        {permits.documentsAccessNote}
      </div>
    </div>
  );
}

function PlanCard({ plan }: { plan: PlanWithDocs }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-[15px] font-black text-navy">
          {plan.planNumber ?? 'תוכנית ללא מספר'}
          {plan.planName && <span className="mr-2 font-bold text-ink">{plan.planName}</span>}
        </div>
        {plan.areaDunam != null && (
          <div className="text-[12px] text-muted">
            שטח התוכנית: {new Intl.NumberFormat('he-IL').format(Math.round(plan.areaDunam))} דונם
          </div>
        )}
      </div>

      <p className="mt-1.5 text-[13px] leading-relaxed text-ink">{plan.plainSummary}</p>

      {plan.quantityLines.length > 0 && (
        <ul className="mt-2 space-y-1">
          {plan.quantityLines.map((l) => (
            <li key={l} className="flex gap-2 text-[12.5px] leading-relaxed text-muted">
              <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-teal" />
              <span>{l}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {plan.documents.map((d) => (
          <a
            key={d.title}
            href={d.url ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-line bg-bgsoft px-3 py-1.5 text-[12px] font-bold text-tealD hover:border-teal"
          >
            {d.title}
            {d.version != null && <span className="mr-1 font-normal text-muted">גרסה {d.version}</span>}
          </a>
        ))}
        {plan.committee && <span className="text-[11.5px] text-muted">ועדה: {plan.committee}</span>}
      </div>
    </div>
  );
}

/** פרק המדיניות של רמ"י — מוצג בדוח קרקע בלבד. */
export function RamiPolicyPanel({
  policy,
}: {
  policy: import('@/lib/rami').RamiPolicy | null;
}) {
  if (!policy || !policy.sections.length) return null;
  return (
    <div className="mt-5 rounded-2xl border border-line bg-surface p-5 shadow-card">
      <h3 className="text-[17px] font-black text-navy">
        מדיניות רמ"י — שינוי ייעוד של קרקע חקלאית
      </h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
        {policy.note} מתוך קובץ החלטות מועצת מקרקעי ישראל, גרסה {policy.version}
        {policy.versionDate
          ? ` (${new Date(policy.versionDate).toLocaleDateString('he-IL')})`
          : ''}
        .
      </p>

      <div className="mt-4 space-y-3">
        {policy.sections.map((s) => (
          <details key={`${s.number}-${s.title}`} className="rounded-xl border border-line bg-bgsoft p-3">
            <summary className="cursor-pointer text-[14px] font-bold text-navy">
              {s.number ? `${s.number} · ` : ''}
              {s.title}
            </summary>
            <div className="mt-1 text-[11.5px] text-muted">{s.path}</div>
            {s.text ? (
              <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-ink">{s.text}</p>
            ) : (
              <p className="mt-2 text-[12.5px] text-muted">
                נוסח הסעיף לא נטען כרגע — אפשר לקרוא אותו במקור.
              </p>
            )}
          </details>
        ))}
      </div>

      <a
        href={policy.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-block text-[13px] font-bold text-tealD hover:underline"
      >
        קובץ ההחלטות המלא באתר רמ"י ←
      </a>
    </div>
  );
}
