'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiUrl } from '@/lib/basepath';
import type { AreaAlertRow } from '@/lib/areaalerts';

/**
 * לוח ההתראות האזוריות. אין עדיין תזמון אוטומטי (Vercel Cron/pg_cron) — זה
 * הכפתור הידני שיזמן יפעיל בעתיד. "בדוק את כולן" מריץ את אותה בדיקה על כל
 * ההתראות הפעילות ברצף, ומדווח לכל אחת אם נמצאו עסקאות חדשות ונשלח מייל.
 */
export default function AreaAlertsBoard({ token }: { token: string }) {
  const [rows, setRows] = useState<AreaAlertRow[] | null>(null);
  const [emailOk, setEmailOk] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | 'all' | null>(null);
  const [flash, setFlash] = useState<Record<number, { text: string; ok: boolean }>>({});

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(apiUrl('/api/admin/area-alerts'), {
        headers: { 'x-admin-token': token },
        cache: 'no-store',
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'שגיאה');
      setRows(j.alerts ?? []);
      setEmailOk(!!j.emailConfigured);
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setRows([]);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  function describe(r: { emailed: boolean; newDealsCount: number; error: string | null }): {
    text: string;
    ok: boolean;
  } {
    if (r.error) return { text: r.error, ok: false };
    if (r.emailed) return { text: `נמצאו ${r.newDealsCount} עסקאות חדשות — נשלח מייל`, ok: true };
    return { text: 'נבדק — אין עסקה חדשה', ok: true };
  }

  async function checkOne(id: number) {
    setBusy(id);
    try {
      const res = await fetch(apiUrl('/api/admin/area-alerts'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ id }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'שגיאה');
      setFlash((f) => ({ ...f, [id]: describe(j.result) }));
      await load();
    } catch (e: any) {
      setFlash((f) => ({ ...f, [id]: { text: String(e?.message ?? e), ok: false } }));
    } finally {
      setBusy(null);
    }
  }

  async function checkAll() {
    setBusy('all');
    try {
      const res = await fetch(apiUrl('/api/admin/area-alerts'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ action: 'check-all' }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'שגיאה');
      const next: Record<number, { text: string; ok: boolean }> = {};
      for (const r of j.results ?? []) next[r.id] = describe(r);
      setFlash(next);
      await load();
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(null);
    }
  }

  if (rows === null) return <p className="mt-3 text-[14px] text-muted">טוען התראות…</p>;

  const active = rows.filter((r) => r.active);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-xl border border-line bg-surface px-4 py-2 text-[14px] font-bold text-navy">
          {active.length} התראות פעילות מתוך {rows.length}
        </div>
        <button
          onClick={checkAll}
          disabled={busy !== null || !active.length}
          className="rounded-xl bg-teal px-4 py-2 text-[13px] font-bold text-white hover:bg-tealD disabled:opacity-50"
        >
          {busy === 'all' ? 'בודק את כולן…' : 'בדוק את כולן עכשיו'}
        </button>
        <button
          onClick={load}
          className="rounded-xl border border-line bg-surface px-4 py-2 text-[13px] font-bold text-navy hover:border-teal"
        >
          רענון
        </button>
        {emailOk === false && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-[13px] font-semibold text-red-700">
            שליחת מייל אינה מוגדרת (RESEND_API_KEY + RESEND_FROM) — הבדיקה תרוץ אך לא תשלח.
          </div>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}

      {rows.length === 0 && !error && (
        <p className="mt-4 text-[14px] text-muted">עוד לא נרשמו התראות אזוריות.</p>
      )}

      <div className="mt-4 space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="rounded-2xl border border-line bg-surface p-4 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${
                      r.active
                        ? 'border-teal/30 bg-teal/10 text-tealD'
                        : 'border-slate-300 bg-slate-100 text-slate-500'
                    }`}
                  >
                    {r.active ? 'פעילה' : 'מושבתת'}
                  </span>
                  <span className="text-[15px] font-black text-navy">
                    {r.address || (r.gush && r.helka ? `גוש ${r.gush} חלקה ${r.helka}` : r.city) || 'ללא זיהוי'}
                  </span>
                </div>
                <div className="mt-1 text-[13px] text-ink" dir="ltr">
                  {r.email}
                </div>
                <div className="mt-0.5 text-[12px] text-muted">
                  {[
                    r.city,
                    `נרשם ${new Date(r.created_at).toLocaleString('he-IL')}`,
                    r.last_checked_at && `נבדק לאחרונה ${new Date(r.last_checked_at).toLocaleString('he-IL')}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
                {r.last_error && (
                  <div className="mt-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-[12px] leading-relaxed text-red-700">
                    {r.last_error}
                  </div>
                )}
              </div>

              <button
                disabled={busy !== null}
                onClick={() => checkOne(r.id)}
                className="shrink-0 rounded-xl border border-line bg-surface px-4 py-2 text-[13px] font-bold text-navy hover:border-teal disabled:opacity-50"
              >
                {busy === r.id ? 'בודק…' : 'בדוק עכשיו'}
              </button>
            </div>

            {flash[r.id] && (
              <div
                className={`mt-3 rounded-xl px-3.5 py-2 text-[13px] font-semibold ${
                  flash[r.id].ok ? 'bg-teal/10 text-tealD' : 'bg-red-50 text-red-700'
                }`}
              >
                {flash[r.id].text}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
