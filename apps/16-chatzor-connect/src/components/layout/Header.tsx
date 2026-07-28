import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, Moon, Sun, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { SITE } from "@/config/site";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/Button";

const NAV = [
  { label: "בתי כנסת", href: "/#synagogues" },
  { label: "זמני היום", href: "/#zmanim" },
  { label: "שיעורי תורה", href: "/#lessons" },
  { label: "שירותי קהילה", href: "/#services" },
  { label: "צור קשר", href: "/#contact" },
];

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-3">
      <span
        className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground shadow-soft"
        aria-hidden
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 20V8c0-.9 1-1.4 1.7-.9L12 10l4.3-2.9C17 6.6 18 7.1 18 8v12" className="text-gold" stroke="hsl(var(--gold))" />
          <circle cx="12" cy="17" r="1.4" fill="hsl(var(--accent))" stroke="none" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className="block font-display text-lg font-bold text-foreground">{SITE.name}</span>
        <span className="block text-xs text-muted-foreground">{SITE.tagline}</span>
      </span>
    </Link>
  );
}

export function Header() {
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="grid h-10 w-10 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={theme === "dark" ? "מעבר למצב בהיר" : "מעבר למצב כהה"}
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <Button size="sm" className="hidden sm:inline-flex" onClick={() => (window.location.href = "/#synagogues")}>
            מצא בית כנסת
          </Button>
          <button
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-md text-foreground lg:hidden"
            aria-label="תפריט"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "grid overflow-hidden border-t border-border/70 transition-[grid-template-rows] duration-300 lg:hidden",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <nav className="min-h-0">
          <ul className="container-page flex flex-col py-2">
            {NAV.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-3 py-3 text-sm font-medium text-foreground hover:bg-secondary"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
