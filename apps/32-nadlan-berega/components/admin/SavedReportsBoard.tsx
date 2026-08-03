'use client';

import { useEffect, useState } from 'react';
import { apiUrl } from '@/lib/basepath';
import { TIER_LABEL } from '@/lib/report';
import type { ReportTier } from '@/lib/report';
import { ASSET_LABEL, isAssetType } from '@/lib/assettype';

/**
 * §8 · כל הדוחות שהופקו, במקום אחד, כל אחד עם הקישור הקבוע שלו.
 *
 * ⚠️ הקישור מוצג כטקסט מלא ולא רק ככפתור: הוא נועד להישלח ללקוח בוואטסאפ
 * או במייל, ולכן צריך להיות ניתן להעתקה בלי לפתוח את הדוח קודם.
 */

interface Row {
  slug: string;
  headline: string | null;
  gush: string | null;
  helka: string | null;
  tat_helka: string | null;
  city: string | null;
  street: string | null;
  house_num: string | null;
  entrance: string | null;
  floor: string | null;
  apartment: string | null;
  asset_type: string;
  best_tier: string;
  generations: number;
  views: number;
  first_seen_at: string;
  updated_at: string;
}

export default function SavedReportsBoard({ token }: { token: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    const url = apiUrl(`/api/admin/saved${token ? `?key=${encodeURIComponent(token)}` : ''}`);
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (d?.error) setError(d.error);
        else setRows(Array.isArray(d?.reports) ? d.reports : []);
      })
      .catch(() => setError('לא הצלחנו לטעון את רשימת הדוחות.'));
  }, [token]);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error}
      </div>
    );
  }
  if (!rows) return <div className="text-sm text-muted">טוען…</div>;
  if (!rows.length) {
    return (
      <div className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">
        עוד לא הופק אף דוח. כל דוח שיופק יישמר כאן אוטומטית, עם קישור קבוע.
      </div>
    );
  }

  const needle = q.trim();
  const shown = needle
    ? rows.filter((r) =>
        [r.headline, r.city, r.street, r.gush, r.helka, r.slug]
          .filter(Boolean)
          .some((v) => String(v).includes(needle)),
      )
    : rows;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="סינון לפי כתובת, עיר, גוש או מזהה"
          aria-label="סינון הדוחות השמורים"
          type="search"
          className="w-full max-w-sm rounded-lg border border-line bg-surface px-3 py-2 text-[13px] outline-none focus:border-teal"
        />
        <span className="text-[12px] text-muted">
          {shown.length} מתוך {rows.length} נכסים
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-card">
        <table className="w-full min-w-[900px] text-right text-sm">
          <thead>
            <tr className="border-b border-line bg-slate-50 text-[12px] text-muted">
              <th className="px-4 py-3 font-semibold">הנכס</th>
              <th className="px-4 py-3 font-semibold">זיהוי</th>
              <th className="px-4 py-3 font-semibold">סוג · רמה</th>
              <th className="px-4 py-3 font-semibold">הפקות</th>
              <th className="px-4 py-3 font-semibold">עודכן</th>
              <th className="px-4 py-3 font-semibold">קישור קבוע</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const url = `${origin}${apiUrl(`/p/${r.slug}`)}`;
              const unit = [
                r.entrance ? `כניסה ${r.entrance}` : '',
                r.floor ? `קומה ${r.floor}` : '',
                r.apartment ? `דירה ${r.apartment}` : '',
                r.tat_helka ? `תת-חלקה ${r.tat_helka}` : '',
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <tr key={r.slug} className="border-b border-line/60 align-top last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-bold text-navy">{r.headline ?? '—'}</div>
                    {unit && <div className="mt-0.5 text-[11.5px] text-muted">{unit}</div>}
                  </td>
                  <td className="px-4 py-3 text-[12.5px] text-ink">
                    {r.gush && r.helka ? `גוש ${r.gush} חלקה ${r.helka}` : r.city ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-[12.5px] text-ink">
                    {isAssetType(r.asset_type) ? ASSET_LABEL[r.asset_type] : r.asset_type}
                    <span className="text-muted"> · </span>
                    {TIER_LABEL[r.best_tier as ReportTier] ?? r.best_tier}
                  </td>
                  <td className="px-4 py-3 text-[12.5px] text-ink">
                    {r.generations}
                    {r.views > 0 && <span className="text-muted"> · {r.views} צפיות</span>}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-muted">
                    {new Date(r.updated_at).toLocaleDateString('he-IL')}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={apiUrl(`/p/${r.slug}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] font-bold text-tealD hover:underline"
                    >
                      פתח ←
                    </a>
                    <div className="mt-1 max-w-[280px] truncate text-[11px] text-muted" title={url}>
                      {url}
                    </div>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(url)}
                      className="mt-1 rounded border border-line px-2 py-0.5 text-[11px] font-bold text-navy hover:border-teal"
                    >
                      העתק
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
