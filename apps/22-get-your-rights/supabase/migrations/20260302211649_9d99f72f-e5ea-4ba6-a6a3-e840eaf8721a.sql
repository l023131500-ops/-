
-- Add detailed fields to leads table
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS id_number text,
  ADD COLUMN IF NOT EXISTS age_exact text,
  ADD COLUMN IF NOT EXISTS spouse_name text,
  ADD COLUMN IF NOT EXISTS spouse_id_number text,
  ADD COLUMN IF NOT EXISTS spouse_health text,
  ADD COLUMN IF NOT EXISTS spouse_employment text,
  ADD COLUMN IF NOT EXISTS children_count integer,
  ADD COLUMN IF NOT EXISTS children_ages text,
  ADD COLUMN IF NOT EXISTS children_health_details text,
  ADD COLUMN IF NOT EXISTS employment_status text,
  ADD COLUMN IF NOT EXISTS disability_percentage text,
  ADD COLUMN IF NOT EXISTS housing_status text,
  ADD COLUMN IF NOT EXISTS eligibility_score text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS admin_notes text;

-- Create rights_reference table for the Excel data
CREATE TABLE IF NOT EXISTS public.rights_reference (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_number integer NOT NULL,
  topic_name text NOT NULL,
  category text NOT NULL,
  handling_body text,
  target_audience text,
  eligibility_criteria text,
  required_documents text,
  service_link text,
  podcast_text text,
  questionnaire jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.rights_reference ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage rights reference"
ON public.rights_reference
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read rights reference"
ON public.rights_reference
FOR SELECT
USING (true);

-- Allow admins to update leads (for notes/scoring)
CREATE POLICY "Admins can update leads"
ON public.leads
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));
