import { motion, useScroll, useTransform } from "framer-motion";
import { HeartHandshake, Gift, Users, ArrowLeft, Sparkles } from "lucide-react";
import { useRef } from "react";

const CommunitySection = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const xCards = useTransform(scrollYProgress, [0, 0.4], [80, 0]);

  return (
    <section className="py-24 bg-emerald-light overflow-hidden" ref={ref}>
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-5xl mx-auto"
        >
          <div className="text-center mb-14">
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", bounce: 0.4 }}
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary flex items-center justify-center"
            >
              <HeartHandshake className="w-10 h-10 text-primary-foreground" />
            </motion.div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4">
              נותנים יד לקהילה
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              מיזם ייחודי שמביא לקהילות שלכם מכירות מסובסדות, הטבות בלעדיות,
              וליווי מקצועי למשפחות - כי ביחד אנחנו חזקים יותר.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {[
              {
                icon: Gift,
                title: "מכירות מסובסדות",
                desc: "מוצרי בית, מזון ואלקטרוניקה - במחירים שלא תמצאו בשום מקום אחר",
              },
              {
                icon: Users,
                title: "הטבות לקהילה",
                desc: "סדנאות מקצועיות, הרצאות, ייעוץ כלכלי וליווי ברמה אחרת",
              },
              {
                icon: Sparkles,
                title: "סיוע למשפחות",
                desc: "כל משפחה שמצטרפת מקבלת בדיקה מקיפה של זכויות וליווי אישי - בחינם",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                style={{ x: xCards }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                whileHover={{ scale: 1.04, y: -6 }}
                className="p-6 rounded-2xl bg-card border border-border/50 card-elevated text-center"
              >
                <item.icon className="w-10 h-10 mx-auto mb-4 text-primary" />
                <h3 className="font-bold text-lg text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="text-center">
            <motion.a
              href="https://nedar.im/F3874"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg shadow-lg hover:shadow-xl transition-all"
            >
              הצטרפו ללא עלות
              <ArrowLeft className="w-5 h-5" />
            </motion.a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CommunitySection;
