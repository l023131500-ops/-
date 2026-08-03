import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function SignUp() {
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) { toast.error("סיסמה לפחות 6 תווים"); return; }
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
            <div><Label>סיסמה (6+ תווים)</Label><Input required type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
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
