import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, LogIn, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function AdminLogin({ target = "/admin", title = "כניסת מנהל" }: { target?: string; title?: string }) {
  const { signIn, isDemo, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    navigate(target, { replace: true });
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    setError(undefined);
    const { error } = await signIn(String(form.get("email") ?? ""), String(form.get("password") ?? ""));
    setSubmitting(false);
    if (error) setError(error);
    else navigate(target, { replace: true });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[hsl(209_63%_13%)] p-4 text-white">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white">
          <ArrowRight className="h-4 w-4" /> חזרה לאתר
        </Link>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-gold text-gold-foreground">
            <ShieldCheck className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-white/60">מערכת מחוברים · חצור הגלילית</p>

          {isDemo && (
            <div className="mt-4 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-xs text-gold">
              מצב הדגמה — אין חיבור לשרת. ניתן להיכנס עם כל פרטים כדי לסקור את המערכת.
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-6 space-y-4 [&_label]:text-white/80">
            <Field label="אימייל" htmlFor="email" required>
              <Input id="email" name="email" type="email" required autoComplete="email" className="bg-white/10 text-white placeholder:text-white/40" placeholder="admin@chatzor" />
            </Field>
            <Field label="סיסמה" htmlFor="password" required>
              <Input id="password" name="password" type="password" required={!isDemo} autoComplete="current-password" className="bg-white/10 text-white placeholder:text-white/40" placeholder="••••••••" />
            </Field>
            {error && <p className="text-sm text-red-300">{error}</p>}
            <Button type="submit" variant="gold" size="lg" disabled={submitting} className="w-full">
              <LogIn className="h-4 w-4" aria-hidden />
              {submitting ? "מתחבר…" : "כניסה"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
