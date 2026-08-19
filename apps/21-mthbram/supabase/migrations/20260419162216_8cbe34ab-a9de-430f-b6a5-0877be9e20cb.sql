-- Allow DELETE on tables that need it from admin dashboard
CREATE POLICY "Anyone can delete nedarim_submissions" ON public.nedarim_submissions FOR DELETE USING (true);
CREATE POLICY "Anyone can update teacher_leads" ON public.teacher_leads FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete teacher_leads" ON public.teacher_leads FOR DELETE USING (true);
CREATE POLICY "Anyone can update seeker_leads" ON public.seeker_leads FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete seeker_leads" ON public.seeker_leads FOR DELETE USING (true);
CREATE POLICY "Anyone can update contact_messages" ON public.contact_messages FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete contact_messages" ON public.contact_messages FOR DELETE USING (true);
CREATE POLICY "Anyone can delete rabbi_portals" ON public.rabbi_portals FOR DELETE USING (true);
CREATE POLICY "Anyone can delete org_portals" ON public.org_portals FOR DELETE USING (true);