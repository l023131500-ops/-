
-- Promote known admin email to admin role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'admin@torathaim.org'
ON CONFLICT (user_id, role) DO NOTHING;

-- Allow admin operations also during testing mode (no auth) by permitting anon
DROP POLICY IF EXISTS "Admins manage invites" ON public.teacher_invites;

CREATE POLICY "Admins or testing mode manage invites"
ON public.teacher_invites
FOR ALL
TO authenticated, anon
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR auth.uid() IS NULL
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR auth.uid() IS NULL
);
