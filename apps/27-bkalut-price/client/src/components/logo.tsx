interface LogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}

/**
 * בקלות (Bkalut) custom inline logo.
 * A monoline "ב" letter inside a soft squircle — a friendly, intentional mark
 * that reads as Hebrew first, professional second.
 */
export function Logo({ size = 32, showWordmark = true, className = "" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`} aria-label="מאגר בקלות" data-testid="logo-bkalut">
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-hidden="true"
      >
        <rect
          x="1.5"
          y="1.5"
          width="37"
          height="37"
          rx="9"
          fill="currentColor"
          opacity="0.08"
        />
        <rect
          x="1.5"
          y="1.5"
          width="37"
          height="37"
          rx="9"
          stroke="currentColor"
          strokeOpacity="0.35"
          strokeWidth="1.2"
        />
        {/* Stylized "ב" — geometric letterform */}
        <path
          d="M11 12.5 V25.5 a3 3 0 0 0 3 3 H28.5"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M11 12.5 H26.5"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        {/* gold dot accent */}
        <circle cx="29.5" cy="13" r="2.2" fill="hsl(42 80% 55%)" />
      </svg>
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span className="font-bold text-base tracking-tight" data-testid="text-logo-name">
            מאגר בקלות
          </span>
          <span className="text-[10px] uppercase tracking-widest opacity-60" data-testid="text-logo-tagline">
            INTERNAL
          </span>
        </div>
      )}
    </div>
  );
}
