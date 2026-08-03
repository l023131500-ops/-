'use client';

import { useMemo, useState } from 'react';
import type { SoldDeal } from '@/lib/buildreport';
import type { ReportTier } from '@/lib/report';

const FREE_ROWS = 5;

/**
 * חלון ברירת המחדל: שלוש השנים האחרונות.
 *
 * ⚠️ זה לא קיצור תצוגה — זו נכונות. הטבלה מוינה קודם לפי קרבה, ולכן השורות
 * הראשונות שהלקוח ראה יכלו להיות מכירות מ-2003 ומ-2009 באותו בניין, בעוד
 * שהעסקאות שקובעות את המחיר היום נדחקו למטה. מי שמסתכל על טבלה ורואה
 * "1,300,000 ₪" בשורה העליונה מסיק מסקנה על שווי הנכס — והמספר הזה בן 17 שנה.
 * מהיום: ברירת המחדל היא שלוש השנים האחרונות, מהחדשה לישנה, וכל השאר נפתח
 * בלחיצה מפורשת ומסומן כהיסטוריה.
 */
const RECENT_YEARS = 3;

function isRecent(dateIso: string, cutoff: number): boolean {
  const ts = new Date(dateIso).getTime();
  return Number.isFinite(ts) && ts >= cutoff;
}

