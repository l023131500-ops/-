import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "client" | "partner";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });
}

export function useUserRoles() {
  const { data: user } = useCurrentUser();
  return useQuery({
    enabled: !!user,
    queryKey: ["userRoles", user?.id],
    queryFn: async () => {
      if (!user) return [] as AppRole[];
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.role as AppRole);
    },
  });
}

export function usePrimaryRole(): AppRole | undefined {
  const { data: roles } = useUserRoles();
  if (!roles) return undefined;
  if (roles.includes("admin")) return "admin";
  if (roles.includes("partner")) return "partner";
  if (roles.includes("client")) return "client";
  return undefined;
}
