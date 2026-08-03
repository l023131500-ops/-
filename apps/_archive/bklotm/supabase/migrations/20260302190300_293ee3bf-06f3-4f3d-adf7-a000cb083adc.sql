-- Allow reading leads (for admin dashboard - no auth yet)
CREATE POLICY "Anyone can read leads"
ON public.leads
FOR SELECT
TO anon, authenticated
USING (true);