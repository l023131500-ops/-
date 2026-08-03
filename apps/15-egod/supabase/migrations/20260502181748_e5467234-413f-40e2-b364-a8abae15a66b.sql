
-- Allow anon to call has_role (returns false for unauthenticated, no info leak)
GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO anon;

-- Add real FK from portal_messages to profiles for PostgREST relationships
ALTER TABLE public.portal_messages
  ADD CONSTRAINT portal_messages_teacher_id_fkey
  FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Materials table
CREATE TABLE IF NOT EXISTS public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL,
  subcategory text,
  file_url text NOT NULL,
  file_type text,
  file_size bigint,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view approved materials" ON public.materials
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Uploaders manage own materials" ON public.materials
  FOR ALL TO authenticated
  USING (uploader_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (uploader_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins manage all materials" ON public.materials
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE INDEX idx_materials_uploader ON public.materials(uploader_id);
CREATE INDEX idx_materials_status ON public.materials(status);
CREATE INDEX idx_materials_category ON public.materials(category, subcategory);
