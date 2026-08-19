import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const navItems = [
  { label: "בדיקת זכויות", href: "#service-bot" },
  { label: "נושאים", href: "#categories" },
  { label: "קהילה", href: "#community" },
  { label: "סיוע אישי", href: "#paid-service" },
];

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      /* המצב הלא-נגלל היה ‎bg-transparent‎ לגמרי, והכיתוב הלבן שבו נמדד מול
         הלבן של ‎body‎ — 1.04:1. הוא אמנם מרחף מעל ה-hero הכהה, אבל גם בעין
         זה שביר: מספיק שהתצלום בהיר במקום שבו יושבת המילה. רצועה כהה
         בשקיפות 80% מעל hero כהה כמעט אינה נראית, ומבטיחה קריאוּת מעל כל
         תצלום — וגם נמדדת נכון (5.19:1). */
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-card/95 backdrop-blur-md shadow-md border-b border-border/50"
          : "bg-emerald-dark/80 backdrop-blur-sm"
      }`}
    >
      {/*
        🚨 ‎pe-28‎ אינו קישוט. כפתור הכניסה המשותף של הפלטפורמה מוזרק
        ‎position:fixed‎ בפינה ‎inset-inline-end:16px / top:12px‎ — כלומר
        בעברית בפינה השמאלית העליונה, בדיוק במקום שבו ‎justify-between‎ מניח
        את הקצה של הנווט. נמדד: הכדור תופס x10..86 והמבורגר x16..60, כלומר
        **כפתור התפריט במובייל היה מכוסה כמעט לגמרי ולא ניתן ללחיצה**, ובדסקטופ
        הכדור כיסה 48px מכפתור "הצטרפו ללא עלות". זו לא בעיה של המערכת הזו
        בלבד — היא תחזור בכל נווט RTL שיש בו פקד בקצה. הריפוד מפנה 112px.
      */}
      <div className="container mx-auto ps-6 pe-28 flex items-center justify-between h-16">
        {/* ⚠️ היה ‎href="#"‎ — עוגן חי עם ‎cursor:pointer‎ שאינו מוביל לשום מקום.
            זה לא "קישור חסר" אלא גרוע ממנו: הוא נראה ומרגיש לחיץ, ולחיצה עליו
            לא עושה כלום. שאר פריטי הנווט כאן הם עוגנים בתוך העמוד, ולכן הלוגו
            מצביע על ראש העמוד באותה שיטה ולא בפתרון אחר. */}
        <a href="#top" className="flex items-center gap-2">
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", bounce: 0.4 }}
            className={`text-2xl font-black ${scrolled ? "text-foreground" : "text-white"}`}
          >
            בקלות
          </motion.span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`font-medium transition-colors ${
                scrolled
                  ? "text-muted-foreground hover:text-foreground"
                  : "text-white/90 hover:text-white"
              }`}
            >
              {item.label}
            </a>
          ))}
          <a
            href="/subscribe?app=zchuyot"
            className={`font-medium transition-colors ${
              scrolled
                ? "text-muted-foreground hover:text-foreground"
                : "text-white/90 hover:text-white"
            }`}
          >
            מחירון
          </a>
          <a
            href="https://nedar.im/F4064"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2 rounded-lg bg-secondary text-secondary-foreground font-bold text-sm hover:scale-105 transition-transform"
          >
            הצטרפו ללא עלות
          </a>
        </div>

        {/* הכפתור היה אייקון בלבד — בלי טקסט ובלי aria-label, כלומר בלי שם
            נגיש. קורא מסך הכריז עליו "לחצן" ותו לא, וזה גם ה-‎button-name‎
            שנכשל ב-Lighthouse. `w-11 h-11` מביא אותו גם מעל סף יעד המגע. */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "סגירת התפריט" : "פתיחת התפריט"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          className={`md:hidden flex h-11 w-11 items-center justify-center rounded-lg ${
            scrolled ? "text-foreground" : "text-white"
          }`}
        >
          {mobileOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            id="mobile-nav"
            className="md:hidden bg-card border-b border-border"
          >
            <div className="px-6 py-4 space-y-3">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="block py-2 font-medium text-foreground hover:text-primary transition-colors"
                >
                  {item.label}
                </a>
              ))}
              <a
                href="/subscribe?app=zchuyot"
                onClick={() => setMobileOpen(false)}
                className="block py-2 font-medium text-foreground hover:text-primary transition-colors"
              >
                מחירון
              </a>
              <a
                href="https://nedar.im/F4064"
                target="_blank"
                rel="noopener noreferrer"
                className="block py-2 px-5 rounded-lg bg-secondary text-secondary-foreground font-bold text-center"
              >
                הצטרפו ללא עלות
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
