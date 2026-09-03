'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiUrl } from '@/lib/basepath';
import type { DocumentRequestRow } from '@/lib/store';

const DOC_LABEL: Record<string, string> = {
  tabu: 'נסח טאבו',
  rami: 'אישור זכויות רמ"י',
  permit: 'מידע היתרי בנייה / חריגות',
  other: 'מסמך אחר',
};

const STATUS_LABEL: Record<string, string> = {
  new: 'חדש',
  contacted: 'נוצר קשר',
};

const STATUS_TONE: Record<string, string> = {
  new: 'bg-gold/15 text-[#8a6d24] border-gold/40',
  contacted: 'bg-teal/10 text-tealD border-teal/30',
};

/**
 * לוח בקשות המסמכים הכלליות — `RequestForm` (דף הבית + `/request`) כותבת
 * ל-`document_requests` מאז ומתמיד, אבל עד ללוח הזה אף מסך-ניהול לא קרא
 * ממנה: כל בקשה (שם+דרך-התקשרות+איזה מסמך) נעלמה בשקט אחרי ה-"נשמרה ✓"
 * שהלקוח רואה. ראו `lib/store.ts`'s `listDocumentRequests`.
 */
export default function DocumentRequestsBoard({ token }: { token: string }) {
  const [rows, setRows] = useState<DocumentRequestRow[] | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [flash, setFlash] = useState<{ id: number; text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(apiUrl('/api/admin/document-requests'), {
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

  async function markContacted(id: number) {
    setBusy(id);
    setFlash(null);
    try {
      const res = await fetch(apiUrl('/api/admin/document-requests'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ id, action: 'mark_contacted' }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'שגיאה');
      setFlash({ id, ok: true, text: 'סומן כ"נוצר קשר".' });
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
          {pending ? `${pending} בקשות חדשות` : 'אין בקשות חדשות'}
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
        <p className="mt-4 text-[14px] text-muted">עוד לא נרשמה בקשת מסמך מלקוח.</p>
      )}

      <div className="mt-4 space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="rounded-2xl border border-line bg-surface p-4 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${STATUS_TONE[r.status] ?? STATUS_TONE.new}`}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                  <span className="text-[15px] font-black text-navy">
                    {DOC_LABEL[r.doc_type] ?? r.doc_type}
                  </span>
                </div>
                <div className="mt-1 text-[13px] text-ink" dir="ltr">
                  {[r.email, r.phone].filter(Boolean).join(' · ')}
                </div>
                <div className="mt-0.5 text-[12px] text-muted">
                  {[
                    r.full_name,
                    r.gush && r.helka ? `גוש ${r.gush} חלקה ${r.helka}${r.tat_helka ? `/${r.tat_helka}` : ''}` : null,
                    r.address,
                    new Date(r.created_at).toLocaleString('he-IL'),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
                {r.notes && <div className="mt-1 text-[12px] text-ink">הערה: {r.notes}</div>}
              </div>

              {r.status === 'new' && (
                <button
                  disabled={busy === r.id}
                  onClick={() => markContacted(r.id)}
                  className="shrink-0 rounded-xl bg-teal px-4 py-2 text-[13px] font-bold text-white hover:bg-tealD disabled:opacity-50"
                >
                  {busy === r.id ? 'מסמן…' : 'סומן שנוצר קשר'}
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
