-- core.issues #250 — public.synagogues was left with the original wide-open
-- RLS policies ("Anyone can insert/update/delete", USING(true)/WITH CHECK(true))
-- from 20260411233411, while 20260712192546 locked down every other table in
-- the project (including the dependent prayer_times, which FKs to this one)
-- to admin-only writes via has_role(auth.uid(),'admin'). PrayerTimesTab.tsx
-- calls insert/update/delete on synagogues directly, so any anon holding the
-- public anon key could create/edit/delete any org's synagogue row over the
-- Supabase REST API without going through the app at all.
--
-- Fix mirrors the exact "ancillary portal table" pattern from 20260712192546
-- section 6 (prayer_times/org_rabbis/etc): public read stays (PublicPrayerTimes.tsx
-- reads synagogues unauthenticated), writes require has_role admin.

SELECT public._drop_all_policies('synagogues');

CREATE POLICY "Public can read" ON public.synagogues
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage" ON public.synagogues
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
