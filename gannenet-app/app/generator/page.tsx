"use client";
import { useState } from "react";

export default function Generator() {
  const [topic, setTopic] = useState("");
  const [ageGroup, setAgeGroup] = useState("טרום־חובה (3–5)");
  const [style, setStyle] = useState("דף עבודה");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<any>(null);
  const [err, setErr] = useState("");

  async function generate() {
    if (!topic.trim()) { setErr("נא להזין נושא"); return; }
    setErr(""); setLoading(true); setRes(null);
    try {
      const r = await fetch("/api/ai-generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic, ageGroup, style }) });
      setRes(await r.json());
    } catch (e: any) { setErr(e?.message || "שגיאה"); }
    setLoading(false);
  }

  return (
    <div className="container-r" style={{ padding: "34px 20px 50px", maxWidth: 820 }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800 }}>מחולל דפי משימה</h1>
        <p style={{ color: "#6d6f88", marginTop: 6 }}>בחרי נושא, גיל וסוג פעילות — וקבלי דף מותאם לגן החרדי</p>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <label style={{ fontWeight: 600, fontSize: 14 }}>נושא</label>
        <input className="input" style={{ marginTop: 6, marginBottom: 14 }} placeholder='למשל: "האות א׳ — אתרוג", "פרשת נח — תיבת נח", "סימני הסתיו"' value={topic} onChange={(e) => setTopic(e.target.value)} />
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ fontWeight: 600, fontSize: 14 }}>קבוצת גיל</label>
            <select className="input" style={{ marginTop: 6 }} value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)}>
              <option>מעון (1–3)</option><option>טרום־חובה (3–5)</option><option>חובה (5–6)</option>
            </select>
          </div>
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ fontWeight: 600, fontSize: 14 }}>סוג פעילות</label>
            <select className="input" style={{ marginTop: 6 }} value={style} onChange={(e) => setStyle(e.target.value)}>
              <option>דף עבודה</option><option>דף צביעה</option><option>משחק התאמה</option><option>כרטיסיות</option>
            </select>
          </div>
        </div>
        {err && <p style={{ color: "#c1607e", marginTop: 10 }}>{err}</p>}
        <button className="btn btn-main" style={{ marginTop: 18 }} onClick={generate} disabled={loading}>
          {loading ? "יוצר…" : "צרי דף משימה"}
        </button>
      </div>

      {res && (
        <div className="card" style={{ padding: 26, marginTop: 22 }}>
          {res.notConnected && <div style={{ background: "#f7efd8", color: "#8a6a1c", borderRadius: 12, padding: "12px 16px", marginBottom: 14, fontSize: 14 }}>תצוגת דוגמה — לחיבור מנוע ה-AI בזמן אמת יש להזין מפתח API (ראו הוראות).</div>}
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#2b4a8b" }}>{res.title}</h2>
          <p style={{ color: "#6d6f88", marginTop: 4 }}>קבוצת גיל: {res.ageGroup}</p>
          {res.instructions && <p style={{ marginTop: 14, lineHeight: 1.8 }}>{res.instructions}</p>}
          {res.contentElements?.length > 0 && (<><h3 style={{ marginTop: 16, fontWeight: 700, color: "#2b8a80" }}>תוכן הדף</h3><ul style={{ paddingInlineStart: 22 }}>{res.contentElements.map((c: string, i: number) => <li key={i} style={{ marginBottom: 4 }}>{c}</li>)}</ul></>)}
          {res.designHints?.length > 0 && (<><h3 style={{ marginTop: 16, fontWeight: 700, color: "#c99a3b" }}>הנחיות עיצוב</h3><ul style={{ paddingInlineStart: 22 }}>{res.designHints.map((c: string, i: number) => <li key={i} style={{ marginBottom: 4 }}>{c}</li>)}</ul></>)}
        </div>
      )}
    </div>
  );
}
