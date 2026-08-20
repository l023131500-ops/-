import { Search, RefreshCw, Users, Mic, ArrowLeft, Star } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import heroMic from "@/assets/hero-microphone.png";
import AIIcon from "@/components/ui/AIIcon";

/**
 * ⚠️ הרכיב הזה **אינו מורכב לשום מסלול** — נמדד ב-10/08/2026: `HeroSection`
 * מיוצא כאן ואינו מיובא באף קובץ ב-`src/`, ואף אחד מ-20 המסלולים ב-`App.tsx`
 * אינו מגיע אליו. הטקסטים שלו לא מופיעים ב-DOM של `/mthbram/` בבנייה
 * (‏`index-bxKxiOtM.js`, נבדק ב-vite preview). הקופי כאן תוקן בכל זאת כדי
 * שלא ישוכפל בחזרה אל משטח חי, אבל **תיקון כאן אינו משנה דבר למשתמש** —
 * מי שמחפש את הטקסט של דף הבית יחפש ב-`src/pages/Index.tsx`.
 */
const HeroSection = () => {
  const actions = [
    {
      icon: Search,
      title: "מחפשים שיעור שמתאים לכם?",
      desc: "חיפוש מתוך מאגר שיעורי התורה",
      link: "/find-lesson",
      gradient: "bg-gradient-teal",
      glow: "glow-teal",
      borderColor: "hover:border-teal-light/50",
      featured: true,
    },
    {
      icon: RefreshCw,
      title: "עדכון שיעור במאגר",
      desc: "הכניסו שיעור קיים למאגר הארצי",
      link: "/update-lesson",
      gradient: "bg-gradient-gold",
      glow: "glow-gold",
      borderColor: "hover:border-gold-light/50",
    },
    {
      icon: Users,
      title: "הקמת שיעור בהתאמה אישית",
      desc: "מלאו שאלון קצר ונמצא לכם את מגיד השיעור המושלם",
      link: "/request-lesson",
      gradient: "bg-gradient-gold",
      glow: "glow-gold",
      borderColor: "hover:border-gold-light/50",
    },
    {
      icon: Mic,
      title: "הצטרפות למסירת שיעור",
      desc: "זכו את הרבים — הצטרפו כמגיד שיעור ונתאם לכם קהל",
      link: "/teachers",
      gradient: "bg-gradient-brand",
      glow: "glow-brand",
      borderColor: "hover:border-gold/50",
    },
  ];

  return (
    <section className="relative pt-24 pb-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy-light to-navy" />
      <div className="absolute top-10 left-1/4 w-[500px] h-[500px] bg-teal/15 rounded-full blur-[150px] animate-glow-pulse" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-magenta/12 rounded-full blur-[120px] animate-glow-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold/8 rounded-full blur-[200px]" />

      {/* Animated particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full bg-gold/40"
            style={{ left: `${15 + i * 15}%`, top: `${60 + (i % 3) * 10}%` }}
            animate={{ y: [0, -200, -400], opacity: [0, 0.8, 0], scale: [0.5, 1, 0.5] }}
            transition={{ duration: 4 + i * 0.5, repeat: Infinity, delay: i * 0.8, ease: "easeOut" }}
          />
        ))}
      </div>

      <div className="relative z-10 container mx-auto px-6">
        {/* Top section with logo and text */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-12">
          {/* Logo Visual */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="relative order-1 md:order-2"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-gold/30 via-transparent to-transparent rounded-full blur-[60px]" />
            <motion.div
              className="relative z-10 w-40 h-40 md:w-56 md:h-56 rounded-3xl overflow-hidden shadow-2xl ring-2 ring-gold/30"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <img src={heroMic} alt="איגוד השיעורים" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-gold/20 via-transparent to-transparent" />
            </motion.div>
            <motion.div
              className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-6 bg-gold/20 rounded-full blur-xl"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>

          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center md:text-right order-2 md:order-1 flex-1"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gold/15 border border-gold/30 text-gold text-sm font-body font-bold mb-6 shadow-lg"
            >
              <Star className="w-4 h-4 animate-pulse" />
              {/* קופי (§6): «הארגון העולמי» היה טענה מוסדית שאין לה מדידה.
                  התגית הוחלפה ולא נמחקה — היא נושאת את הכותרת שמתחתיה, וסלוט
                  ריק כאן הוא שינוי פריסה. שלושת הפריטים הם בדיוק שלושת
                  העמודים של ThreePillarsSection. */}
              שיעורי תורה · חברותות · הרצאות
              <AIIcon size={18} variant="primary" />
            </motion.div>

            <h1 className="font-display text-5xl md:text-7xl font-black leading-tight mb-4">
              <motion.span
                className="text-gradient-brand inline-block"
                animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                transition={{ duration: 5, repeat: Infinity }}
              >
                איגוד השיעורים
              </motion.span>
            </h1>

            <p className="font-display text-xl md:text-2xl font-bold text-primary-foreground/80 mb-3">
              מחברים בין לומדים ומלמדים — בכל מקום, בכל נושא
            </p>

            <p className="font-body text-base text-primary-foreground/50 max-w-2xl mx-auto md:mx-0 leading-relaxed hidden md:block">
              {/* קופי (§6): «הגדול בעולם» הוא דירוג מדיד, ואיש לא מדד אותו —
                  ומעל מאגר שמגיש 0 שיעורים מאושרים לציבור (‎lessons‎ עם
                  ‎is_approved=true‎, נמדד ב-10/08) הוא גם נסתר בעמוד עצמו.
                  במקומו: הסינונים שקיימים בפועל ב-LessonDirectory. */}
              חיפוש לפי נושא, עיר, קהל יעד, סגנון ושפה • שיעורים מוקלטים ובשידור חי
            </p>
          </motion.div>
        </div>

        {/* Action Cards — single row, search emphasized */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-6xl mx-auto mb-10">
          {actions.map((action, i) => (
            <Link to={action.link} key={action.title}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                whileHover={{ y: -8, scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`group relative h-full backdrop-blur-md rounded-2xl p-5 md:p-6 border-2 transition-all duration-500 cursor-pointer overflow-hidden flex flex-col items-center text-center ${
                  action.featured
                    ? "bg-gold/15 border-gold/50 hover:border-gold hover:bg-gold/20 ring-2 ring-gold/30 shadow-[0_0_30px_-5px_hsl(var(--gold)/0.45)]"
                    : `bg-primary-foreground/5 border-primary-foreground/10 ${action.borderColor} hover:bg-primary-foreground/12`
                }`}
              >
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${action.glow}`} />
                <div className="relative z-10 flex flex-col items-center gap-3">
                  <motion.div
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.5 }}
                    className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl ${action.gradient} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg`}
                  >
                    <action.icon className={`w-7 h-7 md:w-8 md:h-8 ${action.featured ? "text-navy" : "text-primary-foreground"}`} />
                  </motion.div>
                  <div className="flex-1">
                    <h3 className={`font-display font-black mb-1.5 transition-colors leading-tight ${
                      action.featured
                        ? "text-xl md:text-2xl text-gold"
                        : "text-lg md:text-xl text-primary-foreground group-hover:text-gold"
                    }`}>
                      {action.title}
                    </h3>
                    <p className="font-body text-xs md:text-sm text-primary-foreground/60 leading-relaxed">{action.desc}</p>
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>

        {/* Quick topic tags */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="flex flex-wrap justify-center gap-2">
          {["📖 גמרא", "✡️ הלכה", "🔥 פרשת השבוע", "💭 מוסר", "🌟 חסידות", "🎯 חברותות", "📚 דף יומי"].map((tag, i) => (
            <motion.span
              key={tag}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.1 + i * 0.08 }}
              whileHover={{ scale: 1.1, y: -2 }}
              className="px-4 py-2 rounded-full bg-primary-foreground/8 border border-primary-foreground/15 text-foreground/60 font-body text-sm hover:border-gold/40 hover:text-gold hover:bg-gold/10 transition-all cursor-pointer"
            >
              {tag}
            </motion.span>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
