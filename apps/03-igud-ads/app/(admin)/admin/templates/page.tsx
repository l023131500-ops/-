"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type Template = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  thumbnail_url: string | null;
  is_active: boolean;
  sort_order: number;
  price_nis: number | null;
  prompt_template: string | null;
  required_fields: string[];
  optional_fields: string[];
  style_rules: { colors: string[]; font: string; alignment: string } | null;
  allows_logo: boolean;
  allows_custom_colors: boolean;
  aspect_ratio: string;
  dalle_size: string;
};

const EMPTY: Omit<Template, "id"> = {
  name: "",
  description: "",
  category: "shiur",
  thumbnail_url: "",
  is_active: true,
  sort_order: 0,
  price_nis: null,
  prompt_template: "",
  required_fields: [],
  optional_fields: [],
  style_rules: { colors: [], font: "", alignment: "right" },
  allows_logo: false,
  allows_custom_colors: false,
  aspect_ratio: "1:1",
  dalle_size: "1024x1024",
};

const CATEGORIES: Record<string, string> = {
  shiur: "שיעור",
  beis_knesset: "בית כנסת",
  gmach: 'גמ"ח',
  tefilla: "תפילה",
  event: "אירוע",
  other: "אחר",
};

export default function TemplatesPage() {
  const [items, setItems] = useState<Template[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState<Omit<Template, "id"> & { id?: string }>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reqStr, setReqStr] = useState("");
  const [optStr, setOptStr] = useState("");
  const [colorsStr, setColorsStr] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/modaot/api/admin/templates");
    if (r.ok) setItems(await r.json());
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
    setForm(EMPTY);
    setReqStr("");
    setOptStr("");
    setColorsStr("");
    setError(null);
    setShowDialog(true);
  }

  function openEdit(t: Template) {
    setForm(t);
    setReqStr((t.required_fields || []).join(", "));
    setOptStr((t.optional_fields || []).join(", "));
    setColorsStr((t.style_rules?.colors || []).join(", "));
    setError(null);
    setShowDialog(true);
  }

  function closeDialog() {
    setShowDialog(false);
  }

  function parseTagStr(s: string): string[] {
    return s.split(",").map((x) => x.trim()).filter(Boolean);
  }

  async function save() {
    if (!form.name) { setError("שם חובה"); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        required_fields: parseTagStr(reqStr),
        optional_fields: parseTagStr(optStr),
        style_rules: {
          ...(form.style_rules || {}),
          colors: parseTagStr(colorsStr),
        },
      };
      const isEdit = !!form.id;
      const url = isEdit ? `/api/admin/templates/${form.id}` : "/modaot/api/admin/templates";
      const method = isEdit ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "שגיאה בשמירה");
      await load();
      closeDialog();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string) {
    if (busyId || !confirm("למחוק תבנית זו לצמיתות?")) return;
    setBusyId(id);
    try {
      const r = await fetch(`/modaot/api/admin/templates/${id}`, { method: "DELETE" });
      if (r.ok) await load();
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(t: Template) {
    if (busyId) return;
    setBusyId(t.id);
    try {
      await fetch(`/modaot/api/admin/templates/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !t.is_active }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-bold text-brand-dark">תבניות מודעה</h1>
        <button className="btn-primary" onClick={openNew}>+ תבנית חדשה</button>
      </div>

      <div className="bg-surface rounded-xl border overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-right">
            <tr>
              <th className="p-3">שם</th>
              <th className="p-3">קטגוריה</th>
              <th className="p-3">מחיר (₪)</th>
              <th className="p-3">פעיל</th>
              <th className="p-3">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr
                key={t.id}
                className="border-t hover:bg-gray-50 cursor-pointer"
                onClick={() => openEdit(t)}
              >
                <td className="p-3 font-medium">{t.name}</td>
                <td className="p-3">{CATEGORIES[t.category] || t.category}</td>
                <td className="p-3">{t.price_nis != null ? <span dir="ltr">{`₪${t.price_nis}`}</span> : "—"}</td>
                <td className="p-3">
                  {t.is_active
                    ? <span className="text-green-700 font-medium">פעיל</span>
                    : <span className="text-gray-400">כבוי</span>
                  }
                </td>
                <td className="p-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="text-brand-blue text-xs hover:underline disabled:opacity-50"
                    onClick={() => toggleActive(t)}
                    disabled={busyId === t.id}
                  >
                    {t.is_active ? "השהה" : "הפעל"}
                  </button>
                  <Link
                    href={`/admin/templates/${t.id}`}
                    className="text-gray-600 text-xs hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    עריכה מלאה
                  </Link>
                  <button
                    className="text-red-600 text-xs hover:underline disabled:opacity-50"
                    onClick={() => del(t.id)}
                    disabled={busyId === t.id}
                  >
                    מחק
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  אין תבניות. לחץ על &quot;תבנית חדשה&quot;.
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
            className="bg-surface rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-label={form.id ? "עריכת תבנית" : "תבנית חדשה"}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-serif text-xl font-bold">
                {form.id ? "עריכת תבנית" : "תבנית חדשה"}
              </h2>
              <button className="text-gray-500 hover:text-gray-900 text-2xl leading-none" onClick={closeDialog} aria-label="סגור">×</button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>
            )}

            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="template-name">שם תבנית *</label>
                  <input id="template-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor="template-category">קטגוריה</label>
                  <select id="template-category" className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {Object.entries(CATEGORIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="label" htmlFor="template-description">תיאור</label>
                <textarea id="template-description" className="input" rows={2} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>

              <div>
                <label className="label" htmlFor="template-prompt">prompt_template</label>
                <textarea
                  id="template-prompt"
                  className="input font-mono text-xs"
                  rows={4}
                  placeholder="לדוגמה: מודעה לשיעור תורה — {title} מפי {teacher_name}, ביום {day} בשעה {time}..."
                  value={form.prompt_template || ""}
                  onChange={(e) => setForm({ ...form, prompt_template: e.target.value })}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="template-required-fields">שדות חובה (מופרדים בפסיק)</label>
                  <input id="template-required-fields" className="input" placeholder="title, teacher_name, day" value={reqStr} onChange={(e) => setReqStr(e.target.value)} />
                </div>
                <div>
                  <label className="label" htmlFor="template-optional-fields">שדות אופציונליים</label>
                  <input id="template-optional-fields" className="input" placeholder="location, contact" value={optStr} onChange={(e) => setOptStr(e.target.value)} />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="label" htmlFor="template-price">מחיר (₪)</label>
                  <input id="template-price" className="input" type="number" inputMode="numeric" value={form.price_nis ?? ""} onChange={(e) => setForm({ ...form, price_nis: e.target.value ? parseInt(e.target.value) : null })} />
                </div>
                <div>
                  <label className="label" htmlFor="template-aspect-ratio">aspect_ratio</label>
                  <select id="template-aspect-ratio" className="input" value={form.aspect_ratio} onChange={(e) => setForm({ ...form, aspect_ratio: e.target.value })}>
                    <option value="1:1">1:1</option>
                    <option value="4:5">4:5</option>
                    <option value="16:9">16:9</option>
                    <option value="9:16">9:16</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="template-dalle-size">DALL-E Size</label>
                  <select id="template-dalle-size" className="input" value={form.dalle_size} onChange={(e) => setForm({ ...form, dalle_size: e.target.value })}>
                    <option value="1024x1024">1024×1024</option>
                    <option value="1792x1024">1792×1024</option>
                    <option value="1024x1792">1024×1792</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label" htmlFor="template-colors">צבעים (hex, מופרדים בפסיק)</label>
                <input id="template-colors" className="input" placeholder="#1A2E5A, #C9A84C" value={colorsStr} onChange={(e) => setColorsStr(e.target.value)} />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="template-font">פונט</label>
                  <input id="template-font" className="input" value={form.style_rules?.font || ""} onChange={(e) => setForm({ ...form, style_rules: { ...(form.style_rules || { colors: [], alignment: "right" }), font: e.target.value } })} />
                </div>
                <div>
                  <label className="label" htmlFor="template-alignment">יישור טקסט</label>
                  <select id="template-alignment" className="input" value={form.style_rules?.alignment || "right"} onChange={(e) => setForm({ ...form, style_rules: { ...(form.style_rules || { colors: [], font: "" }), alignment: e.target.value } })}>
                    <option value="right">ימין</option>
                    <option value="center">מרכז</option>
                    <option value="left">שמאל</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label" htmlFor="template-thumbnail-url">כתובת תמונה ממוזערת (URL)</label>
                <input id="template-thumbnail-url" className="input" value={form.thumbnail_url || ""} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.allows_logo} onChange={(e) => setForm({ ...form, allows_logo: e.target.checked })} />
                  <span className="text-sm">מאפשר לוגו</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.allows_custom_colors} onChange={(e) => setForm({ ...form, allows_custom_colors: e.target.checked })} />
                  <span className="text-sm">מאפשר צבעים מותאמים</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                  <span className="text-sm">פעיל</span>
                </label>
              </div>

              <div>
                <label className="label" htmlFor="template-sort-order">סדר מיון</label>
                <input id="template-sort-order" className="input w-24" type="number" inputMode="numeric" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value || "0") })} />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button className="btn-primary flex-1" disabled={saving} onClick={save}>
                {saving ? "שומר..." : "שמור"}
              </button>
              <button className="btn-outline" onClick={closeDialog}>ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
