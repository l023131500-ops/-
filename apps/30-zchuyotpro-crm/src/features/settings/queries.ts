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

export function useInvalidateSettings() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["my-tenant"] });
    qc.invalidateQueries({ queryKey: ["tenant-profiles"] });
  };
}
