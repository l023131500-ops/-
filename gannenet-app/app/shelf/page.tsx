"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  seedItems,
  sortItems,
  orderedCategories,
  allSenders,
  type ShelfItem,
} from "@/lib/catalog";

function fmtDate(d: string) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return day && m && y ? `${day}/${m}/${y}` : d;
}

export default function ShelfPage() {
  const [dynamic, setDynamic] = useState<ShelfItem[]>([]);
  const [cat, setCat] = useState("");
  const [sender, setSender] = useState("");
  const [kind, setKind] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/catalog")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => {
        if (alive && Array.isArray(d.items)) setDynamic(d.items as ShelfItem[]);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const all = useMemo(() => {
    const seen = new Set(seedItems.map((i) => i.id));
    const merged = [...seedItems, ...dynamic.filter((i) => !seen.has(i.id))];
    return sortItems(merged);
  }, [dynamic]);

  const cats = useMemo(() => orderedCategories(all), [all]);
  const senders = useMemo(() => allSenders(all), [all]);

  const filtered = all.filter(
    (i) =>
      (!cat || i.category === cat) &&
      (!sender || i.sender === sender) &&
      (!kind || i.kind === kind) &&
      (!q || (i.title + i.category + i.sender).includes(q))
  );

  return (
    <div className="container-r" style={{ padding: "34px 20px 60px" }}>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <span className="chip" style={{ background: "#f7efd8", color: "#a2781f" }}>
          מדף הגננת · ארכיון חומרים
        </span>
        <h1 style={{ fontSize: 34, fontWeight: 800, marginTop: 12 }}>מדף הגננת</h1>
        <p style={{ color: "#6d6f88", marginTop: 6, maxWidth: 640, marginInline: "auto", lineHeight: 1.7 }}>
          חומרים אמינים לגננת — דפי עבודה, דפי צביעה, יצירה וחומרי חג — מסודרים לפי סדר השנה.
          צפייה והורדה בקליק. אפשר גם להוסיף חומרים משלכם.
        </p>
        <div style={{ marginTop: 16, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/shelf/upload" className="btn btn-main" style={{ fontSize: 14.5 }}>
            הוספת חומר למדף
          </Link>
          <span style={{ alignSelf: "center", color: "#6d6f88", fontSize: 14 }}>
            {all.length} פריטים · {cats.length} קטגוריות
          </span>
        </div>
      </div>

      {/* Category quick chips (ordered) */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", margin: "18px 0 14px" }}>
        <button onClick={() => setCat("")} className="chip" style={{ cursor: "pointer", border: "none", background: cat === "" ? "#2b4a8b" : "#eef2fb", color: cat === "" ? "#fff" : "#2b4a8b" }}>
          הכול
        </button>
        {cats.map((c) => (
          <button key={c} onClick={() => setCat(c)} className="chip" style={{ cursor: "pointer", border: "none", background: cat === c ? "#2b4a8b" : "#eef2fb", color: cat === c ? "#fff" : "#2b4a8b" }}>
            {c}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 14, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 22 }}>
        <input className="input" style={{ flex: "1 1 220px" }} placeholder="חיפוש חומר…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" style={{ flex: "0 0 190px" }} value={sender} onChange={(e) => setSender(e.target.value)}>
          <option value="">כל המקורות</option>
          {senders.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input" style={{ flex: "0 0 150px" }} value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="">כל הסוגים</option>
          <option value="pdf">מסמכי PDF</option>
          <option value="image">תמונות</option>
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 16 }}>
        {filtered.map((i) => (
          <div key={i.id} className="card" style={{ padding: 18, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              <span className="chip" style={{ background: "#e2f3f0", color: "#1f6a62" }}>{i.category}</span>
              <span className="chip" style={{ background: i.kind === "pdf" ? "#f8e8ee" : "#f7efd8", color: i.kind === "pdf" ? "#a03a5c" : "#a2781f" }}>
                {i.kind === "pdf" ? "PDF" : "תמונה"}
              </span>
            </div>
            <h3 style={{ fontSize: 16.5, fontWeight: 700, color: "#2b4a8b", lineHeight: 1.5, minHeight: 48 }}>{i.title}</h3>
            <p style={{ fontSize: 12.5, color: "#6d6f88", marginTop: 8 }}>
              {i.sender}{i.sender && i.date ? " · " : ""}{fmtDate(i.date)}{i.sizeKB ? ` · ${i.sizeKB}KB` : ""}
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <Link href={`/shelf/${i.id}`} className="btn btn-main" style={{ flex: 1, justifyContent: "center", padding: ".5rem", fontSize: 14 }}>
                פתיחה וצפייה
              </Link>
              <a href={i.file} download target="_blank" rel="noopener" className="btn btn-ghost" style={{ padding: ".5rem .7rem", fontSize: 14 }}>
                הורדה
              </a>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <p style={{ textAlign: "center", color: "#6d6f88", marginTop: 40 }}>לא נמצאו חומרים לסינון הזה.</p>
      )}
    </div>
  );
}
