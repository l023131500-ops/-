import { motion } from "framer-motion";
import { Mic, Search, RefreshCw, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const pillars = [
  {
    icon: Mic,
    title: "מגידי שיעור",
    desc: "זכו את הרבים — הצטרפו לאיגוד השיעורים ונמצא לכם את הקהל שמחכה בדיוק לשיעורים שלכם.",
    link: "/teachers",
    cta: "הצטרפו כמגידי שיעור",
    gradient: "from-teal to-teal-light",
    glowClass: "glow-teal",
    borderHover: "hover:border-teal/40",
    iconBg: "bg-gradient-teal",
  },
  {
    icon: Search,
    title: "מחפשים שיעור תורני",
    desc: "חפשו שיעור תורני שמתאים לכם — לפי נושא, עיר, קהל יעד וסגנון.",
    link: "/find-lesson",
    cta: "מצאו שיעור מתאים",
    gradient: "from-gold to-gold-dark",
    glowClass: "glow-gold",
    borderHover: "hover:border-gold/40",
    iconBg: "bg-gradient-gold",
  },
  {
    icon: RefreshCw,
    title: "עדכון שיעור קיים",
    desc: "יש לכם שיעור תורה קיים? עדכנו אותו במאגר — גם בטלפון וגם בעמדות נדרים פלוס.",
    link: "/update-lesson",
    cta: "עדכנו שיעור קיים",
    gradient: "from-magenta to-magenta-light",
    glowClass: "glow-magenta",
    borderHover: "hover:border-magenta/40",
    iconBg: "bg-gradient-magenta",
  },
];

const ThreePillarsSection = () => {
  return (
    <section className="py-28 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-teal/3 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-gold/3 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 className="font-display text-4xl md:text-5xl font-black text-foreground mb-6">
            שותפות <span className="text-gradient-brand">בהרמת קרן התורה</span>
          </h2>
          <p className="font-body text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            הצטרפו למפעל זיכוי הרבים — חברו בין לומדים ומלמדים, הקימו שיעור חדש, או עדכנו שיעור קיים. 
            הכל ללא עלות, הכל לשם שמים.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pillars.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.6 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className={`group relative bg-card rounded-3xl p-10 border-2 border-border ${p.borderHover} transition-all duration-500 overflow-hidden cursor-pointer`}
            >
              <div className={`absolute inset-0 ${p.glowClass} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

              <div className="relative z-10">
                <div className={`w-20 h-20 rounded-2xl ${p.iconBg} flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500`}>
                  <p.icon className="w-10 h-10 text-background" />
                </div>

                <h3 className="font-display text-2xl font-black text-foreground mb-4">{p.title}</h3>
                <p className="font-body text-muted-foreground leading-relaxed mb-8 min-h-[80px]">{p.desc}</p>

                <Link to={p.link}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`w-full py-4 rounded-xl ${p.iconBg} text-background font-body font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity`}
                  >
                    {p.cta}
                    <ArrowLeft className="w-5 h-5" />
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ThreePillarsSection;
