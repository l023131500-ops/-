import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type TemplateRow = Database["public"]["Tables"]["message_templates"]["Row"];

export const templatesQuery = (channel?: string) =>
  queryOptions({
    queryKey: ["templates", channel ?? "all"],
    queryFn: async () => {
      let q = supabase.from("message_templates").select("*").order("name");
      if (channel) q = q.eq("channel", channel);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export function renderTemplate(
  body: string,
  vars: { client_name?: string; file_number?: string; agent_name?: string; phone?: string; email?: string },
) {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key) => {
    const v = vars[key as keyof typeof vars];
    return v ?? `{{${key}}}`;
  });
}
