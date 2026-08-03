import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles } from "lucide-react";

const CTASection = () => (
  <section className="py-20 bg-background">
    <div className="container mx-auto px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="max-w-3xl mx-auto text-center bg-primary rounded-3xl p-10 md:p-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-transparent" />
        <div className="relative z-10">
          <Sparkles className="w-12 h-12 text-secondary mx-auto mb-6" />
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-primary-foreground mb-4">מוכן להפיץ תורה בצורה מקצועית?</h2>
          <p className="text-primary-foreground/70 text-lg mb-8 max-w-xl mx-auto">הצטרף עכשיו לאיגוד השיעורים וקבל גישה לכל הכלים, התמיכה והקהילה שאתה צריך.</p>
          <Button size="lg" asChild className="bg-secondary text-secondary-foreground hover:bg-gold-dark text-lg px-10 py-6 rounded-xl">
            <Link to="/join" className="flex items-center gap-2">
              הצטרף עכשיו
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  </section>
);

export default CTASection;