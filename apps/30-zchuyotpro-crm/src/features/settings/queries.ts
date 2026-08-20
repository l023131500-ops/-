import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type IntegrationSettings = {
  n8n_base_url?: string;
  whatsapp_instance_id?: string;
  nedarim_token?: string;
  imot_token?: string;
  email_sender?: string;
};

export type NotificationSettings = {
  admin_email_new_referral?: boolean;
  admin_email_inbound_msg?: boolean;
  agent_email_assigned_client?: boolean;
};

export type TenantSettings = {
  integrations?: IntegrationSettings;
  notifications?: NotificationSettings;
};

export const myTenantQuery = () =>
  queryOptions({
    queryKey: ["my-tenant"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const tenantProfilesQuery = () =>
  queryOptions({
    queryKey: ["tenant-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role, auth_user_id, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

// profiles_self_read (RLS) returns every profile in the caller's tenant, not
// just the caller's own row, so a plain .limit(1) here would pick an
// arbitrary teammate. Filter explicitly by the signed-in user's auth id.
export const myProfileQuery = () =>
  queryOptions({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("auth_user_id", authData.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export function useInvalidateSettings() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["my-tenant"] });
    qc.invalidateQueries({ queryKey: ["tenant-profiles"] });
  };
}
