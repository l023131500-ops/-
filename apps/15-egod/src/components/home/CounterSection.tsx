import { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Users, BookOpen, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/* שלושת המספרים בסקשן הזה היו קבועים בקוד: 350+ מגידי שיעור פעילים,
   1,200+ שיעורים שבועיים, 85 ערים ויישובים. במסד של המערכת יש 4 מגידי
   שיעור מאושרים, 10 שיעורים פעילים ו-3 ערים. עמוד ציבורי חי לא מציג
   מספר שאיננו מודדים, ולכן הסקשן קורא את שלוש הספירות מהמסד, ואם אין
   תשובה הוא מסתיר את עצמו — "לא זמין" ולא נתון מומצא.
   גם ה-"+" ירד: ספירה מדויקת אינה "ומעלה". */

type Counts = { teachers: number; lessons: number; cities: number };

const AnimatedCounter = ({ target }: { target: number }) => {
  /* מתחת ל-20 אין מה להנפיש. ספירה קטנה יושבת על 0 כמעט שנייה בגלל
     ה-Math.floor, ומי שמצלם את העמוד רואה "0" — בדיוק מה שנמדד בייצור. */
  const animates = target > 20;
  const [count, setCount] = useState(animates ? 0 : target);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView || !animates) return;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) { setCount(target); clearInterval(timer); }
      else { setCount(Math.floor(current)); }
    }, 2000 / steps);
    return () => clearInterval(timer);
  }, [isInView, animates, target]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
};

const CounterSection = () => {
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [teachers, lessons, cityRows] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_approved", true),
        supabase.from("lessons").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("lessons").select("city").eq("is_active", true),
      ]);
      if (!alive) return;
      if (teachers.error || lessons.error || cityRows.error) return;
      if (teachers.count == null || lessons.count == null || !cityRows.data) return;
      /* "אונליין" הוא מקום הקלטה ולא יישוב, והתווית אומרת "ערים ויישובים". */
      const cities = new Set(
        cityRows.data
          .map((r) => r.city)
          .filter((c): c is string => !!c && c !== "אונליין")
      );
      setCounts({ teachers: teachers.count, lessons: lessons.count, cities: cities.size });
    })();
    return () => { alive = false; };
  }, []);

  if (!counts) return null;

  const stats = [
    { icon: Users, value: counts.teachers, label: "מגידי שיעור מאושרים" },
    { icon: BookOpen, value: counts.lessons, label: "שיעורים פעילים" },
    { icon: MapPin, value: counts.cities, label: "ערים ויישובים" },
  ];

  return (
    <section className="py-16 bg-primary">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stats.map((s) => (
            <motion.div key={s.label} initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="text-center">
              <s.icon className="w-10 h-10 text-secondary mx-auto mb-3" />
              <div className="font-heading text-4xl md:text-5xl font-black text-primary-foreground mb-2">
                <AnimatedCounter target={s.value} />
              </div>
              <p className="text-primary-foreground/70 font-medium">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CounterSection;
