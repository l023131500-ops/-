/** תצוגה מוקטנת סכמטית של מבנה תבנית — נבנית ב-SVG פשוט, RTL.
 *  מתאימה עצמה לפי kind (framed/columns/linear) + דפוסי מפתח v2. */
export function TemplateThumb({ kind, tkey }: { kind: string; tkey: string }) {
  const ink = "#7a2e3a";
  const gray = "#b9a888";
  const line = (x: number, y: number, w: number, c = gray, k?: string | number) => (
    <rect key={k ?? `${x}-${y}`} x={x} y={y} width={w} height={2} rx={1} fill={c} />
  );

  // סיווג ויזואלי מדפוסי מפתח v2
  const isDaf = /daf-gemara/.test(tkey);
  const isMikraot = /mikraot/.test(tkey);
  const isParallel = /parallel/.test(tkey);
  const isSidenotes = /(sidenotes|lemma)/.test(tkey);
  const isFootnotes = /(footnotes|academic)/.test(tkey);
  const isPoem = /(shira|piyut|tehillim)/.test(tkey);
  const isTwoCol = kind === "columns" || /(two-col|shulchan|tri-section|siddur)/.test(tkey);
  const isFramed = kind === "framed" || isDaf || isMikraot;

  return (
    <svg viewBox="0 0 120 90" className="mx-auto h-24 w-auto" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="4" width="104" height="82" rx="3" fill="#fbf8f1" stroke="#ddceb3" />

      {isDaf && (
        <>
          {/* תוספות שמאל, גמרא מרכז, רש"י ימין */}
          <rect x="14" y="14" width="26" height="62" rx="2" fill="#f0e7d4" />
          <rect x="80" y="14" width="26" height="62" rx="2" fill="#f0e7d4" />
          <rect x="44" y="14" width="32" height="62" rx="2" fill="#f6efdd" stroke={ink} strokeWidth="0.6" />
          {[18, 24, 30, 36, 42, 48, 54, 60, 66].map((y) => (
            <g key={y}>{line(16, y, 22)}{line(82, y, 22)}</g>
          ))}
          {[20, 27, 34, 41, 48, 55, 62].map((y) => line(46, y, 28, ink))}
        </>
      )}

      {isMikraot && !isDaf && (
        <>
          <rect x="42" y="26" width="36" height="38" rx="2" fill="#f6efdd" stroke={ink} strokeWidth="0.6" />
          {[16, 22, 28, 34, 40, 46, 52, 58, 64, 70].map((y) => line(14, y, 24))}
          {[16, 22, 28, 34, 40, 46, 52, 58, 64, 70].map((y) => line(82, y, 24))}
          {[10, 16, 68, 74].map((y) => line(42, y, 36))}
          {[31, 38, 45, 52, 59].map((y) => line(45, y, 30, ink))}
        </>
      )}

      {isParallel && (
        <>
          <rect x="62" y="12" width="0.6" height="66" fill={gray} />
          {[18, 26, 34, 42, 50, 58, 66].map((y) => (
            <g key={y}>{line(16, y, 40)}{line(66, y, 40)}</g>
          ))}
        </>
      )}

      {isTwoCol && !isParallel && !isFramed && (
        <>
          <rect x="60" y="14" width="0.6" height="62" fill={gray} />
          {[18, 25, 32, 39, 46, 53, 60, 67].map((y) => (
            <g key={y}>{line(64, y, 42)}{line(14, y, 42)}</g>
          ))}
        </>
      )}

      {isSidenotes && (
        <>
          {[16, 23, 30, 37, 44, 51, 58, 65, 72].map((y) => line(38, y, 56))}
          {[20, 34, 48, 62].map((y) => line(14, y, 18, ink))}
        </>
      )}

      {isFootnotes && !isTwoCol && (
        <>
          {[16, 23, 30, 37, 44, 51].map((y) => line(16, y, 88))}
          <rect x="16" y="60" width="88" height="0.6" fill={gray} />
          {[66, 71, 76].map((y) => line(16, y, 88, "#9a8a70"))}
        </>
      )}

      {isPoem && (
        <>
          {[22, 30, 38, 46, 54, 62].map((y) => line(30, y, 60))}
        </>
      )}

      {/* ברירת-מחדל: מקטע ליניארי עם מילת פתיחה */}
      {!isDaf && !isMikraot && !isParallel && !isTwoCol && !isSidenotes && !isFootnotes && !isPoem && (
        <>
          <rect x="20" y="14" width="8" height="8" rx="1" fill={ink} />
          {[26, 33, 40, 47, 54, 61, 68].map((y) => line(16, y, 88))}
        </>
      )}
    </svg>
  );
}
