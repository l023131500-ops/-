import { Link } from "react-router-dom";
import { SITE } from "@/config/site";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer id="contact" className="border-t border-border bg-secondary/40">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <div className="font-display text-xl font-bold text-foreground">{SITE.name}</div>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">{SITE.description}</p>
          <p className="mt-4 text-sm font-medium text-foreground">{SITE.org}</p>
        </div>

        <nav aria-label="ניווט תחתון">
          <h3 className="text-sm font-semibold text-foreground">ניווט</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link className="link-hit hover:text-foreground" to="/batei-knesset">בתי כנסת</Link></li>
            <li><Link className="link-hit hover:text-foreground" to="/#zmanim">זמני היום</Link></li>
            <li><Link className="link-hit hover:text-foreground" to="/ask-rav">שאל את הרב</Link></li>
            <li><Link className="link-hit hover:text-foreground" to="/gemachim">שירותי קהילה</Link></li>
          </ul>
        </nav>

        <div>
          <h3 className="text-sm font-semibold text-foreground">אזור מנהלים</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link className="link-hit hover:text-foreground" to="/gabai">כניסת גבאים</Link></li>
            <li><Link className="link-hit hover:text-foreground" to="/admin">ניהול מועצה</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/70">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-muted-foreground sm:flex-row">
          <span>© {year} {SITE.org}. כל הזכויות שמורות.</span>
          <span>נבנה באהבה לקהילת חצור הגלילית</span>
        </div>
      </div>
    </footer>
  );
}
