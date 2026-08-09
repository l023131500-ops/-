import Link from "next/link";
import { mashlimaLessons, regularLessons } from "@/lib/content";

const Icon = ({ d }: { d: string }) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: d }} />
);

const features = [
  { t: "מאגר מערכים מלא", d: "מערכי יום לגננת הרגילה (5 מפגשים לנושא) ומערכי העשרה לגננת המשלימה — מבוססי מקורות.", i: '<path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 1 2-2h12"/>', c: "#eef2fb", col: "#2b4a8b" },
  { t: "מדף הגננת — ארכיון חומרים", d: "עשרות חומרים אמינים — דפי עבודה, צביעה, יצירה וחומרי חג — מסודרים לפי סדר השנה, לצפייה והורדה. אפשר גם להוסיף חומרים משלכם.", i: '<path d="M3 7h18M3 12h18M3 17h18"/><path d="M5 7v10M19 7v10"/>', c: "#f7efd8", col: "#c99a3b" },
  { t: "מחולל דפי משימה AI", d: "בחרי נושא, גיל וסוג פעילות — וקבלי דף עבודה אותנטי ומעוצב, מוכן להדפסה ו-PDF.", i: '<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/><path d="M9 13h6M9 17h4"/>', c: "#e2f3f0", col: "#2b8a80" },
  { t: "דפי קשר להורים", d: "טיוטת דף קשר שבועי חם ויהודי, עם שילוב תמונות ושליחה בוואטסאפ.", i: '<path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z"/>', c: "#f8e8ee", col: "#c1607e" },
  { t: "לוח שנה עברי חכם", d: "זיהוי אוטומטי של הפרשה, החג וראש החודש — ונושאים מומלצים לכל שבוע.", i: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>', c: "#f7efd8", col: "#c99a3b" },
  { t: "אשף הכנה לשבוע", d: "כפתור אחד שמכין לך את כל השבוע: סיפור, דף צביעה, יצירה ודף קשר — בחבילה אחת.", i: '<path d="M12 2l2.4 6.9H22l-6 4.4 2.3 7-6.3-4.6L5.7 20l2.3-7-6-4.4h7.6z"/>', c: "#eef2fb", col: "#2b4a8b" },
  { t: "מותאם לסינון נטפרי", d: "רינדור בצד שרת, נכסים מקומיים — עובד גם תחת סינוני אינטרנט מחמירים.", i: '<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/><path d="M9 12l2 2 4-4"/>', c: "#e2f3f0", col: "#2b8a80" },
];

export default function Home() {
  const total = mashlimaLessons.length + regularLessons.length;
  return (
    <>
      <section className="container-r" style={{ padding: "56px 20px 24px", textAlign: "center" }}>
        <span className="chip" style={{ marginBottom: 16 }}>בנוי לפי כללי משרד החינוך · מותאם לגן החרדי</span>
        <h1 style={{ fontSize: "clamp(30px,5vw,52px)", fontWeight: 800, lineHeight: 1.15, letterSpacing: "-.5px" }}>
          כל התוכן לגן<br /><span style={{ color: "#2b4a8b" }}>מוכן בקליק אחד</span>
        </h1>
        <p style={{ fontSize: 19, color: "#6d6f88", maxWidth: 640, margin: "18px auto 0" }}>
          מערכי יום ומערכי העשרה מבוססי מקורות, מחולל דפי משימה חכם, דפי קשר להורים, לוח שנה עברי ואשף הכנה לשבוע — הכל במקום אחד, לגננת הרגילה ולגננת המשלימה.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 28, flexWrap: "wrap" }}>
          <Link href="/library" className="btn btn-main">למאגר המערכים</Link>
          <Link href="/shelf" className="btn btn-ghost">מדף הגננת — חומרים להורדה</Link>
          <Link href="/generator" className="btn btn-ghost">מחולל דפי משימה</Link>
        </div>
        <div style={{ display: "flex", gap: 26, justifyContent: "center", marginTop: 30, flexWrap: "wrap", color: "#6d6f88", fontWeight: 600 }}>
          <span><b style={{ color: "#2b4a8b", fontSize: 22 }}>{total}+</b> מערכים מוכנים</span>
          <span><b style={{ color: "#2b4a8b", fontSize: 22 }}>2</b> קהלים — רגילה ומשלימה</span>
          <span><b style={{ color: "#2b4a8b", fontSize: 22 }}>1–6</b> כל הגילאים</span>
        </div>
      </section>

      <section className="container-r" style={{ padding: "34px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <h2 style={{ fontSize: 31, fontWeight: 800 }}>מה יש במערכת</h2>
          <p style={{ color: "#6d6f88", marginTop: 6 }}>כל הכלים שגננת צריכה — מוכנים, מדויקים ומזמינים</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 18 }}>
          {features.map((f) => (
            <div key={f.t} className="card" style={{ padding: 24 }}>
              <div style={{ width: 54, height: 54, borderRadius: 15, background: f.c, color: f.col, display: "grid", placeItems: "center", marginBottom: 14 }}>
                <Icon d={f.i} />
              </div>
              <h3 style={{ fontSize: 19, fontWeight: 700, marginBottom: 6 }}>{f.t}</h3>
              <p style={{ fontSize: 14.5, color: "#6d6f88" }}>{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-r" style={{ padding: "20px 20px 40px" }}>
        <div className="card" style={{ padding: 30, textAlign: "center", background: "linear-gradient(135deg,#eef2fb,#e2f3f0)" }}>
          <h2 style={{ fontSize: 26, fontWeight: 800 }}>מוכנה להתחיל?</h2>
          <p style={{ color: "#4a4c63", marginTop: 8, maxWidth: 560, margin: "8px auto 0" }}>הצטרפי חינם, גלי את המאגר, וחסכי שעות הכנה כל שבוע.</p>
          <div style={{ marginTop: 20 }}>
            <Link href="/pricing" className="btn btn-main">הרשמה חינם</Link>
          </div>
        </div>
      </section>
    </>
  );
}
