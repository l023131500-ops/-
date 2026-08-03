import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Footer from "@/components/Footer";
import { PUBLIC_SITE_URL } from "@/lib/site";

const Invite = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If user landed on a preview/internal host, redirect to canonical
    // egod.lovable.app so the activation flow never lives on a Lovable
    // marketing/preview domain.
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      const internal =
        host.includes("lovable.dev") ||
        host.endsWith(".lovableproject.com") ||
        host.startsWith("id-preview--") ||
        host.startsWith("preview--");
      if (internal) {
        const target = `${PUBLIC_SITE_URL}/invite${window.location.search}`;
        window.location.replace(target);
        return;
      }
    }
    const c = params.get("code");
    const e = params.get("email");
    if (c) setCode(c);
    if (e) setEmail(e);
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !code) { toast.error("נא למלא מייל וקוד הזמנה"); return; }
    setLoading(true);
    try {
      // Activate via secure backend (creates user, confirms email, upserts profile, marks used)
      const { data, error } = await supabase.functions.invoke("activate-invite", {
        body: { code: code.trim(), email: email.trim() },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const { email: e2, password } = data as { email: string; password: string };

      // Sign the user in immediately
      const { error: siErr } = await supabase.auth.signInWithPassword({ email: e2, password });
      if (siErr) throw siErr;

      toast.success("הפורטל שלך נפתח בהצלחה!");
      navigate("/portal");
    } catch (err: any) {
      toast.error(err?.message || "שגיאה בהפעלת הפורטל");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background" dir="rtl">
      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-card rounded-2xl border border-border shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
              <KeyRound className="w-6 h-6 text-secondary-foreground" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold">הפעלת פורטל חדש</h1>
              <p className="text-sm text-muted-foreground">הזן את פרטי ההזמנה שקיבלת מהניהול</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">כתובת מייל</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" dir="ltr" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">קוד הזמנה</label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="קוד שקיבלת מהניהול" dir="ltr" />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-secondary text-secondary-foreground hover:bg-gold-dark">
              {loading ? "מפעיל..." : "הפעל פורטל"}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-6">
            הסיסמה הראשונית הוגדרה לך על ידי הניהול. תוכל לשנות אותה אחרי הכניסה.
          </p>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default Invite;