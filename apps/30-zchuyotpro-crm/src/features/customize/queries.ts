import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { ModulesMap } from "@/features/customize/modules";

export type CustomFieldDef = Tables<"custom_field_definitions">;
export type CustomFieldValue = Tables<"custom_field_values">;

export const CATEGORY_LABELS: Record<string, string> = {
  personal: "פרטים אישיים",
  family: "משפחה",
  financial: "פיננסי",
  housing: "דיור וחשבונות",
  vehicles: "רכבים",
  other: "אחר",
};

export const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "טקסט",
  number: "מספר",
  date: "תאריך",
  boolean: "כן/לא",
  select: "בחירה מרשימה",
  multiselect: "בחירה מרובה",
};

// RLS scopes the result: staff see the whole tenant, a portal client sees only
// visible_to_client definitions of the own tenant.
export const customFieldDefsQuery = () =>
  queryOptions({
    queryKey: ["custom-field-defs"],
    queryFn: async (): Promise<CustomFieldDef[]> => {
      const { data, error } = await supabase
        .from("custom_field_definitions")
        .select("*")
        .order("category")
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

export const customFieldValuesQuery = (clientId: string) =>
  queryOptions({
    queryKey: ["custom-field-values", clientId],
    queryFn: async (): Promise<CustomFieldValue[]> => {
      const { data, error } = await supabase
        .from("custom_field_values")
        .select("*")
        .eq("client_id", clientId);
      if (error) throw error;
      return data ?? [];
    },
  });

// settings->modules only, via SECURITY DEFINER — works for both staff and
// portal clients (the portal user cannot read the tenants row itself).
export const tenantModulesQuery = () =>
  queryOptions({
    queryKey: ["tenant-modules"],
    queryFn: async (): Promise<ModulesMap> => {
      const { data, error } = await supabase.rpc("get_my_tenant_modules");
      if (error) throw error;
      return (data ?? {}) as ModulesMap;
    },
    // a missing/failed migration must not blank the whole client file — the
    // default map means "everything enabled"
    retry: 1,
  });
