import { Link } from "@tanstack/react-router";
import { Languages, ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export function AppHeader() {
  const { t, toggleLang } = useI18n();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ShoppingCart className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight text-foreground">
            {t("app.name")}
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            activeProps={{ className: "bg-secondary text-secondary-foreground" }}
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
          >
            {t("nav.search")}
          </Link>
          <Link
            to="/status"
            activeProps={{ className: "bg-secondary text-secondary-foreground" }}
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
          >
            {t("nav.status")}
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLang}
            className="ms-1 gap-1.5"
          >
            <Languages className="h-4 w-4" />
            {t("lang.toggle")}
          </Button>
        </nav>
      </div>
    </header>
  );
}
