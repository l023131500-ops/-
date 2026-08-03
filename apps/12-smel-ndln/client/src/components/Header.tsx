import { Link } from "wouter";
import { Moon, Sun } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";

export function Header() {
  const { theme, toggle } = useTheme();
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
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
