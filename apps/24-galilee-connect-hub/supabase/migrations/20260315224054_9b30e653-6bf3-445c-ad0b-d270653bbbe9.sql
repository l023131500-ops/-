
-- =============================================
-- SYNAGOGUES TABLE
-- =============================================
CREATE TABLE public.synagogues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  nusach TEXT NOT NULL,
  rabbi TEXT,
  address TEXT NOT NULL,
  logo_url TEXT,
  background_preset INTEGER DEFAULT 1,
  donation_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Gabbaim (contacts per synagogue)
CREATE TABLE public.synagogue_gabbaim (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  synagogue_id UUID NOT NULL REFERENCES public.synagogues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Prayer times per synagogue
CREATE TABLE public.synagogue_prayer_times (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  synagogue_id UUID NOT NULL REFERENCES public.synagogues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  time TEXT NOT NULL,
  day TEXT NOT NULL CHECK (day IN ('weekday', 'shabbat', 'holiday')),
  no_minyan BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Lessons/classes per synagogue
CREATE TABLE public.synagogue_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  synagogue_id UUID NOT NULL REFERENCES public.synagogues(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  teacher TEXT NOT NULL,
  day TEXT NOT NULL,
  time TEXT NOT NULL,
  audience TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Announcements per synagogue
CREATE TABLE public.synagogue_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  synagogue_id UUID NOT NULL REFERENCES public.synagogues(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- KASHRUT ESTABLISHMENTS
-- =============================================
CREATE TABLE public.kashrut_establishments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  kashrut_level TEXT NOT NULL CHECK (kashrut_level IN ('mehadrin', 'regular')),
  certifying_body TEXT,
  mashgiach_name TEXT,
  mashgiach_phone TEXT,
  opening_hours TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- MIKVAOT
-- =============================================
CREATE TABLE public.mikvaot (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('men', 'women')),
  address TEXT NOT NULL,
  phone TEXT,
  manager_name TEXT,
  manager_phone TEXT,
  rabbi_tahara_name TEXT,
  rabbi_tahara_phone TEXT,
  opening_hours TEXT,
  bride_groom_counselor_name TEXT,
  bride_groom_counselor_phone TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- GABAI ACCOUNTS (password-based, no Supabase Auth)
-- =============================================
CREATE TABLE public.gabai_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  synagogue_id UUID REFERENCES public.synagogues(id) ON DELETE SET NULL,
  is_admin BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- COMMUNITY LEADS / CONTACT FORMS
-- =============================================
CREATE TABLE public.community_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  message TEXT NOT NULL,
  lead_type TEXT NOT NULL CHECK (lead_type IN ('general', 'synagogue', 'rabbi_question', 'gabbai_support')),
  synagogue_id UUID REFERENCES public.synagogues(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- AD BANNERS WITH SCHEDULING
-- =============================================
CREATE TABLE public.ad_banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link TEXT,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- RLS POLICIES
-- =============================================
ALTER TABLE public.synagogues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Synagogues are publicly readable" ON public.synagogues FOR SELECT USING (true);
CREATE POLICY "Synagogues writable via service role" ON public.synagogues FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.synagogue_gabbaim ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gabbaim contacts public read" ON public.synagogue_gabbaim FOR SELECT USING (true);
CREATE POLICY "Gabbaim contacts writable" ON public.synagogue_gabbaim FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.synagogue_prayer_times ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Prayer times public read" ON public.synagogue_prayer_times FOR SELECT USING (true);
CREATE POLICY "Prayer times writable" ON public.synagogue_prayer_times FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.synagogue_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lessons public read" ON public.synagogue_lessons FOR SELECT USING (true);
CREATE POLICY "Lessons writable" ON public.synagogue_lessons FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.synagogue_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Announcements public read" ON public.synagogue_announcements FOR SELECT USING (true);
CREATE POLICY "Announcements writable" ON public.synagogue_announcements FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.kashrut_establishments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Kashrut public read" ON public.kashrut_establishments FOR SELECT USING (true);
CREATE POLICY "Kashrut writable" ON public.kashrut_establishments FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.mikvaot ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mikvaot public read" ON public.mikvaot FOR SELECT USING (true);
CREATE POLICY "Mikvaot writable" ON public.mikvaot FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.gabai_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gabai accounts writable" ON public.gabai_accounts FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.community_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leads public insert" ON public.community_leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Leads readable" ON public.community_leads FOR SELECT USING (true);
CREATE POLICY "Leads writable" ON public.community_leads FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.ad_banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Banners public read" ON public.ad_banners FOR SELECT USING (true);
CREATE POLICY "Banners writable" ON public.ad_banners FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_prayer_times_synagogue ON public.synagogue_prayer_times(synagogue_id);
CREATE INDEX idx_lessons_synagogue ON public.synagogue_lessons(synagogue_id);
CREATE INDEX idx_gabbaim_synagogue ON public.synagogue_gabbaim(synagogue_id);
CREATE INDEX idx_announcements_synagogue ON public.synagogue_announcements(synagogue_id);
CREATE INDEX idx_kashrut_level ON public.kashrut_establishments(kashrut_level);
CREATE INDEX idx_mikvaot_type ON public.mikvaot(type);
CREATE INDEX idx_leads_type ON public.community_leads(lead_type);
CREATE INDEX idx_banners_dates ON public.ad_banners(start_date, end_date);
CREATE INDEX idx_gabai_synagogue ON public.gabai_accounts(synagogue_id);

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_synagogues_updated_at BEFORE UPDATE ON public.synagogues FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_kashrut_updated_at BEFORE UPDATE ON public.kashrut_establishments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mikvaot_updated_at BEFORE UPDATE ON public.mikvaot FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_gabai_updated_at BEFORE UPDATE ON public.gabai_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
