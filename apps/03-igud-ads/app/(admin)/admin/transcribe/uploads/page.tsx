"use client";

import { useEffect, useState } from "react";

type Upload = {
  id: string;
  uploader_email: string | null;
  style: string;
  status: string;
  original_filename: string | null;
  duration_sec: number | null;
  size_bytes: number | null;
  created_at: string;
};

type UploadDetail = Upload & {
  storage_path: string;
  transcript?: {
    raw_text: string | null;
    edited_text: string | null;
    docx_original_url: string | null;
    docx_edited_url: string | null;
    docx_sources_url: string | null;
  };
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "ממתין", color: "bg-slate-200 text-slate-700" },
  running: { label: "בתהליך", color: "bg-blue-100 text-blue-700" },
  done: { label: "הושלם", color: "bg-emerald-100 text-emerald-700" },
  error: { label: "שגיאה", color: "bg-red-100 text-red-700" },
};

const STYLE_LABELS: Record<string, string> = {
  litvish: "ליטאי",
  chassidish: "חסידי",
  yiddish: "אידיש",
};

export default function UploadsPage() {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<UploadDetail | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/modaot/api/admin/transcribe/uploads", { cache: "no-store" });
    if (res.ok) setUploads(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!selected) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSelected(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected]);

  const open = async (id: string) => {
    const res = await fetch(`/modaot/api/admin/transcribe/uploads?id=${id}`);
    if (res.ok) setSelected(await res.json());
  };

  const remove = async (id: string) => {
    if (!confirm("למחוק העלאה זו וכל הקבצים שלה?")) return;
    if (busyId) return;
    setBusyId(id);
    try {
      const res = await fetch(`/modaot/api/admin/transcribe/uploads?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setSelected(null);
        load();
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "שגיאה במחיקה");
      }
    } catch {
      alert("שגיאת רשת — נסה שוב");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-serif font-bold text-brand-blue">העלאות</h1>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-slate-100 text-sm text-slate-600">
            <tr>
              <th className="px-4 py-3">שם קובץ</th>
              <th className="px-4 py-3">סגנון</th>
              <th className="px-4 py-3">סטטוס</th>
              <th className="px-4 py-3">גודל</th>
              <th className="px-4 py-3">תאריך</th>
              <th className="px-4 py-3">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">טוען...</td></tr>
            )}
            {!loading && uploads.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">אין העלאות</td></tr>
            )}
            {uploads.map((u) => {
              const s = STATUS_LABELS[u.status] || STATUS_LABELS.pending;
              return (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm">{u.original_filename || "—"}</td>
                  <td className="px-4 py-3 text-sm">{STYLE_LABELS[u.style] || u.style}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${s.color}`}>{s.label}</span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {u.size_bytes ? `${(u.size_bytes / 1024 / 1024).toFixed(1)} MB` : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {new Date(u.created_at).toLocaleString("he-IL")}
                  </td>
                  <td className="px-4 py-3 text-sm space-x-2 space-x-reverse">
                    <button onClick={() => open(u.id)} className="text-brand-blue hover:underline">
                      צפה
                    </button>
                    <button
                      onClick={() => remove(u.id)}
                      disabled={busyId === u.id}
                      className="text-red-600 hover:underline disabled:opacity-50 disabled:no-underline"
                    >
                      {busyId === u.id ? "מוחק…" : "מחק"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-surface rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={selected.original_filename || selected.id}
          >
            <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-surface">
              <h2 className="text-xl font-serif font-bold text-brand-blue">
                {selected.original_filename || selected.id}
              </h2>
              <button onClick={() => setSelected(null)} className="text-slate-600 hover:text-slate-700 text-2xl">×</button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><div className="text-slate-500">סגנון</div><div className="font-bold">{STYLE_LABELS[selected.style]}</div></div>
                <div><div className="text-slate-500">סטטוס</div><div className="font-bold">{STATUS_LABELS[selected.status]?.label}</div></div>
                <div><div className="text-slate-500">משך</div><div className="font-bold">{selected.duration_sec ? `${Math.round(selected.duration_sec / 60)} דק׳` : "—"}</div></div>
                <div><div className="text-slate-500">תאריך</div><div className="font-bold">{new Date(selected.created_at).toLocaleDateString("he-IL")}</div></div>
              </div>

              {selected.transcript && (
                <>
                  <div className="flex flex-wrap gap-2">
                    {selected.transcript.docx_original_url && (
                      <a href={selected.transcript.docx_original_url} className="btn-outline text-sm" target="_blank" rel="noopener">
                        הורד תמלול גולמי
                      </a>
                    )}
                    {selected.transcript.docx_edited_url && (
                      <a href={selected.transcript.docx_edited_url} className="btn-primary text-sm" target="_blank" rel="noopener">
                        הורד מהדורה ערוכה
                      </a>
                    )}
                    {selected.transcript.docx_sources_url && (
                      <a href={selected.transcript.docx_sources_url} className="btn-accent text-sm" target="_blank" rel="noopener">
                        הורד מקורות
                      </a>
                    )}
                  </div>

                  {selected.transcript.edited_text && (
                    <div>
                      <div className="label">תוצאה ערוכה (תצוגה מקדימה)</div>
                      <div className="bg-slate-50 border border-slate-200 rounded p-4 max-h-64 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap">
                        {selected.transcript.edited_text.slice(0, 2000)}
                        {selected.transcript.edited_text.length > 2000 && "..."}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
