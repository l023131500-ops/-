import { useState } from "react";
import { motion } from "framer-motion";
import { Send, CheckCircle2, Mail, Phone, MapPin } from "lucide-react";

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export default function ContactSection() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || (!form.email.trim() && !form.phone.trim())) return;
    setSending(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/leads-api`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            message: form.message.trim(),
            source: "contact_form",
          }),
        }
      );
      if (!res.ok) console.error("Lead save error:", await res.text());
      setSent(true);
    } catch (err) {
      console.error("Lead save network error:", err);
      setSent(true);
    }
    setSending(false);
  }

  return (
    <section id="contact" className="py-28 px-8 md:px-20">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Info */}
        <motion.div variants={item} initial="hidden" whileInView="show" viewport={{ once: true }} className="space-y-8">
          <div>
            <p className="text-[10px] font-bold text-accent tracking-[0.3em] uppercase mb-3">צור קשר</p>
            <h2 className="text-2xl md:text-3xl font-black text-foreground">נשמח לשמוע ממך</h2>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              יש לכם שאלות? רוצים הדגמה אישית? השאירו פרטים ונחזור אליכם בהקדם.
            </p>
          </div>
          <div className="space-y-4">
            {[
              { icon: Mail, label: "info@luxmanage.com" },
              { icon: Phone, label: "072-XXX-XXXX" },
              { icon: MapPin, label: "ישראל" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-accent" />
                </div>
                <span className="text-sm text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Form */}
        <motion.div variants={item} initial="hidden" whileInView="show" viewport={{ once: true }}>
          {sent ? (
            <div className="bento-card p-10 text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <h3 className="text-xl font-bold text-foreground">הפנייה נשלחה בהצלחה!</h3>
              <p className="text-sm text-muted-foreground">ניצור קשר בהקדם האפשרי.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bento-card p-8 space-y-5">
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1.5 block">שם מלא *</label>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  placeholder="השם שלך"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1.5 block">אימייל</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                    placeholder="email@example.com"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1.5 block">טלפון</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                    placeholder="050-1234567"
                    dir="ltr"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1.5 block">הודעה</label>
                <textarea
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                  placeholder="ספרו לנו במה נוכל לעזור..."
                />
              </div>
              <button
                type="submit"
                disabled={sending}
                className="btn-clay-gold w-full text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {sending ? "שולח..." : "שלח פנייה"}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
}
