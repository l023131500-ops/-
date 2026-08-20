import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { useAdminAuth } from "@/lib/admin-auth";
import { API_BASE, setAdminToken } from "@/lib/queryClient";
import { Lock, ShieldCheck, AlertCircle, Eye, EyeOff } from "lucide-react";

interface GoogleStatus {
  ok?: boolean;
  configured: boolean;
  callbackUrl: string | null;
  allowedAdminEmails: string[];
  missing: string[];
}

function readGoogleTokenFromHash(): { token: string; redirect: string } | null {
  // Hash routing puts the query after #/login. window.location.hash looks like
  // "#/login?google_token=...&redirect=..."
  const h = window.location.hash || "";
  const q = h.split("?")[1];
  if (!q) return null;
  const params = new URLSearchParams(q);
  const token = params.get("google_token");
  if (!token) return null;
  const redirect = params.get("redirect") || "/";
  return { token, redirect };
}

export default function AdminLoginPage() {
  const [identity, setIdentity] = useState("");
  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleNotice, setGoogleNotice] = useState<string | null>(null);
  const { login } = useAdminAuth();
  const [, setLocation] = useLocation();

  const { data: googleStatus } = useQuery<GoogleStatus>({
    queryKey: ["/api/admin/google/status"],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/api/admin/google/status`);
      if (!r.ok) throw new Error("status fetch failed");
      return r.json();
    },
    staleTime: 60_000,
  });

  // Accept the token handed back by the Google callback redirect.
  useEffect(() => {
    const found = readGoogleTokenFromHash();
    if (!found) return;
    setAdminToken(found.token);
    const target = found.redirect && found.redirect.startsWith("/") && !found.redirect.startsWith("//") ? found.redirect : "/admin";
    setLocation(target);
  }, [setLocation]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await login(identity.trim(), code.trim());
    setBusy(false);
    if (result.ok) {
      setLocation("/admin");
    } else {
      setError(result.message ?? "התחברות נכשלה");
    }
  }

  function startGoogle() {
    if (!googleStatus?.configured) {
      const missing = googleStatus?.missing?.length
        ? googleStatus.missing.join(", ")
        : "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_CALLBACK_URL";
      setGoogleNotice(
        `כניסה עם Google אינה מוגדרת. יש להגדיר את משתני הסביבה: ${missing}. פרטים בעמוד "הוראות מערכת" באזור הניהול.`,
      );
      return;
    }
    setGoogleNotice(null);
    window.location.href = "/api/admin/google/start";
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center bg-background px-4 py-12"
      data-testid="page-admin-login"
    >
      <Card className="w-full max-w-md p-8 space-y-6 border border-border shadow-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="text-primary">
            <Logo size={36} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">כניסה לצוות בקלות</h1>
            <p className="text-sm text-muted-foreground mt-1">
              כלי פנימי לניהול זכויות, פניות ואוטומציות. אין כאן הרשמת לקוחות.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            onClick={startGoogle}
            disabled={!googleStatus?.configured}
            className="w-full gap-2"
            data-testid="button-google-login"
            title={googleStatus?.configured ? "התחברות באמצעות חשבון Google מורשה" : "Google OAuth לא מוגדר"}
          >
            <span aria-hidden="true" className="inline-flex items-center justify-center w-4 h-4">
              <svg viewBox="0 0 48 48" width="14" height="14">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
            </span>
            כניסה עם Google
            {!googleStatus?.configured && (
              <span className="text-[10px] mr-1 rounded bg-muted text-muted-foreground px-1 py-0.5">לא מוגדר</span>
            )}
          </Button>
          {googleNotice && (
            <div
              className="flex items-start gap-2 text-xs rounded-md border border-amber-300 bg-amber-50 text-amber-900 px-3 py-2"
              data-testid="text-google-notice"
            >
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{googleNotice}</span>
            </div>
          )}
          {googleStatus?.configured && googleStatus.allowedAdminEmails?.length > 0 && (
            <p className="text-[11px] text-muted-foreground" data-testid="text-google-allowed">
              חשבונות מורשים: {googleStatus.allowedAdminEmails.join(", ")}
            </p>
          )}
          <div className="relative pt-2 pb-1">
            <div className="border-t border-border" />
            <span className="absolute inset-x-0 -top-1 mx-auto w-fit bg-card px-2 text-[11px] text-muted-foreground">או דוא"ל וסיסמה</span>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4" data-testid="form-admin-login">
          <div className="space-y-1.5">
            <Label htmlFor="identity">דוא"ל או טלפון</Label>
            <Input
              id="identity"
              autoComplete="username"
              dir="ltr"
              required
              value={identity}
              onChange={(e) => setIdentity(e.target.value)}
              placeholder="l023131500@gmail.com או 023131500"
              data-testid="input-identity"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="code">קוד כניסה</Label>
            <div className="relative">
              <Input
                id="code"
                type={showCode ? "text" : "password"}
                autoComplete="current-password"
                dir="ltr"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="הקוד הפנימי שניתן לצוות"
                className="pr-10"
                data-testid="input-code"
              />
              <button
                type="button"
                onClick={() => setShowCode((v) => !v)}
                aria-label={showCode ? "הסתר סיסמה" : "הצג סיסמה"}
                title={showCode ? "הסתר סיסמה" : "הצג סיסמה"}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-testid="button-toggle-code"
              >
                {showCode ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
          </div>

          {error && (
            <div
              className="flex items-start gap-2 text-sm rounded-md border border-destructive/40 bg-destructive/5 text-destructive px-3 py-2"
              data-testid="text-login-error"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" disabled={busy} className="w-full gap-2" data-testid="button-login">
            <Lock className="w-4 h-4" />
            {busy ? "מאמת..." : "כניסה למערכת הניהול"}
          </Button>
        </form>

        <div className="text-xs text-muted-foreground border-t border-border pt-4 leading-relaxed flex items-start gap-2">
          <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            מערכת ניהול פנימית. הבקשות מאומתות באמצעות סיסמה ומאוחסנות בטוקן זמני בזיכרון.
            הגדרות נוספות לאבטחה (MFA, תפקידים, מדיניות סיסמאות, RLS) מתועדות בעמוד "הוראות מערכת".
          </span>
        </div>
      </Card>
    </div>
  );
}
