export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        width="34"
        height="34"
        viewBox="0 0 40 40"
        fill="none"
        aria-label="מודעות AI"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* מסגרת מודעה מעוטרת */}
        <rect x="6" y="4" width="28" height="32" rx="3" stroke="currentColor" strokeWidth="2" />
        <rect x="10" y="8" width="20" height="24" rx="1.5" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        {/* שלוש שורות טקסט מסומלות */}
        <line x1="14" y1="14" x2="26" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="16" y1="20" x2="24" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        <line x1="15" y1="26" x2="25" y2="26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        {/* ניצוץ AI */}
        <path d="M31 3 L32.2 6 L35 7.2 L32.2 8.4 L31 11.4 L29.8 8.4 L27 7.2 L29.8 6 Z" fill="currentColor" />
      </svg>
      <div className="leading-tight text-right">
        <div className="font-bold text-lg tracking-tight" style={{ fontFamily: '"Frank Ruhl Libre", serif' }}>
          מוֹדָעוֹת <span className="text-primary">AI</span>
        </div>
      </div>
    </div>
  );
}
