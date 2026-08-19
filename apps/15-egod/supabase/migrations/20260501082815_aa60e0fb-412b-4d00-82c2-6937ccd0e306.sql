
-- Extend lessons table
ALTER TABLE public.lessons 
ADD COLUMN IF NOT EXISTS street text,
ADD COLUMN IF NOT EXISTS street_number text,
ADD COLUMN IF NOT EXISTS target_audience text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS audience_type text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS lesson_style text,
ADD COLUMN IF NOT EXISTS speaking_style text,
ADD COLUMN IF NOT EXISTS rabbi_phone text,
ADD COLUMN IF NOT EXISTS rabbi_role text,
ADD COLUMN IF NOT EXISTS contact_name text,
ADD COLUMN IF NOT EXISTS contact_phone text,
ADD COLUMN IF NOT EXISTS contact_email text,
ADD COLUMN IF NOT EXISTS donation_link text,
ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_recorded boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_live_stream boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS recording_location text,
ADD COLUMN IF NOT EXISTS specific_date date;

-- Extend profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS background text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS teaching_style text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS speaking_style text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS target_audience text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS lesson_locations text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS frequency text,
ADD COLUMN IF NOT EXISTS available_days text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS available_hours text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS payment text,
ADD COLUMN IF NOT EXISTS language text DEFAULT 'עברית',
ADD COLUMN IF NOT EXISTS about_text text,
ADD COLUMN IF NOT EXISTS contact_whatsapp text,
ADD COLUMN IF NOT EXISTS contact_fax text,
ADD COLUMN IF NOT EXISTS contact_mailing_address text,
ADD COLUMN IF NOT EXISTS background_preset text,
ADD COLUMN IF NOT EXISTS font_color text DEFAULT 'light',
ADD COLUMN IF NOT EXISTS rabbi_photo_url text,
ADD COLUMN IF NOT EXISTS custom_background_url text,
ADD COLUMN IF NOT EXISTS custom_sections jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS public_token text DEFAULT encode(gen_random_bytes(16), 'hex'),
ADD COLUMN IF NOT EXISTS donation_link text,
ADD COLUMN IF NOT EXISTS lesson_download_url text,
ADD COLUMN IF NOT EXISTS portal_language text DEFAULT 'עברית';

-- Synagogues table
CREATE TABLE public.synagogues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  name text NOT NULL,
  address text,
  city text,
  neighborhood text,
  phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.synagogues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage own synagogues" ON public.synagogues
  FOR ALL TO authenticated
  USING (teacher_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (teacher_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Public can view synagogues" ON public.synagogues
  FOR SELECT USING (true);

-- Prayer times table
CREATE TABLE public.prayer_times (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  synagogue_id uuid NOT NULL REFERENCES public.synagogues(id) ON DELETE CASCADE,
  prayer_type text NOT NULL,
  day_of_week text NOT NULL DEFAULT 'יומי',
  time text NOT NULL,
  notes text,
  custom_category text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.prayer_times ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage prayer times" ON public.prayer_times
  FOR ALL TO authenticated
  USING (synagogue_id IN (SELECT s.id FROM synagogues s JOIN profiles p ON s.teacher_id = p.id WHERE p.user_id = auth.uid()))
  WITH CHECK (synagogue_id IN (SELECT s.id FROM synagogues s JOIN profiles p ON s.teacher_id = p.id WHERE p.user_id = auth.uid()));

CREATE POLICY "Public can view prayer times" ON public.prayer_times
  FOR SELECT USING (true);

-- Portal messages
CREATE TABLE public.portal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  sender_name text NOT NULL,
  sender_phone text NOT NULL,
  sender_email text,
  message text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.portal_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can send messages" ON public.portal_messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Teachers can view own messages" ON public.portal_messages
  FOR SELECT TO authenticated
  USING (teacher_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Teachers can update own messages" ON public.portal_messages
  FOR UPDATE TO authenticated
  USING (teacher_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Teachers can delete own messages" ON public.portal_messages
  FOR DELETE TO authenticated
  USING (teacher_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all messages" ON public.portal_messages
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Forum categories
CREATE TABLE public.forum_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text DEFAULT 'MessageSquare',
  is_restricted boolean DEFAULT false,
  allowed_subjects text[] DEFAULT '{}',
  sort_order int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view categories" ON public.forum_categories
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories" ON public.forum_categories
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Forum posts
CREATE TABLE public.forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.forum_categories(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  content text NOT NULL,
  is_pinned boolean DEFAULT false,
  is_blocked boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view posts" ON public.forum_posts
  FOR SELECT TO authenticated
  USING (is_blocked = false OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can create posts" ON public.forum_posts
  FOR INSERT TO authenticated
  WITH CHECK (author_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Authors can update own posts" ON public.forum_posts
  FOR UPDATE TO authenticated
  USING (author_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all posts" ON public.forum_posts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Forum comments
CREATE TABLE public.forum_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  content text NOT NULL,
  is_blocked boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view comments" ON public.forum_comments
  FOR SELECT TO authenticated
  USING (is_blocked = false OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can create comments" ON public.forum_comments
  FOR INSERT TO authenticated
  WITH CHECK (author_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all comments" ON public.forum_comments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Portal photos
CREATE TABLE public.portal_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  image_url text NOT NULL,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.portal_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view photos" ON public.portal_photos
  FOR SELECT USING (true);

CREATE POLICY "Teachers can manage own photos" ON public.portal_photos
  FOR ALL TO authenticated
  USING (teacher_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (teacher_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Storage bucket for portal assets
INSERT INTO storage.buckets (id, name, public) VALUES ('portal-assets', 'portal-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view portal assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'portal-assets');

CREATE POLICY "Authenticated can upload portal assets" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'portal-assets');

CREATE POLICY "Authenticated can update portal assets" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'portal-assets');

CREATE POLICY "Authenticated can delete portal assets" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'portal-assets');

-- Seed forum categories
INSERT INTO public.forum_categories (name, description, icon, is_restricted, allowed_subjects, sort_order) VALUES
  ('כללי', 'נושאים כלליים, הודעות, טיפים ורעיונות', 'MessageSquare', false, '{}', 1),
  ('הלכה ומוסר', 'דיונים בנושאי הלכה, מוסר ואגדה', 'BookOpen', false, '{}', 2),
  ('ניהול שיעור', 'טיפים ושיטות להעברת שיעור מוצלח', 'Users', false, '{}', 3),
  ('חיזוק ותמיכה', 'מרחב לשיתוף ולחיזוק הדדי', 'Heart', false, '{}', 4),
  ('חידושי תורה', 'שיתוף חידושים ורעיונות', 'Star', false, '{}', 5),
  ('דף יומי', 'פורום מגידי שיעור הדף היומי', 'BookOpen', true, ARRAY['דף יומי'], 6),
  ('משנה ברורה', 'פורום לומדי משנה ברורה', 'BookOpen', true, ARRAY['משנה ברורה'], 7),
  ('הלכה בעיון', 'פורום לומדי הלכה בעיון', 'BookOpen', true, ARRAY['הלכה בעיון','הלכות פסוקות'], 8),
  ('פרשת שבוע', 'פורום מגידי שיעור פרשת השבוע', 'BookOpen', true, ARRAY['פרשת שבוע','דרשות'], 9),
  ('חסידות וקבלה', 'פורום לומדי חסידות וקבלה', 'BookOpen', true, ARRAY['חסידות','קבלה'], 10);

-- Enable realtime for forum_posts
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_comments;
