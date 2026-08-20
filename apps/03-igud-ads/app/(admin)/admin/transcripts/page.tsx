"use client";
import { useEffect, useState } from "react";

interface Upload {
  id: string;
  uploader_email: string | null;
  style: string | null;
  status: string;
  original_filename: string | null;
  duration_sec: number | null;
  size_bytes: number | null;
  created_at: string;
  transcript?: TranscriptDetail | null;
}

interface TranscriptDetail {
  id: string;
  styled_text: string | null;
  docx_original_url: string | null;
  docx_edited_url: string | null;
  docx_sources_url: string | null;
}

function fmtDuration(sec: number | null): string {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function fmtSize(bytes: number | null): string {
  if (!bytes) return "—";
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    done: "bg-green-100 text-green-800",
    processing: "bg-yellow-100 text-yellow-800",
    error: "bg-red-100 text-red-800",
    pending: "bg-gray-100 text-gray-700",
    uploaded: "bg-blue-100 text-blue-800",
  };
  const labels: Record<string, string> = {
    done: "הושלם",
    processing: "מתמלל",
    error: "שגיאה",
    pending: "ממתין",
    uploaded: "הועלה",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-800"}`}>
      {labels[status] || status}
    </span>
  );
}

export default function TranscriptsAdmin() {
  const [items, setItems] = useState<Upload[]>([]);
  const [modal, setModal] = useState<Upload | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const r = await fetch("/modaot/api/admin/transcripts");
    const j = await r.json();
    setItems(Array.isArray(j) ? j : []);
    setLoading(false);
  }

  async function openDetail(id: string) {
    const r = await fetch(`/modaot/api/admin/transcripts?id=${id}`);
    const j = await r.json();
    setModal(j);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!modal) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setModal(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modal]);

  return (
    <div dir="rtl">
      <h1 className="font-serif text-2xl font-bold text-brand-dark mb-6">ניהול תמלולים</h1>

      <div className="bg-surface rounded-xl border overflow-x-auto" aria-live="polite">
        {loading ? (
          <div className="p-8 text-center text-gray-400">טוען...</div>
        ) : (
          <table className="min-w-full text-sm text-right">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 font-medium">תאריך</th>
                <th className="p-3 font-medium">שם קובץ</th>
                <th className="p-3 font-medium">סטטוס</th>
                <th className="p-3 font-medium">משך</th>
                <th className="p-3 font-medium">גודל</th>
                <th className="p-3 font-medium">מייל</th>
                <th className="p-3 font-medium">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 whitespace-nowrap">{new Date(u.created_at).toLocaleString("he-IL")}</td>
                  <td className="p-3">{u.original_filename || u.id.slice(0, 8)}</td>
                  <td className="p-3"><StatusBadge status={u.status} /></td>
                  <td className="p-3">{fmtDuration(u.duration_sec)}</td>
                  <td className="p-3">{fmtSize(u.size_bytes)}</td>
                  <td className="p-3 text-gray-600">{u.uploader_email || "—"}</td>
                  <td className="p-3">
                    <button
                      onClick={() => openDetail(u.id)}
                      className="text-brand-blue text-xs hover:underline ml-2"
                    >
                      צפייה
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">אין תמלולים.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setModal(null)}>
          <div
            className="bg-surface rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={modal.original_filename || modal.id}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="font-serif text-xl font-bold">{modal.original_filename || modal.id}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-700 text-xl" aria-label="סגור">✕</button>
            </div>

            <div className="flex gap-2 mb-4 flex-wrap">
              <StatusBadge status={modal.status} />
              <span className="text-sm text-gray-500">{fmtDuration(modal.duration_sec)}</span>
              <span className="text-sm text-gray-500">{modal.uploader_email}</span>
            </div>

            {modal.transcript && (
              <div>
                <div className="flex gap-3 mb-4 flex-wrap">
                  {modal.transcript.docx_original_url && (
                    <a
                      href={modal.transcript.docx_original_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-brand-bluesurface text-white px-4 py-2 rounded text-sm hover:bg-brand-darksurface"
                    >
                      הורד DOCX מקורי
                    </a>
                  )}
                  {modal.transcript.docx_edited_url && (
                    <a
                      href={modal.transcript.docx_edited_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-brand-goldsurface text-white px-4 py-2 rounded text-sm"
                    >
                      הורד DOCX ערוך
                    </a>
                  )}
                </div>

                {modal.transcript.styled_text && (
                  <div className="border rounded p-4 bg-gray-50 text-sm whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                    {modal.transcript.styled_text}
                  </div>
                )}
              </div>
            )}

            {!modal.transcript && (
              <div className="text-gray-400 text-sm">אין תמלול זמין עדיין.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
