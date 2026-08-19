"use client";
export const dynamic = "force-dynamic";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";

function LoginInner() {
  const sp = useSearchParams();
  const next = sp.get("next") || "/admin";
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sb, setSb] = useState<ReturnType<typeof createSupabaseBrowser> | null>(null);

  useEffect(() => { setSb(createSupabaseBrowser()); }, []);

  async function loginGoogle() {
    if (!sb) return;
    setErr(null);
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) setErr(error.message);
  }

  async function loginEmail() {
    if (!sb) return;
    setErr(null); setLoading(true);
    const { error } = await sb.auth.signInWithPassword({ email, password: pwd });
    setLoading(false);
    if (error) setErr(error.message);
    else window.location.href = next;
  }

  return (
    <main className="min-h-screen bg-brand-cream flex items-center justify-center p-6">
      <div className="card max-w-md w-full">
        <h1 className="font-serif text-2xl font-bold mb-1 text-brand-dark">כניסה למערכת</h1>
        <p className="text-sm text-gray-600 mb-6">למפעיל המערכת בלבד</p>
        {err && <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{err}</div>}
        <button className="btn-outline w-full mb-4" onClick={loginGoogle}>התחבר עם Google</button>
        <div className="text-center text-xs text-gray-500 mb-3">או</div>
        <label className="label">אימייל</label>
        <input className="input mb-3" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="label">סיסמה</label>
        {/* כפתור "הצג סיסמה" (priority §1א). השדה אינו נושא dir משלו, כך שהוא
            יורש rtl מ-<html> ו-`.input` מוסיף `text-right` — התווים נצמדים
            לקצה הימני, והצד השמאלי הוא הפנוי. לכן העין יושבת בשמאל, ו-pl-10
            שומר לה את המקום גם כשהסיסמה ארוכה. */}
        <div className="relative mb-4">
          <input
            className="input pl-10"
            type={showPwd ? "text" : "password"}
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            aria-label={showPwd ? "הסתר סיסמה" : "הצג סיסמה"}
            title={showPwd ? "הסתר סיסמה" : "הצג סיסמה"}
            className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded text-gray-500 hover:text-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          >
            {showPwd ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                <line x1="2" x2="22" y1="2" y2="22" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
        <button className="btn-primary w-full" disabled={loading || !email || !pwd} onClick={loginEmail}>
          {loading ? "מתחבר..." : "התחבר"}
        </button>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center">טוען...</main>}>
      <LoginInner />
    </Suspense>
  );
}
