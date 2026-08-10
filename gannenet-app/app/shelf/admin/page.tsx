"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Row = {
  id: string;
  title: string;
  category: string;
  sender: string;
  kind: string;
  sizeKB: number;
  hidden: boolean;
  hiddenPages: number[];
};

const PAGE = 40;

function parsePages(text: string): number[] {
  const out = new Set<number>();
  for (const part of text.split(/[,\s]+/).filter(Boolean)) {
    const m = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!m) continue;
    let a = parseInt(m[1], 10);
    let b = m[2] ? parseInt(m[2], 10) : a;
    if (a > b) [a, b] = [b, a];
    for (let p = a; p <= b; p++) if (p >= 1) out.add(p);
  }
  return Array.from(out).sort((x, y) => x - y);
}

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string>("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [onlyEdited, setOnlyEdited] = useState(false);
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => {
    const saved = sessionStorage.getItem("gannenet_admin_key");
    if (saved) {
      setKey(saved);
      login(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(k: string) {
    setErr("");
    try {
      const res = await fetch("/api/admin/list", { method: "POST", headers: { "x-admin-key": k } });
      if (res.status === 401) {
        setErr("סיסמה שגויה.");
        setAuthed(false);
        return;
      }
      if (!res.ok) {
        setErr("שגיאה בטעינה.");
        return;
      }
      const data = await res.json();
      setRows(data.items as Row[]);
      const d: Record<string, string> = {};
      for (const r of data.items as Row[]) d[r.id] = (r.hiddenPages || []).join(",");
      setDrafts(d);
      setAuthed(true);
      sessionStorage.setItem("gannenet_admin_key", k);
    } catch {
      setErr("שגיאת רשת.");
    }
  }

  async function save(r: Row, hidden: boolean, pagesText: string) {
    setSaving(r.id);
    setMsg("");
    try {
      const hiddenPages = parsePages(pagesText);
      const res = await fetch("/api/admin/override", {
        method: "POST",
        headers: { "x-admin-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: r.id, hidden, hiddenPages }),
      });
      if (!res.ok) {
        setErr("שמירה נכשלה.");
        return;
      }
      setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, hidden, hiddenPages } : x)));
      setMsg(`נשמר: ${r.title.slice(0, 40)}`);
      setTimeout(() => setMsg(""), 2500);
    } finally {
      setSaving("");
    }
  }

  const cats = useMemo(() => Array.from(new Set(rows.map((r) => r.category))).sort(), [rows]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!cat || r.category === cat) &&
          (!q || (r.title + r.category + r.sender).toLowerCase().includes(q.toLowerCase())) &&
          (!onlyEdited || r.hidden || (r.hiddenPages && r.hiddenPages.length > 0))
      ),
    [rows, cat, q, onlyEdited]
  );
  useEffect(() => setLimit(PAGE), [q, cat, onlyEdited]);
  const visible = filtered.slice(0, limit);

  if (!authed) {
    return (
      <div className="container-r" style={{ padding: "60px 20px", maxWidth: 420 }}>
        <div className="card" style={{ padding: 26 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#2b4a8b" }}>ניהול המדף</h1>
          <p style={{ color: "#6d6f88", fontSize: 14, marginTop: 6 }}>הזינו סיסמת ניהול כדי להסתיר קבצים או למחוק עמודים.</p>
          <input
            className="input"
            type="password"
            placeholder="סיסמת ניהול"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login(key)}
            style={{ marginTop: 14, width: "100%" }}
          />
          <button onClick={() => login(key)} className="btn btn-main" style={{ marginTop: 12, width: "100%" }}>
            כניסה
          </button>
          {err && <p style={{ color: "#a03a5c", fontSize: 13.5, marginTop: 10 }}>{err}</p>}
          <Link href="/shelf" style={{ display: "block", marginTop: 16, color: "#2b4a8b", fontSize: 13.5 }}>→ חזרה למדף</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-r" style={{ padding: "28px 20px 60px", maxWidth: 1040 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#2b4a8b" }}>ניהול המדף</h1>
        <Link href="/shelf" style={{ color: "#2b4a8b", fontWeight: 600 }}>→ חזרה למדף</Link>
      </div>
      <p style={{ color: "#6d6f88", fontSize: 13.5, marginTop: 6, lineHeight: 1.7 }}>
        <b>הסתרת קובץ</b> — מסירה אותו מהאתר לגמרי. <b>מחיקת עמודים</b> — הקלידו מספרי עמודים להסתרה (למשל <code>1</code> לעמוד המייל, או <code>1-2</code>). העמודים לא יופיעו בצפייה, בהורדה או בהדפסה.
      </p>

      <div className="card" style={{ padding: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 14 }}>
        <input className="input" style={{ flex: "1 1 220px" }} placeholder="חיפוש…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" style={{ flex: "0 0 200px" }} value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">כל הקטגוריות</option>
          {cats.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label style={{ fontSize: 13.5, color: "#6d6f88", display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={onlyEdited} onChange={(e) => setOnlyEdited(e.target.checked)} />
          רק ערוכים
        </label>
      </div>

      {msg && <p style={{ color: "#1f6a62", fontSize: 13.5, marginTop: 10 }}>{msg}</p>}
      {err && <p style={{ color: "#a03a5c", fontSize: 13.5, marginTop: 10 }}>{err}</p>}
      <p style={{ color: "#9a9cb0", fontSize: 12.5, margin: "12px 0" }}>מוצגים {visible.length} מתוך {filtered.length.toLocaleString("he")}</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {visible.map((r) => (
          <div key={r.id} className="card" style={{ padding: 14, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", opacity: r.hidden ? 0.6 : 1 }}>
            <div style={{ flex: "1 1 280px", minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: "#2b4a8b", lineHeight: 1.4 }}>{r.title}</div>
              <div style={{ fontSize: 12, color: "#9a9cb0", marginTop: 3 }}>{r.category} · {r.kind.toUpperCase()} · {r.sizeKB}KB</div>
            </div>
            {r.kind === "pdf" && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12.5, color: "#6d6f88" }}>עמודים למחיקה:</span>
                <input
                  className="input"
                  style={{ width: 92, fontSize: 13, padding: ".4rem .5rem" }}
                  placeholder="1 / 1-2"
                  value={drafts[r.id] ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                />
              </div>
            )}
            <label style={{ fontSize: 12.5, color: r.hidden ? "#a03a5c" : "#6d6f88", display: "flex", gap: 5, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={r.hidden}
                onChange={(e) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, hidden: e.target.checked } : x)))}
              />
              הסתר קובץ
            </label>
            <Link href={`/shelf/${r.id}`} target="_blank" className="btn btn-ghost" style={{ fontSize: 13, padding: ".4rem .7rem" }}>צפייה</Link>
            <button
              onClick={() => save(r, r.hidden, drafts[r.id] ?? "")}
              disabled={saving === r.id}
              className="btn btn-main"
              style={{ fontSize: 13.5, padding: ".45rem .9rem" }}
            >
              {saving === r.id ? "שומר…" : "שמירה"}
            </button>
          </div>
        ))}
      </div>

      {limit < filtered.length && (
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button onClick={() => setLimit((l) => l + PAGE)} className="btn btn-main" style={{ fontSize: 14 }}>
            טעינת עוד
          </button>
        </div>
      )}
    </div>
  );
}
