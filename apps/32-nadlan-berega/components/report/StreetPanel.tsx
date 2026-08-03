'use client';

import { useMemo, useState } from 'react';
import type { PropertyReport, SoldDeal } from '@/lib/buildreport';
import { CertaintyBadge } from './Bits';

/**
 * §7 · שכבת **הרחוב**.
 *
 * המפרט מונה ארבע שכבות שחייבות להופיע: הנכס, הבניין, **הרחוב** והשכונה.
 * שלוש מהן היו בדוח כסעיף עומד בפני עצמו; הרחוב היה מפוזר — שם הרחוב בכותרת,
 * "מחיר למ״ר ברחוב" ככרטיס בודד בתוך "הנכס", והמספרים הסמוכים בלועו של
 * "עסקאות שנמכרו". מי שרצה לדעת מה קורה ברחוב הזה היה צריך להרכיב את זה בעצמו.
 *
 * הפאנל הזה **אינו מושך שום מקור חדש ואינו עולה אגורה**: כל מה שכאן נגזר
 * מהעסקאות שכבר נמשכו ומהכותרת שכבר נבנתה. זו הסיבה שהוא מוצג בכל הרמות,
 * כולל החינמית.
 *
 * ⚠️ נמדד רק על העסקאות שבאמת נושאות את שם הרחוב הזה. עסקה בלי שם רחוב, או
 * עם שם רחוב אחר, אינה נספרת — אחרת "הרחוב" היה חוזר להיות "האזור", וזו בדיוק
 * הטעות שתוקנה ב-§2.
 */

/**
 * השוואת שמות רחוב סלחנית ל-ה' הידיעה, לגרשיים ולרווחים כפולים.
 *
 * ⚠️ הסוגריים נחתכים לפני הכול. `title.streetDisplay` הוא תווית תצוגה ולא שם —
 * "הבעשט (מוכר גם כרחוב הבעל שם טוב)" — ומי שמשווה אותה מול שם הרחוב שבעסקה
 * לא מוצא כלום. זה בדיוק מה שקרה: הבעש״ט 9 ברחובות הראה "לא נרשמה אף עסקה
 * ברחוב", בזמן שבבניין עצמו היו שש. משווים מול `streetOfficial` והכינויים.
 */
function normStreet(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/\(.*?\)/g, '')
    .replace(/["'`״׳]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^ה/, '')
    .trim();
}

function quantile(sorted: number[], p: number): number {
  if (sorted.length === 1) return sorted[0];
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo));
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return quantile([...nums].sort((a, b) => a - b), 0.5);
}

const ils = (n: number) => new Intl.NumberFormat('he-IL').format(Math.round(n));

interface HouseRow {
  houseNum: number;
  deals: number;
  homeSales: number;
  lastDate: string | null;
  medianPerSqm: number | null;
  isSubject: boolean;
}

