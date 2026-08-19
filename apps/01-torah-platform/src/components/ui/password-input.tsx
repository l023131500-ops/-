import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input, type InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * שדה סיסמה עם כפתור "הצג סיסמה" (priority §1א).
 *
 * הכפתור יושב בתוך המסגרת בצד שמאל: העמוד כולו RTL, ולכן הצד הימני של השדה
 * הוא זה שכבר תפוס באייקונים הקיימים (Mail/KeyRound ב-AdminLogin) — כפתור
 * שיושב שם היה מכסה אותם. `pl-10` שומר שהתווים לא ייכנסו מתחת לכפתור.
 *
 * `type="button"` מפורש: כל השדות האלה יושבים בתוך <form>, וכפתור בלי type
 * הוא submit — כל לחיצה על "הצג" הייתה שולחת את הטופס.
 *
 * ה-type, ה-aria-pressed, ה-aria-label והאייקון נגזרים כולם מאותו state אחד,
 * כדי שלא ייתכן מצב שהכפתור אומר "הצג" בזמן שהסיסמה כבר גלויה.
 */
const PasswordInput = React.forwardRef<HTMLInputElement, Omit<InputProps, "type">>(
  ({ className, ...props }, ref) => {
    const [shown, setShown] = React.useState(false);
    const label = shown ? "הסתר סיסמה" : "הצג סיסמה";

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={shown ? "text" : "password"}
          className={cn("pl-10", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          aria-pressed={shown}
          aria-label={label}
          title={label}
          className="absolute left-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {shown ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
