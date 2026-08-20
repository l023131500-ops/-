import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";

/**
 * המסך שמסיים איפוס סיסמה עבור מימוש זכויות (22) — החצי השני של
 * "שכחתי סיסמה" ב-/admin/login.
 *
 * ‏core.issues #201: הקישור שמגיע במייל נוחת על עמוד אמיתי עם טוקן חי,
 * ואם אין מסך שקורא אותו — אין מה לעשות איתו. כאן הטוקן נקרא, מוחלף
 * בסשן, ומשמש פעם אחת כדי לקבוע סיסמה חדשה.
 *
 * ‏detectSessionInUrl של supabase-js הוא ברירת המחדל (ולא כובה ב-client.ts),
 * ולכן הטוקן מה-hash כבר נקרא בזמן שהמודול עולה. המסך רק ממתין לו.
 */

const PW_MIN = 8;

function friendly(message: string): string {
  if (message.includes("should be different")) return "הסיסמה החדשה זהה לקודמת. בחרו סיסמה אחרת.";
  if (message.includes("Password should be")) return `הסיסמה קצרה מדי — לפחות ${PW_MIN} תווים.`;
  if (/session|JWT|expired/i.test(message)) return "תוקף הקישור פג. בקשו קישור חדש ממסך הכניסה.";
  return `שמירת הסיסמה נכשלה: ${message}`;
}

type Phase =
  | { kind: "waiting" }
  | { kind: "ready"; email: string | null }
  | { kind: "failed"; text: string };

const AuthReset = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>({ kind: "waiting" });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let alive = true;

    void (async () => {
      // שגיאה שחזרה מ-Supabase עצמו — קישור שפג, נוצל, או נפתח פעמיים.
      // היא מגיעה ב-hash ולא ב-query, ולכן שני המקורות נקראים.
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

      // הקריאה של הטוקן מהכתובת מתרחשת אחרי טעינת המודול, ולכן אסור
      // להכריז על כישלון בבדיקה אחת.
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

      // הטוקן נשאר בשורת הכתובת אחרי שנקרא — ניקוי מונע שיישלח הלאה
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

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);

    if (password.length < PW_MIN) {
      setError(`הסיסמה חייבת להכיל לפחות ${PW_MIN} תווים.`);
      return;
    }
    // שדה אימות ולא שדה אחד: כאן אין סיסמה קודמת שאפשר לנסות שוב איתה,
    // ולכן שגיאת הקלדה נועלת את החשבון עד לאיפוס נוסף.
    if (password !== confirm) {
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
    setDone(true);
    navigate("/admin/leads", { replace: true });
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4" dir="rtl">
      <div className="w-full max-w-sm">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="w-4 h-4" aria-hidden="true" /> חזרה לאתר
        </Link>
        <div className="bg-card rounded-2xl border border-border shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-8 h-8 text-primary" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {phase.kind === "failed" ? "הקישור אינו תקף" : "בחירת סיסמה חדשה"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">ניהול מימוש זכויות</p>
          </div>

          {phase.kind === "waiting" && (
            <p className="text-sm text-muted-foreground text-center" role="status">
              בודקים את הקישור מהמייל…
            </p>
          )}

          {phase.kind === "failed" && (
            <>
              <p className="text-sm leading-7 text-foreground">{phase.text}</p>
              <Link
                to="/admin/login"
                className="mt-4 inline-block text-sm font-semibold text-primary underline"
              >
                חזרה למסך הכניסה
              </Link>
            </>
          )}

          {phase.kind === "ready" && (
            <>
              <p className="text-sm leading-7 text-muted-foreground">
                {phase.email
                  ? `הקישור אומת עבור ${phase.email}. בחרו סיסמה חדשה — אחריה תיכנסו ישירות פנימה.`
                  : "הקישור אומת. בחרו סיסמה חדשה — אחריה תיכנסו ישירות פנימה."}
              </p>
              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <PasswordInput
                  id="reset-password"
                  placeholder={`סיסמה חדשה (${PW_MIN} תווים לפחות)`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  autoComplete="new-password"
                  className="text-sm"
                  dir="ltr"
                  aria-describedby={error ? "reset-error" : undefined}
                  aria-invalid={!!error}
                />
                <PasswordInput
                  id="reset-confirm"
                  placeholder="שוב, לאימות"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="text-sm"
                  dir="ltr"
                  aria-describedby={error ? "reset-error" : undefined}
                  aria-invalid={!!error}
                />
                {error && <p id="reset-error" role="alert" className="text-sm text-destructive">{error}</p>}
                {done && <p className="text-sm text-primary">הסיסמה עודכנה. מעבירים אותך פנימה…</p>}
                <Button type="submit" disabled={saving} className="w-full">
                  {saving ? "שומרים…" : "שמירת הסיסמה וכניסה"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthReset;
