// אייקונים/איורים דקורטיביים בלבד — aria-hidden, currentColor + טוקני עיצוב קיימים.
// לא נושאים מידע: כל תוכן טקסטואלי כבר קיים במקום אחר בעמוד.

export function HeroCompareIllustration({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 160 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      role="presentation"
    >
      {/* מגן+פלוס — אותה שפה חזותית כמו BrandLogo, בגודל גדול יותר */}
      <path
        d="M46 14l20 6.5v15c0 12.6-8.2 23.4-20 26.6-11.8-3.2-20-14-20-26.6v-15L46 14z"
        className="fill-primary/10 stroke-primary"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path
        d="M46 30v20M36 40h20"
        className="stroke-primary"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      {/* עמודות השוואה — שלושה ערוצים (קופות/ממשלה/עמותות) */}
      <rect x="86" y="52" width="14" height="34" rx="3" className="fill-chart-1/25 stroke-chart-1" strokeWidth="2" />
      <rect x="106" y="34" width="14" height="52" rx="3" className="fill-chart-2/25 stroke-chart-2" strokeWidth="2" />
      <rect x="126" y="44" width="14" height="42" rx="3" className="fill-chart-5/25 stroke-chart-5" strokeWidth="2" />
      <path d="M82 90h64" className="stroke-border" strokeWidth="2" strokeLinecap="round" />
      {/* וי בחירה — ״הקופה הבולטת״ */}
      <circle cx="113" cy="24" r="9" className="fill-chart-2 stroke-chart-2" />
      <path
        d="M109 24l2.6 2.8L118 20"
        stroke="hsl(var(--primary-foreground))"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function FundTrackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation">
      <path d="M12 3l8 3v6c0 5-3.4 9.4-8 10.7C7.4 21.4 4 17 4 12V6l8-3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none" />
      <path d="M12 8.5v7M8.5 12h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function GovTrackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation">
      <path d="M12 3l9 5H3l9-5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none" />
      <path d="M5 10v8M10 10v8M14 10v8M19 10v8M3.5 20h17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function NgoTrackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation">
      <path
        d="M12 20s-7.2-4.4-9.4-9C1 7.4 3 4.5 6.2 4.5c2 0 3.4 1.1 4.2 2.2l1.6 2.1 1.6-2.1c.8-1.1 2.2-2.2 4.2-2.2C21 4.5 23 7.4 21.4 11c-2.2 4.6-9.4 9-9.4 9z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
