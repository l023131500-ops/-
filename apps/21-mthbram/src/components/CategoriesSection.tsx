import { motion } from "framer-motion";
import { BookOpen, Users, Mic, GraduationCap } from "lucide-react";

const categories = [
  {
    icon: BookOpen,
    title: "שיעורי תורה",
    description: "שיעורים בכל הנושאים – גמרא, הלכה, פרשה ועוד",
    count: "2,400+",
    color: "teal",
    glowClass: "glow-teal",
    borderHover: "hover:border-teal/40",
    iconBg: "bg-gradient-teal",
  },
  {
    icon: Users,
    title: "חברותות",
    description: "מצאו חברותא מתאימה ללימוד משותף",
    count: "850+",
    color: "gold",
    glowClass: "glow-gold",
    borderHover: "hover:border-gold/40",
    iconBg: "bg-gradient-gold",
  },
  {
    icon: Mic,
    title: "הרצאות",
    description: "הרצאות מרתקות בנושאי אמונה, השקפה וחיזוק",
    count: "1,200+",
    color: "magenta",
    glowClass: "glow-magenta",
    borderHover: "hover:border-magenta/40",
    iconBg: "bg-gradient-magenta",
  },
  {
    icon: GraduationCap,
    title: "קורסים",
    description: "סדרות שיעורים מובנות ללימוד מעמיק",
    count: "180+",
    color: "teal",
    glowClass: "glow-teal",
    borderHover: "hover:border-teal/40",
    iconBg: "bg-gradient-brand",
  },
];

const CategoriesSection = () => {
  return (
    <section className="py-24 bg-background relative">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-4xl md:text-6xl font-black text-foreground mb-4">
            מה תרצו <span className="text-gradient-brand">ללמוד</span> היום?
          </h2>
          <p className="font-body text-muted-foreground text-lg max-w-lg mx-auto">
            בחרו קטגוריה ומצאו בדיוק מה שאתם מחפשים
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group cursor-pointer"
            >
              <div className={`relative bg-card rounded-2xl p-8 border border-border ${cat.borderHover} transition-all duration-500 shadow-elegant h-full`}>
                {/* Glow on hover */}
                <div className={`absolute inset-0 rounded-2xl ${cat.glowClass} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative z-10">
                  <div className={`w-14 h-14 rounded-xl ${cat.iconBg} flex items-center justify-center mb-6`}>
                    <cat.icon className="w-7 h-7 text-background" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-card-foreground mb-2">{cat.title}</h3>
                  <p className="font-body text-muted-foreground text-sm mb-4 leading-relaxed">{cat.description}</p>
                  <span className="font-body text-xs font-bold text-teal">{cat.count} שיעורים</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
