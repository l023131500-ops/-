import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const testimonials = [
  { name: "הרב ישראל כהן", location: "ירושלים", text: "מאז שהצטרפתי לאיגוד, השיעור שלי גדל פי שלושה. הכלים המקצועיים עושים את ההבדל." },
  { name: "הרב משה לוי", location: "בני ברק", text: "לוח ההספק הלימודי חסך לי שעות עבודה כל שבוע. ממליץ לכל מגיד שיעור." },
  { name: "הרב דוד פרידמן", location: "חיפה", text: "הקהילה של מגידי השיעורים נותנת השראה ותמיכה. אני לא לבד בדרך." },
];

const TestimonialsSection = () => (
  <section className="py-20 bg-muted">
    <div className="container mx-auto px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
          מה אומרים <span className="text-secondary">מגידי השיעורים</span>
        </h2>
      </motion.div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {testimonials.map((t, i) => (
          <motion.div key={t.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
            className="bg-card rounded-2xl p-6 shadow-sm border border-border relative">
            <Quote className="w-8 h-8 text-secondary/30 absolute top-4 left-4" />
            <p className="text-foreground mb-6 leading-relaxed pt-4">"{t.text}"</p>
            <div className="border-t border-border pt-4">
              <p className="font-heading font-bold text-foreground">{t.name}</p>
              <p className="text-muted-foreground text-sm">{t.location}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default TestimonialsSection;