import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, KeyRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Field } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Button } from "@/components/ui/Button";

/**
 * המסך שמסיים איפוס סיסמה עבור חצור — החצי השני של "שכחתי סיסמה" במסך הכניסה.
 * ‏core.issues #201: #200 בנה את שני החצאים בפורטל בלבד, וכל מערכת עם מסך כניסה
 * משלה נשארה עם קישור מייל שנוחת על עמוד שאיש לא קורא.
 *
 * חצור יושבת על אותו פרויקט Supabase של הפורטל (uhnrgujbdxhhmoxcjria) ועל אותו
 * מקור (more30.com), ולכן הסשן שנוצר כאן נכתב תחת אותו `storageKey` ומחליף את
 * הסיסמה של אותו חשבון פלטפורמה. אין כאן חשבון נפרד.
 */

const PW_MIN = 8;

/** יעד פנימי בלבד. `next` מגיע משורת הכתובת, ולכן כתובת מלאה נדחית. */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

function friendly(message: string): string {
  if (message.includes("should be different")) return "הסיסמה החדשה זהה לקודמת. בחרו סיסמה אחרת.";
  if (message.includes("Password should be")) return `הסיסמה קצרה מדי — לפחות ${PW_MIN} תווים.`;
  if (/session|JWT|expired/.test(message)) return "תוקף הקישור פג. בקשו קישור חדש ממסך הכניסה.";
  return `שמירת הסיסמה נכשלה: ${message}`;
}

type Phase = { kind: "waiting" } | { kind: "ready"; email: string | null } | { kind: "failed"; text: string };

export function ResetPassword() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>({ kind: "waiting" });
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  /**
   * נקרא פעם אחת, בהרכבה. הקריאה ל-replaceState למטה מנקה את שורת הכתובת מהטוקן
   * ומוחקת איתה גם את ‎?next‎ — קריאה חוזרת מ-‎location.search‎ בכל רינדור הייתה
   * מחזירה "/" ומאבדת את היעד שממנו נשלחה הבקשה.
   */
  const [next] = useState(() => safeNext(new URLSearchParams(window.location.search).get("next")));

  useEffect(() => {
    if (!supabase) {
      setPhase({ kind: "failed", text: "אין חיבור לשרת במצב הדגמה, ולכן אי אפשר לאפס סיסמה כאן." });
      return;
    }

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

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) return;
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
    setDone(true);
    navigate(next, { replace: true });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[hsl(209_63%_13%)] p-4 text-white">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white">
          <ArrowRight className="h-4 w-4" /> חזרה לאתר
        </Link>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-gold text-gold-foreground">
            <KeyRound className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold">
            {phase.kind === "failed" ? "הקישור אינו תקף" : "בחירת סיסמה חדשה"}
          </h1>
          <p className="mt-1 text-sm text-white/60">מערכת מחוברים · חצור הגלילית</p>

          {phase.kind === "waiting" && (
            <p className="mt-6 text-sm text-white/70" role="status">
              בודקים את הקישור מהמייל…
            </p>
          )}

          {phase.kind === "failed" && (
            <>
              <p className="mt-6 text-sm leading-7 text-white/80">{phase.text}</p>
              <Link to="/admin/login" className="mt-4 inline-block text-sm font-semibold text-gold underline">
                חזרה למסך הכניסה
              </Link>
            </>
          )}

          {phase.kind === "ready" && (
            <>
              <p className="mt-4 text-sm leading-7 text-white/70">
                {phase.email
                  ? `הקישור אומת עבור ${phase.email}. בחרו סיסמה חדשה — אחריה תיכנסו ישירות פנימה.`
                  : "הקישור אומת. בחרו סיסמה חדשה — אחריה תיכנסו ישירות פנימה."}
              </p>
              <form onSubmit={onSubmit} className="mt-6 space-y-4 [&_label]:text-white/80">
                <Field label={`סיסמה חדשה (${PW_MIN} תווים לפחות)`} htmlFor="password" required>
                  <PasswordInput
                    id="password"
                    name="password"
                    required
                    autoFocus
                    autoComplete="new-password"
                    className="bg-white/10 text-white placeholder:text-white/40"
                    placeholder="••••••••"
                  />
                </Field>
                <Field label="שוב, לאימות" htmlFor="confirm" required>
                  <PasswordInput
                    id="confirm"
                    name="confirm"
                    required
                    autoComplete="new-password"
                    className="bg-white/10 text-white placeholder:text-white/40"
                    placeholder="••••••••"
                  />
                </Field>
                {error && <p role="alert" aria-live="assertive" className="text-sm text-red-300">{error}</p>}
                {done && <p role="status" aria-live="polite" className="text-sm text-emerald-300">הסיסמה עודכנה. מעבירים אותך פנימה…</p>}
                <Button type="submit" variant="gold" size="lg" disabled={saving} className="w-full">
                  {saving ? "שומרים…" : "שמירת הסיסמה וכניסה"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
