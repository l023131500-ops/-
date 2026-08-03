-- Documents library (forms & appendices)
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  subcategory TEXT,
  title TEXT NOT NULL,
  description TEXT,
  doc_type TEXT NOT NULL DEFAULT 'form', -- 'form' | 'appendix'
  pdf_url TEXT,
  video_url TEXT,
  audio_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published documents"
ON public.documents FOR SELECT
USING (is_published = true);

CREATE POLICY "Admins can read all documents"
ON public.documents FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert documents"
ON public.documents FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update documents"
ON public.documents FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete documents"
ON public.documents FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_documents_published ON public.documents(is_published, category, subcategory, display_order);

-- Tips
CREATE TABLE public.tips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT,
  video_url TEXT,
  audio_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published tips"
ON public.tips FOR SELECT
USING (is_published = true);

CREATE POLICY "Admins can read all tips"
ON public.tips FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert tips"
ON public.tips FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update tips"
ON public.tips FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete tips"
ON public.tips FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_tips_updated_at
BEFORE UPDATE ON public.tips
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_tips_published ON public.tips(is_published, category, display_order);

-- Public storage bucket for downloadable resources
INSERT INTO storage.buckets (id, name, public)
VALUES ('public-resources', 'public-resources', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public can read public-resources"
ON storage.objects FOR SELECT
USING (bucket_id = 'public-resources');

CREATE POLICY "Admins can upload to public-resources"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'public-resources' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update public-resources"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'public-resources' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete public-resources"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'public-resources' AND public.has_role(auth.uid(), 'admin'));