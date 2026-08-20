"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const adsItems = [
  { href: "/admin", label: "דשבורד" },
  { href: "/admin/stats", label: "סטטיסטיקות" },
  { href: "/admin/projects", label: "פרויקטים" },
  { href: "/admin/payments", label: "תשלומים" },
  { href: "/admin/coupons", label: "קופונים" },
  { href: "/admin/templates", label: "תבניות מודעה" },
  { href: "/admin/users", label: "משתמשים" },
  { href: "/admin/notifications", label: "התראות" },
  { href: "/admin/settings", label: "הגדרות" },
  { href: "/admin/audit", label: "יומן פעולות" },
];

const transcribeItems = [
  { href: "/admin/transcripts", label: "תמלולים" },
  { href: "/admin/transcribe/uploads", label: "העלאות" },
  { href: "/admin/transcribe/coupons", label: "קופונים" },
  { href: "/admin/transcribe/glossary", label: "מילון מונחים" },
  { href: "/admin/transcribe/settings", label: "הגדרות" },
];

export default function AdminNav() {
  const path = usePathname() || "";
  const isActive = (href: string) =>
    path === href || (href !== "/admin" && path.startsWith(href));

  return (
    <aside className="bg-brand-bluesurface text-white w-60 min-h-screen p-4">
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 rounded bg-brand-gold/30 flex items-center justify-center text-brand-gold font-serif font-bold">א</div>
        <div>
          <div className="font-serif font-bold text-sm">איגוד השיעורים</div>
          <div className="text-xs text-brand-gold/80">ניהול מערכת</div>
        </div>
      </div>

      <div className="text-[10px] uppercase tracking-wider text-brand-gold/70 mb-2 px-3">מודעות AI</div>
      <nav className="space-y-1 mb-6">
        {adsItems.map((it) => (
          <Link key={it.href} href={it.href}
            aria-current={isActive(it.href) ? "page" : undefined}
            className={`block rounded px-3 py-2 text-sm ${isActive(it.href) ? "bg-brand-gold/20 text-brand-gold font-semibold" : "hover:bg-white/10"}`}>
            {it.label}
          </Link>
        ))}
      </nav>

      <div className="text-[10px] uppercase tracking-wider text-brand-gold/70 mb-2 px-3">תמלול שיעורים</div>
      <nav className="space-y-1">
        {transcribeItems.map((it) => (
          <Link key={it.href} href={it.href}
            aria-current={isActive(it.href) ? "page" : undefined}
            className={`block rounded px-3 py-2 text-sm ${isActive(it.href) ? "bg-brand-gold/20 text-brand-gold font-semibold" : "hover:bg-white/10"}`}>
            {it.label}
          </Link>
        ))}
      </nav>

      <div className="mt-8 pt-4 border-t border-white/10 text-xs text-white/60 space-y-2">
        <Link href="/" className="block hover:text-brand-gold">→ חזרה לאתר</Link>
        <Link href="/transcribe/upload" className="block hover:text-brand-gold">→ העלאת שיעור</Link>
      </div>
    </aside>
  );
}
