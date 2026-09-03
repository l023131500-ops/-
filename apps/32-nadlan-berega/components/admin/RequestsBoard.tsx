'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiUrl } from '@/lib/basepath';
import type { ReportRequestRow, TabuDocRow } from '@/lib/requests';

const STATUS_LABEL: Record<string, string> = {
  pending: 'ממתין',
  processing: 'בעיבוד',
  sent: 'נשלח',
  failed: 'נכשל',
};

const STATUS_TONE: Record<string, string> = {
  pending: 'bg-gold/15 text-[#8a6d24] border-gold/40',
  processing: 'bg-slate-100 text-slate-600 border-slate-300',
  sent: 'bg-teal/10 text-tealD border-teal/30',
  failed: 'bg-red-50 text-red-700 border-red-200',
};

const SCOPE_LABEL: Record<string, string> = {
  apartment: 'דירה',
  entrance: 'כניסה',
  building: 'בניין שלם',
};

/**
 * לוח הבקשות. ההתראה היא מספר הממתינים, וכל שורה נפתחת לפעולות:
 * הפקה ושליחה למייל, והעלאת נסח טאבו + ניתוח שמצורף לדוח.
 *
 * הטוקן נשמר ב-state בלבד ונשלח בכותרת `x-admin-token`. הוא לא נכנס ל-URL
 * ולא ל-localStorage — כתובת עם טוקן נשמרת בהיסטוריה של הדפדפן וב-Referer.
 */
