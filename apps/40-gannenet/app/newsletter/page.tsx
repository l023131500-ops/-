"use client";
import { useState } from "react";

export default function Newsletter() {
  const [kg, setKg] = useState("");
  const [topics, setTopics] = useState("");
  const [out, setOut] = useState("");

  function build() {
    const list = topics.split(/\n|,/).map((t) => t.trim()).filter(Boolean);
    const body = `להורים היקרים, שלום וברכה!

בשבוע המבורך שחלף עסקנו יחד בנושאים חשובים ומרתקים:
${list.map((t) => `• ${t}`).join("\n")}

הילדים נהנו, למדו והתחזקו במידות טובות ובאהבת התורה. תודה על שיתוף הפעולה החם.

בברכה,
צוות ${kg || "הגן"}`;
    setOut(body);
  }

  return (
    <div className="container-r" style={{ padding: "34px 20px 50px", maxWidth: 820 }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800 }}>מחולל דפי קשר להורים</h1>
        <p style={{ color: "#6d6f88", marginTop: 6 }}>טיוטת דף קשר שבועי חם ויהודי — מוכן לשליחה</p>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <label htmlFor="kg-name" style={{ fontWeight: 600, fontSize: 14 }}>שם הגן</label>
        <input id="kg-name" className="input" style={{ marginTop: 6, marginBottom: 14 }} value={kg} onChange={(e) => setKg(e.target.value)} placeholder="למשל: גן אורות" />
        <label htmlFor="kg-topics" style={{ fontWeight: 600, fontSize: 14 }}>נושאי השבוע (שורה לכל נושא)</label>
        <textarea id="kg-topics" className="input" style={{ marginTop: 6, minHeight: 120 }} value={topics} onChange={(e) => setTopics(e.target.value)} placeholder={"פרשת בראשית\nהאות א׳\nמידת הכרת הטוב"} />
        <button className="btn btn-main" style={{ marginTop: 16 }} onClick={build}>צרי דף קשר</button>
      </div>
      {out && (
        <div className="card" style={{ padding: 26, marginTop: 22, whiteSpace: "pre-wrap", lineHeight: 1.9, fontSize: 16 }}>{out}</div>
      )}
    </div>
  );
}
