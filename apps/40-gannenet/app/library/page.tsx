"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { mashlimaLessons, regularLessons } from "@/lib/content";

type Row = { id: string; title: string; audience: string; month: string; category: string; sub: string };

function buildRows(): Row[] {
  const rows: Row[] = [];
  mashlimaLessons.forEach((l) => {
    const cat = (/תחום:\s*([^|]+)/.exec(l.meta || "")?.[1] || "").trim();
    rows.push({ id: l.id, title: l.title, audience: "גננת משלימה", month: l.month || "", category: cat, sub: (l.objectives?.[0] || "") });
  });
  regularLessons.forEach((l) => {
    rows.push({ id: l.id, title: l.title, audience: "גננת רגילה", month: (l.meta || "").split("·")[0].replace("חודש", "").trim(), category: l.topic, sub: (l.summary || "").slice(0, 90) });
  });
  return rows;
}

export default function Library() {
  const rows = useMemo(buildRows, []);
  const [aud, setAud] = useState("");
  const [q, setQ] = useState("");
  const months = useMemo(() => Array.from(new Set(rows.map((r) => r.month).filter(Boolean))), [rows]);
  const [month, setMonth] = useState("");

  const filtered = rows.filter((r) =>
    (!aud || r.audience === aud) &&
    (!month || r.month === month) &&
    (!q || (r.title + r.category + r.sub).includes(q))
  );

  return (
    <div className="container-r" style={{ padding: "34px 20px 50px" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800 }}>מאגר המערכים</h1>
        <p style={{ color: "#6d6f88", marginTop: 6 }}>{rows.length} מערכים · סננו לפי קהל, חודש וקטגוריה</p>
      </div>

      <div className="card" style={{ padding: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 22 }}>
        <input className="input" style={{ flex: "1 1 220px" }} placeholder="חיפוש נושא…" aria-label="חיפוש נושא" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" style={{ flex: "0 0 190px" }} value={aud} onChange={(e) => setAud(e.target.value)}>
          <option value="">כל הקהלים</option>
          <option value="גננת רגילה">גננת רגילה</option>
          <option value="גננת משלימה">גננת משלימה</option>
        </select>
        <select className="input" style={{ flex: "0 0 170px" }} value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="">כל החודשים</option>
          {months.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
        {filtered.map((r) => (
          <Link key={r.id} href={`/lesson/${r.id}`} className="card" style={{ padding: 20, display: "block" }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              <span className="chip">{r.audience}</span>
              {r.month && <span className="chip" style={{ background: "#f7efd8", color: "#a2781f" }}>{r.month}</span>}
              {r.category && <span className="chip" style={{ background: "#e2f3f0", color: "#1f6a62" }}>{r.category}</span>}
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#2b4a8b" }}>{r.title}</h3>
            <p style={{ fontSize: 13.5, color: "#6d6f88", marginTop: 6 }}>{r.sub}</p>
          </Link>
        ))}
      </div>
      {filtered.length === 0 && <p style={{ textAlign: "center", color: "#6d6f88", marginTop: 30 }}>לא נמצאו מערכים לסינון הזה.</p>}
    </div>
  );
}
