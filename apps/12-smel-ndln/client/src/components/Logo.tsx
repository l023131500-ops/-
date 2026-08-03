export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      aria-label="SMEL NDLN"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9 19L20 10L31 19V32H9V19Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 19.5L20 8.5L33.5 19.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 32C20 32 25 27 25 22.6C25 19.8 22.8 17.6 20 17.6C17.2 17.6 15 19.8 15 22.6C15 27 20 32 20 32Z"
        fill="hsl(var(--accent))"
        stroke="hsl(var(--accent))"
        strokeWidth="0.5"
      />
      <circle cx="20" cy="22.3" r="2" fill="hsl(var(--primary))" className="dark:fill-[hsl(218_45%_11%)]" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5" data-testid="brand-logo">
      <LogoMark className="h-9 w-9 text-primary dark:text-accent" />
      {!compact && (
        <div className="flex flex-col leading-none">
          <span className="text-lg font-extrabold tracking-tight text-foreground">
            SMEL <span className="gold-text">NDLN</span>
          </span>
          <span className="text-[11px] font-medium text-muted-foreground">
            מחקר נדל״ן חכם
          </span>
        </div>
      )}
    </div>
  );
}
