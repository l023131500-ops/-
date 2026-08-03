
-- Synagogues table
CREATE TABLE public.synagogues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  name text NOT NULL,
  address text DEFAULT '',
  city text DEFAULT '',
  neighborhood text DEFAULT '',
  phone text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.synagogues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read synagogues" ON public.synagogues FOR SELECT USING (true);
CREATE POLICY "Anyone can insert synagogues" ON public.synagogues FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update synagogues" ON public.synagogues FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete synagogues" ON public.synagogues FOR DELETE USING (true);

-- Prayer times table
CREATE TABLE public.prayer_times (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  synagogue_id uuid NOT NULL REFERENCES public.synagogues(id) ON DELETE CASCADE,
  prayer_type text NOT NULL DEFAULT 'שחרית',
  day_of_week text DEFAULT '',
  time text NOT NULL DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prayer_times ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read prayer_times" ON public.prayer_times FOR SELECT USING (true);
CREATE POLICY "Anyone can insert prayer_times" ON public.prayer_times FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update prayer_times" ON public.prayer_times FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete prayer_times" ON public.prayer_times FOR DELETE USING (true);
