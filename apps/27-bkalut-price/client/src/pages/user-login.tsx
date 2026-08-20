import { useState } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUserAuth } from "@/lib/user-auth";
import { Eye, EyeOff, LogIn, ShieldCheck, Sparkles } from "lucide-react";

export default function UserLoginPage() {
  const { login, isAuthed, loading } = useUserAuth();
  const [, navigate] = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthed) {
    navigate("/me");
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const r = await login(identifier, password);
    if (!r.ok) setError(r.message || "שגיאה");
    else navigate("/me");
  }

  return (
    <div dir="rtl" className="space-y-6 max-w-xl mx-auto pt-6" data-testid="page-user-login">
      <header className="space-y-2">
        <Badge variant="outline" className="text-xs">כניסת לקוח · מערכת ניהול פיננסי בקלות</Badge>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">ברוכים השבים</h1>
        <p className="text-sm text-foreground/80 leading-relaxed">
          הכניסה מאפשרת לצפות בדשבורד האישי, להזין הוצאות, לעדכן יעדים, להגיש בקשת שדרוג פרימיום ולעקוב
          אחרי הזכויות והתכניות שצוות בקלות הגדיר עבורכם. השתמשו בפרטים שקיבלתם בהודעה האוטומטית.
        </p>
      </header>
      <Card className="p-6 space-y-4">
        <form onSubmit={submit} className="space-y-3" data-testid="form-user-login">
          <div className="space-y-1.5">
            <Label htmlFor="identifier">שם משתמש / מייל / טלפון</Label>
            <Input
              id="identifier"
              dir="ltr"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              required
              aria-describedby={error ? "login-error" : undefined}
              aria-invalid={!!error}
              data-testid="input-identifier"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">סיסמה</Label>
            <div className="relative">
              <Input
                id="password"
                dir="ltr"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="pr-10"
                aria-describedby={error ? "login-error" : undefined}
                aria-invalid={!!error}
                data-testid="input-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
                title={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-testid="button-toggle-password"
              >
                {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
          </div>
          {error && <div id="login-error" role="alert" className="text-sm text-destructive">{error}</div>}
          <Button type="submit" disabled={loading} className="w-full gap-1.5" data-testid="button-submit-login">
            <LogIn className="w-4 h-4" />
            {loading ? "מתחבר..." : "התחברות"}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground leading-relaxed border-t pt-3">
          אין לכם עדיין חשבון? צוות בקלות יוצר חשבון אישי לאחר אישור פנייה לטיפול. ניתן ליצור קשר בטלפון
          02-3131500 או דרך הטופס באתר השיווק הפיננסי.
        </p>
      </Card>
      <Card className="p-5 bg-gradient-to-br from-card via-[hsl(42_70%_96%)] to-[hsl(190_50%_96%)] text-sm leading-relaxed">
        <div className="flex items-start gap-2 mb-2">
          <ShieldCheck className="w-4 h-4 mt-0.5 text-primary" />
          <strong>הגנת חשבון</strong>
        </div>
        <p className="text-foreground/80">
          הסיסמה נשמרת מוצפנת בלבד. אם איבדתם גישה, פנו לצוות בקלות. הגישה היא רק למידע אישי שלכם —
          אין צוות פנימי שרואה את התקציב מלבד תמיכה שאתם מאשרים מראש.
        </p>
        <div className="flex items-start gap-2 mt-3 mb-1">
          <Sparkles className="w-4 h-4 mt-0.5 text-primary" />
          <strong>שדרוג פרימיום</strong>
        </div>
        <p className="text-foreground/80">
          לאחר הכניסה תוכלו להגיש בקשה לשדרוג. המסלול נפתח לאחר אישור אדמין ופרטי גישה מעודכנים נשלחים
          אליכם אוטומטית.
        </p>
      </Card>
    </div>
  );
}
