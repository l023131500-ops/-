"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Project = {
  id: string;
  status: string;
  ad_type: string | null;
  customer_data: Record<string, unknown> | null;
  generated_image_url: string | null;
  generated_pdf_url: string | null;
  created_at: string;
};

export default function MyProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/modaot/api/my/projects").then((r) => r.json()).then((j) => {
      setProjects(j.projects || []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-6" dir="rtl">
      <h1 className="text-2xl font-serif font-bold text-brand-blue mb-2">המודעות שלי</h1>
      <p className="text-sm text-gray-600 mb-6">כל המודעות שיצרת במערכת</p>

      <div aria-live="polite">
      {loading ? (
        <div className="text-gray-500">טוען...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">עוד לא יצרת מודעות</p>
          <Link href="/create" className="bg-brand-bluesurface text-white rounded px-6 py-2 inline-block">
            צור מודעה ראשונה
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {projects.map((p) => (
            <Link key={p.id} href={`/result/${p.id}`} className="bg-surface border rounded-lg overflow-hidden hover:shadow-lg transition">
              {p.generated_image_url ? (
                <img src={p.generated_image_url} alt={p.ad_type ? `תצוגה מקדימה של מודעה - ${p.ad_type}` : "תצוגה מקדימה של מודעה שנוצרה"} className="w-full aspect-square object-cover" />
              ) : (
                <div className="w-full aspect-square bg-gray-100 flex items-center justify-center text-gray-600">
                  {p.status === "generating" ? "בעיבוד..." : p.status === "error" ? "שגיאה" : "ממתין"}
                </div>
              )}
              <div className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    p.status === "ready" ? "bg-green-100 text-green-700" :
                    p.status === "generating" ? "bg-yellow-100 text-yellow-700" :
                    p.status === "error" ? "bg-red-100 text-red-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>{p.status}</span>
                  {p.ad_type && <span className="text-xs text-gray-500">{p.ad_type}</span>}
                </div>
                <div className="text-xs text-gray-600">{new Date(p.created_at).toLocaleString("he-IL")}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
