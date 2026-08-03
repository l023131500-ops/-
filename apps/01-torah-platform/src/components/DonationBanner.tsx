import { motion } from "framer-motion";
import { Heart, Sparkles } from "lucide-react";

export default function DonationBanner() {
  return (
    <section className="py-6 px-6" dir="rtl">
      <div className="container mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-[hsl(180_45%_25%)] via-[hsl(180_40%_30%)] to-[hsl(40_80%_45%)] p-5 md:p-6 shadow-xl"
        >
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-l from-transparent via-white/10 to-transparent"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />

          <div className="relative text-center space-y-2">
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm border border-white/25"
            >
              <Heart className="w-5 h-5 text-white fill-white" />
            </motion.div>

            <h2 className="font-display text-lg md:text-xl font-black text-white drop-shadow-md">
              רוצים להיות שותפים בהחזקת התורה?
            </h2>
            <p className="font-body text-white/90 text-sm max-w-xl mx-auto">
              כל תרומה מזכה את הרבים בשיעורי תורה ברחבי הארץ.
            </p>

            <motion.a
              href="https://nedar.im/7017792"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[hsl(180_45%_20%)] font-display font-black text-sm shadow-lg hover:shadow-xl transition-shadow"
            >
              <Sparkles className="w-4 h-4 text-[hsl(40_80%_45%)]" />
              🤝 לתרומה דרך נדרים פלוס
            </motion.a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
