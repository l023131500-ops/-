/**
 * User auth context for the financial-system client login.
 *
 * Separate from AdminAuth: lives in-memory only, refreshes on each login.
 */
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { API_BASE, apiRequest, getUserToken, setUserToken, subscribeUserToken, queryClient } from "./queryClient";

export interface AppUserInfo {
  id: number;
  fullName: string;
  email: string;
  username: string | null;
  phone: string;
  role: string;
  plan: string;
  finClientId: number | null;
  productAccess: string[];
}

interface UserAuthContextValue {
  token: string | null;
  user: AppUserInfo | null;
  loading: boolean;
  isAuthed: boolean;
  login: (identifier: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const UserAuthContext = createContext<UserAuthContextValue | null>(null);

export function UserAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getUserToken());
  const [user, setUser] = useState<AppUserInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = subscribeUserToken((t) => setToken(t));
    return () => { unsub(); };
  }, []);

  const refresh = useCallback(async () => {
    if (!getUserToken()) {
      setUser(null);
      return;
    }
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/user/me`, {
        headers: { Authorization: `Bearer ${getUserToken()}` },
      });
      if (!r.ok) {
        setUserToken(null);
        setUser(null);
      } else {
        const j = await r.json();
        setUser(j.user || null);
      }
    } catch {
      setUserToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [token, refresh]);

  const login = useCallback(async (identifier: string, password: string) => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/user/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity: identifier, password }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        return { ok: false, message: j.message || `שגיאה ${r.status}` };
      }
      const j = await r.json();
      setUserToken(j.token);
      setUser(j.user || null);
      queryClient.clear();
      return { ok: true };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (getUserToken()) {
        await fetch(`${API_BASE}/api/user/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${getUserToken()}` },
        });
      }
    } catch {}
    setUserToken(null);
    setUser(null);
    queryClient.clear();
  }, []);

  return (
    <UserAuthContext.Provider value={{ token, user, loading, isAuthed: Boolean(token && user), login, logout, refresh }}>
      {children}
    </UserAuthContext.Provider>
  );
}

export function useUserAuth() {
  const ctx = useContext(UserAuthContext);
  if (!ctx) throw new Error("useUserAuth must be used within UserAuthProvider");
  return ctx;
}
