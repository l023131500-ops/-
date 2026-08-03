
CREATE TABLE public.topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  client_subject text NOT NULL,
  client_html_body text NOT NULL,
  notify_partner boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.topics TO authenticated;
GRANT ALL ON public.topics TO service_role;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "topics_admin_all" ON public.topics FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id=auth.uid() AND ur.role='admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id=auth.uid() AND ur.role='admin'));
CREATE POLICY "topics_authenticated_read" ON public.topics FOR SELECT TO authenticated USING (true);
CREATE TRIGGER topics_set_updated_at BEFORE UPDATE ON public.topics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.client_topic_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  is_relevant boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, topic_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_topic_states TO authenticated;
GRANT ALL ON public.client_topic_states TO service_role;
ALTER TABLE public.client_topic_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cts_admin_all" ON public.client_topic_states FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id=auth.uid() AND ur.role='admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id=auth.uid() AND ur.role='admin'));
CREATE TRIGGER cts_set_updated_at BEFORE UPDATE ON public.client_topic_states
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
