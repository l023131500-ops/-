import { motion, useScroll, useTransform } from "framer-motion";
import { ShieldCheck, Headphones, Clock, ThumbsUp, ArrowLeft } from "lucide-react";
import { useRef } from "react";

const PaidServiceSection = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const xItems = useTransform(scrollYProgress, [0, 0.4], [-60, 0]);

  return (
    <section className="py-24 bg-warm overflow-hidden" ref={ref}>
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4">
            מסתבכים? בואו נסדר את זה
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
            ניסיתם לבד ולא הצלחתם? זה קורה - הבירוקרטיה מסובכת. בתשלום סמלי,
            צוות מקצועי מטעמנו יטפל בכל התהליך עבורכם - עד שתקבלו את מה שמגיע לכם.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            {[
              { icon: ShieldCheck, label: "ליווי מקצועי מ-א׳ עד ת׳" },
              { icon: Headphones, label: "שירות אישי ונגיש" },
              { icon: Clock, label: "טיפול מהיר ויעיל" },
              { icon: ThumbsUp, label: "תשלום סמלי בלבד" },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                style={{ x: xItems }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                whileHover={{ y: -4 }}
                className="flex flex-col items-center gap-3"
              >
                <div className="w-16 h-16 rounded-full bg-gold-light flex items-center justify-center">
                  <item.icon className="w-8 h-8 text-secondary" />
                </div>
                <span className="font-semibold text-foreground text-sm">{item.label}</span>
              </motion.div>
            ))}
          </div>

          <motion.a
            href="https://nedar.im/F4064"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-secondary text-secondary-foreground font-bold text-lg shadow-lg glow-gold"
          >
            קבלו סיוע אישי עכשיו
            <ArrowLeft className="w-5 h-5" />
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
};

export default PaidServiceSection;
