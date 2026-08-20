import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function ActivateInvite() {
  const [form, setForm] = useState({ invite_code: "", email: "", initial_password: "", new_password: "" });
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("activate-invite", { body: form });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const { error: signErr } = await signIn(form.email, form.new_password || form.initial_password);
      if (signErr) throw signErr;
      toast.success("הופעלת בהצלחה");
      nav("/portal");
    } catch (err: any) { toast.error("שגיאה: " + err.message); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2"><KeyRound className="h-5 w-5" /> הפעלת הזמנה</CardTitle>
          <CardDescription>הזן את הקוד שקיבלת מהמנהל</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div><Label>דוא״ל</Label><Input required aria-required="true" type="email" inputMode="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>קוד הזמנה</Label><Input required aria-required="true" value={form.invite_code} onChange={(e) => setForm({ ...form, invite_code: e.target.value })} /></div>
            <div><Label htmlFor="initial-password">סיסמה ראשונית (שניתנה)</Label><PasswordInput id="initial-password" required aria-required="true" autoComplete="current-password" value={form.initial_password} onChange={(e) => setForm({ ...form, initial_password: e.target.value })} /></div>
            <div><Label htmlFor="new-password">סיסמה חדשה (אופציונלי)</Label><PasswordInput id="new-password" autoComplete="new-password" value={form.new_password} onChange={(e) => setForm({ ...form, new_password: e.target.value })} /></div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "הפעל חשבון"}</Button>
            <div className="text-center text-sm text-muted-foreground">
              <Link to="/auth/sign-in" className="text-primary hover:underline">חזור להתחברות</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
