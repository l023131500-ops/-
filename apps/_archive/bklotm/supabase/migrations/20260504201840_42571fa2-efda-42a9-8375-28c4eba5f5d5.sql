
ALTER TABLE public.rights_reference
  ADD COLUMN IF NOT EXISTS client_message_template text,
  ADD COLUMN IF NOT EXISTS required_docs_list jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS qualification_questions jsonb DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.client_intake_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  right_id uuid REFERENCES public.rights_reference(id) ON DELETE CASCADE,
  right_topic_name text,
  client_email text NOT NULL,
  client_name text,
  client_phone text,
  browser_fingerprint text,
  answers jsonb DEFAULT '[]'::jsonb,
  uploaded_documents jsonb DEFAULT '[]'::jsonb,
  qualification_score text DEFAULT 'pending',
  status text DEFAULT 'pending',
  is_complete boolean DEFAULT false,
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS client_intake_email_right_idx
  ON public.client_intake_submissions (client_email, right_id);

ALTER TABLE public.client_intake_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert intake"
  ON public.client_intake_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update intake"
  ON public.client_intake_submissions FOR UPDATE
  TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can read intake by id"
  ON public.client_intake_submissions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can delete intake"
  ON public.client_intake_submissions FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_client_intake_updated_at
  BEFORE UPDATE ON public.client_intake_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public)
  VALUES ('client-intake-docs', 'client-intake-docs', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can upload intake docs"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'client-intake-docs');

CREATE POLICY "Anyone can read intake docs"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'client-intake-docs');

CREATE POLICY "Admins can delete intake docs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'client-intake-docs' AND public.has_role(auth.uid(), 'admin'));
