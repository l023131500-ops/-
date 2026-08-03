
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table (MUST be separate from profiles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  email TEXT,
  avatar_url TEXT,
  logo_url TEXT,
  city TEXT,
  neighborhood TEXT,
  subjects TEXT[] DEFAULT '{}',
  experience TEXT,
  bio TEXT,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Lessons table
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  city TEXT,
  neighborhood TEXT,
  synagogue_name TEXT,
  language TEXT DEFAULT 'עברית',
  schedule_days TEXT[] DEFAULT '{}',
  schedule_time TEXT,
  schedule_notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Participants table
CREATE TABLE public.participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

-- Attendance table
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES public.participants(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  was_present BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Study schedule (הספק לימודי)
CREATE TABLE public.study_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  topic TEXT NOT NULL,
  pace_type TEXT DEFAULT 'pages',
  pace_amount INTEGER DEFAULT 1,
  start_date DATE NOT NULL,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.study_schedule ENABLE ROW LEVEL SECURITY;

-- Study daily entries (what to learn each day)
CREATE TABLE public.study_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES public.study_schedule(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  content TEXT,
  is_special BOOLEAN DEFAULT false,
  special_type TEXT,
  tasks TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.study_daily ENABLE ROW LEVEL SECURITY;

-- Leads (public requests for lessons)
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  area TEXT,
  preferred_subject TEXT,
  preferred_times TEXT,
  notes TEXT,
  status TEXT DEFAULT 'new',
  assigned_teacher_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Tips
CREATE TABLE public.tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;

-- ===== RLS POLICIES =====

-- user_roles: users can read their own roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- profiles: users manage own, public read for approved
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Public can view approved profiles" ON public.profiles FOR SELECT USING (is_approved = true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- lessons: owners manage, public read active
CREATE POLICY "Teachers can view own lessons" ON public.lessons FOR SELECT USING (
  teacher_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Public can view active lessons" ON public.lessons FOR SELECT USING (is_active = true);
CREATE POLICY "Teachers can insert lessons" ON public.lessons FOR INSERT WITH CHECK (
  teacher_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Teachers can update own lessons" ON public.lessons FOR UPDATE USING (
  teacher_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Teachers can delete own lessons" ON public.lessons FOR DELETE USING (
  teacher_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- participants: lesson owner manages
CREATE POLICY "Teachers can view participants" ON public.participants FOR SELECT USING (
  lesson_id IN (SELECT l.id FROM public.lessons l JOIN public.profiles p ON l.teacher_id = p.id WHERE p.user_id = auth.uid())
);
CREATE POLICY "Teachers can insert participants" ON public.participants FOR INSERT WITH CHECK (
  lesson_id IN (SELECT l.id FROM public.lessons l JOIN public.profiles p ON l.teacher_id = p.id WHERE p.user_id = auth.uid())
);
CREATE POLICY "Teachers can update participants" ON public.participants FOR UPDATE USING (
  lesson_id IN (SELECT l.id FROM public.lessons l JOIN public.profiles p ON l.teacher_id = p.id WHERE p.user_id = auth.uid())
);
CREATE POLICY "Teachers can delete participants" ON public.participants FOR DELETE USING (
  lesson_id IN (SELECT l.id FROM public.lessons l JOIN public.profiles p ON l.teacher_id = p.id WHERE p.user_id = auth.uid())
);

-- attendance: lesson owner manages
CREATE POLICY "Teachers can view attendance" ON public.attendance FOR SELECT USING (
  lesson_id IN (SELECT l.id FROM public.lessons l JOIN public.profiles p ON l.teacher_id = p.id WHERE p.user_id = auth.uid())
);
CREATE POLICY "Teachers can insert attendance" ON public.attendance FOR INSERT WITH CHECK (
  lesson_id IN (SELECT l.id FROM public.lessons l JOIN public.profiles p ON l.teacher_id = p.id WHERE p.user_id = auth.uid())
);
CREATE POLICY "Teachers can update attendance" ON public.attendance FOR UPDATE USING (
  lesson_id IN (SELECT l.id FROM public.lessons l JOIN public.profiles p ON l.teacher_id = p.id WHERE p.user_id = auth.uid())
);

-- study_schedule: lesson owner manages
CREATE POLICY "Teachers can view study schedule" ON public.study_schedule FOR SELECT USING (
  lesson_id IN (SELECT l.id FROM public.lessons l JOIN public.profiles p ON l.teacher_id = p.id WHERE p.user_id = auth.uid())
);
CREATE POLICY "Teachers can insert study schedule" ON public.study_schedule FOR INSERT WITH CHECK (
  lesson_id IN (SELECT l.id FROM public.lessons l JOIN public.profiles p ON l.teacher_id = p.id WHERE p.user_id = auth.uid())
);
CREATE POLICY "Teachers can update study schedule" ON public.study_schedule FOR UPDATE USING (
  lesson_id IN (SELECT l.id FROM public.lessons l JOIN public.profiles p ON l.teacher_id = p.id WHERE p.user_id = auth.uid())
);
CREATE POLICY "Teachers can delete study schedule" ON public.study_schedule FOR DELETE USING (
  lesson_id IN (SELECT l.id FROM public.lessons l JOIN public.profiles p ON l.teacher_id = p.id WHERE p.user_id = auth.uid())
);

-- study_daily: via schedule ownership
CREATE POLICY "Teachers can view study daily" ON public.study_daily FOR SELECT USING (
  schedule_id IN (SELECT s.id FROM public.study_schedule s JOIN public.lessons l ON s.lesson_id = l.id JOIN public.profiles p ON l.teacher_id = p.id WHERE p.user_id = auth.uid())
);
CREATE POLICY "Teachers can insert study daily" ON public.study_daily FOR INSERT WITH CHECK (
  schedule_id IN (SELECT s.id FROM public.study_schedule s JOIN public.lessons l ON s.lesson_id = l.id JOIN public.profiles p ON l.teacher_id = p.id WHERE p.user_id = auth.uid())
);
CREATE POLICY "Teachers can update study daily" ON public.study_daily FOR UPDATE USING (
  schedule_id IN (SELECT s.id FROM public.study_schedule s JOIN public.lessons l ON s.lesson_id = l.id JOIN public.profiles p ON l.teacher_id = p.id WHERE p.user_id = auth.uid())
);

-- leads: anyone can create, authenticated users can read
CREATE POLICY "Anyone can create leads" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can view leads" ON public.leads FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can update leads" ON public.leads FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- tips: everyone can read
CREATE POLICY "Everyone can view active tips" ON public.tips FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage tips" ON public.tips FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ===== TRIGGERS =====

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_study_schedule_updated_at BEFORE UPDATE ON public.study_schedule FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Indexes
CREATE INDEX idx_lessons_teacher_id ON public.lessons(teacher_id);
CREATE INDEX idx_participants_lesson_id ON public.participants(lesson_id);
CREATE INDEX idx_attendance_lesson_date ON public.attendance(lesson_id, date);
CREATE INDEX idx_study_schedule_lesson_id ON public.study_schedule(lesson_id);
CREATE INDEX idx_study_daily_schedule_date ON public.study_daily(schedule_id, date);
CREATE INDEX idx_leads_status ON public.leads(status);
