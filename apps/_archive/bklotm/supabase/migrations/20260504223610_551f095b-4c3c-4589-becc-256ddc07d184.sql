
-- 1. Make the auto-admin grant work for both gmail variants (case-insensitive)
CREATE OR REPLACE FUNCTION public.auto_grant_admin_for_known_emails()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) IN ('023131500@gmail.com', 'l023131500@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Grant admin now to any existing user with one of those emails
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE lower(email) IN ('023131500@gmail.com', 'l023131500@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Premium client flag on intake submissions, plus admin notes index by email
ALTER TABLE public.client_intake_submissions
  ADD COLUMN IF NOT EXISTS is_premium_client boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS client_intake_email_idx
  ON public.client_intake_submissions (lower(client_email));
