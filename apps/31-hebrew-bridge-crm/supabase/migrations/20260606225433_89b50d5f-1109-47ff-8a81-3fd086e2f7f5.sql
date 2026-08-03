
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE public.webhook_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outbound_url text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_settings TO authenticated;
GRANT ALL ON public.webhook_settings TO service_role;
ALTER TABLE public.webhook_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage webhook_settings" ON public.webhook_settings
  FOR ALL USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE TRIGGER webhook_settings_set_updated_at BEFORE UPDATE ON public.webhook_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.webhook_settings (outbound_url) VALUES (NULL);

CREATE TABLE public.outbox_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  target_url text,
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outbox_queue TO authenticated;
GRANT ALL ON public.outbox_queue TO service_role;
ALTER TABLE public.outbox_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage outbox_queue" ON public.outbox_queue
  FOR ALL USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE INDEX outbox_queue_pending_idx ON public.outbox_queue (status, created_at) WHERE status = 'pending';
CREATE TRIGGER outbox_queue_set_updated_at BEFORE UPDATE ON public.outbox_queue
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.outbox_queue_notify_dispatch()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnYXFxbnV5Zm51bWV6eHhtdGJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2MDM2MjMsImV4cCI6MjA5NjE3OTYyM30.Y1okrqcxAHOHpXmSseyPfkZDG8dFlPjMyA20NAhzpEI';
  _url text := 'https://project--a27fd5fd-3de2-432b-b267-f05f58afad50.lovable.app/api/public/hooks/outbox-dispatch';
BEGIN
  IF NEW.status = 'pending' THEN
    PERFORM net.http_post(
      url := _url,
      headers := jsonb_build_object('Content-Type','application/json','apikey', _anon_key),
      body := jsonb_build_object('id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER outbox_queue_dispatch_after_insert
  AFTER INSERT ON public.outbox_queue
  FOR EACH ROW EXECUTE FUNCTION public.outbox_queue_notify_dispatch();
