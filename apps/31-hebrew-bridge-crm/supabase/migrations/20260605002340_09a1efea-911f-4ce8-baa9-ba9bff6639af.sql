
-- Enums
CREATE TYPE public.task_status AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high');

-- Tasks
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.client_profiles(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES public.partner_profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  due_date timestamptz,
  status public.task_status NOT NULL DEFAULT 'pending',
  priority public.task_priority NOT NULL DEFAULT 'medium',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_admin_all" ON public.tasks
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "tasks_partner_select" ON public.tasks
  FOR SELECT TO authenticated
  USING (partner_id = auth.uid());

CREATE POLICY "tasks_partner_update" ON public.tasks
  FOR UPDATE TO authenticated
  USING (partner_id = auth.uid())
  WITH CHECK (partner_id = auth.uid());

CREATE TRIGGER tasks_set_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX tasks_client_id_idx ON public.tasks(client_id);
CREATE INDEX tasks_partner_id_idx ON public.tasks(partner_id);
CREATE INDEX tasks_status_idx ON public.tasks(status);

-- Communication logs
CREATE TABLE public.communication_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.client_profiles(id) ON DELETE CASCADE,
  template_type text NOT NULL,
  channel text NOT NULL DEFAULT 'webhook',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'simulated',
  triggered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.communication_logs TO authenticated;
GRANT ALL ON public.communication_logs TO service_role;

ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comm_logs_admin_all" ON public.communication_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "comm_logs_partner_select" ON public.communication_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.partner_assignments pa
    WHERE pa.client_id = communication_logs.client_id
      AND pa.partner_id = auth.uid()
  ));

CREATE INDEX comm_logs_client_id_idx ON public.communication_logs(client_id);
CREATE INDEX comm_logs_created_at_idx ON public.communication_logs(created_at DESC);
