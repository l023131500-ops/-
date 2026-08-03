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
        <input className="input mb-4" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
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
