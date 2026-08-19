import { Link, useNavigate } from "react-router-dom";
import { Menu, ShoppingCart, User, LogOut, LayoutDashboard, Heart } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTenant, useTenantFeature } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { tenant } = useTenant();
  const { user, signOut } = useAuth();
  const cartCount = useCart((s) => s.count());
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  const hasShop = useTenantFeature("shop");
  const hasDonations = useTenantFeature("donations");
  const hasLessons = useTenantFeature("lessons");

  const navLinks = [
    { to: "/", label: "ראשי" },
    hasLessons && { to: "/lessons", label: "מאגר שיעורים" },
    hasLessons && { to: "/find-lesson", label: "אתר לי שיעור" },
    hasShop && { to: "/shop", label: "תשמישי קדושה" },
    hasDonations && { to: "/donate", label: "תרומות" },
    { to: "/about", label: "אודות" },
    { to: "/contact", label: "צור קשר" },
  ].filter(Boolean) as { to: string; label: string }[];

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* כפתור הכניסה המשותף של more30 יושב `fixed` בקצה האינליין-סופי של
          החלון — בעברית, הפינה השמאלית העליונה. כאן יושבים "התחבר" וכפתור
          התפריט, ונמדד (`scripts/qa/authbutton-overlap.mjs`) שהלחיצה מגיעה
          לכדור ולא אליהם, בשני הרוחבים. `auth-button.js` מפרסם ב-
          `--more30-auth-inset` את הרוחב שהוא באמת תופס, כולל השוליים.

          החיסור מחזיר את מה שהמרווח הטבעי של ה-container כבר נותן, כדי
          שבמסך רחב הסרגל לא ייראה מוזח פנימה בלי סיבה. */}
      <div
        className="container mx-auto flex h-16 items-center justify-between px-4"
        style={{
          paddingInlineEnd:
            'max(1rem, calc(var(--more30-auth-inset, 124px) - max(0px, (100vw - 1400px) / 2)))',
        }}
      >
        <Link to="/" className="flex items-center gap-3">
          {tenant?.branding?.logo_url ? (
            <img src={tenant.branding.logo_url} alt={tenant.branding.site_name || ""} className="h-10 w-auto" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground font-heading text-lg">
              {tenant?.branding?.site_name?.charAt(0) || "ת"}
            </div>
          )}
          <div className="hidden sm:block">
            <div className="font-heading text-lg font-bold leading-tight">
              {tenant?.branding?.site_name || tenant?.name || "פלטפורמת תורה"}
            </div>
            {tenant?.branding?.site_tagline && (
              <div className="text-xs text-muted-foreground">{tenant.branding.site_tagline}</div>
            )}
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
          <a
            href="/subscribe?app=torah"
            className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-foreground"
          >
            מחירון
          </a>
        </nav>

        <div className="flex items-center gap-2">
          {hasShop && (
            <Button variant="ghost" size="icon" asChild className="relative">
              {/* פקד שכל תוכנו אייקון אינו נושא שם נגיש — קורא מסך מכריז
                  עליו כ"קישור" בלי לומר לאן. שלושת אלה נמדדו כחסרי שם. */}
              <Link to="/cart" aria-label="עגלת הקניות">
                <ShoppingCart className="h-5 w-5" aria-hidden />
                {cartCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                    {cartCount}
                  </Badge>
                )}
              </Link>
            </Button>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="החשבון שלי">
                  <User className="h-5 w-5" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => nav("/portal")}>
                  <LayoutDashboard className="ml-2 h-4 w-4" /> פורטל
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => nav("/portal/profile")}>
                  <User className="ml-2 h-4 w-4" /> פרופיל אישי
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={async () => {
                    await signOut();
                    nav("/");
                  }}
                >
                  <LogOut className="ml-2 h-4 w-4" /> התנתק
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="default" size="sm">
              <Link to="/auth/sign-in">התחבר</Link>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="תפריט"
            aria-expanded={open}
          >
            <Menu className="h-5 w-5" aria-hidden />
          </Button>
        </div>
      </div>

      <div className={cn("lg:hidden border-t bg-background", open ? "block" : "hidden")}>
        <div className="container mx-auto px-4 py-3 flex flex-col gap-1">
          {navLinks.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm hover:bg-accent">
              {l.label}
            </Link>
          ))}
          <a href="/subscribe?app=torah" className="rounded-md px-3 py-2 text-sm hover:bg-accent">
            מחירון
          </a>
        </div>
      </div>
    </header>
  );
}
