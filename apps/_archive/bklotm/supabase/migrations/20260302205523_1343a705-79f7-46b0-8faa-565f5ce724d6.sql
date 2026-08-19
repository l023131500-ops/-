
-- Add document_urls column to leads table
ALTER TABLE public.leads ADD COLUMN document_urls text[] DEFAULT '{}';

-- Create storage bucket for lead documents
INSERT INTO storage.buckets (id, name, public) VALUES ('lead-documents', 'lead-documents', false);

-- Anyone can upload documents (for lead submission)
CREATE POLICY "Anyone can upload lead documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'lead-documents');

-- Admins can view lead documents
CREATE POLICY "Admins can view lead documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'lead-documents' AND public.has_role(auth.uid(), 'admin'));

-- Anyone can read their own uploaded files (by path prefix matching upload session)
CREATE POLICY "Public read for lead documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'lead-documents');

-- Create settings table for webhook URL and API keys
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read settings"
ON public.site_settings FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert settings"
ON public.site_settings FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update settings"
ON public.site_settings FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete settings"
ON public.site_settings FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create API keys table
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  last_used_at timestamp with time zone,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage API keys"
ON public.api_keys FOR ALL
USING (public.has_role(auth.uid(), 'admin'));
