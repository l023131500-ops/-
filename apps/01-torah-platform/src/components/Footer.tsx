import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, Mail, MapPin, MessageCircle, Heart, Send, ExternalLink, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import BrandLogo from "@/components/BrandLogo";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

const Footer = () => {
  const { tenant } = useTenant();
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactMsg, setContactMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  const validate = () => {
    const e: { name?: string; phone?: string } = {};
    if (!contactName.trim()) e.name = "שם הוא שדה חובה";
    if (!contactPhone.trim()) e.phone = "טלפון הוא שדה חובה";
    else if (!/^[\d\-+() ]{7,15}$/.test(contactPhone.trim())) e.phone = "מספר טלפון לא תקין";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleQuickContact = async () => {
    if (!validate()) return;
    setSending(true);
    try {
      // contact_messages no longer exists — inbound contact lands in
      // portal_messages, where the admin Messages screen reads it.
      const { error } = await supabase.from("portal_messages").insert({
        tenant_id: tenant!.id,
        from_name: contactName.trim(),
        from_phone: contactPhone.trim(),
        body: contactMsg.trim(),
        subject: "פנייה מהירה מהפוטר",
      });
      if (error) throw error;
      setSent(true);
      toast.success("הפנייה נשלחה בהצלחה! ✨");
      setContactName("");
      setContactPhone("");
      setContactMsg("");
      setErrors({});
      setTimeout(() => setSent(false), 4000);
    } catch (e) {
      console.error("Quick contact error:", e);
      toast.error("שגיאה בשליחה, נסו שוב");
    } finally {
      setSending(false);
    }
  };

  return (
    <footer className="relative bg-navy text-primary-foreground py-16 overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-teal/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-magenta/5 rounded-full blur-[120px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gold/3 rounded-full blur-[200px]" />

      <div className="relative z-10 container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Col 1: About */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <BrandLogo size="sm" />
            </div>
            <p className="font-body text-sm text-primary-foreground/70 leading-relaxed mb-5">
              הארגון העולמי של שיעורי התורה — מחברים בין לומדים ומלמדים. מאגר שיעורים ארצי ועולמי, ללא עלות, לזיכוי הרבים.
            </p>
            <div className="space-y-3 font-body text-sm">
              <a href="tel:0231330600" className="flex items-center gap-2.5 text-primary-foreground/70 hover:text-gold transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-gold/15 flex items-center justify-center group-hover:bg-gold/25 transition-colors">
                  <Phone className="w-4 h-4 text-gold" />
                </div>
                <span dir="ltr">023-133-0600</span>
              </a>
              <a href="mailto:A023131600@GMAIL.COM" className="flex items-center gap-2.5 text-primary-foreground/70 hover:text-gold transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-gold/15 flex items-center justify-center group-hover:bg-gold/25 transition-colors">
                  <Mail className="w-4 h-4 text-gold" />
                </div>
                <span dir="ltr">A023131600@GMAIL.COM</span>
              </a>
              <span className="flex items-center gap-2.5 text-primary-foreground/70">
                <div className="w-8 h-8 rounded-lg bg-magenta/15 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-magenta-light" />
                </div>
                ירושלים, ישראל
              </span>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <h4 className="font-display font-bold text-primary-foreground mb-5 flex items-center gap-2">
              <div className="w-1.5 h-6 rounded-full bg-gradient-teal" />
              קישורים מהירים
            </h4>
            <ul className="space-y-3 font-body text-sm text-primary-foreground/70">
              {[
                { to: "/lessons", label: "מאגר השיעורים המלא" },
                { to: "/find-lesson", label: "חיפוש שיעור חכם" },
                { to: "/update-lesson", label: "עדכון שיעור למאגר" },
                { to: "/request-lesson", label: "הקמת שיעור בהתאמה" },
                { to: "/teachers", label: "הצטרפות כמגיד שיעור" },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="hover:text-gold transition-all hover:translate-x-[-4px] inline-flex items-center gap-1.5 group"
                  >
                    <span className="w-1 h-1 rounded-full bg-gold/0 group-hover:bg-gold transition-colors" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Quick Contact Form */}
          <div>
            <h4 className="font-display font-bold text-primary-foreground mb-5 flex items-center gap-2">
              <div className="w-1.5 h-6 rounded-full bg-gradient-gold" />
              פנייה מהירה
            </h4>
            <div className="space-y-2.5">
              <div>
                <input
                  value={contactName}
                  onChange={(e) => { setContactName(e.target.value); if (errors.name) setErrors(prev => ({ ...prev, name: undefined })); }}
                  placeholder="שם מלא *"
                  className={`w-full bg-navy/40 border rounded-xl px-4 py-2.5 font-body text-sm text-white placeholder:text-white/50 focus:border-gold/60 focus:ring-1 focus:ring-gold/30 outline-none transition-all ${errors.name ? 'border-red-400/60' : 'border-primary-foreground/20'}`}
                />
                {errors.name && <p className="text-red-400 text-[10px] mt-1 font-body">{errors.name}</p>}
              </div>
              <div>
                <input
                  value={contactPhone}
                  onChange={(e) => { setContactPhone(e.target.value); if (errors.phone) setErrors(prev => ({ ...prev, phone: undefined })); }}
                  placeholder="טלפון *"
                  type="tel"
                  dir="ltr"
                  className={`w-full bg-navy/40 border rounded-xl px-4 py-2.5 font-body text-sm text-white placeholder:text-white/50 focus:border-gold/60 focus:ring-1 focus:ring-gold/30 outline-none transition-all ${errors.phone ? 'border-red-400/60' : 'border-primary-foreground/20'}`}
                />
                {errors.phone && <p className="text-red-400 text-[10px] mt-1 font-body">{errors.phone}</p>}
              </div>
              <textarea
                value={contactMsg}
                onChange={(e) => setContactMsg(e.target.value)}
                placeholder="הודעה (אופציונלי)"
                rows={2}
                className="w-full bg-navy/40 border border-primary-foreground/20 rounded-xl px-4 py-2.5 font-body text-sm text-white placeholder:text-white/50 focus:border-gold/60 focus:ring-1 focus:ring-gold/30 outline-none transition-all resize-none"
              />
              <motion.button
                onClick={handleQuickContact}
                disabled={sending || sent}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full py-2.5 rounded-xl font-body text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  sent
                    ? "bg-teal text-primary-foreground"
                    : "bg-gradient-teal text-primary-foreground hover:opacity-90 disabled:opacity-40"
                }`}
              >
                {sent ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    נשלח בהצלחה!
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {sending ? "שולח..." : "שליחה"}
                  </>
                )}
              </motion.button>
            </div>
          </div>

          {/* Col 4: Social & Donations */}
          <div>
            <h4 className="font-display font-bold text-primary-foreground mb-5 flex items-center gap-2">
              <div className="w-1.5 h-6 rounded-full bg-gradient-magenta" />
              שותפות ותרומה
            </h4>

            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gold via-gold-light to-gold p-5 mb-4 shadow-xl border-2 border-gold-light/40">
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
              <div className="relative">
                <h5 className="font-display font-black text-lg text-navy mb-1 flex items-center gap-1.5">
                  <Heart className="w-4 h-4 fill-navy" />
                  יש לך ארגון?
                </h5>
                <p className="font-body text-xs text-navy/85 leading-relaxed mb-3">
                  פנה אלינו לקבל פורטל ניהול ופרסום שיעורי תורה אישי, מתויג ועם קבלת פניות
                </p>
                <div className="space-y-2">
                  <input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="שם מלא *"
                    className="w-full bg-white/95 border border-navy/20 rounded-lg px-3 py-2 font-body text-sm text-navy placeholder:text-navy/50 focus:border-navy/60 focus:ring-1 focus:ring-navy/30 outline-none"
                  />
                  <input
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="טלפון *"
                    type="tel"
                    dir="ltr"
                    className="w-full bg-white/95 border border-navy/20 rounded-lg px-3 py-2 font-body text-sm text-navy placeholder:text-navy/50 focus:border-navy/60 focus:ring-1 focus:ring-navy/30 outline-none"
                  />
                  <motion.button
                    onClick={async () => {
                      if (!contactName.trim() || !contactPhone.trim()) {
                        toast.error("מלא שם וטלפון");
                        return;
                      }
                      setSending(true);
                      try {
                        const { error } = await supabase.from("portal_messages").insert({
                          tenant_id: tenant!.id,
                          from_name: contactName.trim(),
                          from_phone: contactPhone.trim(),
                          body: "מעוניין בפורטל ניהול לארגון",
                          subject: "בקשת פורטל ארגון",
                        });
                        if (error) throw error;
                        toast.success("הבקשה נשלחה! נחזור אליך בהקדם");
                        setContactName("");
                        setContactPhone("");
                      } catch (e) {
                        toast.error("שגיאה, נסה שוב");
                      } finally {
                        setSending(false);
                      }
                    }}
                    disabled={sending}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-2 rounded-lg bg-navy text-white font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-navy-light transition-colors disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {sending ? "שולח..." : "פנה אלינו עכשיו"}
                  </motion.button>
                </div>
              </div>
            </div>

            <a
              href="https://wa.me/97223130600"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl bg-primary-foreground/5 border border-primary-foreground/10 hover:border-teal-light/30 hover:bg-primary-foreground/8 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-teal/15 flex items-center justify-center group-hover:bg-teal/25 transition-colors">
                <MessageCircle className="w-5 h-5 text-teal-light" />
              </div>
              <div>
                <p className="font-body text-sm font-bold text-primary-foreground">וואטסאפ</p>
                <p className="font-body text-xs text-primary-foreground/50" dir="ltr">023-133-0600</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-primary-foreground/30 mr-auto" />
            </a>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-primary-foreground/10 pt-8">
          <p className="font-body text-xs text-primary-foreground/30 leading-relaxed mb-6 text-center max-w-4xl mx-auto">
            הבהרה משפטית: אנו עושים מאמצים כבירים לוודא את זהות מגידי השיעורים ודיוק הפרטים. עם זאת, אין המערכת נושאת באחריות על תוכן השיעורים או על דיוק המידע שנמסר על ידי צדדים שלישיים.
          </p>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="font-body text-sm text-primary-foreground/50 flex items-center gap-1">
              © {new Date().getFullYear()} איגוד השיעורים — הארגון העולמי של שיעורי התורה
              <Heart className="w-3 h-3 text-magenta-light inline" />
            </p>
            <p className="font-body text-xs text-primary-foreground/30">
              כל הזכויות שמורות | 023-133-0600 | A023131600@GMAIL.COM
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
