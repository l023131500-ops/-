import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Lock, Mail, Sparkles, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

function SocialAuthButton({
  label,
  subtitle,
  icon,
  onClick,
  disabled,
}: {
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button onClick={onClick} type="button" disabled={disabled} className="auth-social-button">
      <span className="auth-social-orb">{icon}</span>
      <span className="auth-social-content">
        <span className="auth-social-title">{label}</span>
        <span className="auth-social-subtitle">{subtitle}</span>
      </span>
      <span className="auth-social-chip">כניסה מהירה</span>
    </button>
  );
}

export default function LoginPage({ onBack, defaultRegister = false }: { onBack?: () => void; defaultRegister?: boolean }) {
  const { login, register, loginWithGoogle, loginWithApple, loginWithMagicLink } = useAuth();
  const location = useLocation();
  const [isRegister, setIsRegister] = useState(defaultRegister);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const nextPath = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const next = params.get("next");
    return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  }, [location.search]);

  const handleSocialLogin = async (provider: "google" | "apple") => {
    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      const authError = provider === "google" ? await loginWithGoogle(nextPath) : await loginWithApple(nextPath);
      if (authError) setError(authError);
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError("נא למלא כתובת אימייל");
      return;
    }

    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      const authError = await loginWithMagicLink(email, nextPath);
      if (authError) {
        setError(authError);
      } else {
        setSuccessMessage("שלחנו קישור כניסה למייל. אפשר להיכנס גם בלי סיסמה.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);
    try {
      if (isRegister) {
        if (!name || !email || !password) { setError("נא למלא את כל השדות"); setLoading(false); return; }
        const err = await register(email, password, name);
        if (err) {
          setError(err);
        } else {
          setSuccessMessage("החשבון נוצר בהצלחה — ממשיכים ישר לשלב הפרטים הראשונים.");
          setPassword("");
        }
      } else {
        if (!email || !password) { setError("נא למלא אימייל וסיסמה"); setLoading(false); return; }
        const err = await login(email, password);
        if (err) setError(err);
      }
    } finally { setLoading(false); }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError("נא להזין אימייל כדי לאפס סיסמה");
      return;
    }

    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setSuccessMessage("שלחנו אליך קישור לאיפוס סיסמה למייל.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center p-4 bg-background relative">
      <div className="ambient-gold w-[600px] h-[600px] top-1/3 start-1/4" />
      <div className="ambient-indigo w-[400px] h-[400px] bottom-1/4 end-1/3" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl gold-gradient mx-auto flex items-center justify-center mb-5 shadow-lg">
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">FinanceHub</h1>
          <p className="text-sm text-muted-foreground mt-2 tracking-editorial">ניהול פיננסי מתקדם למשק הבית והעסק</p>
        </div>

        <div className="bento-card p-8">
          <h2 className="text-xl font-bold text-foreground mb-7">
            {isRegister ? "הרשמה" : "התחברות"}
          </h2>

          <div className="space-y-3 mb-6">
            <SocialAuthButton
              label="התחברות עם Google"
              subtitle="כניסה מיידית עם חשבון קיים"
              onClick={() => void handleSocialLogin("google")}
              disabled={loading}
              icon={<svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12.2c0 4.64-3.12 7.8-7.74 7.8A8.01 8.01 0 1 1 12.2 4c2.1 0 3.87.77 5.2 2.04" /><path d="M21 6v5h-5" /><path d="M16.5 12h-4.3" /></svg>}
            />
            <SocialAuthButton
              label="התחברות עם Apple"
              subtitle="לכניסה חלקה ממכשירי Apple"
              onClick={() => void handleSocialLogin("apple")}
              disabled={loading}
              icon={<svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M16.7 12.1c0-2 1.6-3 1.7-3.1-1-.8-2.5-.9-3-.9-1.3-.1-2.4.7-3 .7-.6 0-1.5-.7-2.6-.7-1.3 0-2.6.8-3.3 2-.9 1.5-.2 3.8.6 5 .4.6.9 1.3 1.6 1.2.7 0 .9-.4 1.7-.4s1 .4 1.7.4c.7 0 1.1-.6 1.5-1.2.5-.7.7-1.4.7-1.4-.1 0-2.6-1-2.6-3.6ZM14.6 6.4c.3-.4.5-1 .4-1.6-.5 0-1.1.3-1.4.7-.3.4-.6 1-.5 1.6.6 0 1.2-.3 1.5-.7Z"/></svg>}
            />
            <button onClick={() => void handleMagicLink()} type="button" disabled={loading} className="auth-social-button">
              <span className="auth-social-orb">
                <Mail className="w-5 h-5" />
              </span>
              <span className="auth-social-content">
                <span className="auth-social-title">כניסה ללא סיסמה</span>
                <span className="auth-social-subtitle">נשלח קישור מאובטח למייל וניתן גם ליצור חשבון אוטומטית</span>
              </span>
              <span className="auth-social-chip">Magic Link</span>
            </button>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-border/40" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">או</span>
            <div className="flex-1 h-px bg-border/40" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="שם מלא" value={name} onChange={(e) => setName(e.target.value)}
                  className="pr-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-accent rounded-2xl" />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="אימייל" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="pr-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-accent rounded-2xl" />
            </div>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="סיסמה" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="pr-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-accent rounded-2xl" />
            </div>

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-destructive">{error}</motion.p>
            )}

            {successMessage && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-primary">{successMessage}</motion.p>
            )}

            <button type="submit" disabled={loading} className="btn-clay-gold w-full text-sm py-3.5 rounded-2xl disabled:opacity-50">
              {loading ? "מעבד..." : isRegister ? "צור חשבון והתחל מיד" : "התחבר"}
            </button>

            {!isRegister && (
              <button
                type="button"
                onClick={() => void handleResetPassword()}
                disabled={loading}
                className="w-full text-xs text-accent hover:text-accent/80 transition-colors"
              >
                שכחתי סיסמה
              </button>
            )}
          </form>

          <div className="mt-7 pt-5 border-t border-border/30 text-center">
              <button onClick={() => { setIsRegister(!isRegister); setError(""); setSuccessMessage(""); }}
              className="text-sm text-accent hover:text-accent/80 transition-colors duration-300">
              {isRegister ? "יש לך חשבון? התחבר" : "אין לך חשבון? הירשם"}
            </button>
          </div>

          {onBack && (
            <div className="mt-4 text-center">
              <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                ← חזרה לדף הבית
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
