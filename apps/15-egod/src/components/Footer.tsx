import { Link } from "react-router-dom";
import { BookOpen, Phone, Mail, MapPin, MessageCircle } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-gradient-navy text-primary-foreground relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 20% 0%, hsl(var(--secondary)) 0%, transparent 50%), radial-gradient(circle at 80% 100%, hsl(var(--secondary)) 0%, transparent 50%)" }} />
      <div className="container mx-auto px-4 py-14 relative">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-gold flex items-center justify-center shadow-gold">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <span className="font-heading text-xl font-bold tracking-tight">איגוד מגידי השיעורים</span>
            </div>
            <p className="text-primary-foreground/70 text-sm leading-relaxed">
              דף לכל שיעור, ניהול משתתפים וחומרי עזר — למגידי שיעורים, ארגונים ובתי כנסת.
            </p>
          </div>
          <div>
            <h3 className="font-heading font-bold text-secondary mb-4">ניווט מהיר</h3>
            <div className="flex flex-col gap-2">
              <Link to="/" className="inline-block py-1 text-sm text-primary-foreground/70 hover:text-secondary transition-colors">דף הבית</Link>
              <Link to="/find-lesson" className="inline-block py-1 text-sm text-primary-foreground/70 hover:text-secondary transition-colors">מצא שיעור</Link>
              <Link to="/request-lesson" className="inline-block py-1 text-sm text-primary-foreground/70 hover:text-secondary transition-colors">הקם שיעור</Link>
              <Link to="/about" className="inline-block py-1 text-sm text-primary-foreground/70 hover:text-secondary transition-colors">אודות</Link>
            </div>
          </div>
          <div>
            <h3 className="font-heading font-bold text-secondary mb-4">למגידי שיעורים</h3>
            <div className="flex flex-col gap-2">
              <Link to="/join" className="inline-block py-1 text-sm text-primary-foreground/70 hover:text-secondary transition-colors">הצטרף לאיגוד</Link>
              <Link to="/invite" className="inline-block py-1 text-sm text-primary-foreground/70 hover:text-secondary transition-colors">הפעלת פורטל חדש</Link>
              <Link to="/login" className="inline-block py-1 text-sm text-primary-foreground/70 hover:text-secondary transition-colors">כניסה לפורטל</Link>
            </div>
          </div>
          <div>
            <h3 className="font-heading font-bold text-secondary mb-4">צור קשר</h3>
            <div className="flex flex-col gap-3">
              <a href="tel:023131600" className="flex items-center gap-2 inline-block py-1 text-sm text-primary-foreground/70 hover:text-secondary transition-smooth">
                <Phone className="w-4 h-4 text-secondary" />
                <span dir="ltr">02-3131600</span>
              </a>
              <a href="https://wa.me/9722313160?text=שלום%2C%20אני%20מעוניין%20בפרטים%20על%20איגוד%20השיעורים" target="_blank" rel="noopener" className="flex items-center gap-2 inline-block py-1 text-sm text-primary-foreground/70 hover:text-secondary transition-smooth">
                <MessageCircle className="w-4 h-4 text-secondary" />
                <span dir="ltr">WhatsApp 02-3131600</span>
              </a>
              <a href="mailto:a023131600@gmail.com" className="flex items-center gap-2 inline-block py-1 text-sm text-primary-foreground/70 hover:text-secondary transition-smooth break-all">
                <Mail className="w-4 h-4 text-secondary shrink-0" />
                <span dir="ltr">a023131600@gmail.com</span>
              </a>
              <div className="flex items-center gap-2 inline-block py-1 text-sm text-primary-foreground/70">
                <MapPin className="w-4 h-4 text-secondary" />
                <span>ישראל</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-sidebar-border/40 text-center text-sm text-primary-foreground/50 space-y-1">
          <p>© {new Date().getFullYear()} איגוד מגידי השיעורים. כל הזכויות שמורות.</p>
          <p className="text-xs tracking-wide">מבית <span className="text-secondary/80 font-semibold">איגוד השיעורים</span></p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;