export default function StreetPanel({ report }: { report: PropertyReport }) {
  const [expanded, setExpanded] = useState(false);

  // התצוגה מקבלת את התווית המלאה; ההשוואה מקבלת את השם הרשמי והכינויים.
  const street = report.title.streetDisplay || report.title.streetOfficial || null;
  const official = report.title.streetOfficial || report.title.streetDisplay || null;
  const aliases = report.title.streetAliases ?? [];
  const subjectNum =
    report.title.houseNumber != null ? Number(report.title.houseNumber) : null;

  const stats = useMemo(() => {
    if (!street) return null;
    const alias = new Set(
      [official, street, ...aliases].map(normStreet).filter(Boolean),
    );

    const onStreet = (report.soldDeals ?? []).filter((d: SoldDeal) =>
      alias.has(normStreet(d.streetName)),
    );
    if (onStreet.length === 0)
      return { onStreet, rows: [] as HouseRow[], perSqm: null, span: null, homeSales: 0, suspect: 0 };

    /**
     * ⚠️ רשומות חריגות נפסלות מכל חישוב מחיר.
     * נמדד בשמואל הנביא: הטווח הגולמי ברחוב היה 1,063–898,000 ₪ למ״ר. שני
     * הקצוות הם רישום שגוי במקור — והצגתם כ"טווח המחירים ברחוב" הופכת מספר
     * נכון (החציון) לשורה שאי אפשר להאמין לה.
     */
    const clean = onStreet.filter((d) => !d.suspect);
    const perSqmValues = clean
      .filter((d) => d.isHomeSale && d.pricePerSqm && d.pricePerSqm > 0)
      .map((d) => d.pricePerSqm as number)
      .sort((a, b) => a - b);

    const dates = onStreet.map((d) => d.date).filter(Boolean).sort();

    // קיבוץ לפי מספר בית — זה מה שהופך רשימה של עסקאות ל"תמונה של רחוב".
    const byNum = new Map<number, SoldDeal[]>();
    for (const d of clean) {
      if (d.houseNum == null) continue;
      const list = byNum.get(d.houseNum) ?? [];
      list.push(d);
      byNum.set(d.houseNum, list);
    }

    const rows: HouseRow[] = [...byNum.entries()]
      .map(([houseNum, deals]) => ({
        houseNum,
        deals: deals.length,
        homeSales: deals.filter((d) => d.isHomeSale).length,
        lastDate:
          deals
            .map((d) => d.date)
            .filter(Boolean)
            .sort()
            .slice(-1)[0] ?? null,
        medianPerSqm: median(
          deals.filter((d) => d.isHomeSale && d.pricePerSqm).map((d) => d.pricePerSqm as number),
        ),
        isSubject: subjectNum != null && houseNum === subjectNum,
      }))
      // הקרוב למספר הנכס קודם — אותה היררכיה שמנחה את §2.
      .sort((a, b) => {
        if (subjectNum == null) return a.houseNum - b.houseNum;
        const da = Math.abs(a.houseNum - subjectNum);
        const db = Math.abs(b.houseNum - subjectNum);
        return da - db || a.houseNum - b.houseNum;
      });

    return {
      onStreet,
      rows,
      perSqm: perSqmValues.length
        ? {
            median: quantile(perSqmValues, 0.5),
            p25: quantile(perSqmValues, 0.25),
            p75: quantile(perSqmValues, 0.75),
            count: perSqmValues.length,
          }
        : null,
      span: dates.length ? { from: dates[0], to: dates[dates.length - 1] } : null,
      homeSales: onStreet.filter((d) => d.isHomeSale).length,
      suspect: onStreet.length - clean.length,
    };
  }, [report.soldDeals, street, official, aliases, subjectNum]);

  // אין שם רחוב כלל — חיפוש לפי גוש וחלקה, או כתובת שלא נפתרה לרחוב.
  if (!street) {
    return (
      <Shell>
        <p className="text-[14px] leading-relaxed text-muted">
          לא זמין — לנכס הזה לא שויך שם רחוב. זה קורה כשהחיפוש נעשה לפי גוש וחלקה בלבד,
          וכשהמרשם רושם את הנכס לפי החלקה ולא לפי כתובת.
        </p>
      </Shell>
    );
  }

  const shown = expanded ? stats!.rows : stats!.rows.slice(0, 8);

  return (
    <Shell>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-[15px] font-black text-navy">{street}</span>
        {report.title.city && <span className="text-[13px] text-muted">{report.title.city}</span>}
      </div>

      {aliases.length > 0 && (
        <p className="mt-1 text-[13px] leading-relaxed text-muted">
          מוכר גם בשם <b className="text-ink">{aliases.join(' · ')}</b> — ומרשם העסקאות רושם
          לפעמים תחת הכינוי ולא תחת השם הרשמי, ולכן שני השמות נספרים כאן יחד.
        </p>
      )}

      {stats!.onStreet.length === 0 ? (
        <p className="mt-3 text-[14px] leading-relaxed text-muted">
          לא נרשמה אף עסקה שנושאת את שם הרחוב הזה בתקופה שנבדקה. זה קורה ברחובות קצרים,
          ברחובות חדשים, וכשהמרשם רושם את העסקאות תחת כינוי אחר של הרחוב.
        </p>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Stat
              label="עסקאות שנרשמו ברחוב"
              value={String(stats!.onStreet.length)}
              note={
                `מתוכן ${stats!.homeSales} מכירות דירות` +
                (stats!.suspect ? ` · ${stats!.suspect} רשומות חריגות לא נספרו במחירים` : '')
              }
            />
            <Stat
              label='מחיר למ"ר חציוני ברחוב'
              value={stats!.perSqm ? `${ils(stats!.perSqm.median)} ₪` : 'לא זמין'}
              note={
                stats!.perSqm
                  ? `רוב העסקאות בין ${ils(stats!.perSqm.p25)} ל-${ils(stats!.perSqm.p75)} ₪ · ${stats!.perSqm.count} עסקאות`
                  : 'אין עסקה עם שטח ומחיר שאפשר לחשב ממנה'
              }
            />
            <Stat
              label="טווח התאריכים"
              value={
                stats!.span
                  ? `${new Date(stats!.span.from).toLocaleDateString('he-IL')} – ${new Date(
                      stats!.span.to,
                    ).toLocaleDateString('he-IL')}`
                  : 'לא זמין'
              }
              note="מהעסקה הישנה ביותר ועד האחרונה שנמצאה"
            />
          </div>

          {stats!.rows.length > 0 && (
            <div className="mt-5">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-[15px] font-black text-navy">מספרי הבתים ברחוב שנמכר בהם</h3>
                <span className="text-[12px] text-muted">
                  {subjectNum != null ? 'מהקרוב למספר שלכם והלאה' : 'לפי מספר בית'}
                </span>
              </div>

              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-right text-[13px]">
                  <thead>
                    <tr className="border-b border-line text-[12px] text-muted">
                      <th className="py-2 pl-3 font-semibold">מספר בית</th>
                      <th className="py-2 pl-3 font-semibold">עסקאות</th>
                      <th className="py-2 pl-3 font-semibold">מכירות דירות</th>
                      <th className="py-2 pl-3 font-semibold">מחיר למ״ר חציוני</th>
                      <th className="py-2 font-semibold">העסקה האחרונה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((r) => (
                      <tr
                        key={r.houseNum}
                        className={`border-b border-line/60 ${
                          r.isSubject ? 'bg-teal/[0.08] font-bold' : ''
                        }`}
                      >
                        <td className="py-2 pl-3 text-navy">
                          {r.houseNum}
                          {r.isSubject && (
                            <span className="mr-1.5 rounded bg-teal px-1.5 py-px text-[10.5px] font-bold text-white">
                              הנכס שלכם
                            </span>
                          )}
                        </td>
                        <td className="py-2 pl-3 text-ink">{r.deals}</td>
                        <td className="py-2 pl-3 text-ink">{r.homeSales}</td>
                        <td className="py-2 pl-3 text-ink">
                          {r.medianPerSqm ? `${ils(r.medianPerSqm)} ₪` : '—'}
                        </td>
                        <td className="py-2 text-muted">
                          {r.lastDate ? new Date(r.lastDate).toLocaleDateString('he-IL') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {stats!.rows.length > 8 && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="mt-3 rounded-lg border border-line bg-white px-4 py-2 text-[13px] font-bold text-navy transition hover:border-teal hover:text-tealD print:hidden"
                >
                  {expanded
                    ? 'הצג פחות'
                    : `הצג את כל ${stats!.rows.length} מספרי הבתים`}
                </button>
              )}

              {subjectNum != null && !stats!.rows.some((r) => r.isSubject) && (
                <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[12.5px] leading-relaxed text-slate-600">
                  במספר {subjectNum} עצמו לא נרשמה אף עסקה. המספרים שבטבלה הם השכנים
                  הקרובים ביותר שכן נמכר בהם.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="mt-4 rounded-2xl border border-line bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg font-black text-navy">הרחוב</h2>
        <CertaintyBadge certainty="verified" small />
      </div>
      <p className="mb-3 mt-1 text-[13px] leading-relaxed text-muted">
        מה שנמכר ברחוב הזה עצמו — לא באזור. נספר לפי שם הרחוב שרשום בעסקה.
      </p>
      {children}
    </section>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-line bg-bgsoft px-4 py-3">
      <div className="text-[12px] font-semibold text-muted">{label}</div>
      <div className="mt-1 text-lg font-extrabold leading-tight text-navy">{value}</div>
      <div className="mt-1 text-[11.5px] leading-relaxed text-muted">{note}</div>
    </div>
  );
}
