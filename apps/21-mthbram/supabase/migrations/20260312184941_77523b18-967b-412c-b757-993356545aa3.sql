
-- Allow public read for all tables (admin dashboard needs to read, no auth yet)
CREATE POLICY "Anyone can read lessons" ON public.lessons FOR SELECT USING (true);
CREATE POLICY "Anyone can read teacher_leads" ON public.teacher_leads FOR SELECT USING (true);
CREATE POLICY "Anyone can read seeker_leads" ON public.seeker_leads FOR SELECT USING (true);
CREATE POLICY "Anyone can read contact_messages" ON public.contact_messages FOR SELECT USING (true);

-- Allow updates on lessons (for admin approve/reject)
CREATE POLICY "Anyone can update lessons" ON public.lessons FOR UPDATE USING (true) WITH CHECK (true);
