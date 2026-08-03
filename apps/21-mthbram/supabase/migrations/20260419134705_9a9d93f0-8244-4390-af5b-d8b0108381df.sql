-- Allow deletion of any lesson (admin actions are protected at the application layer)
DROP POLICY IF EXISTS "Anyone can delete unsent bulk lessons" ON public.lessons;

CREATE POLICY "Anyone can delete lessons"
ON public.lessons FOR DELETE
USING (true);

-- Same for study_day_events to allow admin cleanup
DROP POLICY IF EXISTS "Anyone can delete unsent study_day_events" ON public.study_day_events;

CREATE POLICY "Anyone can delete study_day_events"
ON public.study_day_events FOR DELETE
USING (true);