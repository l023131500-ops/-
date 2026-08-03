import { Phone, Mail, Heart, PhoneCall, Sparkles, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import plantMoney from "@/assets/plant-money.png";
import UnifiedLeadForm from "@/components/UnifiedLeadForm";

const Footer = () => {

  return (
    <footer className="relative">
      {/* Voice system CTA */}
      <section className="bg-gradient-to-br from-primary/10 to-secondary/10 py-16 border-t border-border">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            {/* Voice system info */}
            <div className="text-center md:text-right">
              <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-1.5 mb-4">
                <PhoneCall className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-primary">מערכת קולית אוטומטית</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-extrabold text-foreground mb-3">
                קבלו מידע מיידי בטלפון
              </h3>
              <p className="text-muted-foreground mb-5 leading-relaxed">
                המערכת הקולית שלנו זמינה 24/6 ומעניקה מידע מלא על כל הזכויות שמגיעות לכם - ללא המתנה, ללא תור.
              </p>
              <a
                href="tel:023131500"
                className="inline-flex items-center gap-3 bg-primary text-primary-foreground rounded-xl px-6 py-3.5 font-bold text-lg hover:bg-primary/90 transition-colors shadow-lg"
              >
                <Phone className="w-5 h-5" />
                <span dir="ltr">02-3131500</span>
              </a>
            </div>

            {/* Subscribe form */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-lg">
              <h4 className="font-bold text-lg text-foreground mb-1">🔔 הצטרפו וקבלו עדכונים</h4>
              <p className="text-sm text-muted-foreground mb-4">השאירו פרטים ונשלח לכם מידע על זכויות חדשות</p>
              <UnifiedLeadForm
                source="footer-subscribe"
                defaultRequestType="info_reminders"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Bottom footer - redesigned */}
      <div className="bg-foreground text-background py-12 relative overflow-hidden">
        {/* Subtle floating dots in footer */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-secondary/10"
            style={{ width: 6 + i * 3, height: 6 + i * 3, left: `${10 + i * 20}%`, top: `${20 + (i % 3) * 25}%` }}
            animate={{ y: [0, -15, 0], opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}

        <div className="container mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            {/* Brand + plant image */}
            <div className="flex flex-col items-center md:items-start">
              <span className="text-3xl font-black block mb-3">בקלות ✓</span>
              <p className="text-background/60 text-sm leading-relaxed mb-4 text-center md:text-right">
                הזכות שלך, האחריות שלנו. מיצוי זכויות מקיף - כי לכל אחד מגיע לדעת מה מגיע לו.
              </p>
              <motion.img
                src={plantMoney}
                alt="כסף צומח - מיצוי זכויות"
                className="w-32 h-32 object-contain rounded-xl"
                whileHover={{ scale: 1.08, rotate: 2 }}
                transition={{ type: "spring", stiffness: 300 }}
              />
            </div>

            {/* Quick actions - upgraded */}
            <div>
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-secondary" />
                מה אפשר לעשות עכשיו?
              </h3>
              <div className="space-y-3">
                <motion.a
                  href="https://nedar.im/F3873"
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ x: -6 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-background/5 hover:bg-background/10 border border-background/10 transition-all group"
                >
                  <div className="w-9 h-9 rounded-lg bg-secondary/20 flex items-center justify-center shrink-0">
                    <span className="text-lg">🔍</span>
                  </div>
                  <div>
                    <p className="text-background font-bold text-sm">בדיקת זכויות מקיפה</p>
                    <p className="text-background/40 text-xs">גלו כמה כסף מחכה לכם</p>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-secondary mr-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.a>
                <motion.a
                  href="https://nedar.im/F3875"
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ x: -6 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-background/5 hover:bg-background/10 border border-background/10 transition-all group"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-lg">📋</span>
                  </div>
                  <div>
                    <p className="text-background font-bold text-sm">בחירת נושא מרשימה</p>
                    <p className="text-background/40 text-xs">בחרו קטגוריה וקבלו פירוט</p>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-secondary mr-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.a>
                <motion.a
                  href="https://nedar.im/F3874"
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ x: -6 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-background/5 hover:bg-background/10 border border-background/10 transition-all group"
                >
                  <div className="w-9 h-9 rounded-lg bg-secondary/20 flex items-center justify-center shrink-0">
                    <span className="text-lg">🤝</span>
                  </div>
                  <div>
                    <p className="text-background font-bold text-sm">הצטרפו לקהילה</p>
                    <p className="text-background/40 text-xs">הטבות, מכירות וליווי - ללא עלות</p>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-secondary mr-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.a>
              </div>
            </div>

            {/* Contact - upgraded */}
            <div>
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Phone className="w-5 h-5 text-secondary" />
                דברו איתנו
              </h3>
              <div className="space-y-3">
                <motion.a
                  href="tel:023131500"
                  whileHover={{ scale: 1.03 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-secondary/10 border border-secondary/20 hover:bg-secondary/20 transition-all"
                >
                  <PhoneCall className="w-5 h-5 text-secondary" />
                  <div>
                    <p className="text-background font-bold" dir="ltr">02-3131500</p>
                    <p className="text-background/40 text-xs">מערכת קולית 24/6</p>
                  </div>
                </motion.a>
                <motion.a
                  href="mailto:L023131500@gmail.com"
                  whileHover={{ scale: 1.03 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all"
                >
                  <Mail className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-background font-bold text-sm">L023131500@gmail.com</p>
                    <p className="text-background/40 text-xs">שלחו מייל ונחזור אליכם</p>
                  </div>
                </motion.a>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-background/5 border border-background/10">
                  <Sparkles className="w-5 h-5 text-secondary" />
                  <div>
                    <p className="text-background font-bold text-sm">עמדות נדרים פלוס</p>
                    <p className="text-background/40 text-xs">בכל הארץ - הצטרפו במקום</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-background/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-background/40 text-xs">
            <span>© {new Date().getFullYear()} בקלות - כל הזכויות שמורות</span>
            <span className="flex items-center gap-1">נבנה עם <Heart className="w-3 h-3 text-destructive" /> למען הקהילה</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
