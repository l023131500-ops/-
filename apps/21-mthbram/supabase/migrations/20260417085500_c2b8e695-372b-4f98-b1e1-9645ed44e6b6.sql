-- Create study_day_sessions table (shareable link sessions)
CREATE TABLE public.study_day_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(12), 'hex'),
  org_name TEXT DEFAULT '',
  contact_phone TEXT DEFAULT '',
  contact_email TEXT DEFAULT '',
  contact_address TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.study_day_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read study_day_sessions"
  ON public.study_day_sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert study_day_sessions"
  ON public.study_day_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update study_day_sessions"
  ON public.study_day_sessions FOR UPDATE USING (true) WITH CHECK (true);

-- Create study_day_events table
CREATE TABLE public.study_day_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.study_day_sessions(id) ON DELETE CASCADE,
  synagogue_name TEXT NOT NULL DEFAULT '',
  logo_url TEXT DEFAULT '',
  donation_link TEXT DEFAULT '',
  contact_name TEXT DEFAULT '',
  contact_phone TEXT DEFAULT '',
  contact_email TEXT DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  street TEXT DEFAULT '',
  street_number TEXT DEFAULT '',
  schedule_type TEXT NOT NULL DEFAULT 'specific_date',
  event_date DATE,
  schedule_days JSONB DEFAULT '[]'::jsonb,
  target_audience TEXT[] DEFAULT '{}',
  lessons JSONB DEFAULT '[]'::jsonb,
  is_sent BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.study_day_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read study_day_events"
  ON public.study_day_events FOR SELECT USING (true);
CREATE POLICY "Anyone can insert study_day_events"
  ON public.study_day_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update study_day_events"
  ON public.study_day_events FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete unsent study_day_events"
  ON public.study_day_events FOR DELETE USING (is_sent = false);

-- Seed default session with token 'main'
INSERT INTO public.study_day_sessions (token, org_name, notes)
VALUES ('main', 'איגוד השיעורים', 'קישור ראשי לפרסום ימי עיון');
