import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * המסך שמסיים איפוס סיסמה — החצי השני של "שכחתי סיסמה" במסך ההתחברות.
 *
 * ‏core.issues #201: #200 בנה את שני החצאים בפורטל בלבד, וכל מערכת עם מסך כניסה
 * משלה נשארה עם קישור מייל שנוחת על עמוד שאיש לא קורא. כאן זה נסגר עבור 01.
 *
 * ‏uri_allow_list של bieebmnmkffwbqlsfozh נקרא לפני הכתיבה ולא הונח:
 * ‏https://more30.com/** — ולכן /torah/auth/reset נכלל בו כמות שהוא.
 */

const PW_MIN = 8;

/** יעד פנימי בלבד. `next` מגיע משורת הכתובת, ולכן כתובת מלאה נדחית. */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/portal";
  return raw;
}

function friendly(message: string): string {
  if (message.includes("should be different")) return "הסיסמה החדשה זהה לקודמת. בחרו סיסמה אחרת.";
  if (message.includes("Password should be")) return `הסיסמה קצרה מדי — לפחות ${PW_MIN} תווים.`;
  if (/session|JWT|expired/.test(message)) return "תוקף הקישור פג. בקשו קישור חדש ממסך הכניסה.";
  return `שמירת הסיסמה נכשלה: ${message}`;
}

type Phase = { kind: "waiting" } | { kind: "ready"; email: string | null } | { kind: "failed"; text: string };

export default function ResetPassword() {
  const nav = useNavigate();
  const [phase, setPhase] = useState<Phase>({ kind: "waiting" });
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  /**
   * נקרא פעם אחת, בהרכבה. הקריאה ל-replaceState למטה מנקה את שורת הכתובת
   * מהטוקן ומוחקת איתה גם את ‎?next‎ — קריאה חוזרת מ-‎location.search‎ בכל
   * רינדור הייתה מחזירה את ברירת המחדל ומאבדת את היעד.
   */
  const [next] = useState(() => safeNext(new URLSearchParams(window.location.search).get("next")));

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
    nav(next, { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle as="h1" className="text-2xl flex items-center gap-2">
            <KeyRound className="h-5 w-5" aria-hidden="true" />
            {phase.kind === "failed" ? "הקישור אינו תקף" : "בחירת סיסמה חדשה"}
          </CardTitle>
          <CardDescription>
            {phase.kind === "ready" && phase.email
              ? `הקישור אומת עבור ${phase.email}. אחרי השמירה תיכנסו ישירות פנימה.`
              : "המשך תהליך האיפוס מהמייל"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {phase.kind === "waiting" && (
            <p className="text-sm text-muted-foreground" role="status">
              בודקים את הקישור מהמייל…
            </p>
          )}

          {phase.kind === "failed" && (
            <>
              <p className="text-sm leading-7">{phase.text}</p>
              <Link to="/auth/sign-in" className="mt-4 inline-block text-sm text-primary hover:underline">
                חזרה למסך הכניסה
              </Link>
            </>
          )}

          {phase.kind === "ready" && (
            <form onSubmit={submit} className="space-y-3">
              <div>
                <Label htmlFor="password">{`סיסמה חדשה (${PW_MIN} תווים לפחות)`}</Label>
                <PasswordInput id="password" name="password" required aria-required="true" autoFocus autoComplete="new-password" />
              </div>
              <div>
                <Label htmlFor="confirm">שוב, לאימות</Label>
                <PasswordInput id="confirm" name="confirm" required aria-required="true" autoComplete="new-password" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "שמירת הסיסמה וכניסה"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
