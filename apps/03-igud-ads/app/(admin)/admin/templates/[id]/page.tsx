"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";

type StyleRules = {
  colors: string[];
  font: string;
  alignment: string;
};

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
  style_rules: StyleRules | null;
  allows_logo: boolean;
  allows_custom_colors: boolean;
  aspect_ratio: string;
  dalle_size: string;
};

const CATEGORIES: Record<string, string> = {
  shiur: "שיעור",
  beis_knesset: "בית כנסת",
  gmach: 'גמ"ח',
  tefilla: "תפילה",
  event: "אירוע",
  other: "אחר",
};

export default function TemplateEditPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<Template | null>(null);
  const [reqStr, setReqStr] = useState("");
  const [optStr, setOptStr] = useState("");
  const [colorsStr, setColorsStr] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/modaot/api/admin/templates/${id}`);
      if (!r.ok) throw new Error("לא נמצא");
      const t: Template = await r.json();
      setForm(t);
      setReqStr((t.required_fields || []).join(", "));
      setOptStr((t.optional_fields || []).join(", "));
      setColorsStr((t.style_rules?.colors || []).join(", "));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "שגיאה בטעינה");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function parseTagStr(s: string): string[] {
    return s.split(",").map((x) => x.trim()).filter(Boolean);
  }

  async function save() {
    if (!form) return;
    if (!form.name) { setError("שם חובה"); return; }
    setSaving(true);
    setError(null);
    setSuccess(false);
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
      const r = await fetch(`/modaot/api/admin/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "שגיאה בשמירה");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setSaving(false);
    }
  }

  async function del() {
    if (saving || !confirm("למחוק תבנית זו לצמיתות?")) return;
    setSaving(true);
    try {
      const r = await fetch(`/modaot/api/admin/templates/${id}`, { method: "DELETE" });
      if (r.ok) router.push("/admin/templates");
      else { setError("שגיאה במחיקה"); setSaving(false); }
    } catch {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">טוען...</div>;
  if (!form) return <div className="p-8 text-center text-red-600">{error || "לא נמצא"}</div>;

  const sr = form.style_rules || { colors: [], font: "", alignment: "right" };

  return (
    <div dir="rtl" className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button className="text-brand-blue text-sm hover:underline" onClick={() => router.push("/admin/templates")}>
          ← חזרה לרשימה
        </button>
        <h1 className="font-serif text-2xl font-bold text-brand-dark">{form.name}</h1>
      </div>

      {error && <div role="alert" aria-live="assertive" className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>}
      {success && <div role="status" aria-live="polite" className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded text-sm">נשמר בהצלחה ✓</div>}

      <div className="bg-surface rounded-2xl border p-6 space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="tpl-name">שם תבנית *</label>
            <input id="tpl-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="tpl-category">קטגוריה</label>
            <select id="tpl-category" className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {Object.entries(CATEGORIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="tpl-description">תיאור</label>
          <textarea id="tpl-description" className="input" rows={2} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>

        <div>
          <label className="label" htmlFor="tpl-prompt">
            prompt_template
            <span className="text-gray-400 font-normal mr-2 text-xs">(השתמש ב-{"{field_name}"} לשדות)</span>
          </label>
          <textarea
            id="tpl-prompt"
            className="input font-mono text-xs"
            rows={6}
            placeholder={"לדוגמה: מודעה לשיעור תורה — {title} מפי {teacher_name}, ביום {day} בשעה {time} במקום {location}. {free_text}"}
            value={form.prompt_template || ""}
            onChange={(e) => setForm({ ...form, prompt_template: e.target.value })}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="tpl-required">שדות חובה (מופרדים בפסיק)</label>
            <input
              id="tpl-required"
              className="input"
              placeholder="title, teacher_name, day"
              value={reqStr}
              onChange={(e) => setReqStr(e.target.value)}
            />
            {reqStr && (
              <div className="mt-1 flex flex-wrap gap-1">
                {parseTagStr(reqStr).map((f) => (
                  <span key={f} className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">{f}</span>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="label" htmlFor="tpl-optional">שדות אופציונליים</label>
            <input
              id="tpl-optional"
              className="input"
              placeholder="location, contact, free_text"
              value={optStr}
              onChange={(e) => setOptStr(e.target.value)}
            />
            {optStr && (
              <div className="mt-1 flex flex-wrap gap-1">
                {parseTagStr(optStr).map((f) => (
                  <span key={f} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">{f}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Style Rules */}
        <div className="border rounded-lg p-4 space-y-3">
          <h3 className="font-medium text-sm">כללי עיצוב (style_rules)</h3>
          <div>
            <label className="label" htmlFor="tpl-colors">צבעים (hex, מופרדים בפסיק)</label>
            <input id="tpl-colors" className="input" placeholder="#1A2E5A, #C9A84C" value={colorsStr} onChange={(e) => setColorsStr(e.target.value)} />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="tpl-font">פונט</label>
              <input id="tpl-font" className="input" value={sr.font} onChange={(e) => setForm({ ...form, style_rules: { ...sr, font: e.target.value } })} />
            </div>
            <div>
              <label className="label" htmlFor="tpl-alignment">יישור טקסט</label>
              <select id="tpl-alignment" className="input" value={sr.alignment} onChange={(e) => setForm({ ...form, style_rules: { ...sr, alignment: e.target.value } })}>
                <option value="right">ימין (RTL)</option>
                <option value="center">מרכז</option>
                <option value="left">שמאל</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="label" htmlFor="tpl-price">מחיר (₪)</label>
            <input
              id="tpl-price"
              className="input"
              type="number"
              inputMode="numeric"
              value={form.price_nis ?? ""}
              onChange={(e) => setForm({ ...form, price_nis: e.target.value ? parseInt(e.target.value) : null })}
            />
          </div>
          <div>
            <label className="label" htmlFor="tpl-aspect">יחס תמונה</label>
            <select id="tpl-aspect" className="input" value={form.aspect_ratio} onChange={(e) => setForm({ ...form, aspect_ratio: e.target.value })}>
              <option value="1:1">1:1</option>
              <option value="4:5">4:5</option>
              <option value="16:9">16:9</option>
              <option value="9:16">9:16</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="tpl-dalle-size">DALL-E Size</label>
            <select id="tpl-dalle-size" className="input" value={form.dalle_size} onChange={(e) => setForm({ ...form, dalle_size: e.target.value })}>
              <option value="1024x1024">1024×1024</option>
              <option value="1792x1024">1792×1024</option>
              <option value="1024x1792">1024×1792</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="tpl-thumbnail">כתובת תמונה ממוזערת (URL)</label>
          <input id="tpl-thumbnail" className="input" value={form.thumbnail_url || ""} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} />
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={form.allows_logo}
              onChange={(e) => setForm({ ...form, allows_logo: e.target.checked })}
            />
            <span className="text-sm">מאפשר לוגו</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={form.allows_custom_colors}
              onChange={(e) => setForm({ ...form, allows_custom_colors: e.target.checked })}
            />
            <span className="text-sm">מאפשר צבעים מותאמים</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            <span className="text-sm">פעיל</span>
          </label>
        </div>

        <div>
          <label className="label" htmlFor="tpl-sort-order">סדר מיון</label>
          <input
            id="tpl-sort-order"
            className="input w-24"
            type="number"
            inputMode="numeric"
            value={form.sort_order}
            onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value || "0") })}
          />
        </div>

        <div className="pt-2">
          <button className="btn-primary w-full" disabled={saving} onClick={save}>
            {saving ? "שומר..." : "שמור שינויים"}
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="mt-8 border border-red-200 rounded-2xl p-6">
        <h3 className="font-medium text-red-700 mb-3">אזור מסוכן</h3>
        <button
          className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded disabled:opacity-50"
          onClick={del}
          disabled={saving}
        >
          מחיקת תבנית לצמיתות
        </button>
      </div>
    </div>
  );
}

function parseTagStr(s: string): string[] {
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}
