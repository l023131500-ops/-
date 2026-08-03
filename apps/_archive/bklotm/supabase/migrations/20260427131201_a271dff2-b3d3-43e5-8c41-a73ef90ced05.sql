
-- Add new columns to leads for unified form
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS request_type TEXT,
  ADD COLUMN IF NOT EXISTS community_data JSONB;

-- Helpful index for lookup by email
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);

-- Upsert webhook URL into site_settings
INSERT INTO public.site_settings (key, value)
VALUES ('n8n_webhook_url', 'https://N8N.l023131500.work/webhook/IGUDHASHIURIM_NEDARIM')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
