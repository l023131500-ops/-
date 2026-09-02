'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiUrl } from '@/lib/basepath';
import type { TabuRequestRow } from '@/lib/requests';

const STATUS_LABEL: Record<string, string> = {
  pending: 'ממתין',
  sent: 'נשלח לרשם',
  fulfilled: 'הושלם',
  failed: 'נכשל',
};

const STATUS_TONE: Record<string, string> = {
  pending: 'bg-gold/15 text-[#8a6d24] border-gold/40',
  sent: 'bg-slate-100 text-slate-600 border-slate-300',
  fulfilled: 'bg-teal/10 text-tealD border-teal/30',
  failed: 'bg-red-50 text-red-700 border-red-200',
};

/**
 * לוח בקשות הנסח שהלקוחות עצמם פותחים מתוך דוח VIP (`TabuRequestPanel`).
 * ⚠️ בכוונה **לא** נועל את העלאת הנסח הקיימת ב-`TabuPanel` (RequestsBoard) —
 * זו הייתה יכולת קיימת (צוות מעלה נסח יזום, בלי בקשת לקוח קודמת) ונעילה
 * הייתה מסירה אותה. הלוח הזה הוא רק הנראות + הפעולה האנושית "נשלח לרשם".
 */
export default function TabuRequestsBoard({ token }: { token: string }) {
  const [rows, setRows] = useState<TabuRequestRow[] | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [flash, setFlash] = useState<{ id: number; text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(apiUrl('/api/admin/tabu-requests'), {
        headers: { 'x-admin-token': token },
        cache: 'no-store',
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'שגיאה');
      setRows(j.requests ?? []);
      setPending(j.pending ?? null);
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setRows([]);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markSent(id: number) {
    setBusy(id);
    setFlash(null);
    try {
      const res = await fetch(apiUrl('/api/admin/tabu-requests'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ id, action: 'mark_sent' }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'שגיאה');
      setFlash({ id, ok: true, text: 'סומן כנשלח לרשם המקרקעין. אפשר עכשיו להעלות את הנסח בלוח "בקשות דוח".' });
      await load();
    } catch (e: any) {
      setFlash({ id, ok: false, text: String(e?.message ?? e) });
    } finally {
      setBusy(null);
    }
  }

  if (rows === null) return <p className="mt-3 text-[14px] text-muted">טוען בקשות…</p>;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div
          className={`rounded-xl border px-4 py-2 text-[14px] font-bold ${
            pending ? 'border-gold/50 bg-gold/10 text-[#7a5f1f]' : 'border-line bg-surface text-muted'
          }`}
        >
          {pending ? `${pending} בקשות ממתינות להזמנה` : 'אין בקשות ממתינות'}
        </div>
        <button
          onClick={load}
          className="rounded-xl border border-line bg-surface px-4 py-2 text-[13px] font-bold text-navy hover:border-teal"
        >
          רענון
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
      )}

      {rows.length === 0 && !error && (
        <p className="mt-4 text-[14px] text-muted">עוד לא נרשמה בקשת נסח מלקוח.</p>
      )}

      <div className="mt-4 space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="rounded-2xl border border-line bg-surface p-4 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${STATUS_TONE[r.status]}`}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                  <span className="text-[15px] font-black text-navy">
                    גוש {r.gush} חלקה {r.helka}
                  </span>
                  {r.grade === 'urgent' && (
                    <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">
                      דחוף
                    </span>
                  )}
                </div>
                <div className="mt-1 text-[13px] text-ink" dir="ltr">
                  {r.requester_email}
                </div>
                <div className="mt-0.5 text-[12px] text-muted">
                  {[
                    r.requester_name,
                    r.requester_phone,
                    r.tat_helka && `תת-חלקה ${r.tat_helka}`,
                    r.entrance && `כניסה ${r.entrance}`,
                    r.apartment && `דירה ${r.apartment}`,
                    [r.address, r.city].filter(Boolean).join(', '),
                    new Date(r.created_at).toLocaleString('he-IL'),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
                {r.notes && <div className="mt-1 text-[12px] text-ink">הערה: {r.notes}</div>}
                {r.status === 'fulfilled' && (
                  <div className="mt-1.5 rounded-lg bg-teal/10 px-2.5 py-1.5 text-[12px] text-tealD">
                    הנסח שסופק{r.fulfilled_document_name ? ` (${r.fulfilled_document_name})` : ''}
                    {r.fulfilled_at ? ` — ${new Date(r.fulfilled_at).toLocaleString('he-IL')}` : ''}
                  </div>
                )}
                {r.admin_email_sent === false && r.admin_email_error && (
                  <div className="mt-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-[12px] leading-relaxed text-red-700">
                    התראת המייל לא נשלחה: {r.admin_email_error}
                  </div>
                )}
              </div>

              {r.status === 'pending' && (
                <button
                  disabled={busy === r.id}
                  onClick={() => markSent(r.id)}
                  className="shrink-0 rounded-xl bg-teal px-4 py-2 text-[13px] font-bold text-white hover:bg-tealD disabled:opacity-50"
                >
                  {busy === r.id ? 'מסמן…' : 'סומן כהוזמן — נשלח לרשם המקרקעין'}
                </button>
              )}
            </div>

            {flash?.id === r.id && (
              <div
                className={`mt-3 rounded-xl px-3.5 py-2 text-[13px] font-semibold ${
                  flash.ok ? 'bg-teal/10 text-tealD' : 'bg-red-50 text-red-700'
                }`}
              >
                {flash.text}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
