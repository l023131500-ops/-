import Layout from "@/components/Layout";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { BookOpen, Mail, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { getPublicSiteUrl } from "@/lib/site";
import { authErrorMessage, PASSWORD_MIN_LENGTH } from "@/lib/authErrors";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [fullName, setFullName] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate("/portal");
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignup && password.length < PASSWORD_MIN_LENGTH) {
      toast.error(`הסיסמה חייבת להיות באורך ${PASSWORD_MIN_LENGTH} תווים לפחות`);
      return;
    }
    setLoading(true);
    if (isSignup) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      setLoading(false);
      if (error) { toast.error(authErrorMessage(error, "signup")); return; }
      toast.success("נרשמת בהצלחה! בדוק את המייל לאימות.");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast.error(authErrorMessage(error, "login")); return; }
    toast.success("התחברת בהצלחה!");
    navigate("/portal");
  };

  const handleGoogleLogin = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: getPublicSiteUrl() });
    if (result.error) { toast.error("שגיאה בהתחברות עם Google"); return; }
    if (result.redirected) return;
    navigate("/portal");
  };

  return (
    <Layout>
      <section className="py-16 bg-background min-h-[70vh] flex items-center">
        <div className="container mx-auto px-4 max-w-md">
          <div className="bg-card rounded-2xl p-8 shadow-sm border border-border">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-secondary" />
              </div>
              <h1 className="font-heading text-2xl font-bold text-foreground">כניסה לפורטל</h1>
              <p className="text-muted-foreground text-sm mt-2">{isSignup ? "הרשם לפורטל מגיד השיעור" : "היכנס לפורטל מגיד השיעור שלך"}</p>
            </div>
            <Button variant="outline" className="w-full py-5 mb-4" onClick={handleGoogleLogin}>
              <svg className="w-5 h-5 ml-2" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              התחבר עם Google
            </Button>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">או</span></div>
            </div>
            <form className="space-y-4" onSubmit={handleLogin}>
              {isSignup && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block" htmlFor="fullName">שם מלא</label>
                  <Input id="fullName" placeholder="הרב ישראל כהן" value={fullName} onChange={(e) => setFullName(e.target.value)} required aria-required="true" />
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block" htmlFor="email">דוא"ל</label>
                <div className="relative">
                  <Mail className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input id="email" type="email" inputMode="email" autoComplete="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pr-9" dir="ltr" required aria-required="true" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block" htmlFor="password">סיסמה</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-3 z-10 w-4 h-4 text-muted-foreground" />
                  <PasswordInput
                    id="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-9"
                    dir="ltr"
                    required
                    aria-required="true"
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    minLength={isSignup ? PASSWORD_MIN_LENGTH : undefined}
                    aria-describedby={isSignup ? "password-rule" : undefined}
                  />
                </div>
                {isSignup && (
                  <p
                    id="password-rule"
                    className={cn(
                      "mt-1 text-xs",
                      password.length >= PASSWORD_MIN_LENGTH ? "text-secondary" : "text-muted-foreground",
                    )}
                  >
                    {password.length >= PASSWORD_MIN_LENGTH ? "✓ " : ""}
                    לפחות {PASSWORD_MIN_LENGTH} תווים
                  </p>
                )}
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-navy-light text-lg py-5">
                {loading ? "מתחבר..." : isSignup ? "הרשם" : "התחבר"}
              </Button>
            </form>
            <div className="mt-6 text-center">
              <p className="text-muted-foreground text-sm">
                {isSignup ? (
                  <>כבר רשום? <button onClick={() => setIsSignup(false)} className="text-secondary hover:text-gold-dark font-medium">התחבר</button></>
                ) : (
                  <>עדיין לא רשום? <button onClick={() => setIsSignup(true)} className="text-secondary hover:text-gold-dark font-medium">הרשם עכשיו</button></>
                )}
              </p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Login;