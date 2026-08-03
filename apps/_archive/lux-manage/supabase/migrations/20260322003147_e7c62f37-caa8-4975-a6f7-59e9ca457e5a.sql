-- Create storage bucket for academy videos
INSERT INTO storage.buckets (id, name, public) VALUES ('academy-videos', 'academy-videos', true);

-- Allow authenticated admins to upload
CREATE POLICY "Admins can upload academy videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'academy-videos' AND
  public.has_role(auth.uid(), 'admin')
);

-- Allow anyone to read
CREATE POLICY "Anyone can read academy videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'academy-videos');

-- Allow admins to delete
CREATE POLICY "Admins can delete academy videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'academy-videos' AND
  public.has_role(auth.uid(), 'admin')
);

-- Add video_url and target_topic to academy_content
ALTER TABLE public.academy_content ADD COLUMN IF NOT EXISTS video_url text DEFAULT '';
ALTER TABLE public.academy_content ADD COLUMN IF NOT EXISTS target_topic text DEFAULT 'general';

-- Add category and tip fields to condition_rules
ALTER TABLE public.condition_rules ADD COLUMN IF NOT EXISTS category text DEFAULT 'rights';
ALTER TABLE public.condition_rules ADD COLUMN IF NOT EXISTS tip_content text DEFAULT '';
ALTER TABLE public.condition_rules ADD COLUMN IF NOT EXISTS tip_type text DEFAULT 'alert';