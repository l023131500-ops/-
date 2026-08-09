import Link from "next/link";

const tiers = [
  { name: "חינם", price: "0", per: "", features: ["גישה מוגבלת למאגר", "3 הפקות AI בחודש", "צפייה בלוח השנה"], cta: "התחלה חינם", highlight: false },
  { name: "פרימיום", price: "49", per: "לחודש", features: ["גישה מלאה לכל המערכים", "הפקות AI ללא הגבלה", "דפי קשר + שליחה בוואטסאפ", "אשף הכנה לשבוע", "הורדה ל-PDF ולהדפסה"], cta: "מנוי פרימיום", highlight: true },
  { name: "רשתות גנים", price: "מותאם", per: "", features: ["ניהול ריבוי גנים", "לוח בקרה למפקחת", "חיוב מרוכז", "תמיכה ייעודית והתאמות"], cta: "דברו איתנו", highlight: false },
];

export default function Pricing() {
  return (
    <div className="container-r" style={{ padding: "34px 20px 50px" }}>
      <div style={{ textAlign: "center", marginBottom: 26 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800 }}>מסלולים ומחירים</h1>
        <p style={{ color: "#6d6f88", marginTop: 6 }}>מתחילים חינם — ומשדרגים כשרוצים את הכל</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 18, maxWidth: 980, margin: "0 auto" }}>
        {tiers.map((t) => (
          <div key={t.name} className="card" style={{ padding: 28, border: t.highlight ? "2px solid #2b4a8b" : undefined, position: "relative" }}>
            {t.highlight && <span className="chip" style={{ position: "absolute", top: -12, insetInlineStart: 20, background: "#2b4a8b", color: "#fff" }}>הכי פופולרי</span>}
            <h3 style={{ fontSize: 22, fontWeight: 800 }}>{t.name}</h3>
            <div style={{ margin: "12px 0 16px" }}>
              <span style={{ fontSize: 40, fontWeight: 800, color: "#2b4a8b" }}>{t.price}</span>
              {t.price !== "מותאם" && <span style={{ fontSize: 20 }}> ₪</span>}
              <span style={{ color: "#6d6f88" }}> {t.per}</span>
            </div>
            <ul style={{ paddingInlineStart: 20, marginBottom: 18 }}>
              {t.features.map((f) => <li key={f} style={{ marginBottom: 7, color: "#3a3c56" }}>{f}</li>)}
            </ul>
            <Link href="/library" className={t.highlight ? "btn btn-main" : "btn btn-ghost"} style={{ width: "100%", justifyContent: "center" }}>{t.cta}</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
