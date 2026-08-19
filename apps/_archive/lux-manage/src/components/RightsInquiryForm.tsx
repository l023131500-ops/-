import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Send, CheckCircle2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const RIGHT_TYPES = [
  "הנחת ארנונה",
  "סיוע בשכר דירה",
  "מענק עבודה (מס הכנסה שלילי)",
  "קצבת ילדים",
  "סבסוד צהרון/מעון",
  "טיפולי שיניים מסובסדים",
  "זכויות הורה יחיד",
  "מענק בר/בת מצווה",
  "סיוע בחשמל",
  "הנחה במים",
  "ביטוח לאומי — נכות",
  "קצבת זקנה",
  "אחר",
];

const SERVICE_OPTIONS = [
  { value: "full_service", label: "שירות מלא — תטפלו בזה בשבילי", icon: "🤝" },
  { value: "diy", label: "עשה זאת בעצמך — רק תנחו אותי", icon: "📝" },
  { value: "consultation", label: "ייעוץ בלבד — רק שיחה", icon: "💬" },
];

export default function RightsInquiryForm() {
  const { user } = useAuth();
  const [rightType, setRightType] = useState("");
  const [customRight, setCustomRight] = useState("");
  const [description, setDescription] = useState("");
  const [servicePreference, setServicePreference] = useState("diy");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) { toast.error("יש להתחבר תחילה"); return; }
    const type = rightType === "אחר" ? customRight : rightType;
    if (!type.trim()) { toast.error("יש לבחור סוג זכות"); return; }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("rights_inquiries").insert({
        client_id: user.id,
        right_type: type,
        description: description.trim(),
        service_preference: servicePreference,
        status: "new",
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success("הפנייה נשלחה בהצלחה! נחזור אליך בהקדם.");
    } catch (err: any) {
      toast.error(err.message || "שגיאה בשליחת הפנייה");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bento-card text-center py-12 space-y-4">
        <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-400" />
        <h3 className="text-xl font-bold text-foreground">הפנייה נשלחה בהצלחה!</h3>
        <p className="text-sm text-muted-foreground">צוות היועצים שלנו יבדוק את הזכאות שלך ויחזור אליך בהקדם.</p>
        <button onClick={() => { setSubmitted(false); setRightType(""); setDescription(""); }}
          className="btn-clay-gold text-xs">שלח פנייה נוספת</button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="bento-card space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-accent/10">
            <Shield className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">בדיקת זכאות לזכות/הטבה</h3>
            <p className="text-sm text-muted-foreground">מלא את הפרטים ונבדוק עבורך</p>
          </div>
        </div>

        {/* Right type */}
        <div>
          <label className="text-xs font-bold text-muted-foreground mb-2 block">סוג הזכות/ההטבה</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {RIGHT_TYPES.map(r => (
              <button key={r} onClick={() => setRightType(r)}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all text-start ${
                  rightType === r ? "gold-gradient text-primary-foreground shadow-md" : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}>
                {r}
              </button>
            ))}
          </div>
          {rightType === "אחר" && (
            <Input value={customRight} onChange={e => setCustomRight(e.target.value)}
              placeholder="פרט את סוג הזכות..." className="mt-2" />
          )}
        </div>

        {/* Service preference */}
        <div>
          <label className="text-xs font-bold text-muted-foreground mb-2 block">איך תרצה שנטפל?</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {SERVICE_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setServicePreference(opt.value)}
                className={`p-3 rounded-xl text-start transition-all border-2 ${
                  servicePreference === opt.value ? "border-accent bg-accent/5" : "border-transparent bg-secondary hover:border-border"
                }`}>
                <span className="text-lg">{opt.icon}</span>
                <p className="text-xs font-bold text-foreground mt-1">{opt.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-bold text-muted-foreground mb-1 block">פרטים נוספים (אופציונלי)</label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder="ספר לנו עוד על המצב שלך..." rows={3} />
        </div>

        <button onClick={handleSubmit} disabled={submitting || !rightType}
          className="w-full py-3 rounded-xl gold-gradient text-primary-foreground font-semibold text-sm disabled:opacity-40">
          <Send className="w-4 h-4 inline me-2" />
          {submitting ? "שולח..." : "שלח פנייה לבדיקת זכאות"}
        </button>
      </div>
    </motion.div>
  );
}
