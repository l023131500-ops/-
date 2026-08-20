"use client";
import { useEffect, useState } from "react";

interface Stats {
  projects_total: number;
  projects_ready: number;
  projects_generating: number;
  projects_error: number;
  coupons_active: number;
  users_total: number;
  monthly_revenue: number;
  transcripts_month: number;
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-surface rounded-xl border p-5">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-3xl font-bold ${color || "text-brand-dark"}`}>{value}</div>
      {sub && <div className="text-xs text-gray-600 mt-1">{sub}</div>}
    </div>
  );
}

export default function StatsAdmin() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const r = await fetch("/modaot/api/admin/stats");
    const j = await r.json();
    setStats(j);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  if (loading) return <div className="p-8 text-center text-gray-600">טוען...</div>;
  if (!stats) return <div className="p-8 text-center text-red-400">שגיאה בטעינה.</div>;

  const projectsData = [
    { label: "מוכן", value: stats.projects_ready, color: "#22c55e" },
    { label: "בעיבוד", value: stats.projects_generating, color: "#eab308" },
    { label: "שגיאה", value: stats.projects_error, color: "#ef4444" },
  ];

  const maxVal = Math.max(...projectsData.map((d) => d.value), 1);

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-bold text-brand-dark">סטטיסטיקות</h1>
        <button onClick={load} className="bg-brand-bluesurface text-white px-4 py-1.5 rounded text-sm">
          רענן
        </button>
      </div>

      {/* Main stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label={'סה"כ משתמשים'}
          value={stats.users_total}
          color="text-brand-blue"
        />
        <StatCard
          label={'סה"כ פרויקטים'}
          value={stats.projects_total}
          color="text-brand-dark"
        />
        <StatCard
          label="הכנסות החודש"
          value={`₪${stats.monthly_revenue.toLocaleString("he-IL")}`}
          color="text-green-700"
        />
        <StatCard
          label="תמלולים החודש"
          value={stats.transcripts_month}
          color="text-purple-700"
        />
      </div>

      {/* Project status breakdown */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-surface rounded-xl border p-5">
          <h2 className="font-semibold mb-4">סטטוס פרויקטים</h2>
          <div className="space-y-3">
            {projectsData.map((d) => (
              <div key={d.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{d.label}</span>
                  <span className="font-medium">{d.value}</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(d.value / maxVal) * 100}%`,
                      backgroundColor: d.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface rounded-xl border p-5">
          <h2 className="font-semibold mb-4">נתונים נוספים</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-gray-600">קופונים פעילים</span>
              <span className="font-bold text-brand-gold">{stats.coupons_active}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-gray-600">פרויקטים מוכנים</span>
              <span className="font-bold text-green-700">{stats.projects_ready}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-gray-600">פרויקטים בעיבוד</span>
              <span className="font-bold text-yellow-700">{stats.projects_generating}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">שגיאות</span>
              <span className="font-bold text-red-600">{stats.projects_error}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
