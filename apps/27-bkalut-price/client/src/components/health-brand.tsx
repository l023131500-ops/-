interface HealthBrandProps {
  size?: number;
  className?: string;
  showWordmark?: boolean;
}

/**
 * "הבריאות שלכם — מבית בקלות" brand mark.
 *
 * Public face of the health-funds comparison module. A dedicated, health-first
 * identity that sits alongside the core Bkalut brand (endorsement line "מבית בקלות").
 * The mark is a soft squircle holding a heart + pulse line — reads as care,
 * accuracy, and continuity of the Bkalut system. Monochrome-first with a single
 * gold accent dot, matching the Bkalut logo language. currentColor drives
 * light/dark theming.
 */
export function HealthBrand({ size = 40, className = "", showWordmark = true }: HealthBrandProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`} aria-label="הבריאות שלכם — מבית בקלות" data-testid="brand-health">
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-hidden="true"
      >
        {/* soft squircle container — same language as the Bkalut logo */}
        <rect x="1.5" y="1.5" width="37" height="37" rx="9" fill="currentColor" opacity="0.08" />
        <rect x="1.5" y="1.5" width="37" height="37" rx="9" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.2" />
        {/* heart outline */}
        <path
          d="M20 29 C20 29 10.5 23.2 10.5 16.6 C10.5 13.4 13 11 16 11 C18 11 19.4 12.1 20 13.4 C20.6 12.1 22 11 24 11 C27 11 29.5 13.4 29.5 16.6 C29.5 23.2 20 29 20 29 Z"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        {/* pulse / heartbeat line through the heart */}
        <path
          d="M12.5 19 H16.6 L18 16.3 L20.4 21.4 L22 18.8 H27.5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* gold accent dot — matches Bkalut mark */}
        <circle cx="30" cy="11.5" r="2.2" fill="hsl(42 80% 55%)" />
      </svg>
      {showWordmark && (
        <span className="flex flex-col leading-none">
          <span className="text-base font-bold tracking-tight text-foreground">הבריאות שלכם</span>
          <span className="text-[11px] font-medium text-muted-foreground mt-0.5">מבית בקלות</span>
        </span>
      )}
    </div>
  );
}
