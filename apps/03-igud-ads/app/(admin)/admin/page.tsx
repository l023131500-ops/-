"use client";
import { useEffect, useState } from "react";

type Stats = {
  projects_total: number;
  projects_ready: number;
  projects_generating: number;
  projects_error: number;
  coupons_active: number;
  jobs_pending: number;
};

export default function AdminDashboard() {
  const [s, setS] = useState<Stats | null>(null);
  const [running, setRunning] = useState(false);

  async function load() {
    const r = await fetch("/modaot/api/admin/stats");
    const j = await r.json();
    setS(j);
  }
  useEffect(() => { load(); const id = setInterval(load, 15000); return () => clearInterval(id); }, []);

  async function runWorker() {
    if (running) return;
    setRunning(true);
    try {
      const r = await fetch("/modaot/api/jobs/worker", { method: "POST" });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        alert(d.error || "שגיאה בהרצת ה-Worker");
      }
      await load();
    } catch {
      alert("שגיאת רשת — נסה שוב");
    } finally {
      setRunning(false);
    }
  }

  const cards = [
    { label: "סה\"כ פרויקטים", val: s?.projects_total ?? "—" },
    { label: "מוכנים לבחירה", val: s?.projects_ready ?? "—" },
    { label: "בעיבוד", val: s?.projects_generating ?? "—" },
    { label: "שגיאות", val: s?.projects_error ?? "—" },
    { label: "קופונים פעילים", val: s?.coupons_active ?? "—" },
    { label: "Jobs ממתינים", val: s?.jobs_pending ?? "—" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-bold text-brand-dark">דשבורד</h1>
        <button className="btn-primary text-sm" onClick={runWorker} disabled={running}>
          {running ? "מריץ..." : "הרץ Worker עכשיו"}
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-surface rounded-xl border p-5">
            <div className="text-3xl font-bold text-brand-blue">{c.val}</div>
            <div className="text-sm text-gray-600 mt-1">{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
