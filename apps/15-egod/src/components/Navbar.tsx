import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { label: "דף הבית", path: "/" },
  { label: "מצא שיעור", path: "/find-lesson" },
  { label: "הקם שיעור", path: "/request-lesson" },
  { label: "אודות", path: "/about" },
  { label: "שאלון הצטרפות", path: "/questionnaire" },
  { label: "🔧 ניהול", path: "/admin" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <nav className="sticky top-0 z-50 bg-primary/95 backdrop-blur-md border-b border-sidebar-border">
      {/* כפתור הכניסה המשותף של more30 יושב `fixed` בקצה האינליין-סופי —
          בעברית, הפינה השמאלית העליונה. שם יושבים "הצטרף כמגיד שיעור"
          בדסקטופ וכפתור התפריט במובייל, ונמדד ששניהם מכוסים והלחיצה
          מגיעה לכדור. `--more30-auth-inset` הוא הרוחב שהכדור באמת תופס;
          החיסור מקזז את השוליים שה-container כבר נותן במסך רחב. */}
      <div
        className="container mx-auto px-4 flex items-center justify-between h-16"
        style={{
          paddingInlineEnd:
            'max(1rem, calc(var(--more30-auth-inset, 124px) - max(0px, (100vw - 1400px) / 2)))',
        }}
      >
        <Link to="/" className="flex items-center gap-2 text-primary-foreground">
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-secondary-foreground" />
          </div>
          <span className="font-heading text-xl font-bold">איגוד מגידי השיעורים</span>
        </Link>

        {/* md ← lg. הריפוד למעלה מפנה 104px, ונמדד ב-06/08 שהוא אכן מחושב
            ל-104px ב-834px — ובכל זאת קבוצת הכפתורים ישבה ב-x=14, כלומר
            **גלשה** מעבר לו: לוגו ארוך, שישה קישורים ושני כפתורים אינם
            נכנסים מתחת ל-1024px, וגלישת flex ב-RTL יוצאת שמאלה, היישר אל
            מתחת לכדור הכניסה. ריפוד אינו מפנה מקום שאין; לכן בין 768 ל-1024
            מוצג תפריט המובייל, שכבר יושב בתוך הריפוד. */}
        <div className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === link.path
                  ? "bg-secondary text-secondary-foreground"
                  : "text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-3">
          <Button variant="outline" asChild className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground">
            <Link to="/login">התחברות</Link>
          </Button>
          <Button asChild className="bg-secondary text-secondary-foreground hover:bg-gold-dark">
            <Link to="/join">הצטרף כמגיד שיעור</Link>
          </Button>
        </div>

        <button className="lg:hidden text-primary-foreground p-2" aria-label="תפריט" aria-expanded={mobileOpen} onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="lg:hidden bg-primary border-t border-sidebar-border overflow-hidden"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileOpen(false)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    pathname === link.path
                      ? "bg-secondary text-secondary-foreground"
                      : "text-primary-foreground/80 hover:bg-white/10"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-sidebar-border">
                <Button variant="outline" asChild className="border-secondary text-secondary">
                  <Link to="/login" onClick={() => setMobileOpen(false)}>התחברות</Link>
                </Button>
                <Button asChild className="bg-secondary text-secondary-foreground">
                  <Link to="/join" onClick={() => setMobileOpen(false)}>הצטרף כמגיד שיעור</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;