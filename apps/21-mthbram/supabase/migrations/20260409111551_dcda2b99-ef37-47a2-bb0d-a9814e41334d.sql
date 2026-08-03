
-- Rabbi portals - each rabbi gets a unique token link
CREATE TABLE public.rabbi_portals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rabbi_name TEXT NOT NULL,
  access_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex') UNIQUE,
  logo_url TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Organization portals - each org gets a unique token link
CREATE TABLE public.org_portals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_name TEXT NOT NULL,
  access_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex') UNIQUE,
  logo_url TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Link table: which rabbis belong to which org
CREATE TABLE public.org_rabbis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.org_portals(id) ON DELETE CASCADE,
  rabbi_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add org_name column to lessons for filtering
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS org_name TEXT DEFAULT '';

-- RLS for rabbi_portals
ALTER TABLE public.rabbi_portals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read rabbi_portals" ON public.rabbi_portals FOR SELECT USING (true);
CREATE POLICY "Anyone can insert rabbi_portals" ON public.rabbi_portals FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update rabbi_portals" ON public.rabbi_portals FOR UPDATE USING (true) WITH CHECK (true);

-- RLS for org_portals
ALTER TABLE public.org_portals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read org_portals" ON public.org_portals FOR SELECT USING (true);
CREATE POLICY "Anyone can insert org_portals" ON public.org_portals FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update org_portals" ON public.org_portals FOR UPDATE USING (true) WITH CHECK (true);

-- RLS for org_rabbis
ALTER TABLE public.org_rabbis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read org_rabbis" ON public.org_rabbis FOR SELECT USING (true);
CREATE POLICY "Anyone can insert org_rabbis" ON public.org_rabbis FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update org_rabbis" ON public.org_rabbis FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete org_rabbis" ON public.org_rabbis FOR DELETE USING (true);
