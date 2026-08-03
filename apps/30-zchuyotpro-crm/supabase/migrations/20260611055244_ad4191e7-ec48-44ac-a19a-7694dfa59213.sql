
CREATE TABLE public.call_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  call_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_seconds INTEGER,
  direction TEXT CHECK (direction IN ('inbound','outbound')),
  from_number TEXT,
  to_number TEXT,
  transcript TEXT,
  summary TEXT,
  audio_url TEXT,
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX call_transcripts_client_idx ON public.call_transcripts(client_id, call_at DESC);
CREATE INDEX call_transcripts_tenant_idx ON public.call_transcripts(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.call_transcripts TO authenticated;
GRANT ALL ON public.call_transcripts TO service_role;

ALTER TABLE public.call_transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant members manage call transcripts"
ON public.call_transcripts FOR ALL TO authenticated
USING (public.is_tenant_member(tenant_id))
WITH CHECK (public.is_tenant_member(tenant_id));

CREATE POLICY "client sees own call transcripts"
ON public.call_transcripts FOR SELECT TO authenticated
USING (public.is_self_client(client_id));

CREATE TRIGGER call_transcripts_set_updated_at
BEFORE UPDATE ON public.call_transcripts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
