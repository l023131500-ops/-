import Link from "next/link";
import NotificationBell from "@/components/NotificationBell";
import ThemeToggle from "./ThemeToggle";

export default function SiteHeader() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:right-2 focus:z-50 focus:rounded-md focus:bg-brand-blue focus:px-4 focus:py-2 focus:text-white"
      >
        דלג לתוכן
      </a>
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur sticky top-0 z-30">
      <div className="container-rtl flex items-center justify-between py-3 flex-wrap gap-3">
        <Link href="/" className="flex items-center gap-3">
          <Logo className="h-9 w-9 text-brand" />
          <div className="leading-tight">
            <div className="font-display text-lg font-bold text-brand">איגוד השיעורים</div>
            <div className="text-[11px] text-ink-muted">מודעות ותמלולים בבינה מלאכותית</div>
          </div>
        </Link>

        <nav className="flex items-center gap-2 flex-wrap">
          <Link href="/" className="text-sm px-3 py-1.5 rounded-md hover:bg-stone-100 text-ink">
            מודעות
          </Link>
          <Link href="/transcribe/upload" className="text-sm px-3 py-1.5 rounded-md hover:bg-stone-100 text-ink">
            תמלול
          </Link>
          <Link href="/create" className="btn-primary text-sm">צור מודעה</Link>
          <a href="https://more30.com/subscribe?app=modaot" className="text-sm px-3 py-1.5 rounded-md hover:bg-stone-100 text-ink">
            מחירון
          </a>
          <NotificationBell />
          <Link href="/login" className="btn-outline text-sm">כניסת ניהול</Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
    </>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-label="לוגו" fill="none">
      <rect x="3" y="6" width="28" height="22" rx="3" stroke="currentColor" strokeWidth="2.2" />
      <line x1="8" y1="13" x2="26" y2="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="8" y1="18" x2="22" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="8" y1="23" x2="24" y2="23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="32" cy="32" r="5" fill="#C9A84C" />
      <path d="M30 32 L31.5 33.5 L34 30.5" stroke="#0F1D3D" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
