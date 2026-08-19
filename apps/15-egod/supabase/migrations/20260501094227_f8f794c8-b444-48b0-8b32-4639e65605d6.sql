-- Remove the overly permissive policy
DROP POLICY IF EXISTS "Lookup invite by code" ON public.teacher_invites;

-- Secure function to validate an invite (returns only matching, unused invite)
CREATE OR REPLACE FUNCTION public.validate_teacher_invite(_email text, _code text)
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  phone text,
  portal_type text,
  organization_name text,
  initial_password text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, full_name, email, phone, portal_type, organization_name, initial_password
  FROM public.teacher_invites
  WHERE lower(email) = lower(_email)
    AND invite_code = _code
    AND used = false
  LIMIT 1
$$;

-- Mark invite used (called after successful signup)
CREATE OR REPLACE FUNCTION public.mark_invite_used(_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.teacher_invites SET used = true, used_at = now() WHERE id = _id;
$$;

REVOKE ALL ON FUNCTION public.validate_teacher_invite(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.validate_teacher_invite(text, text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_invite_used(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.mark_invite_used(uuid) TO anon, authenticated;
