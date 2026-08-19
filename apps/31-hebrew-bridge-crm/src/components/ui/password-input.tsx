import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * שדה סיסמה עם כפתור "הצג סיסמה" (priority §1א).
 *
 * ‏/reset-password נבנה בלי הכפתור הזה בזמן ש-‎/auth‎ באותה מערכת כבר החזיק אותו,
 * ודווקא שם הוא הכי נחוץ: אין שם סיסמה קודמת שאפשר לנסות שוב איתה, ולכן שגיאת
 * הקלדה בשני השדות נועלת את החשבון עד לאיפוס נוסף.
 *
 * הצד שבו הכפתור יושב נגזר מה-`dir` של השדה עצמו ולא מזה של העמוד: העמוד RTL
 * אבל השדה `dir="ltr"` (סיסמאות מוקלדות לטינית), כך שהתווים מתחילים משמאל
 * וכפתור משמאל היה יושב עליהם. ה-padding נוסף באותו צד בלבד.
 *
 * `type="button"` מפורש: השדה יושב בתוך <form onSubmit>, וכפתור בלי type הוא
 * submit — כל לחיצה על "הצג" הייתה שולחת את הטופס.
 *
 * ה-type, ה-aria-pressed, ה-aria-label והאייקון נגזרים כולם מאותו state אחד,
 * כדי שלא ייתכן מצב שהכפתור אומר "הצג" בזמן שהסיסמה כבר גלויה.
 */
const PasswordInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<"input">, "type">
>(({ className, ...props }, ref) => {
  const [shown, setShown] = React.useState(false);
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
          "absolute top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          onRight ? "right-1" : "left-1",
        )}
      >
        {shown ? (
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
