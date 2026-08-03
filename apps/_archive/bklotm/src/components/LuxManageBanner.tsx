import { motion } from "framer-motion";
import { Sparkles, ArrowLeft } from "lucide-react";

const LUX_URL = "https://luxe-ledger-hub.lovable.app/";

const LuxManageBanner = () => {
  return (
    <section className="py-8 bg-background">
      <div className="container mx-auto px-6">
        <motion.a
          href={LUX_URL}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          whileHover={{ scale: 1.01 }}
          className="block max-w-4xl mx-auto rounded-2xl bg-gradient-to-l from-primary/10 via-secondary/10 to-primary/10 border border-secondary/30 px-5 py-3 shadow-md hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-secondary/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-secondary" />
              </div>
              <p className="text-sm md:text-base font-bold text-foreground truncate">
                מוזמנים להציץ לניהול פיננסי מבית בקלות
                <span className="text-secondary"> - Lux Manage</span>
              </p>
            </div>
            <ArrowLeft className="w-5 h-5 text-secondary shrink-0" />
          </div>
        </motion.a>
      </div>
    </section>
  );
};

export default LuxManageBanner;
