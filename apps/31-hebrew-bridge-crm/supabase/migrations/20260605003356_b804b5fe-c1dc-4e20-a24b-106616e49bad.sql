
-- Tighten profiles UPDATE: post-update row must still belong to the same user
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Self-only guard inside the SECURITY DEFINER helper
CREATE OR REPLACE FUNCTION private.get_user_primary_role(_user_id uuid)
RETURNS public.app_role
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN (
    SELECT role FROM public.user_roles
    WHERE user_id = _user_id
    ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'partner' THEN 2 ELSE 3 END
    LIMIT 1
  );
END;
$$;
