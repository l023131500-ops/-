
ALTER TABLE public.rights_reference 
ADD COLUMN media_url text,
ADD COLUMN media_type text;

COMMENT ON COLUMN public.rights_reference.media_url IS 'URL to uploaded podcast audio or video file';
COMMENT ON COLUMN public.rights_reference.media_type IS 'Type: audio or video';

-- Create storage bucket for media files
INSERT INTO storage.buckets (id, name, public) VALUES ('rights-media', 'rights-media', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Public can read rights media" ON storage.objects FOR SELECT USING (bucket_id = 'rights-media');

-- Admins can upload
CREATE POLICY "Admins can upload rights media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'rights-media' AND public.has_role(auth.uid(), 'admin'));

-- Admins can delete
CREATE POLICY "Admins can delete rights media" ON storage.objects FOR DELETE USING (bucket_id = 'rights-media' AND public.has_role(auth.uid(), 'admin'));
