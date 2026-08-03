import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, Send, X } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function BusinessGate() {
  const { profile } = useApp();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    setSending(true);
    try {
      await supabase.from("leads").insert({
        name: profile.name || user?.name || "",
        email: user?.email || "",
        phone: "",
        source: "business_request",
        message: message || `לקוח ${profile.name} מעוניין בשירות עסקי`,
      });
      toast.success("הבקשה נשלחה! נחזור אליך בהקדם.");
      setShowForm(false);
      setMessage("");
    } catch {
      toast.error("שגיאה בשליחה, נסה שוב");
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 md:p-12 max-w-2xl mx-auto"
    >
      <div className="bento-card text-center space-y-6 py-12">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-muted flex items-center justify-center">
          <Building2 className="w-10 h-10 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-foreground">אינך רשום לשירות העסקי</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            השירות העסקי מאפשר ניהול הוצאות עסקיות, חשבוניות, דוחות ועוד.
            <br />אם אתה מעוניין להירשם, שלח פנייה ונחזור אליך.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-clay-gold text-sm px-6 py-3 mx-auto flex items-center gap-2"
        >
          <Send className="w-4 h-4" /> שלח פנייה מקוונת
        </button>
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowForm(false)}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bento-card w-full max-w-md space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">🏢 בקשת שירות עסקי</h3>
              <button onClick={() => setShowForm(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">ספר לנו על העסק שלך</p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="שם העסק, סוג הפעילות, מה תרצה לנהל..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <button
              onClick={handleSubmit}
              disabled={sending}
              className="w-full py-3 rounded-xl gold-gradient text-primary-foreground font-semibold text-sm"
            >
              {sending ? "שולח..." : "שלח בקשה"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
