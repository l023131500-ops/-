import { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Users, BookOpen, MapPin } from "lucide-react";

const stats = [
  { icon: Users, value: 350, label: "מגידי שיעור פעילים", suffix: "+" },
  { icon: BookOpen, value: 1200, label: "שיעורים שבועיים", suffix: "+" },
  { icon: MapPin, value: 85, label: "ערים ויישובים", suffix: "" },
];

const AnimatedCounter = ({ target, suffix }: { target: number; suffix: string }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) { setCount(target); clearInterval(timer); }
      else { setCount(Math.floor(current)); }
    }, 2000 / steps);
    return () => clearInterval(timer);
  }, [isInView, target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

const CounterSection = () => (
  <section className="py-16 bg-primary">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {stats.map((s) => (
          <motion.div key={s.label} initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="text-center">
            <s.icon className="w-10 h-10 text-secondary mx-auto mb-3" />
            <div className="font-heading text-4xl md:text-5xl font-black text-primary-foreground mb-2">
              <AnimatedCounter target={s.value} suffix={s.suffix} />
            </div>
            <p className="text-primary-foreground/70 font-medium">{s.label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default CounterSection;