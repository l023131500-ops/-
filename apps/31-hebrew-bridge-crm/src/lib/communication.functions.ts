import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const COMMUNICATION_TEMPLATES = [
  { value: "welcome", label: "הודעת ברוכים הבאים", channel: "whatsapp" },
  { value: "document_request", label: "בקשה להעלאת מסמכים", channel: "whatsapp" },
  { value: "status_update", label: "עדכון סטטוס טיפול", channel: "whatsapp" },
  { value: "appointment_reminder", label: "תזכורת פגישה", channel: "yemot" },
  { value: "completion_notice", label: "הודעת סיום טיפול", channel: "whatsapp" },
] as const;

export type CommunicationLog = {
  id: string;
  client_id: string;
  template_type: string;
  template_label: string;
  channel: string;
  status: string;
  payload: any;
  created_at: string;
};

const templateLabel = (t: string) =>
  COMMUNICATION_TEMPLATES.find((c) => c.value === t)?.label ?? t;
const templateChannel = (t: string) =>
  COMMUNICATION_TEMPLATES.find((c) => c.value === t)?.channel ?? "webhook";

export const triggerCommunication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { clientId: string; templateType: string }) =>
    z.object({
      clientId: z.string().uuid(),
      templateType: z.string().min(1).max(64),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { data: adminRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!adminRow) throw new Error("Forbidden: admin role required");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, phone, email")
      .eq("id", data.clientId)
      .maybeSingle();

    const channel = templateChannel(data.templateType);
    const payload = {
      to: profile?.phone ?? profile?.email ?? null,
      recipient_name: profile?.full_name ?? null,
      template: data.templateType,
      channel,
      sent_at: new Date().toISOString(),
      simulated: true,
    };

    const { error } = await supabaseAdmin.from("communication_logs").insert({
      client_id: data.clientId,
      template_type: data.templateType,
      channel,
      payload,
      status: "simulated",
      triggered_by: userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listCommunicationLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { clientId: string }) => z.object({ clientId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<CommunicationLog[]> => {
    const { supabase, userId } = context as any;
    const { data: adminRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!adminRow) throw new Error("Forbidden: admin role required");
    const { data: rows, error } = await supabase
      .from("communication_logs")
      .select("id, client_id, template_type, channel, status, payload, created_at")
      .eq("client_id", data.clientId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: any) => ({
      ...r,
      template_label: templateLabel(r.template_type),
    }));
  });
