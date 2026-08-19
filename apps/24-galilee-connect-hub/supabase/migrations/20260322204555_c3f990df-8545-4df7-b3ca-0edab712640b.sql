INSERT INTO storage.buckets (id, name, public) VALUES ('site-images', 'site-images', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Site images public read" ON storage.objects FOR SELECT USING (bucket_id = 'site-images');
CREATE POLICY "Site images public upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'site-images');
CREATE POLICY "Site images public delete" ON storage.objects FOR DELETE USING (bucket_id = 'site-images');