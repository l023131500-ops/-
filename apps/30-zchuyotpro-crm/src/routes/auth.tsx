import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { authErrorMessage } from "@/lib/authErrors";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";

// האפליקציה מוגשת תחת /crm (vite base), אבל הראוטר עצמו חסר basepath —
// ולכן window.location.origin לבדו מפיל כל קישור שנשלח במייל אל שורש
// more30.com, שם אין את המסכים האלה בכלל: /reset-password ו-/dashboard
// שניהם 404 בייצור, בעוד /crm/reset-password ו-/crm/dashboard מחזירים 200.
// import.meta.env.BASE_URL הוא אותו "/crm/" שהבנייה כבר משתמשת בו לנכסים,
// ולכן זה מקור אמת אחד ולא מחרוזת שנייה שאפשר לשכוח לעדכן.
const appUrl = (path: string) =>
  `${window.location.origin}${import.meta.env.BASE_URL}${path}`;

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "כניסה למערכת | זכויות פרו" },
      { name: "description", content: "התחברות והרשמה למערכת זכויות פרו." },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        navigate({ to: "/dashboard" });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/40 to-accent/30 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-xl bg-primary text-primary-foreground">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">זכויות פרו</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            מערכת ניהול לקוחות, זכאויות ושותפים
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle>ברוכים הבאים</CardTitle>
            <CardDescription>התחברו או צרו חשבון חדש לארגון</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
              <TabsList className="grid grid-cols-2 w-full mb-4">
                <TabsTrigger value="signin">התחברות</TabsTrigger>
                <TabsTrigger value="signup">הרשמה</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <SignInForm />
              </TabsContent>
              <TabsContent value="signup">
                <SignUpForm />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("שגיאת התחברות", { description: authErrorMessage(error) });
      return;
    }
    toast.success("התחברת בהצלחה");
  }

  async function onReset(e: React.FormEvent) {
    e.preventDefault();
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: appUrl("reset-password"),
    });
    setResetLoading(false);
    if (error) {
      toast.error("שגיאה בשליחת המייל", { description: authErrorMessage(error) });
      return;
    }
    toast.success("נשלח מייל לאיפוס סיסמה", { description: "בדקו את תיבת הדואר שלכם." });
    setResetOpen(false);
  }

  if (resetOpen) {
    return (
      <form onSubmit={onReset} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reset-email">אימייל לאיפוס סיסמה</Label>
          <Input id="reset-email" type="email" required dir="ltr" className="text-start"
            value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <Button type="submit" className="w-full" disabled={resetLoading}>
          {resetLoading && <Loader2 className="h-4 w-4 animate-spin me-2" />}
          שלח קישור איפוס
        </Button>
        <Button type="button" variant="ghost" className="w-full" onClick={() => setResetOpen(false)}>
          חזרה להתחברות
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signin-email">אימייל</Label>
        <Input id="signin-email" type="email" required dir="ltr" className="text-start"
          value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="signin-password">סיסמה</Label>
          {/* ‎inline-flex‎ + ‎min-h-6‎: יעד המגע נמדד 75×16 ב-
              `platform-audit.mjs`, מתחת ל-24px שתקן 5568 דורש. השורה כבר
              מיושרת למרכז מול התווית, ולכן הטקסט אינו זז — רק אזור הפגיעה
              גדל סביבו. */}
          <button
            type="button"
            onClick={() => { setResetEmail(email); setResetOpen(true); }}
            className="inline-flex items-center min-h-6 text-xs text-primary hover:underline"
          >
            שכחתי סיסמה
          </button>
        </div>
        {/* dir="ltr" + text-align:start ⇒ התווים נצמדים לקצה השמאלי, ולכן הצד
            הפנוי לעין הוא הימני. type="button" חובה: הכפתור יושב בתוך
            <form onSubmit={onSubmit}> ובלעדיו כל לחיצה הייתה מנסה להתחבר. */}
        <div className="relative">
          <Input id="signin-password" type={showPassword ? "text" : "password"} required dir="ltr"
            className="text-start pr-10"
            value={password} onChange={(e) => setPassword(e.target.value)} />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
            title={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" />
                          : <Eye className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin me-2" />}
        התחבר
      </Button>
    </form>
  );
}

function SignUpForm() {
  const [fullName, setFullName] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: appUrl("dashboard"),
        data: { full_name: fullName, tenant_name: tenantName },
      },
    });
    setLoading(false);
    if (error) {
      toast.error("שגיאת הרשמה", { description: authErrorMessage(error) });
      return;
    }
    toast.success("נרשמת בהצלחה", { description: "בדקו את תיבת המייל לאישור." });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signup-name">שם מלא</Label>
        <Input id="signup-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-tenant">שם הארגון</Label>
        <Input id="signup-tenant" required value={tenantName} onChange={(e) => setTenantName(e.target.value)} placeholder="לדוגמה: זכויות פרו בע״מ" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-email">אימייל</Label>
        <Input id="signup-email" type="email" required dir="ltr" className="text-start"
          value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">סיסמה</Label>
        <div className="relative">
          <Input id="signup-password" type={showPassword ? "text" : "password"} required minLength={6} dir="ltr"
            className="text-start pr-10" aria-describedby="signup-password-rule"
            value={password} onChange={(e) => setPassword(e.target.value)} />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
            title={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" />
                          : <Eye className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
        {/* minLength={6} נאכף כאן מאז ומעולם ומעולם לא נאמר למשתמש. */}
        <p id="signup-password-rule" className="text-xs text-muted-foreground">לפחות 6 תווים</p>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin me-2" />}
        הירשם וצור ארגון
      </Button>
    </form>
  );
}
