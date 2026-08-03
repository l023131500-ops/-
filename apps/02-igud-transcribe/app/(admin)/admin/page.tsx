"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Stats = {
  uploads_total: number;
  uploads_pending: number;
  uploads_running: number;
  uploads_done: number;
  uploads_error: number;
  coupons_active: number;
  jobs_pending: number;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [runMsg, setRunMsg] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/tamlul/api/admin/stats", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setStats(await res.json());
    } catch {
      setError("שגיאה בטעינת סטטיסטיקות");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  const runWorker = async () => {
    setRunning(true);
    setRunMsg(null);
    try {
      const res = await fetch("/tamlul/api/jobs", { method: "GET" });
      const data = await res.json();
      setRunMsg(data.message || (data.processed ? "עיבוד הושלם" : "אין עבודות בתור"));
      load();
    } catch {
      setRunMsg("שגיאה בהפעלת עיבוד");
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return <div className="text-slate-500">טוען נתונים...</div>;
  }
  if (error || !stats) {
    return <div className="text-red-600">{error}</div>;
  }

  const cards = [
    { label: "סה״כ העלאות", value: stats.uploads_total, color: "text-brand-blue" },
    { label: "בהמתנה", value: stats.uploads_pending, color: "text-amber-600" },
    { label: "בתהליך", value: stats.uploads_running, color: "text-blue-600" },
    { label: "הושלמו", value: stats.uploads_done, color: "text-emerald-600" },
    { label: "שגיאות", value: stats.uploads_error, color: "text-red-600" },
    { label: "קופונים פעילים", value: stats.coupons_active, color: "text-brand-gold" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-brand-blue">דשבורד</h1>
          <p className="text-slate-600 mt-1">סקירה כללית של המערכת</p>
        </div>
        <div className="flex items-center gap-3">
          {runMsg && <span className="text-sm text-slate-600">{runMsg}</span>}
          <button onClick={runWorker} disabled={running} className="btn-accent">
            {running ? "מעבד..." : `הפעל worker (${stats.jobs_pending})`}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="card">
            <div className="text-sm text-slate-500">{c.label}</div>
            <div className={`text-3xl font-bold mt-2 ${c.color}`}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Link href="/admin/uploads" className="card hover:shadow-lg transition">
          <div className="font-bold text-brand-blue">ניהול העלאות</div>
          <p className="text-sm text-slate-600 mt-1">צפייה, הורדת קבצים, מחיקה</p>
        </Link>
        <Link href="/admin/coupons" className="card hover:shadow-lg transition">
          <div className="font-bold text-brand-blue">קופונים</div>
          <p className="text-sm text-slate-600 mt-1">יצירה, ניהול והגבלות שימוש</p>
        </Link>
        <Link href="/admin/glossary" className="card hover:shadow-lg transition">
          <div className="font-bold text-brand-blue">מילון מונחים</div>
          <p className="text-sm text-slate-600 mt-1">תיקוני אוטומציה לפי סגנון</p>
        </Link>
        <Link href="/admin/settings" className="card hover:shadow-lg transition">
          <div className="font-bold text-brand-blue">הגדרות</div>
          <p className="text-sm text-slate-600 mt-1">קונפיגורציה כללית</p>
        </Link>
      </div>
    </div>
  );
}
