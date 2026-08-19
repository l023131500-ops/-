
-- Add columns to rabbi_portals
ALTER TABLE public.rabbi_portals
  ADD COLUMN IF NOT EXISTS background_preset text DEFAULT '',
  ADD COLUMN IF NOT EXISTS custom_background_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS rabbi_photo_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS about_text text DEFAULT '',
  ADD COLUMN IF NOT EXISTS features_enabled jsonb DEFAULT '{"settings": false, "lessons": true}'::jsonb,
  ADD COLUMN IF NOT EXISTS public_token text UNIQUE DEFAULT encode(extensions.gen_random_bytes(16), 'hex');

-- Add columns to org_portals
ALTER TABLE public.org_portals
  ADD COLUMN IF NOT EXISTS background_preset text DEFAULT '',
  ADD COLUMN IF NOT EXISTS custom_background_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS about_text text DEFAULT '',
  ADD COLUMN IF NOT EXISTS features_enabled jsonb DEFAULT '{"settings": false, "lessons": true}'::jsonb,
  ADD COLUMN IF NOT EXISTS public_token text UNIQUE DEFAULT encode(extensions.gen_random_bytes(16), 'hex');

-- Create portal_photos table
CREATE TABLE public.portal_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_type text NOT NULL CHECK (portal_type IN ('rabbi', 'org')),
  portal_id uuid NOT NULL,
  image_url text NOT NULL DEFAULT '',
  caption text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read portal_photos" ON public.portal_photos FOR SELECT USING (true);
CREATE POLICY "Anyone can insert portal_photos" ON public.portal_photos FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update portal_photos" ON public.portal_photos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete portal_photos" ON public.portal_photos FOR DELETE USING (true);

-- Create portal_messages table
CREATE TABLE public.portal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_type text NOT NULL CHECK (portal_type IN ('rabbi', 'org')),
  portal_id uuid NOT NULL,
  sender_name text NOT NULL DEFAULT '',
  sender_phone text NOT NULL DEFAULT '',
  message text DEFAULT '',
  status text DEFAULT 'new',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read portal_messages" ON public.portal_messages FOR SELECT USING (true);
CREATE POLICY "Anyone can insert portal_messages" ON public.portal_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update portal_messages" ON public.portal_messages FOR UPDATE USING (true) WITH CHECK (true);

-- Create storage bucket for portal assets
INSERT INTO storage.buckets (id, name, public) VALUES ('portal-assets', 'portal-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view portal assets" ON storage.objects FOR SELECT USING (bucket_id = 'portal-assets');
CREATE POLICY "Anyone can upload portal assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'portal-assets');
CREATE POLICY "Anyone can update portal assets" ON storage.objects FOR UPDATE USING (bucket_id = 'portal-assets') WITH CHECK (bucket_id = 'portal-assets');
CREATE POLICY "Anyone can delete portal assets" ON storage.objects FOR DELETE USING (bucket_id = 'portal-assets');
