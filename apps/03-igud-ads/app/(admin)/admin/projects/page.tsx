"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Project {
  id: string;
  title: string | null;
  status: string;
  mode: string | null;
  template_id: string | null;
  customer_data: Record<string, unknown> | null;
  created_at: string;
  selected_generation_id: string | null;
}

interface Generation {
  id: string;
  variation_num: number;
  image_url: string | null;
  storage_path: string | null;
  selected: boolean;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  created_at: string;
}

interface DetailData {
  project: Project;
  generations: Generation[];
  payments: Payment[];
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ready: "bg-green-100 text-green-800",
    generating: "bg-yellow-100 text-yellow-800",
    error: "bg-red-100 text-red-800",
    completed: "bg-blue-100 text-blue-800",
    pending: "bg-gray-100 text-gray-700",
  };
  const labels: Record<string, string> = {
    ready: "מוכן",
    generating: "בעיבוד",
    error: "שגיאה",
    completed: "הושלם",
    pending: "ממתין",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-800"}`}>
      {labels[status] || status}
    </span>
  );
}

export default function ProjectsAdmin() {
  const [items, setItems] = useState<Project[]>([]);
  const [detail, setDetail] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);

  const stats = {
    total: items.length,
    ready: items.filter((p) => p.status === "ready").length,
    generating: items.filter((p) => p.status === "generating").length,
    error: items.filter((p) => p.status === "error").length,
  };

  async function load() {
    setLoading(true);
    const r = await fetch("/modaot/api/admin/projects");
    const j = await r.json();
    setItems(Array.isArray(j) ? j : []);
    setLoading(false);
  }

  async function openDetail(id: string) {
    const r = await fetch(`/modaot/api/admin/projects/${id}`);
    setDetail(await r.json());
  }

  async function deleteProject(id: string) {
    if (!confirm("למחוק פרויקט זה?")) return;
    await fetch(`/modaot/api/admin/projects/${id}`, { method: "DELETE" });
    load();
  }

  useEffect(() => {
    load();
    const iv = setInterval(load, 15000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!detail) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setDetail(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [detail]);

  const customer = (p: Project) => {
    const cd = p.customer_data as Record<string, unknown> | null;
    return (cd?.name || cd?.email || "—") as string;
  };

  return (
    <div dir="rtl">
      <h1 className="font-serif text-2xl font-bold text-brand-dark mb-6">פרויקטי מודעות</h1>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-surface rounded-xl border p-4">
          <div className="text-xs text-gray-500">סה"כ פרויקטים</div>
          <div className="text-2xl font-bold text-brand-dark">{stats.total}</div>
        </div>
        <div className="bg-surface rounded-xl border p-4">
          <div className="text-xs text-gray-500">מוכנים</div>
          <div className="text-2xl font-bold text-green-700">{stats.ready}</div>
        </div>
        <div className="bg-surface rounded-xl border p-4">
          <div className="text-xs text-gray-500">בעיבוד</div>
          <div className="text-2xl font-bold text-yellow-700">{stats.generating}</div>
        </div>
        <div className="bg-surface rounded-xl border p-4">
          <div className="text-xs text-gray-500">שגיאות</div>
          <div className="text-2xl font-bold text-red-700">{stats.error}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-xl border overflow-x-auto" aria-live="polite">
        {loading ? (
          <div className="p-8 text-center text-gray-400">טוען...</div>
        ) : (
          <table className="min-w-full text-sm text-right">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 font-medium">תאריך</th>
                <th className="p-3 font-medium">כותרת</th>
                <th className="p-3 font-medium">תבנית</th>
                <th className="p-3 font-medium">מצב</th>
                <th className="p-3 font-medium">לקוח</th>
                <th className="p-3 font-medium">תמונה</th>
                <th className="p-3 font-medium">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr
                  key={p.id}
                  className="border-t hover:bg-gray-50 cursor-pointer"
                  onClick={() => openDetail(p.id)}
                >
                  <td className="p-3 whitespace-nowrap">{new Date(p.created_at).toLocaleString("he-IL")}</td>
                  <td className="p-3">{p.title || "—"}</td>
                  <td className="p-3 text-gray-600">{p.template_id?.slice(0, 8) || "—"}</td>
                  <td className="p-3"><StatusBadge status={p.status} /></td>
                  <td className="p-3">{customer(p)}</td>
                  <td className="p-3">
                    {p.selected_generation_id ? (
                      <Link
                        href={`/result/${p.id}`}
                        className="text-brand-blue text-xs hover:underline"
                        onClick={(e) => e.stopPropagation()}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        צפייה
                      </Link>
                    ) : "—"}
                  </td>
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => deleteProject(p.id)}
                      className="text-red-500 text-xs hover:underline ml-2"
                    >
                      מחק
                    </button>
                    <Link href={`/admin/projects/${p.id}`} className="text-brand-blue text-xs hover:underline">
                      פרטים
                    </Link>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">אין פרויקטים.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {detail && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setDetail(null)}
        >
          <div
            className="bg-surface rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={detail.project?.title || detail.project?.id}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="font-serif text-xl font-bold">
                {detail.project?.title || detail.project?.id}
              </h2>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-700 text-xl" aria-label="סגור">✕</button>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4 text-sm text-gray-600">
              <div>
                <div>מצב: <StatusBadge status={detail.project.status} /></div>
                <div className="mt-1">מסלול: {detail.project.mode || "—"}</div>
                <div className="mt-1">
                  לקוח: {(detail.project.customer_data as Record<string, unknown>)?.name as string || "—"} |{" "}
                  {(detail.project.customer_data as Record<string, unknown>)?.email as string || "—"}
                </div>
              </div>
              <div>
                {detail.payments.length > 0 && (
                  <div>
                    <div className="font-medium mb-1">תשלומים:</div>
                    {detail.payments.map((pay) => (
                      <div key={pay.id} className="text-xs">
                        ₪{pay.amount} — {pay.status === "succeeded" ? "✓ שולם" : pay.status}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              {detail.generations.map((g) => (
                <div key={g.id} className="border rounded p-2 text-center">
                  {g.image_url && (
                    <img src={g.image_url} alt={`תצוגה מקדימה של וריאציה ${g.variation_num}`} className="rounded mb-2 w-full object-cover" />
                  )}
                  <div className="text-xs">וריאציה {g.variation_num}</div>
                  {g.selected && <div className="text-xs text-green-700 mt-1">✓ נבחרה</div>}
                  {g.image_url && (
                    <a
                      href={g.image_url}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-blue hover:underline mt-1 block"
                    >
                      הורד
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
