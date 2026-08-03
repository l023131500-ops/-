'use client';

import { useMemo, useState } from 'react';
import type { PropertyReport } from '@/lib/buildreport';
import { apiUrl } from '@/lib/basepath';
import { CertaintyBadge } from './Bits';

/**
 * שכבת VIP: תשואת שכירות, מצגת ו-PDF.
 *
 * הצילום, תצלום האוויר והמפה **אינם** כאן יותר — הם עברו ל-`PropertyImagery`
 * ומוצגים בכל שלוש הרמות. כשהם חיו כאן, לקוח בדוח רגיל או מקיף לא ראה
 * את הנכס שלו כלל.
 */
export default function VipPanel({ report }: { report: PropertyReport }) {
  const [rent, setRent] = useState<number>(0);

  // שווי משוער לחישוב תשואה — מהעסקאות בבניין, אחרת מהאזור.
  const estValue = useMemo(() => {
    const inBuilding = report.soldDeals.filter((d) => d.proximityRank === 0 && !d.suspect && d.price);
    if (inBuilding.length) {
      const sorted = inBuilding.map((d) => d.price!).sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length / 2)];
    }
    const near = report.soldDeals.filter((d) => !d.suspect && d.price);
    if (!near.length) return null;
    const sorted = near.map((d) => d.price!).sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }, [report.soldDeals]);

  const yieldPct = rent > 0 && estValue ? Math.round(((rent * 12) / estValue) * 1000) / 10 : null;

  return (
    <section className="mt-10">
      <div className="flex items-center gap-2">
        <h2 className="text-2xl font-black text-navy">✦ תוספות דוח VIP</h2>
      </div>

      {/* תשואת שכירות */}
      <div className="mt-4 rounded-2xl border border-line bg-white p-5 shadow-card">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-black text-navy">תשואת שכירות</h3>
          <CertaintyBadge certainty="estimate" small />
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">
          אין מקור ציבורי שמדווח שכר דירה בפועל לנכס מסוים. הזן את שכר הדירה החודשי הצפוי,
          ונחשב את התשואה מול שווי הנכס לפי העסקאות שנסגרו.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-ink">שכר דירה חודשי (₪)</span>
            <input
              type="number"
              min={0}
              step={100}
              value={rent || ''}
              onChange={(e) => setRent(Number(e.target.value))}
              placeholder="לדוגמה 5,500"
              className="w-44 rounded-xl border border-line px-3 py-2 outline-none focus:border-teal"
            />
          </label>

          <div className="rounded-xl bg-slate-50 px-4 py-2.5">
            <div className="text-[11px] font-semibold text-muted">שווי הנכס לפי עסקאות</div>
            <div className="text-lg font-black text-navy">
              {estValue ? new Intl.NumberFormat('he-IL').format(estValue) + ' ₪' : 'לא ידוע'}
            </div>
          </div>

          <div className="rounded-xl bg-teal/10 px-4 py-2.5">
            <div className="text-[11px] font-semibold text-tealD">תשואה שנתית</div>
            <div className="text-lg font-black text-tealD">
              {yieldPct != null ? `${yieldPct}%` : '—'}
            </div>
          </div>
        </div>

        {yieldPct != null && (
          <p className="mt-3 text-[12px] leading-relaxed text-muted">
            החישוב: שכר דירה חודשי × 12, חלקי שווי הנכס. זו תשואה ברוטו — היא לא מנכה ועד
            בית, ארנונה, תיקונים, תקופות ריקות או מס.
          </p>
        )}
      </div>

      {/* פעולות */}
      <div className="mt-4 flex flex-wrap gap-3 print:hidden">
        <a
          href={apiUrl(`/present?q=${encodeURIComponent(report.query)}`)}
          className="rounded-xl bg-navy px-6 py-3 font-bold text-white hover:bg-navy2"
        >
          פתח מצגת להצגה ללקוח
        </a>
        <a
          href={apiUrl(`/api/deck?q=${encodeURIComponent(report.query)}`)}
          className="rounded-xl border border-line bg-white px-6 py-3 font-bold text-navy hover:border-teal hover:text-tealD"
        >
          הורדת המצגת
        </a>
        {/*
          הורדה ולא הדפסה: `window.print()` פותח תיבת הדפסה ומשאיר ללקוח לבחור
          "שמור כ-PDF". כאן השרת מחזיר קובץ מעוצב עם Content-Disposition.
        */}
        <a
          href={apiUrl(`/api/pdf?q=${encodeURIComponent(report.query)}&tier=vip`)}
          className="rounded-xl border border-line bg-white px-6 py-3 font-bold text-navy hover:border-teal hover:text-tealD"
        >
          הורד PDF מעוצב
        </a>
      </div>
    </section>
  );
}
