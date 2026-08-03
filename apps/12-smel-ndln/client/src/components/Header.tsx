import { Link } from "wouter";
import { Moon, Sun } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";

export function Header() {
  const { theme, toggle } = useTheme();
  return (
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
        <Link href="/" data-testid="link-home">
          <a className="cursor-pointer">
            <Logo />
          </a>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/premium" data-testid="link-premium-header">
            <Button variant="ghost" className="hidden sm:inline-flex">
              פרימיום
            </Button>
          </Link>
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
  );
}
