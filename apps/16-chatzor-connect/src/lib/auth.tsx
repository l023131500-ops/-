import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { APP_KEY, hub, supabase } from "@/lib/supabase";

interface AuthUser {
  id: string;
  email: string | null;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  isDemo: boolean; // true when no Supabase backend — a local review session
  /**
   * `null` = the answer has not come back yet. Signed in is not the same as
   * being a manager: without this the admin shell rendered for any registered
   * visitor and only the empty tables gave it away.
   *
   * The answer comes from the platform (`more30_app_access`), which returns
   * "local admin of this system OR global super admin" — one rule, one place.
   */
  isAdmin: boolean | null;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);
const DEMO_KEY = "chatzor-demo-user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const isDemo = !supabase;
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) { setIsAdmin(isDemo ? true : null); return; }
    if (!hub) { setIsAdmin(true); return; }   // מצב הדגמה — אין שרת לשאול
    let alive = true;
    hub
      .rpc("more30_app_access", { p_app: APP_KEY })
      .then(({ data }) => { if (alive) setIsAdmin(data?.is_admin === true); });
    return () => { alive = false; };
  }, [user, isDemo]);

  useEffect(() => {
    if (!supabase) {
      const saved = window.localStorage.getItem(DEMO_KEY);
      setUser(saved ? JSON.parse(saved) : null);
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      setUser(u ? { id: u.id, email: u.email ?? null } : null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user;
      setUser(u ? { id: u.id, email: u.email ?? null } : null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn: AuthState["signIn"] = async (email, password) => {
    if (!supabase) {
      // Demo mode: accept any credentials for review purposes.
      const demoUser = { id: "demo", email: email || "demo@chatzor" };
      window.localStorage.setItem(DEMO_KEY, JSON.stringify(demoUser));
      setUser(demoUser);
      return {};
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  };

  const signOut = async () => {
    if (!supabase) {
      window.localStorage.removeItem(DEMO_KEY);
      setUser(null);
      return;
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, isDemo, isAdmin, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
