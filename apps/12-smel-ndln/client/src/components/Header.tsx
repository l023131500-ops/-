import { Link } from "wouter";
import { Moon, Sun } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";

export function Header() {
  const { theme, toggle } = useTheme();
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:right-2 focus:z-[100] focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-foreground"
      >
        דלג לתוכן הראשי
      </a>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-md">
        {/* כפתור הכניסה המשותף של more30 יושב `fixed` בפינה השמאלית העליונה
            (הקצה האינליין-סופי ב-RTL) — בדיוק על מתג המצב הכהה. נמדד ב-390px
            שהלחיצה מגיעה לכדור, כלומר המתג לא היה ניתן ללחיצה במובייל.
            `--more30-auth-inset` מפורסם על ידי הכדור לפי רוחבו בפועל. */}
        <div
          className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6"
          style={{
            paddingInlineEnd:
              'max(1rem, calc(var(--more30-auth-inset, 124px) - max(0px, (100vw - 1152px) / 2)))',
          }}
        >
          {/* ⚠️ אין כאן <a> פנימי בכוונה. זו תבנית wouter v2; ב-v3 הרכיב מרנדר
              עוגן משלו, וכשהילד עצמו הוא <a> הוא מטפל בו כעוגן הקיים ומחבר לו
              onClick בלבד — בלי href. התוצאה נראתה תקינה לגמרי ובפועל הלוגו לא
              הוביל לשום מקום: אומת בדפדפן על האתר החי, הקישור היחיד מתוך ארבעה
              שאין לו href. הקישור ל"פרימיום" שמתחת עובד בדיוק כי הילד שלו אינו
              עוגן. */}
          <Link href="/" data-testid="link-home" className="cursor-pointer">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            {/* ⚠️ `hidden sm:inline-flex` belongs on the Link, not the Button: Link
                renders its own <a> around the Button (see Logo link above), so
                hiding only the Button left an empty, focusable, nameless anchor
                in the mobile tab order — Lighthouse `link-name` failure. */}
            <Link href="/premium" data-testid="link-premium-header" className="hidden sm:inline-flex">
              <Button variant="ghost">
                פרימיום
              </Button>
            </Link>
            {/* דף מחירון more30 חי מחוץ ל-app הזה (`/subscribe`), לכן <a> רגיל
                ולא wouter Link — ראה ההערה למעלה על הבעיה עם <a> כילד של Link. */}
            <a href="/subscribe?app=smel" data-testid="link-pricing-header" className="hidden sm:inline-flex">
              <Button variant="ghost">
                מחירון
              </Button>
            </a>
            <Button
              variant="outline"
              size="icon"
              onClick={toggle}
              aria-label="החלף מצב תצוגה"
              data-testid="button-theme-toggle"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>
    </>
  );
}
