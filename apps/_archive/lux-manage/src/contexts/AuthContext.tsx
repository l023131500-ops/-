import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { buildOAuthRedirectUrl } from "@/lib/authRedirect";
import { removeFromStorage } from "@/lib/localStorage";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  onboardingComplete: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isNewUser: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (email: string, password: string, name: string) => Promise<string | null>;
  loginWithGoogle: (nextPath?: string) => Promise<string | null>;
  loginWithApple: (nextPath?: string) => Promise<string | null>;
  loginWithMagicLink: (email: string, nextPath?: string) => Promise<string | null>;
  logout: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getDisplayName(supaUser: User) {
  return supaUser.user_metadata?.full_name || supaUser.user_metadata?.name || supaUser.email?.split("@")[0] || "";
}

function formatAuthError(error: unknown) {
  if (error instanceof Error) {
    if (error.message.includes("Failed to fetch")) {
      return "החיבור לשרת לא הושלם. אם אתה גולש דרך נטפרי או סינון רשת, ודא שהדומיינים של האתר וההתחברות פתוחים ברשת שלך.";
    }
    return error.message;
  }
  return "אירעה שגיאה בהתחברות. נסה שוב.";
}

async function ensureProfile(supaUser: User) {
  const { error } = await supabase.from("profiles").upsert(
    { id: supaUser.id, name: getDisplayName(supaUser) },
    { onConflict: "id" }
  );
  if (error) throw error;
}

async function fetchProfile(userId: string) {
  const { data, error } = await supabase.from("profiles").select("name, onboarding_complete, profile_complete").eq("id", userId).maybeSingle();
  if (error || !data) return null;
  return { name: (data as any).name, onboardingComplete: (data as any).onboarding_complete, profileComplete: (data as any).profile_complete };
}

async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) return false;
  return data === true;
}

function buildAuthUser(supaUser: User, profile: { name: string; onboardingComplete: boolean } | null, admin: boolean): AuthUser {
  return {
    id: supaUser.id,
    email: supaUser.email || "",
    name: profile?.name || getDisplayName(supaUser),
    isAdmin: admin,
    onboardingComplete: profile?.onboardingComplete ?? false,
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async (supaUser: User | null) => {
    if (!supaUser) { setUser(null); setLoading(false); return; }
    setLoading(true);
    try {
      try { await ensureProfile(supaUser); } catch { /* continue */ }
      const [profile, admin] = await Promise.all([fetchProfile(supaUser.id), checkIsAdmin(supaUser.id)]);
      setUser(buildAuthUser(supaUser, profile, admin));
    } catch {
      setUser(buildAuthUser(supaUser, null, false));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    removeFromStorage("mock_user");
    removeFromStorage("mock_clients");

    let isActive = true;

    const applySession = (sess: Session | null) => {
      if (!isActive) return;
      setSession(sess);
      if (!sess?.user) {
        setUser(null);
        setLoading(false);
        return;
      }
      void loadUser(sess.user);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      applySession(sess);
    });

    void (async () => {
      try {
        const initialSession = await Promise.race<Session | null>([
          supabase.auth.getSession().then(({ data }) => data.session),
          new Promise<Session | null>((resolve) => window.setTimeout(() => resolve(null), 7000)),
        ]);
        applySession(initialSession);
      } catch {
        if (!isActive) return;
        setSession(null);
        setUser(null);
        setLoading(false);
      }
    })();

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [loadUser]);

  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return formatAuthError(error);
      setSession(data.session);
      if (data.user) {
        await loadUser(data.user);
      } else {
        setLoading(false);
      }
      return null;
    } catch (err) {
      return formatAuthError(err);
    }
  }, [loadUser]);

  const register = useCallback(async (email: string, password: string, name: string): Promise<string | null> => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name }, emailRedirectTo: buildOAuthRedirectUrl("/") },
    });
    if (!error && data.session?.user) {
      setSession(data.session);
      await loadUser(data.session.user);
    }
    return error ? formatAuthError(error) : null;
  }, [loadUser]);

  const loginWithMagicLink = useCallback(async (email: string, nextPath?: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: buildOAuthRedirectUrl(nextPath), shouldCreateUser: true },
    });
    return error ? formatAuthError(error) : null;
  }, []);

  const loginWithGoogle = useCallback(async (nextPath?: string): Promise<string | null> => {
    try {
      const { lovable } = await import("@/integrations/lovable/index");
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: buildOAuthRedirectUrl(nextPath),
        extraParams: { prompt: "select_account" },
      });
      if ((result as any)?.error) {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) { await loadUser(data.session.user); return null; }
        return formatAuthError((result as any).error);
      }
      return null;
    } catch (error) {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) { await loadUser(data.session.user); return null; }
      return formatAuthError(error);
    }
  }, [loadUser]);

  const loginWithApple = useCallback(async (nextPath?: string): Promise<string | null> => {
    try {
      const { lovable } = await import("@/integrations/lovable/index");
      const result = await lovable.auth.signInWithOAuth("apple", { redirect_uri: buildOAuthRedirectUrl(nextPath) });
      if ((result as any)?.error) {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) { await loadUser(data.session.user); return null; }
        return formatAuthError((result as any).error);
      }
      return null;
    } catch (error) {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) { await loadUser(data.session.user); return null; }
      return formatAuthError(error);
    }
  }, [loadUser]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  const completeOnboarding = useCallback(async () => {
    if (!user) return;
    await supabase.from("profiles").update({ onboarding_complete: true }).eq("id", user.id);
    setUser(u => u ? { ...u, onboardingComplete: true } : null);
  }, [user]);

  const isNewUser = !!user && !user.onboardingComplete;

  return (
    <AuthContext.Provider value={{
      user, session, isAuthenticated: !!user, isAdmin: user?.isAdmin ?? false,
      isNewUser, loading, login, register, loginWithGoogle, loginWithApple,
      loginWithMagicLink, logout, completeOnboarding,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
