
ALTER TABLE public.client_profiles
  ADD COLUMN IF NOT EXISTS uploaded_documents jsonb NOT NULL DEFAULT '[]'::jsonb;

INSERT INTO public.visibility_rules (partner_category, allowed_schema_fields)
VALUES
  ('סוכני_פנסיה', '[]'::jsonb),
  ('עורכי_דין', '[]'::jsonb),
  ('יועצים_פיננסיים', '[]'::jsonb)
ON CONFLICT DO NOTHING;
