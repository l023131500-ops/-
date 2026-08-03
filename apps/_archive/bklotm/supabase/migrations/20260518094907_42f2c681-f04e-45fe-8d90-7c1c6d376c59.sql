-- Update n8n webhook URL
INSERT INTO public.site_settings (key, value) VALUES ('n8n_webhook_url', 'https://N8N.l023131500.work/webhook/appbkalut')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Enable pg_net for async HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Trigger function: fire leads-webhook on every new lead
CREATE OR REPLACE FUNCTION public.notify_lead_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fn_url text := 'https://pwcswdfgorvlpdflzylm.supabase.co/functions/v1/leads-webhook';
BEGIN
  PERFORM extensions.http_post(
    url := fn_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('record', row_to_json(NEW))
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_lead_webhook ON public.leads;
CREATE TRIGGER trg_notify_lead_webhook
AFTER INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.notify_lead_webhook();