import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Shield } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "התחברות — מערכת CRM שותפים" },
      { name: "description", content: "התחברות והרשמה למערכת ניהול לקוחות ושותפים" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error("שגיאת התחברות", { description: error.message });
    toast.success("התחברת בהצלחה");
    navigate({ to: "/", replace: true });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName },
      },
    });
    setLoading(false);
    if (error) return toast.error("שגיאת הרשמה", { description: error.message });
    toast.success("נרשמת בהצלחה", { description: "בדוק את תיבת הדואר לאישור" });
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    setLoading(false);
    if (result.error) {
      toast.error("שגיאת התחברות עם Google", { description: result.error.message });
      return;
    }
    if (result.redirected) return;
    toast.success("התחברת בהצלחה");
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12"
         style={{ background: "var(--gradient-primary)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8 text-primary-foreground">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur mb-4">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold mb-2">מערכת CRM שותפים</h1>
          <p className="text-sm opacity-90">פלטפורמת ניהול לקוחות ושותפים עסקיים</p>
        </div>

        <Card className="p-6 shadow-2xl">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">התחברות</TabsTrigger>
              <TabsTrigger value="signup">הרשמה</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">אימייל</Label>
                  <Input id="login-email" type="email" required value={email} dir="ltr"
                         onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">סיסמה</Label>
                  {/* השדה dir="ltr" — הטקסט צמוד לשמאל, ולכן העין יושבת בצד ימין הפנוי.
                      type="button" חובה: הכפתור בתוך <form onSubmit={handleLogin}>. */}
                  <div className="relative">
                    <Input id="login-password" type={showPassword ? "text" : "password"} required
                           value={password} dir="ltr" className="pr-10"
                           onChange={(e) => setPassword(e.target.value)} />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
                      title={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
                      className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" />
                                    : <Eye className="w-4 h-4" aria-hidden="true" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                  התחבר
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">שם מלא</Label>
                  <Input id="signup-name" required value={fullName}
                         onChange={(e) => setFullName(e.target.value)} placeholder="ישראל ישראלי" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">אימייל</Label>
                  <Input id="signup-email" type="email" required value={email} dir="ltr"
                         onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">סיסמה</Label>
                  <div className="relative">
                    <Input id="signup-password" type={showPassword ? "text" : "password"} required minLength={6}
                           value={password} dir="ltr" className="pr-10" aria-describedby="signup-password-rule"
                           onChange={(e) => setPassword(e.target.value)} />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
                      title={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
                      className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" />
                                    : <Eye className="w-4 h-4" aria-hidden="true" />}
                    </button>
                  </div>
                  {/* minLength={6} נאכף בדפדפן אבל מעולם לא נאמר למשתמש (§1א). */}
                  <p id="signup-password-rule" className="text-xs text-muted-foreground">
                    לפחות 6 תווים
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                  צור חשבון
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">או</span>
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogle} type="button" disabled={loading}>
            התחבר עם Google
          </Button>
        </Card>
      </div>
    </div>
  );
}
