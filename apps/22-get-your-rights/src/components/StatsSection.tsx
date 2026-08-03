import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { TrendingUp, PiggyBank, Calculator, FileCheck } from "lucide-react";
import { useRef, useState, useEffect } from "react";

const stats = [
  { value: 200, suffix: "+", label: "זכויות והטבות שמצאנו", icon: FileCheck },
  { value: 50, prefix: "₪", suffix: "K+", label: "חיסכון ממוצע למשפחה", icon: PiggyBank },
  { value: 10, suffix: "K+", label: "משפחות שכבר נעזרו", icon: TrendingUp },
  { value: 30, suffix: "+", label: "גופים ממשלתיים מכוסים", icon: Calculator },
];

const AnimatedNumber = ({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 1500;
    const step = (ts: number) => {
      start = start || ts;
      const progress = Math.min((ts - start) / duration, 1);
      setDisplay(Math.floor(progress * value));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, value]);

  return <span ref={ref}>{prefix}{display}{suffix}</span>;
};

const StatsSection = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, [0, 0.5], [80, 0]);

  return (
    <section className="py-20 bg-card relative overflow-hidden" ref={ref}>
      <div className="container mx-auto px-6">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-muted-foreground mb-10 text-sm font-medium"
        >
          נתונים אמיתיים מהשטח
        </motion.p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              style={{ x }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
              className="text-center"
            >
              <stat.icon className="w-8 h-8 mx-auto mb-3 text-secondary" />
              <div className="text-3xl md:text-4xl font-black text-foreground mb-1">
                <AnimatedNumber value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
              </div>
              <div className="text-sm text-muted-foreground font-medium">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
