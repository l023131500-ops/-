// TODO: Full role implementation - stub for Guru-Portal-Expansion pages
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface RoleContext {
  isAdmin: boolean;
  role: string | null;
  loading: boolean;
}

export function useRole(): RoleContext {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setRole(null);
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase.rpc("is_super_admin", { _uid: user.id });
      setIsAdmin(Boolean(data));
      setRole(data ? "admin" : "teacher");
      setLoading(false);
    })();
  }, [user]);

  return { isAdmin, role, loading };
}
