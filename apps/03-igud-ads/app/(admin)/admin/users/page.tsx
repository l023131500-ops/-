"use client";
import { useEffect, useState, useCallback } from "react";

type AdUser = {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  role: "super_admin" | "admin" | "customer" | "viewer";
  is_active: boolean;
  coupon_id: string | null;
  notes: string | null;
  created_at: string;
  ad_coupons?: { code: string } | null;
};

type Coupon = {
  id: string;
  code: string;
  is_active: boolean;
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "מנהל-על",
  admin: "מנהל",
  customer: "לקוח",
  viewer: "צופה",
};

const EMPTY_FORM = {
  email: "",
  display_name: "",
  role: "customer" as AdUser["role"],
  coupon_id: "",
  is_active: true,
  notes: "",
};

export default function UsersPage() {
  const [users, setUsers] = useState<AdUser[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState<typeof EMPTY_FORM & { id?: string }>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [ur, cr] = await Promise.all([
      fetch("/modaot/api/admin/users"),
      fetch("/modaot/api/admin/coupons"),
    ]);
    if (ur.ok) setUsers(await ur.json());
    if (cr.ok) setCoupons(await cr.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!showDialog) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setShowDialog(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showDialog]);

  function openNew() {
    setForm(EMPTY_FORM);
    setError(null);
    setShowDialog(true);
  }

  function openEdit(u: AdUser) {
    setForm({
      id: u.id,
      email: u.email,
      display_name: u.display_name || "",
      role: u.role,
      coupon_id: u.coupon_id || "",
      is_active: u.is_active,
      notes: u.notes || "",
    });
    setError(null);
    setShowDialog(true);
  }

  async function save() {
    if (!form.email) { setError("אימייל חובה"); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        coupon_id: form.coupon_id || null,
        display_name: form.display_name || null,
        notes: form.notes || null,
      };
      const isEdit = !!form.id;
      const url = isEdit ? `/modaot/api/admin/users/${form.id}` : "/modaot/api/admin/users";
      const method = isEdit ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "שגיאה בשמירה");
      await load();
      setShowDialog(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string) {
    if (busyId || !confirm("למחוק משתמש זה?")) return;
    setBusyId(id);
    try {
      await fetch(`/modaot/api/admin/users/${id}`, { method: "DELETE" });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(u: AdUser) {
    if (busyId) return;
    setBusyId(u.id);
    try {
      await fetch(`/modaot/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !u.is_active }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-bold text-brand-dark">ניהול משתמשים</h1>
        <button className="btn-primary" onClick={openNew}>+ משתמש חדש</button>
      </div>

      <div className="bg-surface rounded-xl border overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-right">
            <tr>
              <th className="p-3">אימייל</th>
              <th className="p-3">שם</th>
              <th className="p-3">תפקיד</th>
              <th className="p-3">פעיל</th>
              <th className="p-3">קופון</th>
              <th className="p-3">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                className="border-t hover:bg-gray-50 cursor-pointer"
                onClick={() => openEdit(u)}
              >
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.display_name || "—"}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                    u.role === "super_admin" ? "bg-red-100 text-red-700" :
                    u.role === "admin" ? "bg-blue-100 text-blue-700" :
                    u.role === "customer" ? "bg-green-100 text-green-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {ROLE_LABELS[u.role] || u.role}
                  </span>
                </td>
                <td className="p-3">
                  {u.is_active
                    ? <span className="text-green-700 font-medium">פעיל</span>
                    : <span className="text-gray-600">מושהה</span>
                  }
                </td>
                <td className="p-3 font-mono text-xs">{u.ad_coupons?.code || "—"}</td>
                <td className="p-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="text-brand-blue text-xs hover:underline disabled:opacity-50"
                    onClick={() => toggleActive(u)}
                    disabled={busyId === u.id}
                  >
                    {u.is_active ? "השהה" : "הפעל"}
                  </button>
                  <button
                    className="text-red-600 text-xs hover:underline disabled:opacity-50"
                    onClick={() => del(u.id)}
                    disabled={busyId === u.id}
                  >
                    מחק
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  אין משתמשים עדיין.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div
            className="bg-surface rounded-2xl shadow-xl w-full max-w-lg p-6"
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-label={form.id ? "עריכת משתמש" : "משתמש חדש"}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-serif text-xl font-bold">
                {form.id ? "עריכת משתמש" : "משתמש חדש"}
              </h2>
              <button
                className="text-gray-500 hover:text-gray-900 text-2xl leading-none"
                onClick={() => setShowDialog(false)}
                aria-label="סגור"
              >
                ×
              </button>
            </div>

            {error && (
              <div role="alert" aria-live="assertive" className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="user-email">אימייל *</label>
                <input
                  id="user-email"
                  className="input"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  disabled={!!form.id}
                />
              </div>
              <div>
                <label className="label" htmlFor="user-display-name">שם תצוגה</label>
                <input
                  id="user-display-name"
                  className="input"
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                />
              </div>
              <div>
                <label className="label" htmlFor="user-role">תפקיד</label>
                <select
                  id="user-role"
                  className="input"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as AdUser["role"] })}
                >
                  <option value="customer">לקוח</option>
                  <option value="viewer">צופה</option>
                  <option value="admin">מנהל</option>
                  <option value="super_admin">מנהל-על</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="user-coupon">קופון משויך (אופציונלי)</label>
                <select
                  id="user-coupon"
                  className="input"
                  value={form.coupon_id}
                  onChange={(e) => setForm({ ...form, coupon_id: e.target.value })}
                >
                  <option value="">— ללא קופון —</option>
                  {coupons.filter((c) => c.is_active).map((c) => (
                    <option key={c.id} value={c.id}>{c.code}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="user-notes">הערות</label>
                <textarea
                  id="user-notes"
                  className="input"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                <span className="text-sm">משתמש פעיל</span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button className="btn-primary flex-1" disabled={saving} onClick={save}>
                {saving ? "שומר..." : "שמור"}
              </button>
              <button className="btn-outline" onClick={() => setShowDialog(false)}>ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
