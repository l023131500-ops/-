'use client';

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import type { ComparableDeal } from '@/lib/valuation';

/**
 * P2 ACCURACY SPEC §E (core.projects #33): "...a comparable-deals table
 * (comparison of transactions) with adjustments; a price-trend chart for
 * the street/neighborhood...". The table half already exists above this
 * component (the "העסקאות שההערכה נשענת עליהן" toggle) — this is the chart
 * half, built purely from the same `valuation.comparables` array (no new
 * fetch, no new source): the deals `valuate()` already selected in its own
 * priority order (property → building → street → area).
 */
export default function ComparablesTrend({ comparables }: { comparables: ComparableDeal[] }) {
  const points = (comparables ?? [])
    .filter((d): d is ComparableDeal & { pricePerSqm: number } => !!d.date && d.pricePerSqm != null)
    .map((d) => ({ date: d.date, pricePerSqm: d.pricePerSqm }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (points.length < 3) return null;

  const first = points[0].pricePerSqm;
  const last = points[points.length - 1].pricePerSqm;
  const changePct = first ? Math.round(((last - first) / first) * 1000) / 10 : null;

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-[13px] font-bold text-navy">מגמת מחיר למ״ר בעסקאות ההשוואה</h4>
        {changePct != null && (
          <span className="text-[12px] text-muted">
            שינוי בין העסקה המוקדמת לעדכנית שבטבלה:{' '}
            <b className={changePct >= 0 ? 'text-tealD' : 'text-red-600'}>
              {changePct > 0 ? '+' : ''}
              {changePct}%
            </b>
          </span>
        )}
      </div>

      <div className="mt-2 h-48" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e3e8f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#5b6577' }}
              minTickGap={24}
              tickFormatter={(d) => new Date(d).toLocaleDateString('he-IL', { year: '2-digit', month: 'short' })}
            />
            <YAxis tick={{ fontSize: 10, fill: '#5b6577' }} domain={['auto', 'auto']} width={55} />
            <Tooltip
              contentStyle={{ fontFamily: 'Heebo', fontSize: 12, direction: 'rtl' }}
              labelFormatter={(l: string) => new Date(l).toLocaleDateString('he-IL')}
              formatter={(val: number) => [`${new Intl.NumberFormat('he-IL').format(val)} ₪`, 'מחיר למ״ר']}
            />
            <Line
              type="monotone"
              dataKey="pricePerSqm"
              stroke="#0ea5a4"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-1 text-[11px] leading-relaxed text-muted">
        כל נקודה היא עסקת השוואה אמיתית מתוך {points.length} העסקאות בעלות תאריך ומחיר-למ״ר בטבלה
        שמעל — לא אינטרפולציה, ולא מדד ארצי.
      </p>
    </div>
  );
}
