import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Mail, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
// TODO: lovable integration replaced with supabase OAuth directly

const ADMIN_WHITELIST = [
  "a023131600@gmail.com",
];

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();

  // If returning from Google OAuth, validate whitelist and redirect
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        const userEmail = session.user.email.toLowerCase();
        if (ADMIN_WHITELIST.includes(userEmail)) {
          toast.success("התחברת בהצלחה!");
          navigate("/admin");
        } else if (session.user.app_metadata?.provider === "google") {
          // Logged in with Google but not in whitelist — sign out
          await supabase.auth.signOut();
          toast.error("המייל הזה אינו מורשה להיכנס לניהול");
        }
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user?.email) {
        const userEmail = session.user.email.toLowerCase();
        if (ADMIN_WHITELIST.includes(userEmail)) {
          navigate("/admin");
        } else if (session.user.app_metadata?.provider === "google") {
          await supabase.auth.signOut();
          toast.error("המייל הזה אינו מורשה להיכנס לניהול");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      // TODO: configure redirect URL in Supabase dashboard
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/legacy/admin-login",
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) {
        toast.error("שגיאה בכניסה עם Google");
        setGoogleLoading(false);
      }
    } catch (e) {
      toast.error("שגיאה בכניסה עם Google");
      setGoogleLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const loginEmail = email.includes("@") ? email : `${email}@admin.local`;
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
    if (error) {
      toast.error("שגיאה בכניסה: " + error.message);
    } else {
      toast.success("התחברת בהצלחה!");
      navigate("/admin");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-card rounded-3xl border border-border shadow-elegant p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-brand flex items-center justify-center mx-auto mb-4">
              <Lock className="w-7 h-7 text-background" />
            </div>
            <h1 className="font-display text-2xl font-black text-foreground">כניסת ניהול</h1>
            <p className="font-body text-sm text-muted-foreground mt-1">היכנס עם Google או שם משתמש וסיסמה</p>
          </div>

          <Button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            variant="outline"
            className="w-full font-body font-semibold py-6 mb-4 gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {googleLoading ? "מתחבר..." : "כניסה עם Google"}
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">או</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="font-body text-sm font-medium text-foreground mb-1.5 block">שם משתמש</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="שם משתמש"
                  className="pr-10"
                />
              </div>
            </div>
            <div>
              <label className="font-body text-sm font-medium text-foreground mb-1.5 block">סיסמה</label>
              <div className="relative">
                <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-gradient-brand text-background font-body font-bold hover:opacity-90 py-6"
            >
              {loading ? "מתחבר..." : "כניסה עם סיסמה"}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
