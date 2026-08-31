// Hand-drawn inline SVGs — decorative only (aria-hidden), no external asset
// requests, so they render identically offline and never 404 in production.
// Colors come from the existing theme tokens (text-primary / text-chart-*)
// rather than fixed hex values, so both the light theme and any future dark
// variant stay in sync automatically.

export function ClientFileIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 140" className={className} aria-hidden="true" focusable="false">
      {/* תיקיית לקוח פתוחה */}
      <path
        d="M30 112V38a6 6 0 0 1 6-6h34l12 14h58a6 6 0 0 1 6 6v60a6 6 0 0 1-6 6H36a6 6 0 0 1-6-6z"
        className="text-primary" fill="currentColor" opacity="0.12"
      />
      <path
        d="M30 112V38a6 6 0 0 1 6-6h34l12 14h58a6 6 0 0 1 6 6v60a6 6 0 0 1-6 6H36a6 6 0 0 1-6-6z"
        fill="none" className="text-primary" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"
      />
      {/* שורות פרטים בתיק */}
      <g className="text-chart-3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.7">
        <path d="M50 66h60M50 78h84M50 90h72M50 102h48" />
      </g>
      {/* דמות לקוח */}
      <g className="text-chart-2">
        <circle cx="150" cy="52" r="10" fill="currentColor" opacity="0.85" />
        <path d="M132 74c4-10 12-14 18-14s14 4 18 14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
      </g>
    </svg>
  );
}

export function PartnersHandshakeIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 140" className={className} aria-hidden="true" focusable="false">
      {/* שני מעגלים מחוברים — לקוח ושותף */}
      <circle cx="56" cy="60" r="26" className="text-primary" fill="currentColor" opacity="0.12" />
      <circle cx="144" cy="60" r="26" className="text-chart-4" fill="currentColor" opacity="0.12" />
      <circle cx="56" cy="60" r="26" fill="none" className="text-primary" stroke="currentColor" strokeWidth="3" />
      <circle cx="144" cy="60" r="26" fill="none" className="text-chart-4" stroke="currentColor" strokeWidth="3" />
      {/* לחיצת יד באמצע */}
      <path
        d="M78 66l14-8 8 4 14-8 10 6-12 10-10-4-10 6z"
        className="text-chart-3" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" opacity="0.85"
      />
      {/* וו הסכמה */}
      <g className="text-chart-2" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M92 104l10 10 22-22" />
      </g>
      <g className="text-muted-foreground" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.55">
        <path d="M40 96h32M128 96h32" />
      </g>
    </svg>
  );
}

export function FinanceLedgerIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 140" className={className} aria-hidden="true" focusable="false">
      {/* גרף עמודות תזרים */}
      <g className="text-primary" fill="currentColor" opacity="0.16">
        <rect x="32" y="70" width="20" height="46" rx="3" />
        <rect x="62" y="50" width="20" height="66" rx="3" />
        <rect x="92" y="30" width="20" height="86" rx="3" />
      </g>
      <g className="text-primary" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round">
        <rect x="32" y="70" width="20" height="46" rx="3" />
        <rect x="62" y="50" width="20" height="66" rx="3" />
        <rect x="92" y="30" width="20" height="86" rx="3" />
      </g>
      {/* קו מגמה עולה */}
      <path d="M32 66l30-24 30-18 30-10" fill="none" className="text-chart-2" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="152" cy="14" r="5" className="text-chart-2" fill="currentColor" />
      {/* מטבע חיסכון */}
      <circle cx="168" cy="98" r="20" className="text-chart-3" fill="currentColor" opacity="0.14" />
      <circle cx="168" cy="98" r="20" fill="none" className="text-chart-3" stroke="currentColor" strokeWidth="3" />
      <text x="168" y="104" textAnchor="middle" className="text-chart-3" fill="currentColor" fontSize="16" fontWeight="700">₪</text>
    </svg>
  );
}

export function SecureVaultIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 140" className={className} aria-hidden="true" focusable="false">
      {/* מנעול */}
      <rect x="66" y="66" width="68" height="52" rx="8" className="text-primary" fill="currentColor" opacity="0.14" />
      <rect x="66" y="66" width="68" height="52" rx="8" fill="none" className="text-primary" stroke="currentColor" strokeWidth="3" />
      <path d="M80 66V50a20 20 0 0 1 40 0v16" fill="none" className="text-primary" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="100" cy="90" r="7" className="text-chart-4" fill="currentColor" />
      <path d="M100 97v12" className="text-chart-4" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      {/* גלי אוטומציה סביב — וואטסאפ/מייל/קול */}
      <g className="text-chart-2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" fill="none">
        <path d="M30 40q10 10 0 20" />
        <path d="M18 34q18 16 0 32" />
        <path d="M170 40q-10 10 0 20" />
        <path d="M182 34q-18 16 0 32" />
      </g>
    </svg>
  );
}
