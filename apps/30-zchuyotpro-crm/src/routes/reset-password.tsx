import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({ meta: [{ title: "איפוס סיסמה | זכויות פרו" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  // שני מצבים נפרדים ולא אחד משותף: כל שדה נחשף בנפרד, כדי שאפשר יהיה
  // לקרוא את האחד ולהקליד את השני מוסתר.
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("הסיסמאות אינן תואמות");
      return;
    }
    if (password.length < 6) {
      toast.error("הסיסמה חייבת להכיל לפחות 6 תווים");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error("שגיאה בעדכון הסיסמה", { description: error.message });
      return;
    }
    toast.success("הסיסמה עודכנה בהצלחה");
    navigate({ to: "/dashboard" });
  }

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/40 to-accent/30 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-xl bg-primary text-primary-foreground">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold">זכויות פרו</h1>
          </div>
        </div>
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle>איפוס סיסמה</CardTitle>
            <CardDescription>
              {ready ? "הזינו סיסמה חדשה" : "מאמת את הקישור..."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ready ? (
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">סיסמה חדשה</Label>
                  {/* type="button" חובה: הכפתורים יושבים בתוך
                      <form onSubmit={onSubmit}>, ובלעדיו כל לחיצה הייתה
                      מנסה לעדכן את הסיסמה בפועל. */}
                  <div className="relative">
                    <Input id="new-password" type={showNew ? "text" : "password"} required minLength={6} dir="ltr"
                      className="text-start pr-10" aria-describedby="new-password-rule"
                      value={password} onChange={(e) => setPassword(e.target.value)} />
                    <button
                      type="button"
                      onClick={() => setShowNew((v) => !v)}
                      aria-label={showNew ? "הסתר סיסמה" : "הצג סיסמה"}
                      title={showNew ? "הסתר סיסמה" : "הצג סיסמה"}
                      className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {showNew ? <EyeOff className="h-4 w-4" aria-hidden="true" />
                               : <Eye className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  </div>
                  {/* הכלל נאכף פעמיים — minLength={6} וגם onSubmit — ומעולם
                      לא הוצג ליד השדה. */}
                  <p id="new-password-rule" className="text-xs text-muted-foreground">לפחות 6 תווים</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">אימות סיסמה</Label>
                  <div className="relative">
                    <Input id="confirm-password" type={showConfirm ? "text" : "password"} required minLength={6} dir="ltr"
                      className="text-start pr-10"
                      value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      aria-label={showConfirm ? "הסתר סיסמה" : "הצג סיסמה"}
                      title={showConfirm ? "הסתר סיסמה" : "הצג סיסמה"}
                      className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" aria-hidden="true" />
                                   : <Eye className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                  עדכן סיסמה
                </Button>
              </form>
            ) : (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
