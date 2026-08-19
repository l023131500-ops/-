
-- Add status tracking fields to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS handled_description text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS closed_at timestamp with time zone;

-- Allow admins to delete leads
CREATE POLICY "Admins can delete leads"
ON public.leads
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
