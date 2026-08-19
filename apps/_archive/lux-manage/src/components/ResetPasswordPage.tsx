import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Lock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const type = hashParams.get("type");

    if (type === "recovery") {
      setReady(true);
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setReady(true);
      } else {
        setError("קישור האיפוס אינו תקין או שפג תוקפו.");
      }
    });
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!password || !confirmPassword) {
      setError("נא למלא את שני השדות");
      return;
    }

    if (password.length < 6) {
      setError("הסיסמה חייבת להכיל לפחות 6 תווים");
      return;
    }

    if (password !== confirmPassword) {
      setError("הסיסמאות אינן תואמות");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccessMessage("הסיסמה עודכנה בהצלחה. אפשר להתחבר עכשיו.");
      setPassword("");
      setConfirmPassword("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center p-4 bg-background relative">
      <div className="ambient-gold w-[600px] h-[600px] top-1/3 start-1/4" />
      <div className="ambient-indigo w-[400px] h-[400px] bottom-1/4 end-1/3" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bento-card p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl gold-gradient mx-auto flex items-center justify-center shadow-lg">
              <Sparkles className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-black text-foreground">איפוס סיסמה</h1>
            <p className="text-sm text-muted-foreground">הגדר סיסמה חדשה לחשבון שלך.</p>
          </div>

          {!ready && !error ? (
            <p className="text-sm text-muted-foreground text-center">טוען קישור איפוס...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="סיסמה חדשה"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-accent rounded-2xl"
                />
              </div>

              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="אישור סיסמה חדשה"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-accent rounded-2xl"
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
              {successMessage && <p className="text-sm text-primary">{successMessage}</p>}

              <button type="submit" disabled={!ready || loading} className="btn-clay-gold w-full text-sm py-3.5 rounded-2xl disabled:opacity-50">
                {loading ? "מעדכן..." : "שמור סיסמה חדשה"}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}