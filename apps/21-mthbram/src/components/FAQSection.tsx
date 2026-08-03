import { motion } from "framer-motion";
import { HelpCircle, ChevronDown, ShieldCheck, BookOpen, RefreshCw, Heart } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ_ITEMS = [
  {
    q: "איך אתם מוודאים את דיוק פרטי השיעורים?",
    a: "אנו מאמתים את הפרטים מול מגיד השיעור באופן אישי. כל שיעור עובר תהליך אישור לפני שהוא מוצג במאגר, ואנו מתעדכנים מעת לעת מול המגידים לוודא שהפרטים עדכניים.",
    icon: ShieldCheck,
    color: "text-teal",
  },
  {
    q: "האם ניתן לבקש שיעור בנושא שאינו במאגר?",
    a: "בהחלט! ניתן למלא את טופס 'הקמת שיעור בהתאמה אישית' ולפרט את הנושא המבוקש. נעשה מאמץ לאתר מגיד שיעור מתאים ולהקים שיעור חדש בדיוק לפי הצרכים שלכם.",
    icon: BookOpen,
    color: "text-gold",
  },
  {
    q: "איך רב יכול לעדכן את פרטיו באופן עצמאי?",
    a: "כל מגיד שיעור רשום מקבל קישור ייחודי ומאובטח דרכו ניתן לעדכן את פרטי השיעור, הזמנים והמיקום. ניתן גם לפנות אלינו ישירות ונעדכן עבורכם.",
    icon: RefreshCw,
    color: "text-magenta",
  },
  {
    q: "האם השירות כרוך בתשלום?",
    a: "לא! השירות ניתן ללא עלות כלל. המטרה שלנו היא זיכוי הרבים והפצת התורה — חיבור בין לומדים ומלמדים ללא שום תמורה כספית.",
    icon: Heart,
    color: "text-primary",
  },
];

const FAQSection = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-background to-accent/20 relative overflow-hidden">
      <div className="absolute top-0 left-1/3 w-[400px] h-[400px] bg-teal/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-gold/5 rounded-full blur-[120px]" />

      <div className="relative z-10 container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-body mb-6">
            <HelpCircle className="w-4 h-4" />
            שאלות נפוצות
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-black text-foreground mb-3">
            שאלות <span className="text-gradient-brand">ותשובות</span>
          </h2>
          <p className="font-body text-muted-foreground max-w-lg mx-auto">
            כל מה שרציתם לדעת על איגוד השיעורים
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <AccordionItem
                  value={`faq-${i}`}
                  className="bg-card rounded-2xl border border-border hover:border-primary/20 transition-all shadow-sm hover:shadow-md overflow-hidden"
                >
                  <AccordionTrigger className="px-6 py-5 hover:no-underline [&[data-state=open]]:bg-accent/30 transition-colors">
                    <span className="flex items-center gap-3 text-right font-display text-base font-bold text-foreground">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center flex-shrink-0`}>
                        <item.icon className={`w-5 h-5 ${item.color}`} />
                      </div>
                      {item.q}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-5">
                    <p className="font-body text-sm text-muted-foreground leading-relaxed pr-13">
                      {item.a}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
