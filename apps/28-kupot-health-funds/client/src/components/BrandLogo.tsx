// לוגו מותג — מגן בריאות עם סמל פלוס, בגוון טורקיז. משתמש ב-currentColor.
export function BrandLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="השוואת קופות חולים"
      role="img"
    >
      <path
        d="M24 4l15 5v11c0 9.5-6.2 17.6-15 20-8.8-2.4-15-10.5-15-20V9l15-5z"
        fill="currentColor"
        fillOpacity="0.12"
      />
      <path
        d="M24 4l15 5v11c0 9.5-6.2 17.6-15 20-8.8-2.4-15-10.5-15-20V9l15-5z"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M24 15v14M17 22h14"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
