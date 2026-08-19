"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Upload = {
  id: string;
  status: string;
  original_filename: string | null;
  style: string | null;
  duration_sec: number | null;
  created_at: string;
};

export default function MyTranscriptsPage() {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/modaot/api/my/transcripts").then((r) => r.json()).then((j) => {
      setUploads(j.uploads || []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6" dir="rtl">
      <h1 className="text-2xl font-serif font-bold text-brand-blue mb-2">התמלולים שלי</h1>
      <p className="text-sm text-gray-600 mb-6">כל ההעלאות והתמלולים שביצעת</p>

      {loading ? (
        <div className="text-gray-500">טוען...</div>
      ) : uploads.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">עוד לא העלית קבצים לתמלול</p>
          <Link href="/transcribe/upload" className="bg-brand-bluesurface text-white rounded px-6 py-2 inline-block">
            העלאת קובץ ראשון
          </Link>
        </div>
      ) : (
        <div className="bg-surface border rounded-lg divide-y">
          {uploads.map((u) => (
            <div key={u.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
              <div>
                <div className="font-medium">{u.original_filename || "ללא שם"}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(u.created_at).toLocaleString("he-IL")} • סגנון: {u.style || "-"} • {u.duration_sec ? `${Math.round(u.duration_sec/60)} דקות` : ""}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-1 rounded ${
                  u.status === "ready" || u.status === "done" ? "bg-green-100 text-green-700" :
                  u.status === "error" ? "bg-red-100 text-red-700" :
                  "bg-yellow-100 text-yellow-700"
                }`}>{u.status}</span>
                <Link href={`/transcribe/success?id=${u.id}`} className="text-brand-blue text-sm underline">
                  צפה / הורד
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