export default function RequestsBoard({ token }: { token: string }) {
  const [rows, setRows] = useState<ReportRequestRow[] | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const [emailOk, setEmailOk] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [flash, setFlash] = useState<{ id: number; text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(apiUrl('/api/admin/requests'), {
        headers: { 'x-admin-token': token },
        cache: 'no-store',
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'שגיאה');
      setRows(j.requests ?? []);
      setPending(j.pending ?? null);
      setEmailOk(!!j.emailConfigured);
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setRows([]);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(id: number, action: 'process' | 'retry') {
    setBusy(id);
    setFlash(null);
    try {
      const res = await fetch(apiUrl('/api/admin/requests'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ id, action }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'שגיאה');
      setFlash({
        id,
        ok: true,
        text:
          action === 'retry'
            ? 'הבקשה הוחזרה לתור.'
            : `נשלח ל${j.headline ? ' — ' + j.headline : ''}. עלות הפקה: $${(j.costUsd ?? 0).toFixed(3)}${j.tabuAttached ? ` · צורפו ${j.tabuAttached} נסחים` : ''}`,
      });
      await load();
    } catch (e: any) {
      setFlash({ id, ok: false, text: String(e?.message ?? e) });
      await load();
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
          {pending ? `${pending} בקשות ממתינות להפקה` : 'אין בקשות ממתינות'}
        </div>
        <button
          onClick={load}
          className="rounded-xl border border-line bg-surface px-4 py-2 text-[13px] font-bold text-navy hover:border-teal"
        >
          רענון
        </button>
        {emailOk === false && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-[13px] font-semibold text-red-700">
            שליחת מייל אינה מוגדרת (RESEND_API_KEY + RESEND_FROM) — לא ניתן להפיק ולשלוח.
          </div>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}

      {rows.length === 0 && !error && (
        <p className="mt-4 text-[14px] text-muted">עוד לא נרשמו בקשות דוח.</p>
      )}

      <div className="mt-4 space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="rounded-2xl border border-line bg-surface p-4 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${STATUS_TONE[r.status]}`}
                  >
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                  <span className="text-[15px] font-black text-navy">{r.query}</span>
                  <span className="text-[12px] font-bold text-muted">
                    דוח {r.tier === 'basic' ? 'רגיל' : r.tier === 'premium' ? 'מקיף' : 'VIP'}
                  </span>
                </div>
                <div className="mt-1 text-[13px] text-ink" dir="ltr">
                  {r.email}
                </div>
                <div className="mt-0.5 text-[12px] text-muted">
                  {[
                    r.full_name,
                    r.phone,
                    r.entrance && `כניסה ${r.entrance}`,
                    r.floor && `קומה ${r.floor}`,
                    r.rooms && `${r.rooms} חדרים`,
                    new Date(r.requested_at).toLocaleString('he-IL'),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
                {r.notes && <div className="mt-1 text-[12px] text-ink">הערה: {r.notes}</div>}
                {r.error && (
                  <div className="mt-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-[12px] leading-relaxed text-red-700">
                    {r.error}
                  </div>
                )}
                {r.status === 'sent' && (
                  <div className="mt-1 text-[12px] text-tealD">
                    נשלח ב-{r.sent_at ? new Date(r.sent_at).toLocaleString('he-IL') : '—'}
                    {r.cost_usd != null && ` · עלות הפקה $${Number(r.cost_usd).toFixed(3)}`}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                {r.status === 'pending' && (
                  <button
                    disabled={busy === r.id || emailOk === false}
                    onClick={() => act(r.id, 'process')}
                    className="rounded-xl bg-teal px-4 py-2 text-[13px] font-bold text-white hover:bg-tealD disabled:opacity-50"
                  >
                    {busy === r.id ? 'מפיק ושולח…' : 'הפק ושלח למייל'}
                  </button>
                )}
                {(r.status === 'failed' || r.status === 'processing') && (
                  <button
                    disabled={busy === r.id}
                    onClick={() => act(r.id, 'retry')}
                    className="rounded-xl border border-line bg-surface px-4 py-2 text-[13px] font-bold text-navy hover:border-teal disabled:opacity-50"
                  >
                    החזר לתור
                  </button>
                )}
                <button
                  onClick={() => setOpen(open === r.id ? null : r.id)}
                  className="rounded-xl border border-line bg-surface px-4 py-2 text-[13px] font-bold text-navy hover:border-teal"
                >
                  {open === r.id ? 'סגור טאבו' : 'נסח טאבו'}
                </button>
              </div>
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

            {open === r.id && <TabuPanel token={token} request={r} />}
          </div>
        ))}
      </div>
    </div>
  );
}

/** העלאת נסח וניתוחו, לבקשה מסוימת. */
function TabuPanel({ token, request }: { token: string; request: ReportRequestRow }) {
  const [docs, setDocs] = useState<TabuDocRow[] | null>(null);
  const [analysisOk, setAnalysisOk] = useState<boolean | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    gush: request.gush ?? '',
    helka: request.helka ?? '',
    tat_helka: '',
    scope: 'apartment',
    entrance: request.entrance ?? '',
    apartment: '',
    doc_type: 'regular',
  });
  const [file, setFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(apiUrl(`/api/admin/tabu?request_id=${request.id}`), {
        headers: { 'x-admin-token': token },
        cache: 'no-store',
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'שגיאה');
      setDocs(j.documents ?? []);
      setAnalysisOk(!!j.analysisConfigured);
    } catch (e: any) {
      setMsg({ text: String(e?.message ?? e), ok: false });
      setDocs([]);
    }
  }, [request.id, token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setMsg({ text: 'לא נבחר קובץ.', ok: false });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('request_id', String(request.id));
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
      const res = await fetch(apiUrl('/api/admin/tabu'), {
        method: 'PUT',
        headers: { 'x-admin-token': token },
        body: fd,
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'שגיאה');
      setMsg({ text: 'הנסח הועלה. אפשר להריץ ניתוח.', ok: true });
      setFile(null);
      await load();
    } catch (e: any) {
      setMsg({ text: String(e?.message ?? e), ok: false });
    } finally {
      setBusy(false);
    }
  }

  async function analyze(id: number) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(apiUrl('/api/admin/tabu'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ id }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'שגיאה');
      setMsg({ text: 'הניתוח הושלם והוא יצורף לדוח.', ok: true });
      await load();
    } catch (e: any) {
      setMsg({ text: String(e?.message ?? e), ok: false });
    } finally {
      setBusy(false);
    }
  }

  const input = 'mt-1 w-full rounded-lg border border-line px-2.5 py-1.5 text-[13px] outline-none focus:border-teal';

  return (
    <div className="mt-4 rounded-xl border border-line bg-bgsoft p-4">
      <div className="text-[14px] font-black text-navy">נסח טאבו</div>
      <p className="mt-1 text-[12px] leading-relaxed text-muted">
        השיוך חובה: נסח מרוכז כולל את כל תתי-החלקות בבניין, ובלי לסמן לאיזו דירה או כניסה
        הוא מתייחס הנתונים המשפטיים היו מוצגים לדירה הלא נכונה.
      </p>

      <form onSubmit={upload} className="mt-3 grid gap-3 sm:grid-cols-4">
        <label className="text-[12px] font-semibold text-ink">
          גוש *
          <input value={form.gush} onChange={(e) => setForm({ ...form, gush: e.target.value })} className={input} />
        </label>
        <label className="text-[12px] font-semibold text-ink">
          חלקה *
          <input value={form.helka} onChange={(e) => setForm({ ...form, helka: e.target.value })} className={input} />
        </label>
        <label className="text-[12px] font-semibold text-ink">
          היקף הנסח
          <select
            value={form.scope}
            onChange={(e) => setForm({ ...form, scope: e.target.value })}
            className={input}
          >
            <option value="apartment">דירה</option>
            <option value="entrance">כניסה</option>
            <option value="building">בניין שלם (מרוכז)</option>
          </select>
        </label>
        <label className="text-[12px] font-semibold text-ink">
          סוג הנסח
          <select
            value={form.doc_type}
            onChange={(e) => setForm({ ...form, doc_type: e.target.value })}
            className={input}
          >
            <option value="regular">רגיל</option>
            <option value="historical">היסטורי</option>
            <option value="concentrated">מרוכז</option>
          </select>
        </label>

        <label className="text-[12px] font-semibold text-ink">
          תת-חלקה
          <input
            value={form.tat_helka}
            onChange={(e) => setForm({ ...form, tat_helka: e.target.value })}
            className={input}
          />
        </label>
        <label className="text-[12px] font-semibold text-ink">
          מספר דירה
          <input
            value={form.apartment}
            onChange={(e) => setForm({ ...form, apartment: e.target.value })}
            className={input}
          />
        </label>
        <label className="text-[12px] font-semibold text-ink">
          מספר כניסה
          <input
            value={form.entrance}
            onChange={(e) => setForm({ ...form, entrance: e.target.value })}
            className={input}
          />
        </label>
        <label className="text-[12px] font-semibold text-ink">
          קובץ (PDF / תמונה) *
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 w-full text-[12px]"
          />
        </label>

        <div className="sm:col-span-4">
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-navysurface px-4 py-2 text-[13px] font-bold text-white hover:bg-navysurface/90 disabled:opacity-50"
          >
            {busy ? 'מעלה…' : 'העלאת נסח טאבו'}
          </button>
        </div>
      </form>

      {msg && (
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-[12px] font-semibold ${
            msg.ok ? 'bg-teal/10 text-tealD' : 'bg-red-50 text-red-700'
          }`}
        >
          {msg.text}
        </p>
      )}

      {analysisOk === false && (
        <p className="mt-2 text-[12px] font-semibold text-[#8a6d24]">
          ניתוח נסח דורש מפתח AI. הקבצים נשמרים, אך לא יוצגו נתונים משפטיים בלי קריאה
          אמיתית של הנסח.
        </p>
      )}

      {docs && docs.length > 0 && (
        <ul className="mt-3 divide-y divide-line/70">
          {docs.map((d) => (
            <li key={d.id} className="py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 text-[13px]">
                  <b className="text-navy">{SCOPE_LABEL[d.scope] ?? d.scope}</b>
                  {d.tat_helka && <> · תת-חלקה {d.tat_helka}</>}
                  {d.entrance && <> · כניסה {d.entrance}</>}
                  {d.apartment && <> · דירה {d.apartment}</>}
                  <span className="text-muted"> · {d.file_name}</span>
                  <div className="text-[11px] text-muted">
                    גוש {d.gush} חלקה {d.helka} · הועלה{' '}
                    {new Date(d.uploaded_at).toLocaleString('he-IL')}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[11px] font-bold text-muted">
                    {d.analysis_status === 'done'
                      ? 'נותח ✓'
                      : d.analysis_status === 'running'
                        ? 'בניתוח…'
                        : d.analysis_status === 'failed'
                          ? 'ניתוח נכשל'
                          : 'טרם נותח'}
                  </span>
                  <button
                    disabled={busy || analysisOk === false}
                    onClick={() => analyze(d.id)}
                    className="rounded-lg border border-line bg-surface px-3 py-1.5 text-[12px] font-bold text-navy hover:border-teal disabled:opacity-50"
                  >
                    {d.analysis_status === 'done' ? 'ניתוח מחדש' : 'ניתוח טאבו'}
                  </button>
                </div>
              </div>

              {d.analysis_error && (
                <p className="mt-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700">
                  {d.analysis_error}
                </p>
              )}

              {d.analysis && (
                <div className="mt-2 rounded-lg border border-line bg-surface p-3 text-[12px] leading-relaxed text-ink">
                  {d.analysis.owners.length > 0 && (
                    <div>
                      <b>בעלות:</b>{' '}
                      {d.analysis.owners
                        .map((o) => o.name + (o.share ? ` (${o.share})` : ''))
                        .join(' · ')}
                    </div>
                  )}
                  <div>
                    <b>משכנתאות:</b>{' '}
                    {d.analysis.mortgages.length
                      ? d.analysis.mortgages
                          .map((m) => m.holder + (m.amount ? ` — ${m.amount}` : ''))
                          .join(' · ')
                      : 'לא נמצאו'}
                  </div>
                  <div>
                    <b>הערות אזהרה:</b>{' '}
                    {d.analysis.cautionNotes.length
                      ? d.analysis.cautionNotes
                          .map((c) => c.kind + (c.inFavourOf ? ` לטובת ${c.inFavourOf}` : ''))
                          .join(' · ')
                      : 'לא נמצאו'}
                  </div>
                  {d.analysis.perFloorRights?.length > 0 && (
                    <div>
                      <b>פירוט לפי קומה/תת-חלקה:</b>
                      <ul className="mt-0.5 list-disc pe-4">
                        {d.analysis.perFloorRights.map((f, i) => (
                          <li key={i}>{(f.floor ? `קומה ${f.floor} — ` : '') + f.summary}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(d.analysis.parcelArea || d.analysis.subParcelArea || d.analysis.sharedAreas) && (
                    <div>
                      <b>שטח רשום בנסח:</b>{' '}
                      {[
                        d.analysis.parcelArea && `חלקה ${d.analysis.parcelArea}`,
                        d.analysis.subParcelArea && `תת-חלקה ${d.analysis.subParcelArea}`,
                        d.analysis.sharedAreas && `משותף ${d.analysis.sharedAreas}`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  )}
                  {d.analysis.unreadable.length > 0 && (
                    <div className="mt-1 text-[#8a6d24]">
                      <b>לא נקרא מהנסח:</b> {d.analysis.unreadable.join(' · ')}
                    </div>
                  )}
                  {d.analysis.summary && (
                    <p className="mt-1.5 text-muted">{d.analysis.summary}</p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
