"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Payment {
  id: string;
  project_id: string | null;
  user_email: string | null;
  amount: number;
  currency: string;
  status: "succeeded" | "failed" | "pending";
  provider: string;
  provider_transaction_id: string | null;
  payer_name: string | null;
  description: string | null;
  created_at: string;
}

interface Stats {
  monthly_revenue: number;
  monthly_count: number;
  monthly_avg: number;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    succeeded: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    pending: "bg-yellow-100 text-yellow-800",
  };
  const labels: Record<string, string> = {
    succeeded: "הצליח",
    failed: "נכשל",
    pending: "ממתין",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-800"}`}>
      {labels[status] || status}
    </span>
  );
}

export default function PaymentsAdmin() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    const r = await fetch(`/modaot/api/admin/payments?${params}`);
    const j = await r.json();
    setPayments(j.payments || []);
    setStats(j.stats || null);
    setLoading(false);
  }

  useEffect(() => { load(); }, [statusFilter, dateFrom, dateTo]);

  return (
    <div dir="rtl">
      <h1 className="font-serif text-2xl font-bold text-brand-dark mb-6">תשלומים</h1>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-surface rounded-xl border p-4">
            <div className="text-xs text-gray-500 mb-1">הכנסות החודש</div>
            <div className="text-2xl font-bold text-brand-dark">₪{stats.monthly_revenue.toLocaleString("he-IL")}</div>
          </div>
          <div className="bg-surface rounded-xl border p-4">
            <div className="text-xs text-gray-500 mb-1">מספר עסקאות החודש</div>
            <div className="text-2xl font-bold text-brand-dark">{stats.monthly_count}</div>
          </div>
          <div className="bg-surface rounded-xl border p-4">
            <div className="text-xs text-gray-500 mb-1">ממוצע לעסקה</div>
            <div className="text-2xl font-bold text-brand-dark">₪{stats.monthly_avg.toFixed(0)}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-surface rounded-xl border p-4 mb-4 flex flex-wrap gap-3 items-center">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="סינון לפי סטטוס"
          className="border rounded px-3 py-1.5 text-sm"
        >
          <option value="all">כל הסטטוסים</option>
          <option value="succeeded">הצליח</option>
          <option value="failed">נכשל</option>
          <option value="pending">ממתין</option>
        </select>
        <div className="flex items-center gap-2 text-sm">
          <span>מתאריך:</span>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="border rounded px-2 py-1 text-sm" />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span>עד:</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="border rounded px-2 py-1 text-sm" />
        </div>
        <button onClick={load} className="bg-brand-bluesurface text-white px-4 py-1.5 rounded text-sm hover:bg-brand-darksurface">
          רענן
        </button>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-xl border overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-400">טוען...</div>
        ) : (
          <table className="min-w-full text-sm text-right">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 font-medium">תאריך</th>
                <th className="p-3 font-medium">סכום</th>
                <th className="p-3 font-medium">מצב</th>
                <th className="p-3 font-medium">שם משלם</th>
                <th className="p-3 font-medium">מייל</th>
                <th className="p-3 font-medium">פרויקט</th>
                <th className="p-3 font-medium">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 whitespace-nowrap">{new Date(p.created_at).toLocaleString("he-IL")}</td>
                  <td className="p-3 font-medium"><span dir="ltr">₪{Number(p.amount).toLocaleString("he-IL")}</span></td>
                  <td className="p-3"><StatusBadge status={p.status} /></td>
                  <td className="p-3">{p.payer_name || "—"}</td>
                  <td className="p-3 text-gray-600">{p.user_email || "—"}</td>
                  <td className="p-3">
                    {p.project_id ? (
                      <Link href={`/admin/projects/${p.project_id}`} className="text-brand-blue hover:underline text-xs">
                        {p.project_id.slice(0, 8)}...
                      </Link>
                    ) : "—"}
                  </td>
                  <td className="p-3">
                    {p.project_id && (
                      <Link href={`/admin/projects/${p.project_id}`}
                        className="text-xs text-brand-blue hover:underline">
                        פרויקט
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">אין תשלומים.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
