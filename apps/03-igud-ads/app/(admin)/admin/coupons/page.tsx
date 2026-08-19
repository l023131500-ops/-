"use client";
import { useEffect, useState } from "react";

type Coupon = {
  id: string; code: string; max_designs: number; used_designs: number;
  expires_at: string | null; is_active: boolean; note: string | null; created_at: string;
};

export default function CouponsPage() {
  const [items, setItems] = useState<Coupon[]>([]);
  const [code, setCode] = useState("");
  const [maxD, setMaxD] = useState(3);
  const [exp, setExp] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch("/modaot/api/admin/coupons");
    const j = await r.json();
    setItems(j);
  }
  useEffect(() => { load(); }, []);

  async function generate() {
    setBusy(true);
    const r = await fetch("/modaot/api/admin/coupons", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code || null, max_designs: maxD, expires_at: exp || null, note }),
    });
    setBusy(false);
    if (r.ok) { setCode(""); setNote(""); setExp(""); setMaxD(3); load(); }
  }
  async function toggle(id: string, active: boolean) {
    await fetch("/modaot/api/admin/coupons", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: !active }),
    });
    load();
  }
  async function del(id: string) {
    if (!confirm("למחוק קופון זה?")) return;
    await fetch(`/modaot/api/admin/coupons?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-brand-dark mb-4">קופונים</h1>
      <div className="bg-surface rounded-xl border p-5 mb-6">
        <h2 className="font-serif font-bold mb-3">יצירת קופון חדש</h2>
        <div className="grid md:grid-cols-4 gap-3">
          <div><label className="label">קוד (ריק = אוטומטי)</label><input className="input" value={code} onChange={(e) => setCode(e.target.value)} /></div>
          <div><label className="label">מספר מודעות</label><input className="input" type="number" min={1} value={maxD} onChange={(e) => setMaxD(parseInt(e.target.value || "1"))} /></div>
          <div><label className="label">תוקף (אופציונלי)</label><input className="input" type="date" value={exp} onChange={(e) => setExp(e.target.value)} /></div>
          <div><label className="label">הערה</label><input className="input" value={note} onChange={(e) => setNote(e.target.value)} /></div>
        </div>
        <button className="btn-primary mt-3" disabled={busy} onClick={generate}>{busy ? "..." : "צור קופון"}</button>
      </div>

      <div className="bg-surface rounded-xl border overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-right">
            <tr>
              <th className="p-3">קוד</th><th className="p-3">בשימוש</th><th className="p-3">מקסימום</th>
              <th className="p-3">תוקף</th><th className="p-3">סטטוס</th><th className="p-3">הערה</th><th className="p-3">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3 font-mono">{c.code}</td>
                <td className="p-3">{c.used_designs}</td>
                <td className="p-3">{c.max_designs}</td>
                <td className="p-3">{c.expires_at ? new Date(c.expires_at).toLocaleDateString("he-IL") : "—"}</td>
                <td className="p-3">{c.is_active ? <span className="text-green-700">פעיל</span> : <span className="text-gray-500">השהוי</span>}</td>
                <td className="p-3">{c.note || "—"}</td>
                <td className="p-3 space-x-1 space-x-reverse">
                  <button className="text-brand-blue hover:underline text-xs" onClick={() => toggle(c.id, c.is_active)}>{c.is_active ? "השהה" : "הפעל"}</button>
                  <button className="text-red-600 hover:underline text-xs" onClick={() => del(c.id)}>מחק</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-gray-500">אין קופונים. צור אחד מעל.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
