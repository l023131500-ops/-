import { motion, useScroll, useTransform } from "framer-motion";
import { FileCheck, LayoutGrid, ListChecks } from "lucide-react";
import { useRef } from "react";
import { mainCategories } from "@/data/rightsData";

/**
 * ⚠️ ארבעת המספרים שהיו כאן פורסמו תחת הכותרת "נתונים אמיתיים מהשטח",
 * ולשלושה מהם לא היה שום מקור:
 *
 *   200+ זכויות והטבות שמצאנו   — המאגר מחזיק 174 נושאים. אותו מספר מומצא
 *                                 כבר תוקן בסקשן שמתחת (RightsCategories),
 *                                 ונשאר כאן. זה בדיוק "בדוק את האחיות".
 *   ₪50K+ חיסכון ממוצע למשפחה   — אין ולו חישוב אחד באתר שמגיע למספר הזה.
 *   10K+ משפחות שכבר נעזרו      — אין מדידה כזו. מה שכן קיים הוא טבלת הפניות,
 *                                 והיא סופרת מי השאיר פרטים ולא מי קיבל כסף;
 *                                 החלפה של מספר אחד בשני הייתה טעות מסוג אחר.
 *   30+ גופים ממשלתיים מכוסים    — ל-RightTopic אין שדה גוף מטפל, ולכן אי אפשר
 *                                 לגזור את זה מהמאגר. לא מוצג במקום לנחש.
 *
 * מה שנשאר הוא מה שנספר מהמאגר עצמו בזמן רינדור, ולכן אינו יכול להתיישן:
 * כל שינוי ב-rightsData משנה את המספר על המסך.
 */
const rightsCount = mainCategories.reduce((n, c) => n + c.topics.length, 0);
const questionCount = mainCategories.reduce(
  (n, c) => n + c.topics.reduce((m, t) => m + t.questions.length, 0),
  0,
);

const stats = [
  { value: rightsCount, label: "זכויות, מענקים והטבות במאגר", icon: FileCheck },
  { value: mainCategories.length, label: "קטגוריות", icon: LayoutGrid },
  { value: questionCount, label: "שאלות זכאות בשאלונים", icon: ListChecks },
];

/**
 * ⚠️ כאן ישבה ספירה מונפשת מ-0 עד המספר, והיא הוסרה — לא מטעמי סגנון.
 *
 * העמוד הזה נאפה מראש (scripts/prerender-all.mjs). ההנפשה מתחילה ב-0 ורצה רק
 * כשהסקשן נכנס לתצוגה, ולכן ה-HTML האפוי — כלומר הציור הראשון, וגם מה שרואה
 * מי שה-JavaScript שלו חסום — אמר "0 זכויות, מענקים והטבות במאגר". השומר
 * ב-prerender-spa.mjs סירב לאפות בדיוק בגלל זה ("zero-counts: 3"), וזה היה
 * הדיווח הנכון: מספר שקרי לכמה שניות הוא עדיין מספר שקרי, ובאתר שכל הכלל שלו
 * הוא נתוני אמת — במיוחד.
 *
 * המספר מצויר עכשיו כפי שהוא. אפקט הספירה אינו שווה עמוד שפותח באפס.
 */
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
          {/* "נתונים אמיתיים מהשטח" הבטיח תוצאות בשטח והציג מספרים מומצאים.
              הכותרת אומרת עכשיו בדיוק מה שהמספרים שמתחתיה הם: ספירה של המאגר. */}
          מה יש במאגר, במספרים
        </motion.p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
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
                {stat.value}
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
