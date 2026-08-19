-- Add portal_type to profiles to support different portal kinds
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS portal_type text NOT NULL DEFAULT 'rabbi',
  ADD COLUMN IF NOT EXISTS organization_name text,
  ADD COLUMN IF NOT EXISTS years_teaching integer,
  ADD COLUMN IF NOT EXISTS preferred_age_groups text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS street text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb;

-- portal_type allowed values via trigger
CREATE OR REPLACE FUNCTION public.validate_portal_type()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.portal_type NOT IN ('rabbi', 'organization', 'synagogue') THEN
    RAISE EXCEPTION 'Invalid portal_type: %', NEW.portal_type;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_portal_type_trigger ON public.profiles;
CREATE TRIGGER validate_portal_type_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_portal_type();

-- Pending teacher invites table for admin approval flow with admin-set password
CREATE TABLE IF NOT EXISTS public.teacher_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  portal_type text NOT NULL DEFAULT 'rabbi',
  organization_name text,
  notes text,
  invite_code text NOT NULL DEFAULT encode(gen_random_bytes(8), 'hex'),
  initial_password text NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz
);

ALTER TABLE public.teacher_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage invites"
  ON public.teacher_invites
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Lookup invite by code+email (used by signup screen) - public read scoped by exact match
CREATE POLICY "Lookup invite by code"
  ON public.teacher_invites
  FOR SELECT
  TO anon, authenticated
  USING (used = false);
