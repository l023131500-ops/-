import { motion } from "framer-motion";
import { Mic } from "lucide-react";
import { Link } from "react-router-dom";

const CTASection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-hero" />
      {/* Animated gradient orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal/5 rounded-full blur-[100px] animate-glow-pulse" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-magenta/5 rounded-full blur-[100px] animate-glow-pulse" style={{ animationDelay: '1.5s' }} />
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gold/5 rounded-full blur-[80px] animate-float" />

      <div className="relative z-10 container mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="font-display text-4xl md:text-6xl font-black text-foreground mb-6">
            מלמדים תורה?
            <br />
            <span className="text-gradient-brand">הצטרפו למתחברים</span>
          </h2>
          <p className="font-body text-foreground/50 text-lg max-w-xl mx-auto mb-10">
            הגיעו לאלפי לומדים המחפשים שיעורים. פרסמו את השיעורים שלכם בחינם והרחיבו את קהל הלומדים.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/questionnaire">
              <button className="group relative px-10 py-5 rounded-xl font-body font-bold text-background text-lg overflow-hidden">
                <div className="absolute inset-0 bg-gradient-brand group-hover:opacity-90 transition-opacity" />
                <div className="absolute inset-0 bg-gradient-brand opacity-0 group-hover:opacity-50 blur-xl transition-opacity" />
                <span className="relative flex items-center gap-2">
                  <Mic className="w-5 h-5" />
                  הרשמה כמגיד שיעור
                </span>
              </button>
            </Link>
            <button className="px-10 py-5 rounded-xl font-body font-bold text-foreground/70 text-lg border border-border hover:border-teal/30 hover:text-teal transition-all">
              למידע נוסף
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
