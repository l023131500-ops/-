import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Mail, KeyRound, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { authErrorMessage } from "@/lib/authErrors";
import { getPublicOrigin } from "@/lib/utils";
import { toast } from "sonner";

const checkIsAdmin = async (userId: string) => {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  return !error && data === true;
};

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  // הודעה בתוך הטופס ולא רק toast: נמדד כאן שהודעות ה-toast של המסך הזה
  // אינן מגיעות למסך בפועל (אין [data-sonner-toast] אחרי לחיצה), ולכן
  // משוב שנשען עליהן לבדו הוא לחיצה שלא קורה בה כלום מבחינת המשתמש.
  const [resetNote, setResetNote] = useState<{ ok: boolean; text: string }>();
  const navigate = useNavigate();

  // If returning from Google OAuth, validate whitelist and redirect
  useEffect(() => {
    const handleSession = async (session: any) => {
      if (!session?.user) return;
      const isAdmin = await checkIsAdmin(session.user.id);
      if (isAdmin) {
        navigate("/admin");
      } else if (session.user.app_metadata?.provider === "google") {
        await supabase.auth.signOut();
        toast.error("המשתמש הזה אינו מורשה להיכנס לניהול");
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => handleSession(session));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => handleSession(session), 0);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: getPublicOrigin() + "/admin-login",
        extraParams: { prompt: "select_account" },
      });
      if (result.error) {
        toast.error("שגיאה בכניסה עם Google");
        setGoogleLoading(false);
      }
      // If redirected, the page navigates to Google
    } catch (e) {
      toast.error("שגיאה בכניסה עם Google");
      setGoogleLoading(false);
    }
  };

  // "שכחתי סיסמה" (core.issues #201). היעד נבנה מ-BASE_URL ולא מ-origin
  // לבדו: האפליקציה מוגשת תחת more30.com/mthbram, ו-origin לבדו היה שולח
  // את הקישור אל more30.com/auth/reset — כתובת שאינה קיימת. זה בדיוק
  // הבאג שנמצא ב-30 crm.
  const handleForgotPassword = async () => {
    // השדה כאן מקבל גם שם משתמש, שמורכב אחר כך ל-@admin.local — כתובת
    // שאינה תיבה אמיתית ואי אפשר לשלוח אליה דבר. לכן נדרש מייל מלא.
    if (!email.includes("@")) {
      const text = "איפוס סיסמה נשלח למייל. הקלידו בשדה למעלה את כתובת המייל המלאה של החשבון.";
      setResetNote({ ok: false, text });
      toast.error(text);
      return;
    }
    setResetNote(undefined);
    setResetting(true);
    const base = import.meta.env.BASE_URL.endsWith("/")
      ? import.meta.env.BASE_URL
      : `${import.meta.env.BASE_URL}/`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${base}auth/reset`,
    });
    setResetting(false);
    if (error) {
      const text = authErrorMessage(error);
      setResetNote({ ok: false, text });
      toast.error(text);
      return;
    }
    // ניסוח מכוון שאינו מאשר ואינו מכחיש שהכתובת רשומה — Supabase עצמו
    // מחזיר 200 בשני המקרים, ואישור כאן היה הופך את המסך למונה חשבונות.
    const sent = "אם הכתובת רשומה במערכת, שלחנו אליה קישור לבחירת סיסמה חדשה. הקישור תקף לשעה.";
    setResetNote({ ok: true, text: sent });
    toast.success(sent);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const loginEmail = email.includes("@") ? email : `${email}@admin.local`;
    const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
    if (error) {
      // לא error.message כפי שהוא: הוא מגיע באנגלית ומאחד תחתיו מייל שלא אומת,
      // חסימת קצב ונפילת רשת. authErrorMessage מפריד ביניהם בעברית.
      toast.error(authErrorMessage(error));
      setLoading(false);
      return;
    }
    const isAdmin = data.user ? await checkIsAdmin(data.user.id) : false;
    if (!isAdmin) {
      await supabase.auth.signOut();
      toast.error("המשתמש הזה אינו מורשה להיכנס לניהול");
      setLoading(false);
      return;
    }
    toast.success("התחברת בהצלחה!");
    navigate("/admin");
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
              <label htmlFor="admin-login-username" className="font-body text-sm font-medium text-foreground mb-1.5 block">שם משתמש</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="admin-login-username"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="שם משתמש"
                  className="pr-10"
                />
              </div>
            </div>
            <div>
              <label htmlFor="admin-login-password" className="font-body text-sm font-medium text-foreground mb-1.5 block">סיסמה</label>
              {/* כפתור "הצג סיסמה" (priority §1א). הצד נמדד על החי ולא הועתק
                  ממערכת קודמת: השדה אינו נושא dir משלו, יורש rtl מ-<html> ו-
                  text-align:start — התווים נצמדים לקצה הימני, שם כבר יושב
                  KeyRound עם pr-10. הצד הפנוי הוא השמאלי (padding-left 12px),
                  ולכן העין יושבת שם, ו-pl-10 שומר לה את המקום גם כשהסיסמה
                  ארוכה. השדה נמצא בתוך <form>, ולכן type="button" חובה — בלעדיו
                  לחיצה על העין הייתה שולחת את טופס הכניסה. */}
              <div className="relative">
                <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="admin-login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10 pl-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
                  title={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
                  className="absolute left-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex justify-start">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetting}
                className="font-body text-sm text-muted-foreground underline hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded disabled:opacity-60"
              >
                {resetting ? "שולחים…" : "שכחתי סיסמה"}
              </button>
            </div>
            {resetNote && (
              <p
                className={`font-body text-sm ${resetNote.ok ? "text-muted-foreground" : "text-destructive"}`}
                role="status"
              >
                {resetNote.text}
              </p>
            )}
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
