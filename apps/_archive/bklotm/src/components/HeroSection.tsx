import { motion, useScroll, useTransform } from "framer-motion";
import { Phone, Mail, Sparkles } from "lucide-react";
import bill20 from "@/assets/bills/nis-20.png";
import bill50 from "@/assets/bills/nis-50.png";
import bill100 from "@/assets/bills/nis-100.png";
import bill200 from "@/assets/bills/nis-200.png";

const BILLS = [bill20, bill50, bill100, bill200];

const HeroSection = () => {
  const { scrollY } = useScroll();
  const textY = useTransform(scrollY, [0, 400], [0, -60]);
  const opacity = useTransform(scrollY, [0, 400], [1, 0]);

  // Generate 18 falling banknotes - smaller, subtle
  const bills = Array.from({ length: 18 }).map((_, i) => ({
    id: i,
    src: BILLS[i % BILLS.length],
    left: (i * 53) % 100,
    size: 42 + ((i * 11) % 38), // 42–80px
    delay: (i * 0.55) % 9,
    duration: 10 + ((i * 13) % 9),
    rotate: ((i * 47) % 60) - 30,
    drift: ((i * 31) % 60) - 30,
  }));

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Rich gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(250,204,21,0.18),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(0,0,0,0.5),transparent_70%)]" />

      {/* Money Rain - real Israeli shekel banknotes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {bills.map((b) => (
          <motion.img
            key={b.id}
            src={b.src}
            alt=""
            aria-hidden="true"
            className="absolute drop-shadow-2xl select-none"
            style={{
              left: `${b.left}%`,
              top: "-12%",
              width: b.size,
              height: "auto",
            }}
            initial={{ y: "-20vh", x: 0, opacity: 0, rotate: b.rotate }}
            animate={{
              y: "125vh",
              x: [0, b.drift, -b.drift, b.drift / 2, 0],
              opacity: [0, 0.95, 0.95, 0.8, 0],
              rotate: [b.rotate, b.rotate + 180, b.rotate + 360],
            }}
            transition={{
              duration: b.duration,
              delay: b.delay,
              repeat: Infinity,
              ease: "linear",
              x: { duration: b.duration, repeat: Infinity, ease: "easeInOut" },
            }}
          />
        ))}
      </div>

      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background pointer-events-none" />

      {/* Content */}
      <motion.div
        className="relative z-10 container mx-auto px-6 text-center"
        style={{ y: textY, opacity }}
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="max-w-4xl mx-auto"
        >
          {/* Logo text with cinematic reveal */}
          <motion.div
            className="mb-8 overflow-hidden"
          >
            <motion.h1
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="text-8xl md:text-[10rem] font-black text-primary-foreground tracking-tight leading-none"
            >
              בקלות
            </motion.h1>
          </motion.div>



          <motion.div className="overflow-hidden mb-4">
            <motion.p
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="text-3xl md:text-5xl font-bold text-primary-foreground/95 leading-tight"
            >
              הזכות שלך, האחריות שלנו
            </motion.p>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.7 }}
            className="text-lg md:text-xl text-primary-foreground/75 mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            אלפי ישראלים מפסידים עשרות אלפי שקלים בשנה - פשוט כי הם לא יודעים
            שמגיע להם. אנחנו כאן כדי לשנות את זה.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4, duration: 0.7 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <motion.a
              href="#service-bot"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="px-10 py-5 rounded-2xl bg-secondary text-secondary-foreground font-extrabold text-lg shadow-2xl glow-gold relative overflow-hidden group"
            >
              <span className="relative z-10">🔍 גלו כמה כסף מחכה לכם</span>
              <motion.div
                className="absolute inset-0 bg-gradient-to-l from-transparent via-primary-foreground/10 to-transparent"
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
              />
            </motion.a>
            <motion.a
              href="https://nedar.im/F4064"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="px-10 py-5 rounded-2xl border-2 border-primary-foreground/30 text-primary-foreground font-bold text-lg backdrop-blur-sm hover:bg-primary-foreground/10 transition-colors"
            >
              ✨ הצטרפו ללא עלות
            </motion.a>
          </motion.div>

          {/* Contact strip - prominent */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8, duration: 0.8 }}
            className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto"
          >
            <motion.a
              href="tel:023131500"
              whileHover={{ scale: 1.05 }}
              className="flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl bg-primary-foreground/15 backdrop-blur-md border border-primary-foreground/25 hover:bg-primary-foreground/25 transition-all"
            >
              <Phone className="w-5 h-5 text-secondary" />
              <div className="text-right">
                <p className="text-primary-foreground font-bold text-sm" dir="ltr">02-3131500</p>
                <p className="text-primary-foreground/60 text-[10px]">מערכת קולית 24/6</p>
              </div>
            </motion.a>
            <motion.a
              href="mailto:L023131500@gmail.com"
              whileHover={{ scale: 1.05 }}
              className="flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl bg-primary-foreground/15 backdrop-blur-md border border-primary-foreground/25 hover:bg-primary-foreground/25 transition-all"
            >
              <Mail className="w-5 h-5 text-secondary" />
              <div className="text-right">
                <p className="text-primary-foreground font-bold text-xs">L023131500@gmail.com</p>
                <p className="text-primary-foreground/60 text-[10px]">שלחו מייל</p>
              </div>
            </motion.a>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl bg-secondary/20 backdrop-blur-md border border-secondary/30 cursor-default"
            >
              <Sparkles className="w-5 h-5 text-secondary" />
              <div className="text-right">
                <p className="text-primary-foreground font-bold text-sm">עמדות נדרים פלוס</p>
                <p className="text-primary-foreground/60 text-[10px]">בכל הארץ</p>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        animate={{ y: [0, 12, 0] }}
        transition={{ repeat: Infinity, duration: 2.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 w-7 h-11 rounded-full border-2 border-primary-foreground/25 flex items-start justify-center pt-2"
      >
        <motion.div
          className="w-1.5 h-3 rounded-full bg-secondary/70"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.div>
    </section>
  );
};

export default HeroSection;
