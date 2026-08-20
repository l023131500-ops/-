import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, MessageCircle, User, Briefcase, BookOpen, Sparkles, ArrowLeft, CheckCircle, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

type ContactStep = "intro" | "role" | "topic" | "details" | "done";

const roles = [
  { id: "teacher", label: "מגיד שיעור", icon: BookOpen, gradient: "bg-gradient-teal" },
  { id: "gabbai", label: "גבאי / מנהל בית כנסת", icon: Briefcase, gradient: "bg-gradient-gold" },
  { id: "seeker", label: "מחפש שיעור", icon: User, gradient: "bg-gradient-magenta" },
  { id: "other", label: "אחר", icon: MessageCircle, gradient: "bg-gradient-brand" },
];

const topics = [
  "שאלה על שיעור קיים",
  "עדכון פרטי שיעור",
  "הצעה לשיתוף פעולה",
  "משוב והמלצות",
  "בעיה טכנית",
  "אחר",
];

const ContactSection = () => {
  const { tenant } = useTenant();
  const [step, setStep] = useState<ContactStep>("intro");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) return;
    // contact_messages was dropped in the multi-tenant migration; inbound
    // contact goes to portal_messages, which is what the admin Messages screen
    // reads. Without a tenant there is nowhere to file the message.
    if (!tenant?.id) {
      toast.error("שגיאה בשליחה");
      return;
    }
    const { error } = await supabase.from("portal_messages").insert({
      tenant_id: tenant.id,
      from_name: name,
      from_phone: phone,
      from_email: email || null,
      subject: selectedTopic || "פנייה מהאתר",
      body: message,
      meta: { role: roles.find(r => r.id === selectedRole)?.label || "", topic: selectedTopic },
    });
    if (error) {
      toast.error("שגיאה בשליחה");
    } else {
      toast.success("ההודעה נשלחה! 🎉");
      setStep("done");
    }
  };

  const chatMessages: Record<ContactStep, string> = {
    intro: "שלום! 👋 רוצים ליצור איתנו קשר? בואו נתחיל...",
    role: "מעולה! קודם כל, מה התפקיד שלכם?",
    topic: `${selectedRole ? `אהלן ${roles.find(r => r.id === selectedRole)?.label}! ` : ""}מה הנושא?`,
    details: `מצוין! ${selectedTopic ? `בנוגע ל"${selectedTopic}" — ` : ""}ספרו לי קצת יותר 📨`,
    done: "תודה רבה! נחזור אליכם בהקדם. יום מבורך! ✨",
  };

  return (
    <section id="contact" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-magenta/5 rounded-full blur-[150px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gold/3 rounded-full blur-[180px]" />

      <div className="relative z-10 container mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <motion.div
            whileInView={{ scale: [0.9, 1] }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gold/15 border border-gold/30 text-gold text-sm font-body font-bold mb-6 shadow-sm"
          >
            <MessageCircle className="w-4 h-4" />
            יצירת קשר
          </motion.div>
          <h2 className="font-display text-4xl md:text-5xl font-black text-foreground mb-4">
            דברו <span className="text-gradient-brand">איתנו</span>
          </h2>
          <p className="font-body text-muted-foreground max-w-lg mx-auto mb-6">
            נשמח לעזור לכם בכל שאלה, הצעה או בקשה
          </p>
          <Link to="/install">
            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-teal text-primary-foreground font-body font-bold text-sm shadow-lg cursor-pointer"
            >
              <Download className="w-5 h-5" />
              התקנת האפליקציה
            </motion.div>
          </Link>
        </motion.div>

        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-brand rounded-3xl opacity-20 blur-md" />
            <div className="relative bg-card rounded-3xl border-2 border-border overflow-hidden shadow-elegant">
              {/* Header */}
              <div className="relative p-6 flex items-center gap-3">
                <div className="absolute inset-0 bg-gradient-to-l from-teal/15 via-gold/8 to-magenta/15" />
                <div className="absolute inset-0 bg-card/50 backdrop-blur-sm" />
                <div className="relative z-10 flex items-center gap-3 w-full">
                  <motion.div
                    animate={{ boxShadow: ["0 0 15px hsl(170,65%,35%,0.3)", "0 0 30px hsl(170,65%,35%,0.5)", "0 0 15px hsl(170,65%,35%,0.3)"] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-12 h-12 rounded-2xl bg-gradient-brand flex items-center justify-center"
                  >
                    <Sparkles className="w-6 h-6 text-primary-foreground" />
                  </motion.div>
                  <div>
                    <h3 className="font-display text-xl font-bold text-foreground">צוות איגוד השיעורים</h3>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-teal animate-pulse" />
                      <p className="font-body text-xs text-muted-foreground">אונליין • ממוצע תגובה: שעה</p>
                    </div>
                  </div>
                  {step !== "intro" && step !== "done" && (
                    <button
                      onClick={() => {
                        const steps: ContactStep[] = ["intro", "role", "topic", "details"];
                        const idx = steps.indexOf(step);
                        if (idx > 0) setStep(steps[idx - 1]);
                      }}
                      className="mr-auto text-muted-foreground hover:text-primary transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6 min-h-[350px] flex flex-col">
                <AnimatePresence mode="wait">
                  <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex gap-3 mb-8">
                    <div className="w-9 h-9 rounded-full bg-gradient-brand flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Sparkles className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div className="bg-gradient-to-br from-muted/80 to-muted/40 rounded-2xl rounded-tr-sm px-5 py-4 border border-border/50 max-w-[85%] shadow-sm">
                      <p className="font-body text-sm text-foreground leading-relaxed">{chatMessages[step]}</p>
                    </div>
                  </motion.div>
                </AnimatePresence>

                <div className="flex-1">
                  <AnimatePresence mode="wait">
                    {step === "intro" && (
                      <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center">
                        <motion.button
                          whileHover={{ scale: 1.08, y: -3 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setStep("role")}
                          animate={{ boxShadow: ["0 0 20px hsl(170,65%,35%,0.2)", "0 0 40px hsl(38,80%,50%,0.3)", "0 0 20px hsl(170,65%,35%,0.2)"] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="px-10 py-5 rounded-2xl bg-gradient-brand text-primary-foreground font-body font-black text-lg shadow-lg"
                        >
                          בואו נתחיל! 🚀
                        </motion.button>
                      </motion.div>
                    )}
                    {step === "role" && (
                      <motion.div key="role" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-2 gap-3">
                        {roles.map((r, i) => (
                          <motion.button key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                            whileHover={{ scale: 1.05, y: -3 }} onClick={() => { setSelectedRole(r.id); setStep("topic"); }}
                            className="p-5 rounded-2xl border-2 border-border hover:border-primary/40 bg-gradient-to-br from-muted/30 to-card text-center transition-all shadow-sm hover:shadow-lg group">
                            <div className={`w-12 h-12 rounded-xl ${r.gradient} flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform shadow-md`}>
                              <r.icon className="w-6 h-6 text-primary-foreground" />
                            </div>
                            <span className="font-body text-sm font-bold text-foreground">{r.label}</span>
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                    {step === "topic" && (
                      <motion.div key="topic" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-wrap gap-3">
                        {topics.map((t, i) => (
                          <motion.button key={t} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }}
                            whileHover={{ scale: 1.08, y: -2 }} onClick={() => { setSelectedTopic(t); setStep("details"); }}
                            className="px-5 py-3 rounded-xl border-2 border-border bg-gradient-to-br from-muted/30 to-card hover:border-gold/40 hover:shadow-md text-foreground font-body text-sm font-bold transition-all">
                            {t}
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                    {step === "details" && (
                      <motion.div key="details" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="השם שלכם *" aria-label="השם שלכם"
                            className="bg-muted/40 rounded-xl px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground border-2 border-border/50 focus:border-primary/40 outline-none transition-colors" />
                          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="טלפון *" aria-label="טלפון"
                            className="bg-muted/40 rounded-xl px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground border-2 border-border/50 focus:border-primary/40 outline-none transition-colors" />
                        </div>
                        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="מייל (אופציונלי)" aria-label="מייל"
                          className="w-full bg-muted/40 rounded-xl px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground border-2 border-border/50 focus:border-primary/40 outline-none transition-colors" />
                        <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="ספרו לנו..." aria-label="תוכן ההודעה"
                          rows={3} className="w-full bg-muted/40 rounded-xl px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground border-2 border-border/50 focus:border-primary/40 outline-none resize-none transition-colors" />
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSubmit}
                          disabled={!name.trim() || !phone.trim()}
                          className="px-8 py-3 rounded-xl bg-gradient-brand text-primary-foreground font-body font-bold hover:opacity-90 disabled:opacity-40 flex items-center gap-2 mr-auto shadow-lg">
                          <Send className="w-4 h-4" /> שליחה
                        </motion.button>
                      </motion.div>
                    )}
                    {step === "done" && (
                      <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="w-20 h-20 rounded-full bg-gradient-brand mx-auto mb-4 flex items-center justify-center shadow-lg"
                        >
                          <CheckCircle className="w-10 h-10 text-primary-foreground" />
                        </motion.div>
                        <p className="font-display text-2xl font-black text-foreground mb-2">תודה!</p>
                        <p className="font-body text-sm text-muted-foreground mb-4">נחזור אליכם בהקדם</p>
                        <button onClick={() => { setStep("intro"); setSelectedRole(""); setSelectedTopic(""); setName(""); setPhone(""); setEmail(""); setMessage(""); }}
                          className="mt-2 text-primary font-body text-sm font-bold hover:underline">שליחת הודעה נוספת</button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
