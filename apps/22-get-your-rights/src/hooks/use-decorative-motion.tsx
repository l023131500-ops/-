import { useEffect, useState } from "react";

/*
  האם מותר לצייר את הקישוט הנע.

  למה זה קיים: העמוד הריץ עשרים אנימציות ‎repeat: Infinity‎ בו-זמנית —
  שמונה נקודות ב-‎FloatingElements‎ ושתים-עשרה ב-hero. כל אחת מהן היא לולאת
  ‎requestAnimationFrame‎ של framer-motion שכותבת ‎transform‎ בכל פריים.
  במדידת Lighthouse (פרופיל מובייל, מעבד מואט פי 4) זה נספר ישירות
  ב-‎total-blocking-time‎ ‎וב-‎mainthread-work-breakdown‎. הנקודות עצמן הן
  עיגולים של 4–10 פיקסלים בשקיפות 15%–40%: במסך של 390px הן כמעט בלתי
  נראות, ובוודאי אינן שוות שנייה של חסימה.

  שלושה תנאים, וכולם חייבים להתקיים:
  1. לא ‎prefers-reduced-motion‎ — הנחיית נגישות, לא העדפה.
  2. רוחב ≥ 768px — במובייל הקישוט אינו נראה ממילא.
  3. אחרי שהעמוד נרגע — ‎requestIdleCallback‎ כדי שהציור הראשון והאינטראקציה
     הראשונה לא יתחרו בקישוט.
*/
export function useDecorativeMotion(): boolean {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const wide = window.matchMedia("(min-width: 768px)");

    let idle: number | undefined;
    const evaluate = () => {
      const ok = !reduced.matches && wide.matches;
      if (!ok) {
        setAllowed(false);
        return;
      }
      const ric = window.requestIdleCallback;
      if (ric) idle = ric(() => setAllowed(true), { timeout: 3000 });
      else idle = window.setTimeout(() => setAllowed(true), 1500);
    };

    evaluate();
    reduced.addEventListener("change", evaluate);
    wide.addEventListener("change", evaluate);
    return () => {
      reduced.removeEventListener("change", evaluate);
      wide.removeEventListener("change", evaluate);
      if (idle !== undefined) {
        if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
        else window.clearTimeout(idle);
      }
    };
  }, []);

  return allowed;
}
