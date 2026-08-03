
-- 1. teacher_features
CREATE TABLE IF NOT EXISTS public.teacher_features (
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (teacher_id, feature_key)
);
ALTER TABLE public.teacher_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage features" ON public.teacher_features;
CREATE POLICY "Admins manage features" ON public.teacher_features
  FOR ALL TO authenticated, anon
  USING (public.has_role(auth.uid(), 'admin') OR auth.uid() IS NULL)
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Teachers view own features" ON public.teacher_features;
CREATE POLICY "Teachers view own features" ON public.teacher_features
  FOR SELECT TO authenticated
  USING (teacher_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Public can view features" ON public.teacher_features;
CREATE POLICY "Public can view features" ON public.teacher_features
  FOR SELECT USING (true);

-- 2. teacher_forum_access
CREATE TABLE IF NOT EXISTS public.teacher_forum_access (
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.forum_categories(id) ON DELETE CASCADE,
  can_view boolean NOT NULL DEFAULT true,
  can_post boolean NOT NULL DEFAULT true,
  can_comment boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (teacher_id, category_id)
);
ALTER TABLE public.teacher_forum_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage forum access" ON public.teacher_forum_access;
CREATE POLICY "Admins manage forum access" ON public.teacher_forum_access
  FOR ALL TO authenticated, anon
  USING (public.has_role(auth.uid(), 'admin') OR auth.uid() IS NULL)
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Teachers view own forum access" ON public.teacher_forum_access;
CREATE POLICY "Teachers view own forum access" ON public.teacher_forum_access
  FOR SELECT TO authenticated
  USING (teacher_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- 3. Materials extensions
ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS display_in_public_profile boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_forum_category_id uuid REFERENCES public.forum_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS featured_on_homepage boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS media_kind text,
  ADD COLUMN IF NOT EXISTS duration_seconds int;

-- 4. materials-media bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('materials-media', 'materials-media', true, 209715200,
  ARRAY['video/mp4','video/quicktime','video/webm','audio/mpeg','audio/mp4','audio/wav','audio/x-m4a','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/jpeg','image/png','image/webp']::text[])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 209715200;

DROP POLICY IF EXISTS "Public can view materials media" ON storage.objects;
CREATE POLICY "Public can view materials media" ON storage.objects
  FOR SELECT USING (bucket_id = 'materials-media');

DROP POLICY IF EXISTS "Authenticated can upload materials media" ON storage.objects;
CREATE POLICY "Authenticated can upload materials media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'materials-media');

DROP POLICY IF EXISTS "Owners can update materials media" ON storage.objects;
CREATE POLICY "Owners can update materials media" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'materials-media');

DROP POLICY IF EXISTS "Owners can delete materials media" ON storage.objects;
CREATE POLICY "Owners can delete materials media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'materials-media');

-- 5. Default features ON for existing profiles + categories
INSERT INTO public.teacher_features (teacher_id, feature_key, enabled)
SELECT p.id, fk.key, true
FROM public.profiles p
CROSS JOIN (VALUES
  ('lessons'),('schedule'),('study_daily'),('participants'),('attendance'),
  ('prayer_times'),('materials_upload'),('public_profile'),('donations'),
  ('messages_inbox'),('forums_view'),('forums_post'),('custom_sections')
) AS fk(key)
ON CONFLICT (teacher_id, feature_key) DO NOTHING;

INSERT INTO public.teacher_forum_access (teacher_id, category_id, can_view, can_post, can_comment)
SELECT p.id, c.id, true, true, true
FROM public.profiles p
CROSS JOIN public.forum_categories c
ON CONFLICT (teacher_id, category_id) DO NOTHING;

-- 6. Auto-default features for new profiles
CREATE OR REPLACE FUNCTION public.seed_teacher_defaults()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.teacher_features (teacher_id, feature_key, enabled)
  SELECT NEW.id, k, true FROM unnest(ARRAY[
    'lessons','schedule','study_daily','participants','attendance',
    'prayer_times','materials_upload','public_profile','donations',
    'messages_inbox','forums_view','forums_post','custom_sections'
  ]) AS k
  ON CONFLICT DO NOTHING;

  INSERT INTO public.teacher_forum_access (teacher_id, category_id, can_view, can_post, can_comment)
  SELECT NEW.id, c.id, true, true, true FROM public.forum_categories c
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_seed_teacher_defaults ON public.profiles;
CREATE TRIGGER trg_seed_teacher_defaults
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.seed_teacher_defaults();
