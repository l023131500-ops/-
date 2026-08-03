import { motion } from "framer-motion";
import { Target, GraduationCap, Users, Lightbulb } from "lucide-react";

const pillars = [
  {
    icon: Users,
    title: "הנגשת מידע לקהילה",
    desc: "אנו מנגישים שיעורי תורה, הרצאות וחברותות לכל יהודי — בכל מקום ובכל זמן.",
    color: "teal",
  },
  {
    icon: GraduationCap,
    title: "הכשרה מקצועית למגידי שיעור",
    desc: "כלים, הדרכה ופלטפורמה למגידי שיעור להתפתח מקצועית ולהגיע לקהל רחב.",
    color: "gold",
  },
  {
    icon: Target,
    title: "כלים להצלחה",
    desc: "נתינת כלים להתמודדות מירבית והצלחה בהשגת משימות — גם למלמדים וגם ללומדים.",
    color: "magenta",
  },
  {
    icon: Lightbulb,
    title: "חיבור חכם ומדויק",
    desc: "מערכת AI שמתאימה בדיוק בין מגידי שיעור ולומדים לפי סגנון, נושא ומיקום.",
    color: "teal",
  },
];

const MissionSection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-gold/3 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/3 w-[600px] h-[600px] bg-teal/3 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-magenta/10 border border-magenta/20 text-magenta text-sm font-body mb-6">
            <Target className="w-4 h-4" />
            הבמה שלנו
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-black text-foreground mb-6">
            מה זה <span className="text-gradient-brand">מתחברים?</span>
          </h2>
          <p className="font-body text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            מתחברים היא במה דיגיטלית שמחברת בין עולם הלימוד לעולם ההוראה. 
            סיוע לקהילה, הכשרת מגידי שיעור, והתאמה חכמה שמשנה את חוקי המשחק.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {pillars.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
              className={`group relative bg-card rounded-2xl p-8 border border-border hover:border-${p.color}/30 transition-all duration-500 overflow-hidden`}
            >
              <div className={`absolute inset-0 glow-${p.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className="relative z-10">
                <div className={`w-14 h-14 rounded-xl bg-gradient-${p.color} flex items-center justify-center mb-5`}>
                  <p.icon className="w-7 h-7 text-background" />
                </div>
                <h3 className="font-display text-xl font-bold text-foreground mb-3">{p.title}</h3>
                <p className="font-body text-muted-foreground leading-relaxed">{p.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MissionSection;
