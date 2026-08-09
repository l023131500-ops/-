"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CATEGORY_ORDER } from "@/lib/catalog";

export default function UploadPage() {
  const [ready, setReady] = useState<boolean | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORY_ORDER[0]);
  const [sender, setSender] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/catalog")
      .then((r) => r.json())
      .then((d) => setReady(Boolean(d.ready)))
      .catch(() => setReady(false));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!file) return setMsg({ type: "err", text: "יש לבחור קובץ." });
    if (!title.trim()) return setMsg({ type: "err", text: "יש להזין כותרת." });
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("category", category);
      fd.append("sender", sender.trim());
      fd.append("file", file);
      const res = await fetch("/api/catalog", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה בהעלאה");
      setMsg({ type: "ok", text: "החומר נוסף למדף בהצלחה!" });
      setTitle("");
      setSender("");
      setFile(null);
      (document.getElementById("file-input") as HTMLInputElement).value = "";
    } catch (err: any) {
      setMsg({ type: "err", text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-r" style={{ padding: "34px 20px 60px", maxWidth: 640 }}>
      <Link href="/shelf" style={{ color: "#2b4a8b", fontWeight: 600 }}>→ חזרה למדף הגננת</Link>
      <h1 style={{ fontSize: 30, fontWeight: 800, marginTop: 14 }}>הוספת חומר למדף</h1>
      <p style={{ color: "#6d6f88", marginTop: 6, lineHeight: 1.7 }}>
        העלו דף עבודה, דף צביעה, יצירה או חומר חג (PDF או תמונה, עד 25MB). החומר יתווסף למדף לצפייה והורדה.
      </p>

      {ready === false && (
        <div className="card" style={{ padding: 16, marginTop: 18, background: "#f7efd8", borderColor: "#e6d199", color: "#8a6a1c" }}>
          אחסון הענן להעלאות עדיין לא הופעל בסביבה הזו. המדף עם החומרים הקיימים פעיל לצפייה והורדה;
          העלאת חומרים חדשים תיפתח מיד עם הגדרת משתני הסביבה של האחסון.
        </div>
      )}

      <form onSubmit={submit} className="card" style={{ padding: 22, marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        <label style={{ fontWeight: 600, fontSize: 14 }}>
          כותרת החומר
          <input className="input" style={{ marginTop: 6 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="למשל: דף עבודה — פירות הארץ" />
        </label>
        <label style={{ fontWeight: 600, fontSize: 14 }}>
          קטגוריה
          <select className="input" style={{ marginTop: 6 }} value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label style={{ fontWeight: 600, fontSize: 14 }}>
          מקור / קרדיט (רשות)
          <input className="input" style={{ marginTop: 6 }} value={sender} onChange={(e) => setSender(e.target.value)} placeholder="למשל: קהילת גן" />
        </label>
        <label style={{ fontWeight: 600, fontSize: 14 }}>
          קובץ (PDF או תמונה)
          <input id="file-input" className="input" style={{ marginTop: 6 }} type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>

        {msg && (
          <div style={{ padding: "10px 14px", borderRadius: 10, fontSize: 14, background: msg.type === "ok" ? "#e2f3f0" : "#f8e8ee", color: msg.type === "ok" ? "#1f6a62" : "#a03a5c" }}>
            {msg.text}
          </div>
        )}

        <button type="submit" className="btn btn-main" disabled={busy || ready === false} style={{ justifyContent: "center", opacity: busy || ready === false ? 0.6 : 1 }}>
          {busy ? "מעלה…" : "הוספה למדף"}
        </button>
      </form>
    </div>
  );
}
