import { motion } from "framer-motion";
import { Megaphone, Users, Calendar, Palette, Smartphone, Trophy, Globe, MessageSquare, ClipboardList, Building2, Image as ImageIcon, ShieldCheck } from "lucide-react";

const benefits = [
  { icon: Globe, title: "דף ציבורי אישי", description: "פורטל מעוצב לכל מגיד שיעור עם 24 רקעים, לוגו, גלריה ופרטי קשר – להפצה ושיתוף." },
  { icon: ClipboardList, title: "ניהול שיעורים מלא", description: "כל שיעור עם נושא, סגנון, קהל יעד, מיקום, זמנים ופרטי קשר במקום אחד." },
  { icon: Building2, title: "בתי כנסת וזמני תפילות", description: "ניהול מספר בתי כנסת עם זמני שחרית, מנחה, ערבית, מוסף, סליחות ועוד." },
  { icon: Calendar, title: "לוח הספק לימודי חכם", description: "חישוב אוטומטי של ההספק היומי, ימים מיוחדים, חגים וסיומי מסכת." },
  { icon: Users, title: "ניהול משתתפים ונוכחות", description: "רשימת משתתפים, סימון נוכחות, מעקב נעדרים ושליחת הודעות עידוד." },
  { icon: MessageSquare, title: "פורומים מקצועיים", description: "צ'אט בסגנון וואטסאפ עם מגידי שיעור מהארץ – לפי נושאי הלימוד שלך." },
  { icon: Palette, title: "חומרי עזר מעוצבים", description: "תבניות מקצועיות לפליירים, מודעות, הזמנות לסיום ועוד – מותאמים אישית." },
  { icon: Megaphone, title: "כלים לשיווק השיעור", description: "גיוס משתתפים חדשים בעזרת מודעות מעוצבות, דפי נחיתה ותוכן שיווקי." },
  { icon: ImageIcon, title: "מחלקת גרפיקה", description: "בקשת עיצובים מותאמים אישית עם הלוגו, פרטי השיעור והמיתוג שלך." },
  { icon: Smartphone, title: "חיבור לוואטסאפ ומייל", description: "שליחת הודעות אוטומטיות למשתתפים – תזכורות, עידוד נעדרים ועדכונים." },
  { icon: Trophy, title: "הדרכה מקצועית", description: "טיפים, מדריכים וסרטונים קצרים לשיפור מיומנויות ההוראה." },
  { icon: ShieldCheck, title: "מעטפת מלאה ומקצועית", description: "תמיכה אישית, פניות מטופלות, ועדכונים שוטפים מהצוות של איגוד השיעורים." },
];

const BenefitsSection = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
            למה להצטרף ל<span className="text-secondary">איגוד השיעורים</span>?
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">כל מה שמגיד שיעור צריך – במקום אחד, בחינם, עם תמיכה מלאה.</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((b, i) => (
            <motion.div key={b.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="bg-card rounded-2xl p-6 shadow-sm border border-border hover:shadow-md hover:border-secondary/30 transition-all duration-300 group">
              <div className="w-14 h-14 rounded-xl bg-secondary/10 flex items-center justify-center mb-4 group-hover:bg-secondary/20 transition-colors">
                <b.icon className="w-7 h-7 text-secondary" />
              </div>
              <h3 className="font-heading text-xl font-bold text-foreground mb-2">{b.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{b.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;