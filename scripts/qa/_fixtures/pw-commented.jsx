// Negative control for password-reveal-scan.mjs: prose that *mentions* the
// idiom must never be reported as a field. This file must stay finding-free.
//
// It exists because the scan reported exactly this as a bug on 13/08:
// apps/24-galilee-connect-hub/src/pages/GabaiPortal.tsx:1416 was a comment
// explaining the reveal button that the field twelve lines below already had.
// A campaign whose last open finding is its own prose reads as "one system
// still broken" forever.

/* This field is written type="password" inside a block comment. */

export default function Fixture() {
  // The real field is dynamic — this is what a fixed field looks like:
  const [shown, setShown] = useState(false);
  return (
    <>
      {/* type="password" inside a JSX comment, too */}
      <input type={shown ? 'text' : 'password'} />
      <button type="button" onClick={() => setShown(!shown)} aria-pressed={shown}>
        הצג סיסמה
      </button>
    </>
  );
}
