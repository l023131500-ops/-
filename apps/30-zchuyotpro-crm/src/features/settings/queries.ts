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
  // client-facing proactive notices (features/clients/notifyClient.ts).
  // Missing key = enabled — delivery itself stays test-mode gated, so the
  // default only ever produces timeline rows, never an unapproved live send.
  client_consent_email?: boolean;
  client_consent_whatsapp?: boolean;
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

// Staff access control (flagship spec item 6) — enforced by RLS
// (staff_sees_client). When restrict_to_assigned is on, agents/viewers see
// only clients assigned to them (or unassigned); admin/manager see all.
export type AccessSettings = {
  restrict_to_assigned?: boolean;
};

export type TenantSettings = {
  integrations?: IntegrationSettings;
  notifications?: NotificationSettings;
  voice?: VoiceSettings;
  email?: EmailSettings;
  whatsapp?: WhatsappSettings;
  access?: AccessSettings;
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

// Pending staff invitations — RLS returns rows to tenant admins only.
// Errors degrade to [] so the team screen keeps working until the
// staff-access-control migration has been applied on the project.
export const staffInvitesQuery = () =>
  queryOptions({
    queryKey: ["staff-invites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_invites")
        .select("id, email, role, created_at, expires_at, accepted_at")
        .is("accepted_at", null)
        .order("created_at", { ascending: false });
      if (error) return [];
      return data ?? [];
    },
  });

export function useInvalidateSettings() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["my-tenant"] });
    qc.invalidateQueries({ queryKey: ["tenant-profiles"] });
    qc.invalidateQueries({ queryKey: ["staff-invites"] });
  };
}
