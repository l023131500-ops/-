import { Link } from "wouter";

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-label="אות ודף"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* דף פתוח */}
      <path
        d="M24 10C19 6.5 11 6.5 6 8.5V38C11 36 19 36 24 39.5C29 36 37 36 42 38V8.5C37 6.5 29 6.5 24 10Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M24 10V39.5" stroke="currentColor" strokeWidth="2.2" />
      {/* אות א' מסוגננת במרכז */}
      <path
        d="M18 18L30 30M30 18L18 30"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      {/* כפתור הכניסה המשותף של more30 יושב `fixed` בפינה השמאלית העליונה
          (הקצה האינליין-סופי ב-RTL) — בדיוק על "שאלון חכם", הפעולה הראשית
          של הסרגל. נמדד ב-390px שהלחיצה מגיעה לכדור ולא לקישור.
          `--more30-auth-inset` מפורסם על ידי הכדור לפי רוחבו בפועל. */}
      <div
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5"
        style={{
          paddingInlineEnd:
            'max(1.25rem, calc(var(--more30-auth-inset, 124px) - max(0px, (100vw - 1152px) / 2)))',
        }}
      >
        <Link href="/" className="flex items-center gap-2.5 text-primary" data-testid="link-home">
          <Logo />
          <div className="leading-tight">
            <div className="font-serif text-xl font-bold text-foreground">אות ודף</div>
            <div className="text-[11px] text-muted-foreground">עימוד תורני מקצועי</div>
          </div>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/"
            className="rounded-md px-3 py-2 text-muted-foreground hover-elevate"
            data-testid="link-nav-books"
          >
            הספרים שלי
          </Link>
          <Link
            href="/templates"
            className="rounded-md px-3 py-2 text-muted-foreground hover-elevate"
            data-testid="link-nav-templates"
          >
            תבניות
          </Link>
          <Link
            href="/wizard"
            className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground hover-elevate"
            data-testid="link-nav-new"
          >
            שאלון חכם
          </Link>
        </nav>
      </div>
    </header>
  );
}
