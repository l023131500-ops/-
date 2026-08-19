import { useEffect, useState } from "react";

/**
 * מתג בהיר/כהה למרכז השליטה.
 *
 * core.issues #68: מתוך 25 המסלולים החיים, /admin היה היחיד שלא הגיב
 * ל-prefers-color-scheme ולא היה בו פקד להחלפה — כלומר מי שמערכת ההפעלה שלו
 * כהה קיבל מסך לבן ולא היה לו מה ללחוץ. הערכה עצמה יושבת ב-index.html
 * כמשתני CSS; כאן רק בוחרים אותה במפורש ושומרים את הבחירה.
 *
 * שלושה מצבים ולא שניים: "auto" הוא ברירת המחדל ומשמעו "כמו מערכת ההפעלה".
 * לחיצה קובעת light או dark במפורש, וזה מה שמאפשר גם למי שהמערכת שלו כהה
 * לבקש מסך בהיר — מתג דו-מצבי לא יכול לבטא את זה.
 *
 * הכפתור נמצא מחוץ ל-<App> (ראה main.tsx) כי הוא חייב להיות זמין גם במסך
 * ההתחברות ובמסך "אין הרשאה", לא רק ללוח עצמו.
 */
type Choice = "light" | "dark" | "auto";

const KEY = "more30-admin-theme";
const MQ = "(prefers-color-scheme: dark)";

const stored = (): Choice => {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "auto";
  } catch {
    return "auto"; // דפדפן שחוסם אחסון לא אמור להשאיר את המסך בלי מתג
  }
};

export function ThemeToggle() {
  const [choice, setChoice] = useState<Choice>(stored);
  const [osDark, setOsDark] = useState(() => window.matchMedia(MQ).matches);

  useEffect(() => {
    const root = document.documentElement;
    if (choice === "auto") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", choice);
    try { localStorage.setItem(KEY, choice); } catch { /* ראה stored() */ }
  }, [choice]);

  // מי שמשאיר את המתג על auto ומחליף ערכה במערכת ההפעלה — הכיתוב חייב לזוז איתו.
  useEffect(() => {
    const mq = window.matchMedia(MQ);
    const on = () => setOsDark(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const dark = choice === "dark" || (choice === "auto" && osDark);

  return (
    <button
      type="button"
      onClick={() => setChoice(dark ? "light" : "dark")}
      aria-label={dark ? "מעבר למצב בהיר" : "מעבר למצב כהה"}
      title={dark ? "מעבר למצב בהיר" : "מעבר למצב כהה"}
      style={{
        position: "fixed", insetInlineStart: 16, bottom: 16, zIndex: 40,
        display: "flex", alignItems: "center", gap: 6,
        fontFamily: "Assistant, system-ui, sans-serif", fontSize: 13, fontWeight: 600,
        color: "var(--fg-2)", background: "var(--surface)",
        border: "1px solid var(--border-2)", borderRadius: 999,
        padding: "7px 14px", cursor: "pointer",
        boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
      }}
    >
      {dark ? "☀️ מצב בהיר" : "🌙 מצב כהה"}
    </button>
  );
}
