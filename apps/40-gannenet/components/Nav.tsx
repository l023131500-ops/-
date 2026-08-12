import Link from "next/link";

const links = [
  { href: "/", label: "בית" },
  { href: "/library", label: "מאגר מערכים" },
  { href: "/shelf", label: "מדף הגננת" },
  { href: "/generator", label: "מחולל דפי משימה" },
  { href: "/newsletter", label: "דפי קשר" },
  { href: "/calendar", label: "לוח שנה עברי" },
  { href: "/pricing", label: "מחירים" },
];

export default function Nav() {
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(250,248,244,.92)", backdropFilter: "blur(10px)", borderBottom: "1px solid #ebe7de" }}>
      {/* הכדול של auth-button.js הוא position:fixed בקצה האינליין-סופי — בעברית
          הפינה השמאלית העליונה, בדיוק המקום שבו justify-between מניח את
          "כניסה למאגר". בלי ריפוד הכדור יושב מעליו והכפתור אינו ניתן ללחיצה.
          --more30-auth-inset נמדד מקצה החלון, ולכן מחסירים ממנו את השוליים
          של המכל הממורכז (max-width 1180). אותו דפוס כמו ב-16 וב-17. */}
      <div className="container-r" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "12px 20px", paddingInlineEnd: "max(20px, calc(var(--more30-auth-inset, 124px) - max(0px, (100vw - 1180px) / 2)))", flexWrap: "wrap" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 44, height: 44, borderRadius: 13, background: "#2b4a8b", display: "grid", placeItems: "center" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6a2 2 0 0 1 2-2h5v16H6a2 2 0 0 0-2 2zM20 6a2 2 0 0 0-2-2h-5v16h5a2 2 0 0 1 2 2z"/></svg>
          </span>
          <span>
            <span style={{ display: "block", fontSize: 22, fontWeight: 800, color: "#2b4a8b", letterSpacing: "-.3px" }}>גננת בקליק</span>
            <span style={{ display: "block", fontSize: 11.5, color: "#6d6f88", marginTop: -3 }}>תוכן פדגוגי ו-AI · גן חרדי · גיל 1–6</span>
          </span>
        </Link>
        <nav style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
          {links.map((l) => (
            <Link key={l.href} href={l.href} style={{ fontSize: 14.5, fontWeight: 600, color: "#6d6f88", padding: "9px 13px", borderRadius: 11 }}>{l.label}</Link>
          ))}
          {/* This said "הרשמה" and went to /pricing. The app has no sign-up at
              all, so the one prominent button on every page promised an account
              and landed on a price table. */}
          <Link href="/library" className="btn btn-main" style={{ padding: ".55rem 1.1rem", fontSize: 14.5 }}>כניסה למאגר</Link>
        </nav>
      </div>
    </header>
  );
}
