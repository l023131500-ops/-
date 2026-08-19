
CREATE TABLE public.nedarim_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  raw_data JSONB DEFAULT '{}'::jsonb,
  name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  subject TEXT DEFAULT '',
  city TEXT DEFAULT '',
  submission_type TEXT DEFAULT 'lesson',
  status TEXT DEFAULT 'new',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.nedarim_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read nedarim_submissions" ON public.nedarim_submissions FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert nedarim_submissions" ON public.nedarim_submissions FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update nedarim_submissions" ON public.nedarim_submissions FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE TABLE public.ivr_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_phone TEXT DEFAULT '',
  request_type TEXT DEFAULT 'search',
  input_text TEXT DEFAULT '',
  response_text TEXT DEFAULT '',
  params JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ivr_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ivr_submissions" ON public.ivr_submissions FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert ivr_submissions" ON public.ivr_submissions FOR INSERT TO public WITH CHECK (true);

CREATE TABLE public.ivr_menu_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_tree JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ivr_menu_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ivr_menu_config" ON public.ivr_menu_config FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert ivr_menu_config" ON public.ivr_menu_config FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update ivr_menu_config" ON public.ivr_menu_config FOR UPDATE TO public USING (true) WITH CHECK (true);
