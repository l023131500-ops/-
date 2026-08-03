import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import BrandLogo from "@/components/BrandLogo";
import { Search, RefreshCw, PlusCircle, Mic, Menu, X } from "lucide-react";

const NAV_LINKS = [
  { to: "/find-lesson", label: "חיפוש שיעור", icon: Search, color: "text-teal" },
  { to: "/update-lesson", label: "עדכון שיעור", icon: RefreshCw, color: "text-gold" },
  { to: "/request-lesson", label: "הקמת שיעור", icon: PlusCircle, color: "text-magenta" },
  { to: "/teachers", label: "הצטרפות כרב", icon: Mic, color: "text-primary" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="fixed top-0 right-0 left-0 z-50 bg-background/70 backdrop-blur-2xl border-b border-border/40 shadow-sm">
      <div className="container mx-auto px-6 py-3 flex items-center justify-between">
        <Link to="/">
          <BrandLogo size="sm" />
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1 font-body text-sm font-medium">
          {NAV_LINKS.map((l) => {
            const isActive = location.pathname === l.to;
            return (
              <Link key={l.to} to={l.to}>
                <motion.span
                  whileHover={{ scale: 1.06, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all duration-300 ${
                    isActive
                      ? "bg-primary/10 text-primary font-bold border border-primary/20 shadow-sm"
                      : "text-foreground/70 hover:text-foreground hover:bg-accent/60 border border-transparent hover:border-border/50"
                  }`}
                >
                  <l.icon className={`w-4 h-4 ${isActive ? l.color : ""}`} />
                  {l.label}
                </motion.span>
              </Link>
            );
          })}
        </div>

        <div className="hidden md:flex items-center gap-2" />

        {/* Mobile hamburger.
            כל תוכנו אייקון, ולכן קורא מסך הכריז עליו "לחצן" בלי לומר מה
            הוא עושה — נמדד כפקד ללא שם נגיש ב-`platform-audit.mjs`.
            `aria-expanded` מאותה סיבה: בלעדיו אין דרך לדעת אם התפריט פתוח. */}
        <button
          className="md:hidden text-foreground p-2"
          aria-label={isOpen ? 'סגירת התפריט' : 'פתיחת התפריט'}
          aria-expanded={isOpen}
          onClick={() => setIsOpen(!isOpen)}
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                <X className="w-6 h-6" />
              </motion.div>
            ) : (
              <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                <Menu className="w-6 h-6" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background/95 backdrop-blur-2xl border-b border-border overflow-hidden"
          >
            <div className="px-6 py-4 space-y-1">
              {NAV_LINKS.map((l, i) => {
                const isActive = location.pathname === l.to;
                return (
                  <motion.div
                    key={l.to}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      to={l.to}
                      className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all ${
                        isActive
                          ? "bg-primary/10 text-primary font-bold"
                          : "text-foreground hover:bg-accent/50"
                      }`}
                      onClick={() => setIsOpen(false)}
                    >
                      <l.icon className={`w-5 h-5 ${l.color}`} />
                      <span className="font-body text-sm font-medium">{l.label}</span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
