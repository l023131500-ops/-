import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/Field";
import { cn } from "@/lib/cn";

/**
 * שדה סיסמה עם כפתור "הצג סיסמה" (priority §1א).
 *
 * הצד נגזר ולא הועתק. השדה כאן יורש `dir="rtl"` מ-<html>, ו-text-align הוא
 * `start` — כלומר התווים מתחילים מהקצה הימני, ולכן הכפתור יושב משמאל. אם
 * יקבל `dir="ltr"` (כפי שנהוג בשדות שמוקלדים לטינית) הוא יעבור מימין. ה-padding
 * נוסף באותו צד בלבד, כדי שהתווים לא ייכנסו מתחת לכפתור.
 *
 * `type="button"` מפורש: השדה יושב בתוך <form>, וכפתור בלי type הוא submit —
 * כל לחיצה על "הצג" הייתה מנסה להתחבר.
 *
 * הצבע והטבעת נגזרים מ-currentColor ולא מטוקן קבוע: הטופס היחיד שמשתמש בזה
 * יושב על כרטיס כהה עם טקסט לבן, ו-text-muted-foreground היה נעלם בתוכו.
 *
 * ה-type, ה-aria-pressed, ה-aria-label והאייקון נגזרים כולם מאותו state אחד,
 * כדי שלא ייתכן מצב שהכפתור אומר "הצג" בזמן שהסיסמה כבר גלויה.
 */
export const PasswordInput = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, "type">
>(({ className, ...props }, ref) => {
  const [shown, setShown] = useState(false);
  const label = shown ? "הסתר סיסמה" : "הצג סיסמה";
  const onRight = props.dir === "ltr";

  return (
    <div className="relative">
      <Input
        ref={ref}
        type={shown ? "text" : "password"}
        className={cn(onRight ? "pr-10" : "pl-10", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        aria-pressed={shown}
        aria-label={label}
        title={label}
        className={cn(
          "absolute top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-current opacity-60 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-current",
          onRight ? "right-1" : "left-1",
        )}
      >
        {shown ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
      </button>
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";
