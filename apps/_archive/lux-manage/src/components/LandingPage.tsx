import { motion } from "framer-motion";
import { Shield, Mic, Layers, ArrowLeft, Sparkles, ChevronDown, Quote, ExternalLink, Star, UserCheck, Crown, UserPlus } from "lucide-react";
import PublicConciergeBot from "./PublicConciergeBot";
import ContactSection from "./ContactSection";
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12 } },
};
const item = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" as const } },
};

const features = [
  {
    icon: Shield,
    title: "בינה מלאכותית בשירות הזכויות שלך",
    desc: "המערכת סורקת את הפרופיל שלך, מצליבה מול מאגרי מידע ומזהה הטבות, הנחות וזכויות שאף אחד לא סיפר לך עליהן — אוטומטית ובלי מאמץ.",
    gradient: "from-accent to-gold-dark",
  },
  {
    icon: Layers,
    title: "ניהול עסקי ומשפחתי בהפרדה מוחלטת",
    desc: "חשבון אחד, שתי פלטפורמות. עברו בין ניהול הבית לניהול העסק בלחיצה אחת — עם נתונים, תובנות ודוחות מותאמים לכל מצב.",
    gradient: "from-indigo to-indigo-dark",
  },
  {
    icon: Mic,
    title: "הזנת נתונים בשפה חופשית",
    desc: "כתבו בוואטסאפ, הקליטו הודעה קולית או פשוט הקלידו: ״שילמתי לחשמלאי 300 ש״ח״ — והמערכת תסווג, תתעד ותעדכן את התקציב בזמן אמת.",
    gradient: "from-emerald-500 to-emerald-700",
  },
];

const testimonials = [
  {
    name: "שירה לוי",
    role: "אם לשלושה, רמת גן",
    text: "גיליתי שמגיע לי הנחה של 40% בארנונה. רק בזכות הסריקה האוטומטית חסכתי אלפי שקלים בשנה.",
    avatar: "ש",
  },
  {
    name: "אורן כהן",
    role: "בעל עסק, תל אביב",
    text: "לראשונה אני רואה את העסק והבית במקום אחד. התזכורות למע״מ לבד שוות את כל הכסף.",
    avatar: "א",
  },
  {
    name: "מיכל אברהם",
    role: "יועצת פיננסית",
    text: "אני ממליצה ללקוחות שלי על המערכת. מנוע הזכויות חוסך לי שעות עבודה בכל תיק.",
    avatar: "מ",
  },
];

