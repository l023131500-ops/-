import Layout from "@/components/Layout";
import { motion } from "framer-motion";
import { Target, Heart, Shield, Award, Users, Globe } from "lucide-react";

const values = [
  { icon: Target, title: "חזון", description: "להנגיש תורה איכותית לכל יהודי, בכל מקום." },
  { icon: Heart, title: "אכפתיות", description: "ליווי אישי ותמיכה לכל מגיד שיעור." },
  { icon: Shield, title: "מקצועיות", description: "כלים ברמה הגבוהה ביותר להפצת תורה." },
  { icon: Award, title: "איכות", description: "תוכן ערכי, מעוצב ומדויק." },
  { icon: Users, title: "קהילה", description: "רשת תומכת של מאות מגידי שיעור." },
  { icon: Globe, title: "נגישות", description: "פלטפורמה דיגיטלית חינמית לכולם." },
];

const About = () => (
  <Layout>
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-heading text-4xl md:text-5xl font-bold text-foreground mb-6">
            אודות <span className="text-secondary">איגוד השיעורים</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-muted-foreground text-lg max-w-3xl mx-auto leading-relaxed">
            איגוד השיעורים הוקם מתוך חזון להעצים כל מגיד שיעור עם הכלים, הידע והקהילה שהוא צריך כדי להפיץ תורה בצורה מקצועית ואפקטיבית.
          </motion.p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {values.map((v, i) => (
            <motion.div key={v.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="bg-card rounded-2xl p-6 border border-border text-center">
              <v.icon className="w-10 h-10 text-secondary mx-auto mb-3" />
              <h3 className="font-heading text-xl font-bold text-foreground mb-2">{v.title}</h3>
              <p className="text-muted-foreground text-sm">{v.description}</p>
            </motion.div>
          ))}
        </div>
        <div className="bg-gradient-navy rounded-3xl p-10 text-center max-w-2xl mx-auto shadow-elegant">
          <h2 className="font-heading text-3xl font-bold text-primary-foreground mb-6">רוצה לדעת עוד?</h2>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="tel:023131600" className="px-5 py-3 rounded-xl bg-gradient-gold text-primary font-semibold shadow-gold hover:scale-105 transition-smooth" dir="ltr">📞 02-3131600</a>
            <a href="https://wa.me/9722313160" target="_blank" rel="noopener" className="px-5 py-3 rounded-xl bg-card/10 border border-secondary/30 text-primary-foreground font-semibold hover:bg-card/20 transition-smooth" dir="ltr">💬 WhatsApp</a>
            <a href="mailto:a023131600@gmail.com" className="px-5 py-3 rounded-xl bg-card/10 border border-secondary/30 text-primary-foreground font-semibold hover:bg-card/20 transition-smooth" dir="ltr">✉️ Email</a>
          </div>
        </div>
      </div>
    </section>
  </Layout>
);

export default About;