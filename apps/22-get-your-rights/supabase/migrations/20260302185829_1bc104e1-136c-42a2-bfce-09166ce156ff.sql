-- Create leads table for all form submissions
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  service_type TEXT,
  name TEXT,
  phone TEXT,
  gender TEXT,
  marital_status TEXT,
  children TEXT,
  health_status TEXT,
  economic_status TEXT,
  description TEXT,
  category TEXT,
  selected_right TEXT,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert leads"
ON public.leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);