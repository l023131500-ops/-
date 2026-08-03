import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const ADMIN_EMAIL_DOMAIN = "@bklot.local";

const AdminLogin = () => {
  const [identifier, setIdentifier] = useState(""); // email OR phone-as-username (e.g. 023131500)
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Convert "023131500" → "023131500@bklot.local". Pass real emails through.
  const resolveEmail = (input: string) => {
    const trimmed = input.trim();
    if (trimmed.includes("@")) return trimmed;
    const digits = trimmed.replace(/\D/g, "");
    return `${digits}${ADMIN_EMAIL_DOMAIN}`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const email = resolveEmail(identifier);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      toast({
        title: "שגיאה בהתחברות",
        description: "שם משתמש או סיסמה שגויים",
        variant: "destructive",
      });
      return;
    }

    navigate("/admin/leads");
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/admin/leads`,
    });

    if (result.error) {
      setGoogleLoading(false);
      toast({
        title: "שגיאה בהתחברות עם גוגל",
        description: "לא הצלחנו להתחבר. נסו שוב.",
        variant: "destructive",
      });
      return;
    }

    if (result.redirected) {
      // Browser will redirect to Google
      return;
    }

    // Tokens received in-place (no redirect)
    setGoogleLoading(false);
    navigate("/admin/leads");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4" dir="rtl">
      <div className="w-full max-w-sm">
        <div className="bg-card rounded-2xl border border-border shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">כניסת מנהל</h1>
            <p className="text-sm text-muted-foreground mt-1">
              הזינו טלפון/אימייל וסיסמה, או היכנסו עם גוגל
            </p>
          </div>

          {/* Google sign-in */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full gap-2 mb-4"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M12 11v3.2h4.5c-.2 1.2-1.5 3.6-4.5 3.6-2.7 0-4.9-2.2-4.9-5s2.2-5 4.9-5c1.6 0 2.6.7 3.2 1.2l2.2-2.1C15.9 5.5 14.1 4.7 12 4.7 7.9 4.7 4.6 8 4.6 12s3.3 7.3 7.4 7.3c4.3 0 7.1-3 7.1-7.2 0-.5 0-.8-.1-1.1H12z"
              />
            </svg>
            {googleLoading ? "מתחבר..." : "כניסה עם גוגל"}
          </Button>

          <div className="flex items-center gap-2 my-4">
            <div className="h-px bg-border flex-1" />
            <span className="text-[11px] text-muted-foreground">או</span>
            <div className="h-px bg-border flex-1" />
          </div>

          <form onSubmit={handleLogin} className="space-y-4" dir="rtl">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center gap-0.5">
                טלפון או אימייל <span className="text-red-500 font-bold">*</span>
              </label>
              <Input
                type="text"
                placeholder="לדוגמה: 023131500"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                className="text-sm"
                dir="ltr"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center gap-0.5">
                סיסמה <span className="text-red-500 font-bold">*</span>
              </label>
              <Input
                type="password"
                placeholder="הזינו סיסמה"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="text-sm"
                dir="ltr"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full gap-2">
              <LogIn className="w-4 h-4" />
              {loading ? "מתחבר..." : "כניסה"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
