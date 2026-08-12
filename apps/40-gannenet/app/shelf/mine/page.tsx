"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { ShelfItem } from "@/lib/catalog";
import { withBase, downloadUrl } from "@/lib/base";
import { sessionToken, authLinks } from "@/lib/session";

/**
 * "החומרים שלי" — מה שהגננת הזאת עצמה העלתה למדף.
 *
 * זה הצד השני של הגידור שנעשה ב-12/08: מאז שההעלאה דורשת חשבון, כל העלאה נושאת
 * `uploader_id` שנכתב מהטוקן שנבדק בשרת — ובלי המסך הזה אין שום מקום שבו
 * ההתחברות מחזירה משהו לגננת. המדף הציבורי מחזיק אלפי פריטים ואין בו דרך לשאול
 * "מה *אני* הוספתי".
 *
 * הסינון נעשה בשרת (`GET /api/catalog?mine=1`), מול אותה בדיקת טוקן של ההעלאה.
 * הדפדפן לא מקבל את הרשימה המלאה ולא מסנן אותה בעצמו, ו-`uploader_email` לא
 * יוצא מהשרת בכלל.
 */

type MineItem = ShelfItem & { hidden?: boolean };

function fmtDate(d: string) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return day && m && y ? `${day}/${m}/${y}` : d;
}

export default function MinePage() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [loginHref, setLoginHref] = useState("https://more30.com/login");
  const [signupHref, setSignupHref] = useState("https://more30.com/login?mode=signup");
  const [items, setItems] = useState<MineItem[] | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    const links = authLinks();
    setLoginHref(links.login);
    setSignupHref(links.signup);

    const token = sessionToken();
    if (!token) {
      setSignedIn(false);
      return;
    }
    setSignedIn(true);
    let alive = true;
    fetch(withBase("/api/catalog?mine=1"), { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (!alive) return;
        // סשן שפג תוקפו בין הכתיבה ל-localStorage לבין הקריאה הזאת נראה כאן
        // בדיוק כמו מי שלא התחבר מעולם, ולכן המסך חוזר לכרטיס הכניסה ולא מציג
        // "אין לך חומרים" — שתי אמירות שונות לגמרי.
        if (res.status === 401) {
          setSignedIn(false);
          return;
        }
        if (!res.ok) throw new Error(`שגיאה בטעינת הרשימה (${res.status}).`);
        const data = await res.json();
        setItems(Array.isArray(data.items) ? (data.items as MineItem[]) : []);
      })
      .catch((e: any) => {
        if (!alive) return;
        setErr(e instanceof TypeError ? "החיבור נכשל. בדקו את החיבור לאינטרנט ונסו שוב." : e?.message || "שגיאה בטעינה.");
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="container-r" style={{ padding: "34px 20px 60px", maxWidth: 900 }}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Link href="/shelf" style={{ color: "#2b4a8b", fontWeight: 600 }}>→ חזרה למדף הגננת</Link>
        <Link href="/shelf/upload" style={{ color: "#2b4a8b", fontWeight: 600 }}>הוספת חומר</Link>
      </div>
      <h1 style={{ fontSize: 30, fontWeight: 800, marginTop: 14 }}>החומרים שלי</h1>
      <p style={{ color: "#6d6f88", marginTop: 6, lineHeight: 1.7 }}>
        כל מה שהעליתן למדף מהחשבון הזה. המדף עצמו פתוח לכולם לצפייה ולהורדה; הרשימה הזאת היא שלכן בלבד.
      </p>

      {signedIn === false && (
        <div className="card" style={{ padding: 18, marginTop: 18, background: "#eef2fb", borderColor: "#c8d4ee" }}>
          <b style={{ display: "block", fontSize: 16, color: "#2b4a8b" }}>הרשימה הזאת דורשת חשבון</b>
          <p style={{ color: "#4a4c63", marginTop: 6, lineHeight: 1.7, fontSize: 14.5 }}>
            כדי לראות את החומרים שהעליתן יש להתחבר — חשבון אחד לכל מערכות more30, וההתחברות מחזירה
            אתכן בדיוק לעמוד הזה.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <a className="btn btn-main" href={loginHref}>כניסה לחשבון</a>
            <a className="btn btn-ghost" href={signupHref}>פתיחת חשבון — פחות מדקה</a>
          </div>
        </div>
      )}

      {err && (
        <div className="card" style={{ padding: 16, marginTop: 18, background: "#f8e8ee", borderColor: "#e6c3d1", color: "#a03a5c" }}>
          {err}
        </div>
      )}

      {signedIn === true && !err && items === null && (
        <p style={{ color: "#6d6f88", marginTop: 24 }}>טוען…</p>
      )}

      {items !== null && items.length === 0 && (
        <div className="card" style={{ padding: 22, marginTop: 18, textAlign: "center" }}>
          <p style={{ color: "#4a4c63", lineHeight: 1.7 }}>
            עדיין לא הוספתן חומר למדף. כל חומר שתעלו יופיע כאן, וגם במדף הכללי לצפייה ולהורדה.
          </p>
          <Link href="/shelf/upload" className="btn btn-main" style={{ marginTop: 14, fontSize: 14.5 }}>
            הוספת חומר למדף
          </Link>
        </div>
      )}

      {items !== null && items.length > 0 && (
        <>
          <p style={{ color: "#9a9cb0", fontSize: 13, margin: "18px 0 12px" }}>
            {items.length.toLocaleString("he")} חומרים שהעליתן
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 16 }}>
            {items.map((i) => (
              <div key={i.id} className="card" style={{ padding: 18, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                  <span className="chip" style={{ background: "#e2f3f0", color: "#1f6a62" }}>{i.category}</span>
                  <span className="chip" style={{ background: i.kind === "image" ? "#f7efd8" : "#f8e8ee", color: i.kind === "image" ? "#a2781f" : "#a03a5c" }}>
                    {i.kind === "image" ? "תמונה" : "PDF"}
                  </span>
                  {/* חומר שהוסתר בידי הצוות לא נעלם מכאן אלא מסומן: המעלה צריכה
                      לדעת שהוא כבר לא מוצג במדף, ולא לחשוב שההעלאה נכשלה. */}
                  {i.hidden && (
                    <span className="chip" style={{ background: "#efe9f6", color: "#6b4aa0" }}>מוסתר מהמדף</span>
                  )}
                </div>
                <h3 style={{ fontSize: 15.5, fontWeight: 700, color: "#2b4a8b", lineHeight: 1.5, minHeight: 46 }}>{i.title}</h3>
                <p style={{ fontSize: 12.5, color: "#6d6f88", marginTop: 8 }}>
                  {i.sender}{i.sender && i.date ? " · " : ""}{fmtDate(i.date)}{i.sizeKB ? ` · ${i.sizeKB}KB` : ""}
                </p>
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <Link href={`/shelf/${i.id}`} className="btn btn-main" style={{ flex: 1, justifyContent: "center", padding: ".5rem", fontSize: 14 }}>
                    פתיחה וצפייה
                  </Link>
                  <a href={downloadUrl(i.file)} className="btn btn-ghost" style={{ padding: ".5rem .7rem", fontSize: 14 }}>
                    הורדה
                  </a>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
