'use client';

import { useState } from 'react';
import type { Feasibility } from '@/lib/feasibility';

/**
 * §7 · הכפתור "היתכנות להיתר נוסף", והתשובה שמאחוריו.
 *
 * הכפתור סגור כברירת מחדל כי זו שאלה שלא כל קורא שואל; מי ששואל אותה מקבל
 * את כל מה שידוע — ואת כל מה שלא ידוע, במפורש.
 *
 * ⚠️ אין כאן אף מספר של זכויות בנייה. הם אינם מתפרסמים בשום שירות מקוון,
 * ודוח שממציא להם ערך הוא בדיוק מה שהמפרט אוסר.
 */
export default function FeasibilityPanel({ feasibility }: { feasibility: Feasibility | null }) {
  const [open, setOpen] = useState(false);
  if (!feasibility) return null;
  const f = feasibility;

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
          <span className="text-[17px] font-black text-navy">
            היתכנות להיתר נוסף — אפשר להוסיף כאן בנייה?
          </span>
          <span className="shrink-0 text-[13px] font-bold text-tealD">
            {open ? 'סגור ▲' : 'פתח ▼'}
          </span>
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">
          זכויות שנותרו, אפשרות תוספת או הרחבה, קווי בניין, ומה נחשב חריגת בנייה — בשפה פשוטה.
        </p>
      </button>

      {open && (
        <div className="mt-3 space-y-5 rounded-2xl border border-line bg-surface p-5 shadow-card">
          <p className="text-[15px] leading-relaxed text-ink">{f.headline}</p>

          {/* ===== תכניות שמאפשרות תוספת ===== */}
          {f.additivePlans.length > 0 && (
            <section>
              <h4 className="text-[15px] font-black text-navy">
                תכניות מאושרות שמכוחן אפשר לבקש תוספת
              </h4>
              <div className="mt-2 space-y-2">
                {f.additivePlans.map((p, i) => (
                  <div key={`${p.planNumber}-${i}`} className="rounded-xl border border-line bg-bgsoft p-3">
                    <div className="text-[14px] font-bold text-navy">
                      {p.planNumber ?? 'תכנית ללא מספר'}
                      {p.planName && <span className="mr-2 font-semibold text-ink">{p.planName}</span>}
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted">{p.why}</p>
                    {p.documentsUrl && (
                      <a
                        href={p.documentsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 inline-block text-[12.5px] font-bold text-tealD hover:underline"
                      >
                        הוראות התכנית והתשריט ←
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {f.pendingPlans.length > 0 && (
            <section>
              <h4 className="text-[15px] font-black text-navy">תכניות בהליך שעשויות לפתוח תוספת</h4>
              <p className="mt-1 text-[12.5px] text-muted">
                עדיין לא אושרו, ולכן אינן מקנות זכויות היום. זה צפי, לא מצב קיים.
              </p>
              <ul className="mt-2 space-y-1.5">
                {f.pendingPlans.map((p, i) => (
                  <li key={`${p.planNumber}-${i}`} className="text-[13px] leading-relaxed text-ink">
                    <b className="text-navy">{p.planNumber ?? 'ללא מספר'}</b>
                    {p.planName ? ` · ${p.planName}` : ''} — {p.why}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ===== קווי בניין ומגבלות ===== */}
          <section>
            <h4 className="text-[15px] font-black text-navy">קווי בניין ומגבלות על החלקה</h4>
            {f.buildingLines.length > 0 ? (
              <ul className="mt-2 space-y-1.5">
                {f.buildingLines.map((e, i) => (
                  <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-ink">
                    <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-teal" />
                    <span>
                      <b className="text-navy">{e.name}</b>
                      {e.planNumber && <span className="text-muted"> · מתכנית {e.planNumber}</span>}
                      {e.status && <span className="text-muted"> · {e.status}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[13px] leading-relaxed text-muted">
                לא אותרו קווי בניין מצוירים על החלקה בשירות המפות. המרחק המותר מגבול המגרש כתוב
                אז בהוראות התכנית בטקסט, ולא כקו על התשריט.
              </p>
            )}

            {f.restrictions.length > 0 && (
              <>
                <div className="mt-3 text-[14px] font-bold text-ink">
                  מגבלות נוספות שמסומנות על התשריט:
                </div>
                <ul className="mt-1.5 space-y-1.5">
                  {f.restrictions.map((e, i) => (
                    <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-ink">
                      <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-gold" />
                      <span>
                        <b className="text-navy">{e.name}</b>
                        {e.planNumber && <span className="text-muted"> · מתכנית {e.planNumber}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
                  סימונים כמו שימור, עתיקות או עצים לשימור אינם אוסרים בנייה מראש, אבל הם מוסיפים
                  גורם מאשר לתהליך ההיתר ומאריכים אותו.
                </p>
              </>
            )}
          </section>

          {/* ===== מה נחשב חריגת בנייה ===== */}
          <section>
            <h4 className="text-[15px] font-black text-navy">מה נחשב חריגת בנייה</h4>
            <ul className="mt-2 space-y-1.5">
              {f.deviationExplained.map((d) => (
                <li key={d} className="flex gap-2 text-[13px] leading-relaxed text-ink">
                  <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-navy/50" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* ===== מה לא ידוע ===== */}
          <section className="rounded-xl border border-gold/40 bg-gold/[0.07] p-4">
            <h4 className="text-[14px] font-black text-[#8a6d24]">מה אי אפשר לדעת מכאן</h4>
            <ul className="mt-2 space-y-1.5">
              {f.unknowns.map((u) => (
                <li key={u} className="flex gap-2 text-[13px] leading-relaxed text-ink">
                  <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-gold" />
                  <span>{u}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[13px] font-semibold leading-relaxed text-ink">{f.whereToCheck}</p>
          </section>
        </div>
      )}
    </div>
  );
}
