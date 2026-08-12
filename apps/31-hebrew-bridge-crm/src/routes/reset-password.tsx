import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";

/**
 * המסך שמסיים איפוס סיסמה — החצי השני של «שכחתי סיסמה» ב-‎/auth‎.
 *
 * ‏core.issues #201: #200 בנה את שני החצאים בפורטל בלבד, וכל מערכת עם מסך כניסה
 * משלה נשארה עם קישור מייל שנוחת על עמוד שאיש לא קורא. כאן זה נסגר עבור 31.
 *
 * שם הקובץ הוא ‎reset-password.tsx‎ ולא ‎auth.reset.tsx‎ בכוונה: ניקוד בשם קובץ
 * הוא קינון אצל TanStack Router, ו-‎auth.tsx‎ הוא מסך עלה בלי ‎<Outlet/>‎ — מסלול
 * ‎auth.reset‎ היה נבלע בו ולא מוצג.
 */

const PW_MIN = 6; // תואם ל-minLength בטופס ההרשמה של /auth ולברירת המחדל של GoTrue

function friendly(message: string): string {
  if (message.includes("should be different")) return "הסיסמה החדשה זהה לקודמת. בחרו סיסמה אחרת.";
  if (message.includes("Password should be")) return `הסיסמה קצרה מדי — לפחות ${PW_MIN} תווים.`;
  if (/session|JWT|expired/.test(message)) return "תוקף הקישור פג. בקשו קישור חדש ממסך הכניסה.";
  return `שמירת הסיסמה נכשלה: ${message}`;
}

type Phase = { kind: "waiting" } | { kind: "ready"; email: string | null } | { kind: "failed"; text: string };

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "בחירת סיסמה חדשה — מערכת CRM שותפים" },
      { name: "description", content: "השלמת איפוס סיסמה מהקישור שנשלח במייל" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>({ kind: "waiting" });
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;

    void (async () => {
      // שגיאה שחזרה מ-Supabase עצמו — קישור שפג, נוצל, או נפתח פעמיים.
      const query = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const err = query.get("error") ?? hash.get("error");
      if (err) {
        const code = query.get("error_code") ?? hash.get("error_code") ?? "";
        if (code.includes("otp_expired")) {
          setPhase({
            kind: "failed",
            text: "תוקף הקישור פג. קישורי איפוס תקפים לשעה — בקשו קישור חדש ממסך הכניסה.",
          });
          return;
        }
        const detail = query.get("error_description") ?? hash.get("error_description") ?? err;
        setPhase({ kind: "failed", text: decodeURIComponent(detail.replace(/\+/g, " ")) });
        return;
      }

      // ‏detectSessionInUrl קורא גם ‎?code=‎ וגם טוקנים ב-hash, ועושה זאת אחרי
      // שהמודול נטען. נותנים לו להשלים לפני שמכריזים על כישלון.
      let session = null;
      for (let i = 0; i < 25 && !session && alive; i++) {
        const { data } = await supabase.auth.getSession();
        session = data?.session ?? null;
        if (!session) await new Promise((r) => setTimeout(r, 200));
      }
      if (!alive) return;
      if (!session) {
        setPhase({
          kind: "failed",
          text: "לא מצאנו קישור איפוס תקף בכתובת. ייתכן שהקישור פג, שכבר נוצל, או שנפתח בדפדפן אחר. בקשו קישור חדש ממסך הכניסה.",
        });
        return;
      }

      // הטוקן נשאר בשורת הכתובת אחרי שנקרא. ניקוי שלו מונע שיישלח הלאה
      // ב-Referer או יישמר בהיסטוריית הדפדפן.
      try {
        window.history.replaceState(null, "", window.location.pathname);
      } catch {
        /* דפדפן שחוסם replaceState — הטוקן כבר נוצל, והמסך ממשיך כרגיל */
      }

      setPhase({ kind: "ready", email: session.user?.email ?? null });
    })();

    return () => {
      alive = false;
    };
  }, []);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    setError(undefined);

    if (password.length < PW_MIN) {
      setError(`הסיסמה חייבת להכיל לפחות ${PW_MIN} תווים.`);
      return;
    }
    // שדה אימות ולא רק שדה אחד: כאן אין סיסמה קודמת שאפשר לנסות שוב איתה,
    // ולכן שגיאת הקלדה נועלת את החשבון עד לאיפוס נוסף.
    if (password !== String(form.get("confirm") ?? "")) {
      setError("שתי הסיסמאות אינן זהות.");
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError(friendly(updateError.message));
      return;
    }
    toast.success("הסיסמה עודכנה");
    // §1ג: פנימה למוצר, לא למסך תודה. "/" מנתב לפי התפקיד כמו אחרי התחברות.
    navigate({ to: "/", replace: true });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "var(--gradient-primary)" }}
    >
      <div className="w-full max-w-md">
        <Card className="p-6 shadow-2xl">
          <h1 className="text-2xl font-bold flex items-center gap-2 mb-1">
            <KeyRound className="w-5 h-5" aria-hidden="true" />
            {phase.kind === "failed" ? "הקישור אינו תקף" : "בחירת סיסמה חדשה"}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {phase.kind === "ready" && phase.email
              ? `הקישור אומת עבור ${phase.email}. אחרי השמירה תיכנסו ישירות פנימה.`
              : "המשך תהליך האיפוס מהמייל"}
          </p>

          {phase.kind === "waiting" && (
            <p className="text-sm text-muted-foreground" role="status">
              בודקים את הקישור מהמייל…
            </p>
          )}

          {phase.kind === "failed" && (
            <>
              <p className="text-sm leading-7">{phase.text}</p>
              <Link to="/auth" className="mt-4 inline-block text-sm text-primary hover:underline">
                חזרה למסך הכניסה
              </Link>
            </>
          )}

          {phase.kind === "ready" && (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">{`סיסמה חדשה (${PW_MIN} תווים לפחות)`}</Label>
                <Input id="password" name="password" type="password" required autoFocus dir="ltr"
                       autoComplete="new-password" minLength={PW_MIN} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">שוב, לאימות</Label>
                <Input id="confirm" name="confirm" type="password" required dir="ltr"
                       autoComplete="new-password" minLength={PW_MIN} />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                שמירת הסיסמה וכניסה
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