const stats = [
  { value: "₪6,400+", label: "חיסכון שנתי ממוצע למשפחה" },
  { value: "2,500+", label: "משפחות ובעלי עסקים פעילים" },
  { value: "98%", label: "שביעות רצון משתמשים" },
];

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div dir="rtl" className="min-h-screen bg-background overflow-x-hidden">

      {/* ───── Hero ───── */}
      <section className="relative min-h-screen flex items-center justify-center px-8 md:px-20">
        <div className="ambient-gold w-[700px] h-[700px] top-1/4 start-1/4" />
        <div className="ambient-indigo w-[500px] h-[500px] bottom-1/4 end-1/3" />

        <motion.div variants={container} initial="hidden" animate="show" className="relative z-10 max-w-3xl mx-auto text-center space-y-12">
          <motion.div variants={item} className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full glass-card">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-xs font-bold text-accent tracking-wide">הדור הבא של ניהול פיננסי</span>
          </motion.div>

          <motion.h1 variants={item} className="text-4xl md:text-5xl lg:text-6xl font-black text-foreground leading-[1.12] tracking-tight">
            השליטה הפיננסית שלך,
            <br />
            <span className="gold-text">מעכשיו באינטליגנציה אחרת.</span>
          </motion.h1>

          <motion.p variants={item} className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed tracking-editorial">
            המערכת היחידה בישראל שמשלבת ניהול משק בית חכם, צמיחה עסקית ומיצוי זכויות אוטומטי בממשק יוקרתי אחד.
          </motion.p>

          <motion.div variants={item} className="flex flex-col sm:flex-row gap-5 justify-center items-center pt-4">
            <button onClick={onGetStarted}
              className="btn-clay-gold text-lg px-12 py-5 rounded-bento group">
              התחל עכשיו — בחינם
              <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            </button>
            <button onClick={onGetStarted}
              className="btn-clay-ghost text-base px-10 py-5 rounded-bento">
              כניסה למערכת
            </button>
          </motion.div>

          <motion.div variants={item} className="pt-12">
            <ChevronDown className="w-6 h-6 mx-auto text-muted-foreground/30 animate-bounce" />
          </motion.div>
        </motion.div>
      </section>

      {/* ───── The Problem ───── */}
      <section className="py-32 px-8 md:px-20">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
          className="max-w-3xl mx-auto text-center space-y-7">
          <p className="text-[10px] font-bold text-accent tracking-[0.3em] uppercase">הבעיה</p>
          <h2 className="text-3xl md:text-4xl font-black text-foreground leading-tight">
            ניהול הבית והעסק הפך לכאוס.
          </h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-2xl mx-auto tracking-editorial">
            אקסלים מפוזרים, זכויות שלא ממומשות, חשבונות שנשכחים, ותחושת חוסר שליטה שגדלה מחודש לחודש. אתם לא לבד — 73% מהמשפחות בישראל מאבדות כסף רק בגלל חוסר סדר.
          </p>
        </motion.div>
      </section>

      {/* ───── Stats ───── */}
      <section className="py-24 px-8 md:px-20">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-12">
          {stats.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="text-center space-y-3">
              <p className="text-5xl md:text-6xl font-black gold-text">{stat.value}</p>
              <p className="text-sm text-muted-foreground tracking-editorial">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ───── The Solution — Features ───── */}
      <section className="py-32 px-8 md:px-20">
        <div className="max-w-6xl mx-auto space-y-20">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="text-center space-y-5">
            <p className="text-[10px] font-bold text-accent tracking-[0.3em] uppercase">הפתרון</p>
            <h2 className="text-3xl md:text-4xl font-black text-foreground">
              כל מה שצריך. בממשק אחד.
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-base tracking-editorial">
              שלוש יכולות ליבה שמשנות את הדרך שבה אתם מנהלים כסף.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.12 }}
                className="bento-card space-y-7 hover:border-accent/15 transition-all duration-500 group">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-400`}>
                  <f.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-foreground leading-snug">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed tracking-editorial">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Dual Mode ───── */}
      <section className="py-32 px-8 md:px-20">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="text-center space-y-5 mb-20">
            <p className="text-[10px] font-bold text-accent tracking-[0.3em] uppercase">שתי פלטפורמות</p>
            <h2 className="text-3xl md:text-4xl font-black text-foreground">חשבון אחד. שליטה כפולה.</h2>
            <p className="text-muted-foreground max-w-lg mx-auto tracking-editorial">עברו בין ניהול ביתי לניהול עסקי בלחיצה — בלי להתנתק, בלי לאבד נתונים.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="bento-card space-y-6 border-t-2 border-accent">
              <h3 className="text-xl font-bold text-foreground">🏠 ניהול ביתי</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>• מעקב הוצאות משפחתיות בזמן אמת</li>
                <li>• תכנון אירועים — בר מצווה, חתונה, חגים</li>
                <li>• גילוי אוטומטי של זכויות והטבות</li>
                <li>• ניהול ספקים ביתיים ותשלומים חוזרים</li>
              </ul>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="bento-card-business space-y-6 border-t-2 border-indigo">
              <h3 className="text-xl font-bold text-foreground">💼 ניהול עסקי</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>• רווח והפסד בזמן אמת עם גרפים מקצועיים</li>
                <li>• ספירה לאחור למועדי מע״מ ומס הכנסה</li>
                <li>• ניהול ספקים עסקיים וחשבוניות</li>
                <li>• ייצוא דוחות PDF ו-Excel ממותגים</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ───── Testimonials ───── */}
      <section className="py-32 px-8 md:px-20">
        <div className="max-w-5xl mx-auto space-y-20">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="text-center space-y-4">
            <p className="text-[10px] font-bold text-accent tracking-[0.3em] uppercase">מה אומרים עלינו</p>
            <h2 className="text-3xl md:text-4xl font-black text-foreground">הצטרפו למשפחה</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div key={t.name} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="bento-card space-y-5 relative">
                <Quote className="w-8 h-8 text-accent/10 absolute top-7 end-7" />
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-3.5 h-3.5 text-accent fill-accent" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed tracking-editorial">״{t.text}״</p>
                <div className="flex items-center gap-3 pt-2">
                  <div className="w-11 h-11 rounded-2xl gold-gradient flex items-center justify-center text-sm font-bold text-primary-foreground">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Minuf Integration ───── */}
      <section className="py-28 px-8 md:px-20">
        <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          className="max-w-3xl mx-auto bento-card text-center space-y-7 py-16">
          <p className="text-[10px] font-bold text-accent tracking-[0.3em] uppercase">שותפות אסטרטגית</p>
          <h2 className="text-2xl md:text-3xl font-black text-foreground">מינוף — הפלטפורמה העסקית המשלימה</h2>
          <p className="text-muted-foreground text-sm md:text-base leading-relaxed max-w-xl mx-auto tracking-editorial">
            שילוב חכם עם פלטפורמת מינוף לניהול עסקי מתקדם — מימון, ליווי עסקי וכלים ליזמים.
          </p>
          <a href="https://manof.lovable.app" target="_blank" rel="noopener noreferrer"
            className="btn-clay inline-flex items-center gap-3 px-8 py-4 rounded-bento border-2 border-accent text-accent font-bold hover:bg-accent hover:text-primary-foreground transition-all duration-400">
            גלו את מינוף
            <ExternalLink className="w-4 h-4" />
          </a>
        </motion.div>
      </section>

      {/* ───── Contact ───── */}
      <ContactSection />

      {/* ───── CTA ───── */}
      <section className="py-36 px-8 md:px-20">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center space-y-10">
          <h2 className="text-3xl md:text-4xl font-black text-foreground">מוכנים לקחת שליטה?</h2>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto tracking-editorial">הצטרפו לאלפי משפחות ובעלי עסקים שכבר מנהלים חכם יותר.</p>
          <button onClick={onGetStarted}
            className="btn-clay-gold text-lg px-14 py-5 rounded-bento">
            הרשמה חינם
            <ArrowLeft className="w-5 h-5" />
          </button>
        </motion.div>
      </section>

      {/* ───── Footer ───── */}
      <footer className="py-12 px-8 md:px-20 border-t border-border/50">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl gold-gradient flex items-center justify-center">
              <span className="text-xs font-black text-primary-foreground">EF</span>
            </div>
            <span className="font-bold text-foreground tracking-tight">FinanceHub</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/admin-portal" className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors">Staff</a>
            <p className="text-xs text-muted-foreground">© 2026 FinanceHub. כל הזכויות שמורות.</p>
          </div>
        </div>
      </footer>
      <PublicConciergeBot onGetStarted={onGetStarted} />
    </div>
  );
}
