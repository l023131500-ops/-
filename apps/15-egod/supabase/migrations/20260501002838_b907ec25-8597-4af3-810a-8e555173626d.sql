
-- Allow admins to see all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete tips
CREATE POLICY "Admins can delete tips"
ON public.tips
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all participants (for stats)
CREATE POLICY "Admins can view all participants"
ON public.participants
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all lessons
CREATE POLICY "Admins can view all lessons"
ON public.lessons
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update profiles (approve teachers)
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));
