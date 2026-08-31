// Hand-drawn inline SVGs — decorative only (aria-hidden), no external asset
// requests, so they render identically offline and never 404 in production.
// Colors come from the existing theme tokens (text-primary / text-chart-3 /
// text-chart-4) rather than fixed hex values, so both the light theme and any
// future dark variant stay in sync automatically.

export function TorahLectureIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 140"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* גלי קול — מייצגים את השיעור המוקלט */}
      <g className="text-chart-4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.55">
        <path d="M124 40c6-10 6-20 0-30" />
        <path d="M136 46c10-16 10-32 0-48" />
        <path d="M148 52c14-22 14-44 0-66" />
      </g>
      {/* ספר פתוח — מייצג את התמלול הכתוב */}
      <g>
        <path
          d="M20 108V44c22-10 42-10 60 0v64c-18-10-38-10-60 0z"
          className="text-primary"
          fill="currentColor"
          opacity="0.12"
        />
        <path
          d="M160 108V44c-22-10-42-10-60 0v64c18-10 38-10 60 0z"
          className="text-primary"
          fill="currentColor"
          opacity="0.12"
        />
        <path
          d="M20 108V44c22-10 42-10 60 0v64c-18-10-38-10-60 0zM160 108V44c-22-10-42-10-60 0v64c18-10 38-10 60 0z"
          className="text-primary"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M80 44v64" className="text-primary" stroke="currentColor" strokeWidth="3" />
        {/* שורות טקסט על שני העמודים */}
        <g className="text-chart-3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.65">
          <path d="M32 60h38M32 72h34M32 84h38M32 96h28" />
          <path d="M110 60h38M114 72h34M110 84h38M118 96h28" />
        </g>
      </g>
    </svg>
  );
}

export function UploadContributionIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 140"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* ענן העלאה */}
      <path
        d="M56 84a26 26 0 0 1 4-51 34 34 0 0 1 65-9 24 24 0 0 1 21 40 22 22 0 0 1-2 44H60a22 22 0 0 1-4-24z"
        className="text-primary"
        fill="currentColor"
        opacity="0.1"
      />
      <path
        d="M56 84a26 26 0 0 1 4-51 34 34 0 0 1 65-9 24 24 0 0 1 21 40 22 22 0 0 1-2 44H60a22 22 0 0 1-4-24z"
        className="text-primary"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* חץ עולה — קובץ אודיו שעולה לארכיון */}
      <g className="text-chart-4" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M100 100V56" />
        <path d="M84 72l16-16 16 16" />
      </g>
      {/* גל קול קטן ליד החץ — מזכיר שמדובר בהקלטת שיעור */}
      <g className="text-chart-3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7">
        <path d="M132 84c4-6 4-12 0-18" />
        <path d="M140 88c7-10 7-20 0-30" />
      </g>
    </svg>
  );
}
