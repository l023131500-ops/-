import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type IntegrationSettings = {
  n8n_base_url?: string;
  whatsapp_instance_id?: string;
  whatsapp_api_token?: string;
  nedarim_token?: string;
  imot_token?: string;
  email_sender?: string;
};

export type NotificationSettings = {
  admin_email_new_referral?: boolean;
  admin_email_inbound_msg?: boolean;
  agent_email_assigned_client?: boolean;
};

// Yemot HaMashiach voice extension (flagship spec item 8) — consumed by
// /api/public/yemot-ivr. api_secret doubles as the extension's password
// (it is embedded in the api_link URL configured on the Yemot system).
export type VoiceSettings = {
  enabled?: boolean;
  api_secret?: string;
  yemot_phone?: string;
  yemot_extension?: string;
  id_method?: "phone" | "phone_id" | "id";
};

// Two-way email sync (flagship spec item 9) — consumed by /api/email-send
// (outbound, live only when live_enabled AND platform EMAIL_LIVE_MODE=live)
// and /api/public/email-inbound (inbound_secret is the webhook's password,
// same convention as VoiceSettings.api_secret).
export type EmailSettings = {
  enabled?: boolean;
  inbound_secret?: string;
  live_enabled?: boolean;
  reply_to?: string;
};

// Two-way WhatsApp sync (flagship spec item 9, sibling of EmailSettings) —
// consumed by /api/whatsapp-send (outbound, live only when live_enabled AND
// platform WHATSAPP_LIVE_MODE=live AND Green API creds in IntegrationSettings)
// and /api/public/whatsapp-inbound (inbound_secret is the webhook's password).
export type WhatsappSettings = {
  enabled?: boolean;
  inbound_secret?: string;
  live_enabled?: boolean;
};

export type TenantSettings = {
  integrations?: IntegrationSettings;
  notifications?: NotificationSettings;
  voice?: VoiceSettings;
  email?: EmailSettings;
  whatsapp?: WhatsappSettings;
  // per-tenant module visibility (flagship spec item 2) — key: enabled.
  // Missing key means enabled; see features/customize/modules.ts
  modules?: Record<string, boolean>;
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
