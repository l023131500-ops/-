-- Per-tenant customization (flagship CRM spec items 1+2+3): every manager can
-- extend the own CRM with custom client fields — grouped by the client-file
-- category they belong to — and control which ones the client sees/edits in
-- the self-portal. Definitions are created either manually in Settings or via
-- the AI extension assistant (/api/ai-extend proposes, staff approves, the
-- approved actions are applied client-side under these same RLS policies).

CREATE TABLE public.custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  -- which client-file tab the field renders under
  category TEXT NOT NULL DEFAULT 'personal'
    CHECK (category IN ('personal', 'family', 'financial', 'housing', 'vehicles', 'other')),
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text'
    CHECK (field_type IN ('text', 'number', 'date', 'boolean', 'select', 'multiselect')),
  -- for select/multiselect: JSON array of option strings
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- portal exposure: visible_to_client shows the field in the self-portal;
  -- client_editable additionally lets the client write its value there
  visible_to_client BOOLEAN NOT NULL DEFAULT false,
  client_editable BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, field_key)
);

CREATE INDEX idx_custom_field_definitions_tenant ON public.custom_field_definitions(tenant_id, category, sort_order);

CREATE TRIGGER trg_custom_field_definitions_updated_at BEFORE UPDATE ON public.custom_field_definitions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  definition_id UUID NOT NULL REFERENCES public.custom_field_definitions(id) ON DELETE CASCADE,
  -- value shape depends on definition.field_type: string / number / boolean /
  -- array of strings (multiselect) — stored as-is in jsonb
  value JSONB NOT NULL DEFAULT 'null'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, definition_id)
);

CREATE INDEX idx_custom_field_values_client ON public.custom_field_values(client_id);
CREATE INDEX idx_custom_field_values_tenant ON public.custom_field_values(tenant_id);

CREATE TRIGGER trg_custom_field_values_updated_at BEFORE UPDATE ON public.custom_field_values
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_field_definitions TO authenticated;
GRANT ALL ON public.custom_field_definitions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_field_values TO authenticated;
GRANT ALL ON public.custom_field_values TO service_role;

ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;

-- Staff: full access inside their tenant (same pattern as every client_* table)
CREATE POLICY "custom_field_definitions_tenant_isolation" ON public.custom_field_definitions
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

CREATE POLICY "custom_field_values_tenant_isolation" ON public.custom_field_values
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- Client self-portal: may see only definitions marked visible_to_client, and
-- only in the own tenant (resolved via the own clients row)
CREATE POLICY "custom_field_definitions_client_select" ON public.custom_field_definitions
  FOR SELECT TO authenticated
  USING (
    visible_to_client
    AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.auth_user_id = auth.uid() AND c.tenant_id = custom_field_definitions.tenant_id
    )
  );

-- Client self-portal values: read values of visible fields on the own file;
-- write only values of fields the manager marked client_editable. The
-- tenant_id subquery pins the row to the client's real tenant.
CREATE POLICY "custom_field_values_self_select" ON public.custom_field_values
  FOR SELECT TO authenticated
  USING (
    public.is_self_client(client_id)
    AND EXISTS (
      SELECT 1 FROM public.custom_field_definitions d
      WHERE d.id = custom_field_values.definition_id AND d.visible_to_client
    )
  );

CREATE POLICY "custom_field_values_self_insert" ON public.custom_field_values
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_self_client(client_id)
    AND tenant_id = (SELECT tenant_id FROM public.clients WHERE id = client_id)
    AND EXISTS (
      SELECT 1 FROM public.custom_field_definitions d
      WHERE d.id = custom_field_values.definition_id AND d.visible_to_client AND d.client_editable
    )
  );

CREATE POLICY "custom_field_values_self_update" ON public.custom_field_values
  FOR UPDATE TO authenticated
  USING (
    public.is_self_client(client_id)
    AND EXISTS (
      SELECT 1 FROM public.custom_field_definitions d
      WHERE d.id = custom_field_values.definition_id AND d.visible_to_client AND d.client_editable
    )
  )
  WITH CHECK (
    public.is_self_client(client_id)
    AND tenant_id = (SELECT tenant_id FROM public.clients WHERE id = client_id)
    AND EXISTS (
      SELECT 1 FROM public.custom_field_definitions d
      WHERE d.id = custom_field_values.definition_id AND d.visible_to_client AND d.client_editable
    )
  );

-- Module visibility for the client portal (spec item 2: "non-essential
-- functions hidden unless the manager enabled them for the client").
-- The portal user cannot read the tenants row itself (it holds integration
-- secrets), so this SECURITY DEFINER function exposes ONLY settings->modules.
CREATE OR REPLACE FUNCTION public.get_my_tenant_modules()
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(t.settings->'modules', '{}'::jsonb)
  FROM public.tenants t
  WHERE t.id = COALESCE(
    public.get_my_tenant_id(),
    (SELECT c.tenant_id FROM public.clients c WHERE c.auth_user_id = auth.uid() LIMIT 1)
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_my_tenant_modules() TO authenticated;
