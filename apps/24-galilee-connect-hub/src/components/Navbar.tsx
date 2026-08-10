import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, BookOpen, Phone, Settings, Menu, X, Landmark, HelpCircle, ShieldCheck, Download } from 'lucide-react';
import logoMechubarim from '@/assets/logo-mechubarim.png';

// במגירת המובייל הגליף הוא מה שמזהה את היעד, ולכן שני יעדים שונים לא יכולים
// לשאת אותו סמל. נמדד בייצור: שבע שורות נשאו חמישה גליפים — `book-open`
// ל"בתי כנסת" ול"דת וקהילה", `settings` ל"פורטל גבאים" ול"ניהול",
// ו-`message-circle` ל"שאל את הרב" בזמן שאותו סמל מציין בעמוד גם את
// הוואטסאפ וגם את פקד הצ'אט. כל סמל כאן לקוח מהיעד עצמו: `help-circle`
// הוא הסמל של AskRabbiSection, `book-open` נשאר ל-/info כי הכרטיס שמוביל
// לשם מצייר אותו, ו-`settings` נשאר לפורטל הגבאים מאותה סיבה.
const navItems = [
  { label: 'ראשי', to: '/', icon: Home },
  { label: 'בתי כנסת', to: '/#synagogues', icon: Landmark, isAnchor: true },
  { label: 'דת וקהילה', to: '/info', icon: BookOpen },
  { label: 'שאל את הרב', to: '/#ask-rabbi', icon: HelpCircle, isAnchor: true },
  { label: 'צור קשר', to: '/contact', icon: Phone },
  { label: 'פורטל גבאים', to: '/gabai', icon: Settings },
  { label: 'ניהול ⚡', to: '/gabai?auto=admin', icon: ShieldCheck },
];

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => setMobileOpen(false), [location]);

  const handleNavClick = (item: typeof navItems[0]) => {
    if (item.isAnchor && location.pathname === '/') {
      const id = item.to.split('#')[1];
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <motion.nav
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-card/95 backdrop-blur-xl shadow-elevated border-b border-border'
            : 'bg-teal-dark/80 backdrop-blur-md'
        }`}
      >
        {/* כפתור הכניסה המשותף של more30 יושב `fixed` בפינה השמאלית העליונה
            (הקצה האינליין-סופי ב-RTL) — בדיוק על כפתור התפריט במובייל ועל
            "ניהול ⚡" בדסקטופ. נמדד ששניהם מכוסים והלחיצה מגיעה לכדור.
            `--more30-auth-inset` הוא הרוחב שהכדור מפרסם בפועל. */}
        <div
          className="container flex items-center justify-between h-14"
          style={{
            paddingInlineEnd:
              'max(1rem, calc(var(--more30-auth-inset, 124px) - max(0px, (100vw - 1400px) / 2)))',
          }}
        >
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logoMechubarim} alt="מחוברים" className="h-9 rounded-lg" />
            <span className={`font-display font-black text-sm hidden sm:block transition-colors ${
              scrolled ? 'text-foreground' : 'text-primary-foreground'
            }`}>
              מחוברים
            </span>
          </Link>

          {/* Download complete local bundle */}
          <div className="flex items-center gap-1.5">
            <a
              href="/downloads/mehubarim-complete-package.zip"
              download
              title="הורדת חבילה מלאה: קוד, נתונים וסיכום שיחה"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-[11px] font-black shadow-sm hover:shadow-elevated transition-all"
            >
              <Download className="w-3.5 h-3.5" /> הורדה מלאה
            </a>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(item => {
              const isActive = location.pathname === item.to || (item.to === '/' && location.pathname === '/');
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={() => handleNavClick(item)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                    isActive && !item.isAnchor
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : scrolled
                        ? 'text-foreground/80 hover:text-foreground hover:bg-primary/10'
                        : 'text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Mobile hamburger */}
          {/* קורא מסך הכריז על הפקד הזה כ"לחצן" בלי לומר מה הוא עושה —
              כל תוכנו אייקון. נמדד ב-`platform-audit.mjs` כפקד ללא שם נגיש
              במובייל. `aria-expanded` נוסף מאותה סיבה: בלעדיו אין דרך לדעת
              אם התפריט פתוח או סגור. */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'סגירת התפריט' : 'פתיחת התפריט'}
            aria-expanded={mobileOpen}
            className={`md:hidden w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
              scrolled ? 'text-foreground hover:bg-primary/10' : 'text-primary-foreground hover:bg-primary-foreground/10'
            }`}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-14 inset-x-0 z-40 bg-card shadow-elevated border-b border-border p-4 md:hidden"
            >
              <div className="flex flex-col gap-1">
                {navItems.map(item => (
                  <Link
                    key={item.label}
                    to={item.to}
                    onClick={() => { setMobileOpen(false); handleNavClick(item); }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-foreground font-bold text-sm hover:bg-primary/10 transition-colors"
                  >
                    <item.icon className="w-4 h-4 text-primary" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