export default function SoldDeals({
  deals,
  tier,
  /** עמוד העסקאות של הכתובת באתר הנדל"ן הממשלתי — לאימות שורה מול שורה. */
  officialUrl = null,
}: {
  deals: SoldDeal[];
  tier: ReportTier;
  officialUrl?: string | null;
}) {
  const [showOlder, setShowOlder] = useState(false);
  const [showAllRecent, setShowAllRecent] = useState(false);

  const { recent, older, cutoffYear } = useMemo(() => {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - RECENT_YEARS);
    const cutoff = cutoffDate.getTime();
    // מהחדשה לישנה — בשתי הקבוצות. הקרבה לנכס נשארת כתווית בשורה עצמה.
    const byDateDesc = (a: SoldDeal, b: SoldDeal) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
    const r = deals.filter((d) => isRecent(d.date, cutoff)).sort(byDateDesc);
    const o = deals.filter((d) => !isRecent(d.date, cutoff)).sort(byDateDesc);
    return { recent: r, older: o, cutoffYear: cutoffDate.getFullYear() };
  }, [deals]);

  if (!deals.length) {
    return (
      <div className="mt-6 rounded-2xl border border-line bg-white p-6 text-[14px] leading-relaxed text-muted shadow-card">
        לא נמצאו עסקאות מכר שנסגרו בבניין הזה או בסביבתו הקרובה. זה קורה באזורים חדשים,
        בבניינים שטרם נמכרו בהם דירות, ובנכסים שאינם דירות מגורים.
      </div>
    );
  }

  /**
   * חיתוך שאינו מוריד את עסקאות **הבניין עצמו**.
   *
   * ⚠️ נמצא באימות מול הדוח החי של "הבעש\"ט 9 רחובות": כשהמיון עבר לכרונולוגי,
   * שתי מכירות **בבניין** מ-2024 (2,850,000 ו-2,825,000 ₪) נדחקו מתחת לשורה 25
   * על ידי עסקאות שכנות מ-2025–2026, והטבלה הראתה 5 שורות בניין במקום 7 —
   * בעוד שהכרטיס למעלה מכריז 6 עסקאות בבניין. המיון לפי קרבה, שהוחלף, הבטיח
   * את זה במקרה; עכשיו זה מובטח במפורש. עסקאות הבניין הן בדיוק מה שהלקוח בא
   * לראות, והן לעולם לא נחתכות בגלל רעש מהסביבה.
   */
  const capKeepingBuilding = (list: SoldDeal[], cap: number): SoldDeal[] => {
    if (list.length <= cap) return list;
    const inBuilding = list.filter((d) => d.proximityRank === 0);
    const others = list.filter((d) => d.proximityRank !== 0);
    const room = Math.max(0, cap - inBuilding.length);
    return [...inBuilding, ...others.slice(0, room)].sort((a, b) =>
      a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
    );
  };

  const recentCap = tier === 'basic' ? FREE_ROWS : showAllRecent ? recent.length : 25;
  const shownRecent = capKeepingBuilding(recent, recentCap);
  const hiddenRecent = recent.length - shownRecent.length;
  const shownOlder = showOlder ? (tier === 'basic' ? capKeepingBuilding(older, FREE_ROWS) : older) : [];
  const shown = [...shownRecent, ...shownOlder];

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-black text-navy">
          {recent.length
            ? `${recent.length} עסקאות שנסגרו מאז ${cutoffYear} — מהחדשה לישנה`
            : `אין עסקאות מאז ${cutoffYear} — כל ${deals.length} העסקאות ישנות יותר`}
        </h3>
        <p className="text-[12px] text-muted">
          אלה מחירים שנרשמו בפועל ברשות המסים, לא מחירים שמישהו ביקש.
          {officialUrl && (
            <>
              {' '}
              <a
                href={officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block py-1.5 font-bold text-tealD underline decoration-teal/40 hover:decoration-teal"
              >
                בדיקה במקור באתר הנדל"ן הממשלתי
              </a>
            </>
          )}
        </p>
      </div>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-white shadow-card">
        <table className="w-full min-w-[880px] text-right text-sm">
          <thead>
            <tr className="border-b border-line bg-slate-50 text-[12px] text-muted">
              <th className="px-4 py-3 font-semibold">מיקום ביחס לנכס</th>
              <th className="px-4 py-3 font-semibold">כתובת</th>
              <th className="px-4 py-3 font-semibold">גוש/חלקה/תת-חלקה</th>
              <th className="px-4 py-3 font-semibold">תאריך</th>
              <th className="px-4 py-3 font-semibold">מחיר</th>
              <th className="px-4 py-3 font-semibold">שטח</th>
              <th className="px-4 py-3 font-semibold">מחיר למ"ר</th>
              <th className="px-4 py-3 font-semibold">חדרים</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((d, i) => {
              const isOld = i >= shownRecent.length;
              return (
                <tr
                  key={`${d.parcelLabel ?? ''}|${d.date}|${d.price}|${i}`}
                  className={`border-b border-line/60 last:border-0 ${
                    d.proximityRank === 0 ? 'bg-teal/5' : ''
                  } ${isOld ? 'opacity-80' : ''}`}
                >
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${
                        d.proximityRank === 0
                          ? 'bg-teal/15 text-tealD'
                          : d.proximityRank < 500
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-slate-50 text-slate-500'
                      }`}
                    >
                      {d.proximityLabel}
                    </span>
                    {d.suspect && (
                      <div
                        title={d.suspectReason}
                        className="mt-1 cursor-help text-[11px] font-semibold text-[#8a6d24]"
                      >
                        ⚠ רשומה חריגה
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink">
                    {d.streetName ? `${d.streetName}${d.houseNum != null ? ` ${d.houseNum}` : ''}` : d.address ?? '—'}
                    {d.settlement && (
                      <div className="text-[11px] text-muted">{d.settlement}</div>
                    )}
                  </td>
                  {/* גוש/חלקה/תת-חלקה בדיוק בצורה שבה nadlan.gov.il מציג אותם,
                      כדי שאפשר יהיה להשוות שורה מול שורה מול המקור. */}
                  <td className="px-4 py-3 font-mono text-[12px] text-ink" dir="ltr">
                    {d.parcelLabel ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {d.date ? new Date(d.date).toLocaleDateString('he-IL') : '—'}
                  </td>
                  <td className="px-4 py-3 font-bold text-navy">
                    {d.price ? new Intl.NumberFormat('he-IL').format(d.price) + ' ₪' : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted">{d.areaSqm ? `${d.areaSqm} מ"ר` : '—'}</td>
                  <td className="px-4 py-3 text-ink">
                    {d.pricePerSqm ? new Intl.NumberFormat('he-IL').format(d.pricePerSqm) : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted">{d.rooms ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {shown.some((d) => d.suspect) && (
        <p className="mt-2 text-[12px] leading-relaxed text-muted">
          ⚠ רשומות שסומנו כחריגות מוצגות כי הן קיימות במרשם הרשמי, אך הן לא נכללות בחישוב
          המחיר הממוצע למ"ר — בדרך כלל מדובר בהעברת חלק בנכס, בחניה או במחסן.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
        {hiddenRecent > 0 &&
          (tier === 'basic' ? (
            <div className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-[#7a5f1f]">
              יש עוד <b>{hiddenRecent}</b> עסקאות מהשנים האחרונות. הן נפתחות בדוח הפרימיום.
            </div>
          ) : (
            <button
              onClick={() => setShowAllRecent(true)}
              className="rounded-xl border border-line bg-white px-5 py-2 text-sm font-bold text-navy hover:border-teal hover:text-tealD"
            >
              הצג את כל {recent.length} העסקאות מ-{RECENT_YEARS} השנים האחרונות
            </button>
          ))}

        {older.length > 0 && !showOlder && (
          <button
            onClick={() => setShowOlder(true)}
            className="rounded-xl border border-line bg-white px-5 py-2 text-sm font-bold text-navy hover:border-teal hover:text-tealD"
          >
            הצג שנים קודמות ({older.length} עסקאות עד {cutoffYear})
          </button>
        )}
      </div>

      {showOlder && older.length > 0 && (
        <p className="mt-2 text-center text-[12px] leading-relaxed text-muted">
          העסקאות הישנות מוצגות כהיסטוריה של הנכס והסביבה. מחיר מלפני יותר מ-{RECENT_YEARS} שנים
          אינו מעיד על השווי היום. הדוח מחשב את המחיר למ"ר על חלון זמן מוגדר שנכתב לצד
          המספר — וכשהחלון ארוך מ-{RECENT_YEARS} שנים, חלק מהעסקאות שנכללו בו נמצאות כאן.
          {tier === 'basic' && older.length > FREE_ROWS
            ? ` מוצגות ${FREE_ROWS} מתוך ${older.length} — השאר בדוח הפרימיום.`
            : ''}
        </p>
      )}
    </div>
  );
}
