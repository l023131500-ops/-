// אייקונים/איורים דקורטיביים בלבד — aria-hidden, currentColor + טוקני עיצוב קיימים.
// לא נושאים מידע: כל תוכן טקסטואלי כבר קיים במקום אחר בעמוד.

export function HeroRightsIllustration({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 220 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      role="presentation"
    >
      {/* מסמך זכות — דף עם שורות טקסט ווי אישור */}
      <rect x="26" y="18" width="76" height="98" rx="6" className="fill-primary/10 stroke-primary" strokeWidth="2.4" />
      <path d="M40 40h48M40 54h48M40 68h32" className="stroke-primary/60" strokeWidth="3" strokeLinecap="round" />
      <circle cx="80" cy="94" r="16" className="fill-chart-2 stroke-chart-2" />
      <path d="M73 94l5 5.5L88 87" stroke="hsl(var(--primary-foreground))" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* משפחה — שלוש דמויות פשוטות */}
      <circle cx="146" cy="46" r="11" className="fill-chart-1/25 stroke-chart-1" strokeWidth="2.2" />
      <path d="M128 92c0-11 8-18 18-18s18 7 18 18" className="fill-chart-1/15 stroke-chart-1" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="176" cy="58" r="8" className="fill-chart-5/25 stroke-chart-5" strokeWidth="2" />
      <path d="M162 92c0-8.5 6.3-14 14-14s14 5.5 14 14" className="fill-chart-5/15 stroke-chart-5" strokeWidth="2" strokeLinecap="round" />
      {/* מטבע/הטבה מתחת — ליווי כלכלי */}
      <circle cx="150" cy="112" r="12" className="fill-chart-2/20 stroke-chart-2" strokeWidth="2" />
      <path d="M150 106v12M145.5 112h9" className="stroke-chart-2" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function FindRightsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation">
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M15.3 15.3L20 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 10.5l1.7 1.7L13.5 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function ClearExplanationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation">
      <rect x="4" y="4.5" width="16" height="12" rx="2.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7.5 8.5h9M7.5 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 16.5l-2 3.2v-3.2" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function PersonalSupportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation">
      <path
        d="M12 20.2s-6.7-4.1-8.7-8.4C1.7 8.5 3.5 5.9 6.4 5.9c1.9 0 3.1 1 3.9 2.1L12 9.5l1.7-1.5c.8-1.1 2-2.1 3.9-2.1 2.9 0 4.7 2.6 3.1 5.9-2 4.3-8.7 8.4-8.7 8.4z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function EligibilityCatalogIllustration({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 220 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      role="presentation"
    >
      {/* קטלוג — ערימת כרטיסי נושא */}
      <rect x="24" y="46" width="70" height="52" rx="6" className="fill-chart-1/15 stroke-chart-1" strokeWidth="2" />
      <rect x="34" y="34" width="70" height="52" rx="6" className="fill-primary/10 stroke-primary" strokeWidth="2.4" />
      <path d="M46 50h46M46 62h32M46 74h38" className="stroke-primary/60" strokeWidth="3" strokeLinecap="round" />
      {/* זכוכית מגדלת — חיפוש/סינון */}
      <circle cx="152" cy="56" r="26" className="fill-chart-2/10 stroke-chart-2" strokeWidth="3" />
      <path d="M171 75l18 18" stroke="hsl(var(--chart-2))" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M141 56l7.5 7.5L166 46" stroke="hsl(var(--chart-2))" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* וי אישור זכאות */}
      <circle cx="66" cy="112" r="13" className="fill-chart-5 stroke-chart-5" />
      <path d="M59.5 112l4.5 5L73 106" stroke="hsl(var(--primary-foreground))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function HealthFundsIllustration({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 220 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      role="presentation"
    >
      {/* מגן בריאות עם פלוס */}
      <path
        d="M110 20l46 16v34c0 30-20 46-46 54-26-8-46-24-46-54V36l46-16z"
        className="fill-primary/10 stroke-primary"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path d="M110 54v40M90 74h40" className="stroke-primary" strokeWidth="6" strokeLinecap="round" />
      {/* עמודות השוואה בין קופות — שלוש רמות גובה */}
      <rect x="24" y="96" width="18" height="30" rx="3" className="fill-chart-1/25 stroke-chart-1" strokeWidth="2" />
      <rect x="48" y="84" width="18" height="42" rx="3" className="fill-chart-2/25 stroke-chart-2" strokeWidth="2" />
      <rect x="150" y="90" width="18" height="36" rx="3" className="fill-chart-5/25 stroke-chart-5" strokeWidth="2" />
      <rect x="174" y="78" width="18" height="48" rx="3" className="fill-chart-1/25 stroke-chart-1" strokeWidth="2" />
    </svg>
  );
}

export function PriceCompareIllustration({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 220 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      role="presentation"
    >
      {/* עגלת קניות */}
      <path
        d="M28 26h14l8 62h84l12-46H60"
        className="stroke-primary"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="62" cy="106" r="9" className="fill-primary/15 stroke-primary" strokeWidth="2.4" />
      <circle cx="122" cy="106" r="9" className="fill-primary/15 stroke-primary" strokeWidth="2.4" />
      {/* שני תגי מחיר להשוואה */}
      <g className="fill-chart-2/15 stroke-chart-2" strokeWidth="2.2">
        <path d="M150 34h32l14 14-24 24-22-22z" strokeLinejoin="round" />
        <circle cx="160" cy="44" r="3" className="fill-chart-2 stroke-chart-2" />
      </g>
      <g className="fill-chart-5/15 stroke-chart-5" strokeWidth="2.2">
        <path d="M156 78h30l13 13-22 22-21-21z" strokeLinejoin="round" />
        <circle cx="166" cy="87" r="3" className="fill-chart-5 stroke-chart-5" />
      </g>
    </svg>
  );
}

export function TopicDetailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation">
      <rect x="4.5" y="3.5" width="15" height="17" rx="2.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 8h8M8 11.5h8M8 15h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
