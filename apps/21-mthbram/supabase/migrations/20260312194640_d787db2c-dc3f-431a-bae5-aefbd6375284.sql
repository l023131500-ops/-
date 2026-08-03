
INSERT INTO storage.buckets (id, name, public) VALUES ('lesson-logos', 'lesson-logos', true);

CREATE POLICY "Anyone can upload logos" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'lesson-logos');
CREATE POLICY "Anyone can view logos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'lesson-logos');
