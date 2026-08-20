"use client";

import { useEffect, useState } from "react";

type Entry = {
  id: string;
  style: string;
  term: string;
  replacement: string;
  notes: string | null;
  created_at: string;
};

const STYLES = [
  { value: "litvish", label: "ליטאי" },
  { value: "chassidish", label: "חסידי" },
  { value: "yiddish", label: "אידיש" },
];

export default function GlossaryPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ style: "litvish", term: "", replacement: "", notes: "" });

  const load = async () => {
    const url = filter ? `/api/admin/transcribe/glossary?style=${filter}` : "/modaot/api/admin/transcribe/glossary";
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) setEntries(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/modaot/api/admin/transcribe/glossary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ style: "litvish", term: "", replacement: "", notes: "" });
      load();
    } else {
      const d = await res.json();
      alert(d.error || "שגיאה");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("למחוק רשומה?")) return;
    await fetch(`/modaot/api/admin/transcribe/glossary?id=${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-serif font-bold text-brand-blue">מילון מונחים</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ הוסף</button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setFilter("")}
          className={`px-3 py-1.5 rounded text-sm ${!filter ? "bg-brand-bluesurface text-white" : "bg-surface border border-slate-200"}`}
        >
          הכל
        </button>
        {STYLES.map((s) => (
          <button
            key={s.value}
            onClick={() => setFilter(s.value)}
            className={`px-3 py-1.5 rounded text-sm ${filter === s.value ? "bg-brand-bluesurface text-white" : "bg-surface border border-slate-200"}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="card">
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="glossary-style" className="label">סגנון</label>
                <select
                  id="glossary-style"
                  value={form.style}
                  onChange={(e) => setForm({ ...form, style: e.target.value })}
                  className="input"
                >
                  {STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="glossary-term" className="label">מונח (לחיפוש)</label>
                <input
                  id="glossary-term"
                  value={form.term}
                  onChange={(e) => setForm({ ...form, term: e.target.value })}
                  className="input"
                  required
                  aria-required="true"
                />
              </div>
            </div>
            <div>
              <label htmlFor="glossary-replacement" className="label">החלפה</label>
              <input
                id="glossary-replacement"
                value={form.replacement}
                onChange={(e) => setForm({ ...form, replacement: e.target.value })}
                className="input"
                required
                aria-required="true"
              />
            </div>
            <div>
              <label htmlFor="glossary-notes" className="label">הערות (אופציונלי)</label>
              <input
                id="glossary-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="input"
              />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn-outline flex-1">
                ביטול
              </button>
              <button type="submit" className="btn-primary flex-1">שמור</button>
            </div>
          </form>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-slate-100 text-sm text-slate-600">
            <tr>
              <th className="px-4 py-3">סגנון</th>
              <th className="px-4 py-3">מונח</th>
              <th className="px-4 py-3">החלפה</th>
              <th className="px-4 py-3">הערות</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">טוען...</td></tr>}
            {!loading && entries.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">אין רשומות</td></tr>}
            {entries.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm">{STYLES.find((s) => s.value === e.style)?.label}</td>
                <td className="px-4 py-3 font-bold">{e.term}</td>
                <td className="px-4 py-3 text-brand-blue">{e.replacement}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{e.notes || "—"}</td>
                <td className="px-4 py-3">
                  <button onClick={() => remove(e.id)} className="text-red-600 hover:underline text-sm">
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
