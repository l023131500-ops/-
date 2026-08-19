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

export default function PriceTrend({ points }: { points: { period: string; value: number }[] }) {
  if (!points || points.length < 3) return null;

  const first = points[0].value;
  const last = points[points.length - 1].value;
  const changePct = first ? Math.round(((last - first) / first) * 1000) / 10 : null;

  return (
    <div className="mt-6 rounded-2xl border border-line bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-black text-navy">מגמת מחירי הדירות בישראל</h3>
        {changePct != null && (
          <span className="text-[13px] text-muted">
            שינוי בתקופה המוצגת:{' '}
            <b className={changePct >= 0 ? 'text-tealD' : 'text-red-600'}>
              {changePct > 0 ? '+' : ''}
              {changePct}%
            </b>
          </span>
        )}
      </div>

      <div className="mt-4 h-64" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e3e8f0" />
            <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#5b6577' }} minTickGap={24} />
            <YAxis
              tick={{ fontSize: 11, fill: '#5b6577' }}
              domain={['auto', 'auto']}
              width={50}
            />
            <Tooltip
              contentStyle={{ fontFamily: 'Heebo', fontSize: 12, direction: 'rtl' }}
              labelFormatter={(l) => `תקופה: ${l}`}
              formatter={(v: any) => [v, 'ערך המדד']}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#0ea5a4"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        זהו המדד הארצי של הלשכה המרכזית לסטטיסטיקה — הוא מתאר את מגמת השוק בכללותו, לא את
        הנכס הזה.
      </p>
    </div>
  );
}
