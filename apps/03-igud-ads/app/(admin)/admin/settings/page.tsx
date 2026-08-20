"use client";
import { useEffect, useState } from "react";

interface Setting {
  key: string;
  value: unknown;
  label: string | null;
  updated_at: string | null;
}

type SettingsByCategory = Record<string, Setting[]>;

function getCategory(key: string): string {
  const parts = key.split(".");
  return parts.length > 1 ? parts[0] : "כללי";
}

const CATEGORY_LABELS: Record<string, string> = {
  payment: "תשלומים",
  transcribe: "תמלול",
  email: "מייל",
  site: "אתר",
  כללי: "כללי",
};

function ValueInput({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (typeof value === "boolean") {
    return (
      <select
        value={String(value)}
        onChange={(e) => onChange(e.target.value === "true")}
        className="border rounded px-3 py-1.5 text-sm w-full"
      >
        <option value="true">כן</option>
        <option value="false">לא</option>
      </select>
    );
  }
  if (typeof value === "number") {
    return (
      <input
        type="number"
        inputMode="decimal"
        value={String(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="border rounded px-3 py-1.5 text-sm w-full"
      />
    );
  }
  if (typeof value === "object" && value !== null) {
    return (
      <textarea
        value={JSON.stringify(value, null, 2)}
        onChange={(e) => {
          try {
            onChange(JSON.parse(e.target.value));
          } catch {}
        }}
        rows={3}
        className="border rounded px-3 py-1.5 text-sm w-full font-mono"
      />
    );
  }
  return (
    <input
      type="text"
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      className="border rounded px-3 py-1.5 text-sm w-full"
    />
  );
}

export default function SettingsAdmin() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [localValues, setLocalValues] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const r = await fetch("/modaot/api/admin/settings");
    const j = await r.json();
    const arr = Array.isArray(j) ? j : [];
    setSettings(arr);
    const vals: Record<string, unknown> = {};
    arr.forEach((s: Setting) => { vals[s.key] = s.value; });
    setLocalValues(vals);
    setLoading(false);
  }

  async function saveSetting(key: string) {
    setSaving((prev) => ({ ...prev, [key]: true }));
    await fetch("/modaot/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: localValues[key] }),
    });
    setSaving((prev) => ({ ...prev, [key]: false }));
    setSaved((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => setSaved((prev) => ({ ...prev, [key]: false })), 2000);
  }

  useEffect(() => { load(); }, []);

  if (loading) return <div className="p-8 text-center text-gray-400">טוען...</div>;

  const byCategory = settings.reduce<SettingsByCategory>((acc, s) => {
    const cat = getCategory(s.key);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  return (
    <div dir="rtl">
      <h1 className="font-serif text-2xl font-bold text-brand-dark mb-6">הגדרות מערכת</h1>

      {Object.entries(byCategory).map(([cat, items]) => (
        <div key={cat} className="bg-surface rounded-xl border mb-6">
          <div className="bg-gray-50 px-5 py-3 border-b rounded-t-xl">
            <h2 className="font-semibold text-brand-dark">{CATEGORY_LABELS[cat] || cat}</h2>
          </div>
          <div className="divide-y">
            {items.map((s) => (
              <div key={s.key} className="px-5 py-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-700 mb-0.5">
                    {s.label || s.key}
                  </div>
                  <div className="text-xs text-gray-400 font-mono mb-2">{s.key}</div>
                  <ValueInput
                    value={localValues[s.key]}
                    onChange={(v) => setLocalValues((prev) => ({ ...prev, [s.key]: v }))}
                  />
                </div>
                <div className="flex-shrink-0 pt-6">
                  <button
                    onClick={() => saveSetting(s.key)}
                    disabled={saving[s.key]}
                    className={`px-4 py-1.5 rounded text-sm font-medium ${
                      saved[s.key]
                        ? "bg-green-100 text-green-700"
                        : "bg-brand-bluesurface text-white hover:bg-brand-darksurface"
                    }`}
                  >
                    {saved[s.key] ? "נשמר ✓" : saving[s.key] ? "שומר..." : "שמור"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {settings.length === 0 && (
        <div className="bg-surface rounded-xl border p-8 text-center text-gray-400">
          אין הגדרות. יש להוסיף שורות לטבלת ad_app_settings.
        </div>
      )}
    </div>
  );
}
