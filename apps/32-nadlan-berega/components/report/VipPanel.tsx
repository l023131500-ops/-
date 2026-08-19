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
  const [mortgagePrice, setMortgagePrice] = useState<number>(0);
  const [downPayment, setDownPayment] = useState<number>(0);
  const [annualRate, setAnnualRate] = useState<number>(0);
  const [mortgageYears, setMortgageYears] = useState<number>(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState<number>(0);

  const ils = (n: number) => new Intl.NumberFormat('he-IL').format(n);

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

  // מחשבון משכנתא — נוסחת שפיצר (תשלום חודשי קבוע), חישוב אריתמטי בלבד.
  const mortgage = useMemo(() => {
    const price = mortgagePrice;
    const down = downPayment;
    const rate = annualRate;
    const term = mortgageYears;
    if (!price || !rate || !term || down < 0 || down >= price) return null;
    const loan = price - down;
    const r = rate / 100 / 12;
    const n = term * 12;
    const monthly = r === 0 ? loan / n : (loan * r) / (1 - Math.pow(1 + r, -n));
    const totalPaid = monthly * n;
    return {
      loan,
      monthly: Math.round(monthly),
      totalInterest: Math.round(totalPaid - loan),
      ltv: Math.round((loan / price) * 1000) / 10,
    };
  }, [mortgagePrice, downPayment, annualRate, mortgageYears]);

  // תזרים מזומנים חודשי — שכר דירה פחות החזר משכנתא ופחות הוצאות קבועות משוערות.
  const netCashFlow =
    rent > 0 && mortgage ? Math.round(rent - mortgage.monthly - monthlyExpenses) : null;

  return (
    <section className="mt-10">
      <div className="flex items-center gap-2">
        <h2 className="text-2xl font-black text-navy">✦ תוספות דוח VIP</h2>
      </div>

      {/* תשואת שכירות */}
      <div className="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-card">
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

      {/* מחשבון משכנתא ותשואת השקעה */}
      <div className="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-card">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-black text-navy">מחשבון משכנתא</h3>
          <CertaintyBadge certainty="estimate" small />
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">
          הזן מחיר רכישה, הון עצמי, ריבית שנתית ותקופת החזר — נחשב את ההחזר החודשי המשוער
          (נוסחת "שפיצר", ריבית קבועה) וסך הריבית לתקופה. זהו חישוב אריתמטי בלבד ולא הצעת
          מימון; הריבית בפועל נקבעת מול הבנק ומשתנה לפי מסלול (קבועה/משתנה/צמודה).
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-ink">מחיר רכישה (₪)</span>
            <input
              type="number"
              min={0}
              step={10000}
              value={mortgagePrice || ''}
              onChange={(e) => setMortgagePrice(Number(e.target.value))}
              placeholder={estValue ? String(estValue) : 'לדוגמה 1,800,000'}
              className="w-full rounded-xl border border-line px-3 py-2 outline-none focus:border-teal"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-ink">הון עצמי (₪)</span>
            <input
              type="number"
              min={0}
              step={10000}
              value={downPayment || ''}
              onChange={(e) => setDownPayment(Number(e.target.value))}
              placeholder="לדוגמה 450,000"
              className="w-full rounded-xl border border-line px-3 py-2 outline-none focus:border-teal"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-ink">ריבית שנתית (%)</span>
            <input
              type="number"
              min={0}
              max={20}
              step={0.1}
              value={annualRate || ''}
              onChange={(e) => setAnnualRate(Number(e.target.value))}
              placeholder="לדוגמה 5.2"
              className="w-full rounded-xl border border-line px-3 py-2 outline-none focus:border-teal"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-ink">תקופת החזר (שנים)</span>
            <input
              type="number"
              min={1}
              max={35}
              step={1}
              value={mortgageYears || ''}
              onChange={(e) => setMortgageYears(Number(e.target.value))}
              placeholder="לדוגמה 25"
              className="w-full rounded-xl border border-line px-3 py-2 outline-none focus:border-teal"
            />
          </label>
        </div>

        {mortgage && (
          <>
            <div className="mt-4 flex flex-wrap gap-4">
              <div className="rounded-xl bg-slate-50 px-4 py-2.5">
                <div className="text-[11px] font-semibold text-muted">גובה המשכנתא</div>
                <div className="text-lg font-black text-navy">{ils(mortgage.loan)} ₪</div>
              </div>
              <div className="rounded-xl bg-teal/10 px-4 py-2.5">
                <div className="text-[11px] font-semibold text-tealD">החזר חודשי משוער</div>
                <div className="text-lg font-black text-tealD">{ils(mortgage.monthly)} ₪</div>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-2.5">
                <div className="text-[11px] font-semibold text-muted">סך הריבית לתקופה</div>
                <div className="text-lg font-black text-navy">{ils(mortgage.totalInterest)} ₪</div>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-2.5">
                <div className="text-[11px] font-semibold text-muted">אחוז מימון (LTV)</div>
                <div className="text-lg font-black text-navy">{mortgage.ltv}%</div>
              </div>
            </div>

            {mortgage.ltv > 75 && (
              <p className="mt-3 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-[13px] leading-relaxed text-[#7a5f1f]">
                אחוז מימון מעל 75% חורג מהתקרה המקובלת לדירה יחידה בישראל (הנחיית בנק ישראל) —
                ייתכן שהבנק ידרוש הון עצמי גבוה יותר.
              </p>
            )}
          </>
        )}

        <p className="mt-3 text-[12px] leading-relaxed text-muted">
          אינו כולל ביטוח חיים/מבנה, עמלות פתיחת תיק, או שינויי ריבית עתידיים (מסלולי
          פריים/משתנה).
        </p>
      </div>

      {/* תזרים מזומנים חודשי */}
      <div className="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-card">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-black text-navy">תזרים מזומנים חודשי</h3>
          <CertaintyBadge certainty="estimate" small />
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">
          שכר הדירה שהזנת למעלה, פחות ההחזר החודשי למשכנתא שחושב למעלה, פחות הוצאות קבועות
          משוערות (ועד בית, ארנונה, ביטוח) — התזרים החודשי הנקי מההשקעה.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-ink">הוצאות קבועות חודשיות (₪)</span>
            <input
              type="number"
              min={0}
              step={50}
              value={monthlyExpenses || ''}
              onChange={(e) => setMonthlyExpenses(Number(e.target.value))}
              placeholder="לדוגמה 450"
              className="w-44 rounded-xl border border-line px-3 py-2 outline-none focus:border-teal"
            />
          </label>

          <div
            className={`rounded-xl px-4 py-2.5 ${
              netCashFlow == null
                ? 'bg-slate-50'
                : netCashFlow >= 0
                  ? 'bg-teal/10'
                  : 'bg-red-50'
            }`}
          >
            <div
              className={`text-[11px] font-semibold ${
                netCashFlow == null ? 'text-muted' : netCashFlow >= 0 ? 'text-tealD' : 'text-red-700'
              }`}
            >
              תזרים חודשי נקי
            </div>
            <div
              className={`text-lg font-black ${
                netCashFlow == null ? 'text-navy' : netCashFlow >= 0 ? 'text-tealD' : 'text-red-700'
              }`}
            >
              {netCashFlow != null ? `${ils(netCashFlow)} ₪` : 'הזן שכר דירה ופרטי משכנתא למעלה'}
            </div>
          </div>
        </div>

        {netCashFlow != null && netCashFlow < 0 && (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] leading-relaxed text-red-700">
            לפי הנתונים שהוזנו, ההשקעה מייצרת תזרים שלילי — ההחזר החודשי וההוצאות עולים על
            שכר הדירה הצפוי.
          </p>
        )}
      </div>

      {/* פעולות */}
      <div className="mt-4 flex flex-wrap gap-3 print:hidden">
        <a
          href={apiUrl(`/present?q=${encodeURIComponent(report.query)}`)}
          className="rounded-xl bg-navysurface px-6 py-3 font-bold text-white hover:bg-navy2"
        >
          פתח מצגת להצגה ללקוח
        </a>
        <a
          href={apiUrl(`/api/deck?q=${encodeURIComponent(report.query)}`)}
          className="rounded-xl border border-line bg-surface px-6 py-3 font-bold text-navy hover:border-teal hover:text-tealD"
        >
          הורדת המצגת
        </a>
        {/*
          הורדה ולא הדפסה: `window.print()` פותח תיבת הדפסה ומשאיר ללקוח לבחור
          "שמור כ-PDF". כאן השרת מחזיר קובץ מעוצב עם Content-Disposition.
        */}
        <a
          href={apiUrl(`/api/pdf?q=${encodeURIComponent(report.query)}&tier=vip`)}
          className="rounded-xl border border-line bg-surface px-6 py-3 font-bold text-navy hover:border-teal hover:text-tealD"
        >
          הורד PDF מעוצב
        </a>
      </div>
    </section>
  );
}
