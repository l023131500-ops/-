
-- Daily Halacha table
CREATE TABLE public.daily_halacha (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  hebrew_date text,
  category text NOT NULL DEFAULT 'הלכה יומית',
  is_seasonal boolean DEFAULT false,
  is_active boolean DEFAULT true,
  display_date date DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_halacha ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Halacha public read" ON public.daily_halacha FOR SELECT TO public USING (true);
CREATE POLICY "Halacha writable" ON public.daily_halacha FOR ALL TO public USING (true) WITH CHECK (true);

-- Newsletters table
CREATE TABLE public.newsletters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  pdf_url text NOT NULL,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Newsletters public read" ON public.newsletters FOR SELECT TO public USING (true);
CREATE POLICY "Newsletters writable" ON public.newsletters FOR ALL TO public USING (true) WITH CHECK (true);

-- Mourning/Azkarot requests table
CREATE TABLE public.azkarot_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  deceased_name text NOT NULL,
  request_type text NOT NULL DEFAULT 'azkara',
  date_requested date,
  notes text,
  is_read boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.azkarot_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Azkarot public insert" ON public.azkarot_requests FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Azkarot readable" ON public.azkarot_requests FOR SELECT TO public USING (true);
CREATE POLICY "Azkarot writable" ON public.azkarot_requests FOR ALL TO public USING (true) WITH CHECK (true);

-- Storage bucket for newsletters
INSERT INTO storage.buckets (id, name, public) VALUES ('newsletters', 'newsletters', true);

-- Storage policy for newsletter uploads
CREATE POLICY "Newsletter files public read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'newsletters');
CREATE POLICY "Newsletter files upload" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'newsletters');
CREATE POLICY "Newsletter files delete" ON storage.objects FOR DELETE TO public USING (bucket_id = 'newsletters');

-- Add updated_at trigger to daily_halacha
CREATE TRIGGER update_daily_halacha_updated_at
  BEFORE UPDATE ON public.daily_halacha
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
