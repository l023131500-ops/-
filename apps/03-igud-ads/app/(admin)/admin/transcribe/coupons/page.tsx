"use client";

import { useEffect, useState } from "react";

type Coupon = {
  id: string;
  code: string;
  max_uploads: number;
  used_uploads: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", max_uploads: 1, expires_at: "" });
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/modaot/api/admin/transcribe/coupons", { cache: "no-store" });
    if (res.ok) setCoupons(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const generateCode = () => {
    const c = Math.random().toString(36).slice(2, 6).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    setForm((f) => ({ ...f, code: c }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/modaot/api/admin/transcribe/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.trim(),
          max_uploads: form.max_uploads,
          expires_at: form.expires_at || null,
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ code: "", max_uploads: 1, expires_at: "" });
        load();
      } else {
        const d = await res.json();
        alert(d.error || "שגיאה");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggle = async (id: string, is_active: boolean) => {
    if (busyId) return;
    setBusyId(id);
    try {
      const res = await fetch("/modaot/api/admin/transcribe/coupons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_active: !is_active }),
      });
      if (res.ok) {
        await load();
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "עדכון הקופון נכשל");
      }
    } catch {
      alert("עדכון הקופון נכשל");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("למחוק קופון זה?")) return;
    if (busyId) return;
    setBusyId(id);
    try {
      const res = await fetch(`/modaot/api/admin/transcribe/coupons?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        await load();
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "מחיקת הקופון נכשלה");
      }
    } catch {
      alert("מחיקת הקופון נכשלה");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-serif font-bold text-brand-blue">קופונים</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ קופון חדש</button>
      </div>

      {showForm && (
        <div className="card">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label" htmlFor="coupon-code">קוד</label>
              <div className="flex gap-2">
                <input
                  id="coupon-code"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="input flex-1 font-mono"
                  required
                  aria-required="true"
                />
                <button type="button" onClick={generateCode} className="btn-outline">
                  צור אוטומטית
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="coupon-max-uploads">מספר העלאות מותר</label>
                <input
                  id="coupon-max-uploads"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={form.max_uploads}
                  onChange={(e) => setForm({ ...form, max_uploads: parseInt(e.target.value) })}
                  className="input"
                  required
                  aria-required="true"
                />
              </div>
              <div>
                <label className="label" htmlFor="coupon-expires-at">תפוגה (אופציונלי)</label>
                <input
                  id="coupon-expires-at"
                  type="date"
                  value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                  className="input"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn-outline flex-1">
                ביטול
              </button>
              <button type="submit" disabled={submitting} className="btn-primary flex-1">
                {submitting ? "שומר…" : "שמור"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-slate-100 text-sm text-slate-600">
            <tr>
              <th className="px-4 py-3">קוד</th>
              <th className="px-4 py-3">שימוש</th>
              <th className="px-4 py-3">תפוגה</th>
              <th className="px-4 py-3">סטטוס</th>
              <th className="px-4 py-3">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">טוען...</td>
              </tr>
            )}
            {!loading && coupons.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">אין קופונים</td>
              </tr>
            )}
            {coupons.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono font-bold">{c.code}</td>
                <td className="px-4 py-3">{c.used_uploads} / {c.max_uploads}</td>
                <td className="px-4 py-3 text-sm">
                  {c.expires_at ? new Date(c.expires_at).toLocaleDateString("he-IL") : "—"}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggle(c.id, c.is_active)}
                    disabled={busyId === c.id}
                    className={`px-2 py-1 rounded text-xs disabled:opacity-50 ${
                      c.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {c.is_active ? "פעיל" : "מושבת"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => remove(c.id)}
                    disabled={busyId === c.id}
                    className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                  >
                    מחק
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
