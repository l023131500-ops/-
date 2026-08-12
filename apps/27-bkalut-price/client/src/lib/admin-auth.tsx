import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  API_BASE,
  apiRequest,
  getAdminToken,
  setAdminToken,
  subscribeAdminToken,
  queryClient,
} from "./queryClient";

export interface AdminSessionInfo {
  identity: string;
  role: string;
  expiresAt: string;
}

interface AdminAuthContextValue {
  token: string | null;
  session: AdminSessionInfo | null;
  loading: boolean;
  isAuthed: boolean;
  login: (identity: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getAdminToken());
  const [session, setSession] = useState<AdminSessionInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const unsub = subscribeAdminToken((t) => setToken(t));
    return () => { unsub(); };
  }, []);

  // When token changes, fetch /me. If invalid, clear.
  useEffect(() => {
    if (!token) {
      setSession(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    apiRequest("GET", "/api/admin/me")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.ok) {
          setSession({ identity: data.identity, role: data.role, expiresAt: data.expiresAt });
        } else {
          setAdminToken(null);
          setSession(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAdminToken(null);
          setSession(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = useCallback(async (identity: string, password: string) => {
    const r = await fetch(`${API_BASE}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity, password }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data?.ok) {
      return { ok: false, message: data?.message ?? "התחברות נכשלה" };
    }
    setAdminToken(data.token);
    setSession({ identity: data.identity, role: data.role, expiresAt: data.expiresAt });
    // Refresh any cached admin queries
    queryClient.invalidateQueries();
    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest("POST", "/api/admin/logout");
    } catch {
      // ignore
    }
    setAdminToken(null);
    setSession(null);
    queryClient.clear();
  }, []);

  const value: AdminAuthContextValue = {
    token,
    session,
    loading,
    isAuthed: Boolean(token && session),
    login,
    logout,
  };

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  return ctx;
}
