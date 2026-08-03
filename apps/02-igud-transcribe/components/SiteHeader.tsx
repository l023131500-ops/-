import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="border-b border-stone-200 bg-white/80 backdrop-blur">
      <div className="container-rtl flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-3">
          <Logo className="h-9 w-9 text-brand" />
          <div className="leading-tight">
            <div className="font-display text-lg font-bold text-brand">תמלול</div>
            <div className="text-xs text-ink-muted">מבית איגוד השיעורים</div>
          </div>
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/upload" className="btn-primary text-sm">העלאת שיעור</Link>
          <Link href="/login" className="btn-outline text-sm">כניסת ניהול</Link>
        </nav>
      </div>
    </header>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-label="לוגו תמלול" fill="none">
      <rect x="3" y="6" width="28" height="22" rx="3" stroke="currentColor" strokeWidth="2.2" />
      <line x1="8" y1="13" x2="26" y2="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="8" y1="18" x2="22" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="8" y1="23" x2="24" y2="23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="32" cy="32" r="5" fill="#C9A84C" />
      <path d="M30 32 L31.5 33.5 L34 30.5" stroke="#0F1D3D" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
