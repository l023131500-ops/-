
CREATE TABLE public.benefit_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  benefit_key text NOT NULL,
  status text NOT NULL DEFAULT 'not_started',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, benefit_key)
);

ALTER TABLE public.benefit_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own benefit statuses"
  ON public.benefit_statuses FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all benefit statuses"
  ON public.benefit_statuses FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.benefit_statuses;
