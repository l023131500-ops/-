import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, BookOpen, Users, Heart, ScrollText, ShieldCheck, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const INQUIRY_CATEGORIES = [
  { id: "שיעור_חדש", label: "מעוניינים בשיעור חדש", icon: BookOpen },
  { id: "למסור_שיעור", label: "מעוניין למסור שיעור", icon: PenTool },
  { id: "רב_לבית_כנסת", label: "מעוניינים ברב לבית הכנסת", icon: Users },
  { id: "חברותא", label: "חברותא", icon: BookOpen },
  { id: "בר_מצוה", label: "לימוד לבר מצוה", icon: ScrollText },
  { id: "אזכרה", label: "אזכרה", icon: Heart },
  { id: "בדיקת_מזוזות", label: "בדיקת מזוזות", icon: ShieldCheck },
  { id: "סתם", label: "רכישת סת\"מ", icon: PenTool },
  { id: "אחר", label: "פנייה כללית", icon: Send },
];

interface Props {
  portalId: string;
  portalType: "org" | "rabbi" | "shul";
  portalName: string;
}

const PublicContactForm = ({ portalId, portalType, portalName }: Props) => {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!name.trim() || !phone.trim()) { toast.error("שם וטלפון הם שדות חובה"); return; }
    setSending(true);
    const categoryLabel = INQUIRY_CATEGORIES.find(c => c.id === selectedCategory)?.label || "פנייה כללית";
    const fullMessage = `[${categoryLabel}] ${message}`.trim();
    const { error } = await supabase.from("portal_messages").insert({
      portal_type: portalType,
      portal_id: portalId,
      sender_name: name.trim(),
      sender_phone: phone.trim(),
      sender_email: email.trim(),
      message: fullMessage,
    });
    setSending(false);
    if (!error) {
      toast.success("הפנייה נשלחה בהצלחה!");
      setSent(true);
    } else toast.error("שגיאה בשליחה");
  };

  if (sent) {
    return (
      <div className="bg-background/90 backdrop-blur-sm py-12 px-6">
        <div className="container mx-auto max-w-lg text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="w-16 h-16 rounded-full bg-green-500/20 mx-auto mb-4 flex items-center justify-center">
              <Send className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="font-display text-xl font-bold text-card-foreground mb-2">הפנייה נשלחה בהצלחה!</h3>
            <p className="font-body text-sm text-muted-foreground mb-4">ניצור אתכם קשר בהקדם</p>
            <Button variant="outline" size="sm" onClick={() => { setSent(false); setSelectedCategory(""); setName(""); setPhone(""); setEmail(""); setMessage(""); }}>
              שלח פנייה נוספת
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background/90 backdrop-blur-sm py-12 px-6">
      <div className="container mx-auto max-w-2xl">
        <h2 className="font-display text-2xl font-black text-card-foreground mb-2 text-center">יצירת קשר ופניות</h2>
        <p className="font-body text-sm text-muted-foreground text-center mb-6">מה תרצו? בחרו קטגוריה ומלאו את הפרטים</p>

        {/* Category Buttons */}
        <div className="flex flex-wrap gap-2 justify-center mb-6">
          {INQUIRY_CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <motion.button
                key={cat.id}
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2.5 rounded-xl font-body text-sm border-2 transition-all flex items-center gap-2 ${
                  isSelected
                    ? "bg-gold/20 border-gold/50 text-secondary font-bold shadow-md"
                    : "bg-card border-gold/15 text-muted-foreground hover:border-gold/30 hover:bg-card/80"
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat.label}
              </motion.button>
            );
          })}
        </div>

        {/* Form */}
        <AnimatePresence mode="wait">
          {selectedCategory && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-card rounded-2xl border border-border p-6 space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-body text-xs font-medium text-muted-foreground mb-1 block">שם *</label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="השם שלך" className="border-gold/20 focus:border-gold/50 bg-background text-foreground" />
                </div>
                <div>
                  <label className="font-body text-xs font-medium text-muted-foreground mb-1 block">טלפון *</label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="050-..." className="border-gold/20 focus:border-gold/50 bg-background text-foreground" />
                </div>
              </div>
              <div>
                <label className="font-body text-xs font-medium text-muted-foreground mb-1 block">מייל</label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" className="border-gold/20 focus:border-gold/50 bg-background text-foreground" />
              </div>
              <div>
                <label className="font-body text-xs font-medium text-muted-foreground mb-1 block">פרטים נוספים</label>
                <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="ספרו לנו עוד..." rows={3} className="border-gold/20 focus:border-gold/50 bg-background text-foreground" />
              </div>
              <Button onClick={handleSend} disabled={sending} className="w-full bg-gradient-brand text-primary-foreground font-body font-bold py-5 gap-2">
                <Send className="w-4 h-4" /> {sending ? "שולח..." : "שלח פנייה"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PublicContactForm;
