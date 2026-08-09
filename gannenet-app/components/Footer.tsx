export default function Footer() {
  return (
    <footer style={{ marginTop: 48, background: "#2b4a8b", color: "#fff", borderRadius: "2rem 2rem 0 0" }}>
      <div className="container-r" style={{ display: "flex", justifyContent: "space-between", gap: 24, flexWrap: "wrap", alignItems: "center", padding: "34px 20px 28px" }}>
        <div style={{ maxWidth: 440 }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>גננת בקליק</div>
          <p style={{ opacity: .85, fontSize: 14, marginTop: 6 }}>
            כל התוכן הפדגוגי לגן החרדי במקום אחד — מערכי יום ומערכי העשרה, דפי משימה, דפי קשר, לוח שנה עברי ואשף הכנה לשבוע. בנוי לפי כללי משרד החינוך ומותאם לגן החרדי, גיל 1–6.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="chip" style={{ background: "rgba(255,255,255,.15)", color: "#fff" }}>הדפסה ו-PDF</span>
          <span className="chip" style={{ background: "rgba(255,255,255,.15)", color: "#fff" }}>מבוסס מקורות</span>
          <span className="chip" style={{ background: "rgba(255,255,255,.15)", color: "#fff" }}>מותאם לסינון נטפרי</span>
        </div>
      </div>
      <div style={{ textAlign: "center", opacity: .7, fontSize: 12.5, paddingBottom: 18 }}>© גננת בקליק · כל הזכויות שמורות</div>
    </footer>
  );
}
