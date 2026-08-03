
-- Lessons table with all required fields
CREATE TABLE public.lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Location
  city TEXT NOT NULL DEFAULT '',
  neighborhood TEXT DEFAULT '',
  street TEXT DEFAULT '',
  street_number TEXT DEFAULT '',
  synagogue_name TEXT DEFAULT '',
  
  -- Lesson details
  language TEXT NOT NULL DEFAULT 'עברית',
  target_audience TEXT[] DEFAULT '{}', -- נשים, גברים, ילדים, נוער
  audience_type TEXT[] DEFAULT '{}', -- בעלי בתים, בוגרי ישיבות, חסידים, בני תורה, חוזרי בתשובה, מקובלים
  subject TEXT NOT NULL DEFAULT '',
  lesson_style TEXT DEFAULT '',
  
  -- Rabbi info
  rabbi_name TEXT NOT NULL DEFAULT '',
  rabbi_role TEXT DEFAULT '',
  rabbi_phone TEXT DEFAULT '',
  
  -- Schedule
  is_recurring BOOLEAN DEFAULT false,
  specific_date DATE,
  schedule_days JSONB DEFAULT '[]', -- [{day: "ראשון", time: "19:00"}]
  schedule_notes TEXT DEFAULT '',
  
  -- Media
  is_recorded BOOLEAN DEFAULT false,
  recording_location TEXT DEFAULT '',
  is_live_stream BOOLEAN DEFAULT false,
  logo_url TEXT DEFAULT '',
  
  -- Contact
  contact_name TEXT DEFAULT '',
  contact_phone TEXT DEFAULT '',
  contact_email TEXT DEFAULT '',
  donation_link TEXT DEFAULT '',
  
  -- Admin
  is_approved BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitter_notes TEXT DEFAULT ''
);

-- Teacher leads table
CREATE TABLE public.teacher_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  city TEXT DEFAULT '',
  subjects TEXT[] DEFAULT '{}',
  experience TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'active', 'rejected'))
);

-- Seeker leads table
CREATE TABLE public.seeker_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  contact_name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  lesson_type TEXT DEFAULT '', -- שיעור קבוע, חוג בית, אזכרה, חברותא
  city TEXT DEFAULT '',
  subject TEXT DEFAULT '',
  audience_type TEXT DEFAULT '',
  preferred_time TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'matched', 'rejected'))
);

-- Contact messages table
CREATE TABLE public.contact_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  role TEXT DEFAULT '',
  subject TEXT DEFAULT '',
  message TEXT DEFAULT '',
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied'))
);

-- Enable RLS
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seeker_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Public read for approved lessons
CREATE POLICY "Anyone can view approved lessons" ON public.lessons
  FOR SELECT USING (is_approved = true);

-- Anyone can insert lessons (public form)
CREATE POLICY "Anyone can submit lessons" ON public.lessons
  FOR INSERT WITH CHECK (true);

-- Anyone can submit leads
CREATE POLICY "Anyone can submit teacher leads" ON public.teacher_leads
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can submit seeker leads" ON public.seeker_leads
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can submit contact messages" ON public.contact_messages
  FOR INSERT WITH CHECK (true);
