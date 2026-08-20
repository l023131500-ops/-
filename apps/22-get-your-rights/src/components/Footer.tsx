import { useState } from "react";
// שלושת האמוג'ים ששימשו כאייקונים (🔍 📋 🤝) הוחלפו באייקוני lucide —
// DESIGN_STANDARD §2. אמוג'י מרונדר בגופן המערכת ונראה אחרת בכל מכשיר.
import { Phone, Mail, Heart, Send, PhoneCall, Printer, MessageCircle, CheckCircle, ArrowLeft, MapPin, Search, ClipboardList, HeartHandshake } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import plantMoney from "@/assets/plant-money.jpg";

const contactMethods = [
  { id: "voice", label: "מערכת קולית", icon: PhoneCall },
  { id: "whatsapp", label: "וואטסאפ", icon: MessageCircle },
  { id: "email", label: "מייל", icon: Mail },
  { id: "fax", label: "פקס", icon: Printer },
];

const Footer = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({ name: "", phone: "", idNumber: "", email: "" });
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleMethod = (id: string) => {
    setSelectedMethods((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast({ title: "שגיאה", description: "נא למלא שם וטלפון", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const { error } = await supabase.from("leads").insert({
      source: "footer-subscribe",
      name: formData.name,
      phone: formData.phone,
      details: `ת.ז: ${formData.idNumber || "לא צוין"}\nמייל: ${formData.email || "לא צוין"}\nערוצי קבלת מידע: ${selectedMethods.length > 0 ? selectedMethods.join(", ") : "לא נבחרו"}`,
    } as any);
    setIsSubmitting(false);
    if (error) {
      toast({ title: "שגיאה", description: "לא הצלחנו לשמור. נסו שוב.", variant: "destructive" });
      return;
    }
    setSubmitted(true);
  };

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
              {!submitted ? (
                <>
                  <h4 className="font-bold text-lg text-foreground mb-1">הצטרפו וקבלו עדכונים</h4>
                  <p className="text-sm text-muted-foreground mb-4">השאירו פרטים ונשלח לכם מידע על זכויות חדשות</p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      {/* A placeholder is not a label: a screen reader announces these as
                          an unnamed edit field, and the text disappears the moment anyone
                          starts typing. aria-label gives each one a name that stays. */}
                      <Input
                        placeholder="שם מלא *"
                        aria-label="שם מלא (חובה)"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="text-sm"
                        autoComplete="name"
                      />
                      <Input
                        placeholder="טלפון *"
                        aria-label="טלפון (חובה)"
                        required
                        type="tel"
                        inputMode="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="text-sm"
                        autoComplete="tel"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="תעודת זהות"
                        aria-label="תעודת זהות"
                        inputMode="numeric"
                        value={formData.idNumber}
                        onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                        className="text-sm"
                      />
                      <Input
                        placeholder="מייל"
                        aria-label="כתובת מייל"
                        type="email"
                        inputMode="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="text-sm"
                        autoComplete="email"
                      />
                    </div>
                    {/* Contact method selection */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">איך תרצו לקבל מידע?</p>
                      <div className="grid grid-cols-2 gap-2">
                        {contactMethods.map((method) => (
                          <button
                            key={method.id}
                            onClick={() => toggleMethod(method.id)}
                            className={`flex items-center gap-2 p-2 rounded-lg border text-sm transition-all ${
                              selectedMethods.includes(method.id)
                                ? "border-primary bg-primary/10 text-primary font-medium"
                                : "border-border text-muted-foreground hover:border-primary/30"
                            }`}
                          >
                            <method.icon className="w-4 h-4 shrink-0" />
                            <span>{method.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full gap-2">
                      <Send className="w-4 h-4" />
                      {isSubmitting ? "שולח..." : "הצטרפו עכשיו"}
                    </Button>
                  </div>
                </>
              ) : (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6" role="status" aria-live="polite">
                  <CheckCircle className="w-12 h-12 text-primary mx-auto mb-3" />
                  <h4 className="text-lg font-bold text-foreground mb-1">נרשמתם בהצלחה</h4>
                  <p className="text-sm text-muted-foreground">נשלח לכם עדכונים על זכויות חדשות בהקדם.</p>
                </motion.div>
              )}
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
              {/* אייקון על כותרת אינו מוסיף מידע — הכותרת כבר אומרת את מה שהוא
                  אמור לרמוז, וכשזה ניצוץ הוא לא רומז אפילו על זה. הוסר כאן
                  ובכותרת "דברו איתנו" למטה. שלוש השורות שמתחת שומרות את
                  האייקונים שלהן, כי שם הם מבדילים בין שלוש פעולות שונות. */}
              <h3 className="font-bold text-lg mb-4">
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
                    <Search className="w-5 h-5 text-secondary" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-background font-bold text-sm">בדיקת זכויות מקיפה</p>
                    <p className="text-background/70 text-xs">גלו כמה כסף מחכה לכם</p>
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
                    <ClipboardList className="w-5 h-5 text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-background font-bold text-sm">בחירת נושא מרשימה</p>
                    <p className="text-background/70 text-xs">בחרו קטגוריה וקבלו פירוט</p>
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
                    <HeartHandshake className="w-5 h-5 text-secondary" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-background font-bold text-sm">הצטרפו לקהילה</p>
                    <p className="text-background/70 text-xs">הטבות, מכירות וליווי - ללא עלות</p>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-secondary mr-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.a>
              </div>
            </div>

            {/* Contact - upgraded */}
            <div>
              <h3 className="font-bold text-lg mb-4">
                דברו איתנו
              </h3>
              <div className="space-y-3">
                <motion.a
                  href="tel:023131500"
                  whileHover={{ scale: 1.03 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-secondary/10 border border-secondary/20 hover:bg-secondary/20 transition-all"
                >
                  {/* אותו מספר מופיע פעמיים בפוטר — כאן וב-CTA של המערכת
                      הקולית — ונשא שני גליפים שונים. ‎Phone‎ הוא המספר,
                      ‎PhoneCall‎ נשאר לצ׳יפ שמדבר על המערכת עצמה. */}
                  <Phone className="w-5 h-5 text-secondary" />
                  <div>
                    <p className="text-background font-bold" dir="ltr">02-3131500</p>
                    <p className="text-background/70 text-xs">מערכת קולית 24/6</p>
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
                    <p className="text-background/70 text-xs">שלחו מייל ונחזור אליכם</p>
                  </div>
                </motion.a>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-background/5 border border-background/10">
                  {/* אותה החלפה כמו בגיבור: עמדות הן מקום פיזי, ולכן סיכה על
                      מפה — ולא ניצוץ שנבחר כי היה צריך שם משהו. */}
                  <MapPin className="w-5 h-5 text-secondary" />
                  <div>
                    <p className="text-background font-bold text-sm">עמדות נדרים פלוס</p>
                    <p className="text-background/70 text-xs">בכל הארץ - הצטרפו במקום</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-background/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-background/70 text-xs">
            <span>© {new Date().getFullYear()} בקלות - כל הזכויות שמורות</span>
            <span className="flex items-center gap-1">נבנה עם <Heart className="w-3 h-3 text-destructive" /> למען הקהילה</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
