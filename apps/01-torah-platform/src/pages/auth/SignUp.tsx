import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// דרישת הסיסמה נכתבת פעם אחת ונקראת בכל שלושת המקומות — התווית, בדיקת
// השליחה וההסבר שליד השדה. כשהם היו שלושה מספרים נפרדים, שינוי אחד מהם
// היה משאיר את המשתמש עם הודעה שסותרת את מה שהטופס באמת דורש.
const PW_MIN = 6;

export default function SignUp() {
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < PW_MIN) { toast.error(`סיסמה לפחות ${PW_MIN} תווים`); return; }
    setLoading(true);
    const { error } = await signUp(form.email, form.password, { full_name: form.name, phone: form.phone });
    setLoading(false);
    if (error) { toast.error("שגיאה: " + error.message); return; }
    toast.success("נרשמת בהצלחה");
    nav("/portal");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">הרשמה</CardTitle>
          <CardDescription>פתח חשבון חדש</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div><Label>שם מלא</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>דוא״ל</Label><Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>טלפון</Label><Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div>
              <Label htmlFor="password">סיסמה</Label>
              <PasswordInput
                id="password"
                required
                minLength={PW_MIN}
                autoComplete="new-password"
                aria-describedby="password-req"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              {/* הדרישה מוצגת ליד השדה בזמן ההקלדה ומשנה מצב כשהיא מתקיימת —
                  ולא רק כשגיאה אחרי שליחה. aria-describedby ולא aria-live,
                  כדי שהיא לא תוקרא מחדש בכל הקשה. */}
              <p
                id="password-req"
                className={`mt-1.5 text-xs ${
                  form.password.length >= PW_MIN ? "text-green-600 dark:text-green-500" : "text-muted-foreground"
                }`}
              >
                <span aria-hidden="true">{form.password.length >= PW_MIN ? "✓" : "•"}</span>{" "}
                לפחות {PW_MIN} תווים
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserPlus className="ml-2 h-4 w-4" /> צור חשבון</>}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              כבר רשום? <Link to="/auth/sign-in" className="text-primary hover:underline">להתחברות</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
