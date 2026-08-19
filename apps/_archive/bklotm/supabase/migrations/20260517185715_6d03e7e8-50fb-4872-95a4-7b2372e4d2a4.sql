
-- Rebuild rights_reference with the new 26-column structure from the upgraded Excel database
DROP TABLE IF EXISTS public.rights_reference CASCADE;

CREATE TABLE public.rights_reference (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  priority_order integer,
  category text NOT NULL,
  subcategory text,
  topic_name text NOT NULL,
  handling_body text,
  target_audience text,
  what_you_get text,
  eligibility_criteria text,
  qualifying_cases text,
  prepare_in_advance text,
  required_documents text,
  how_to_apply text,
  official_links text,
  service_cost text,
  public_description text,
  faq text,
  gold_tip text,
  eligibility_questions jsonb DEFAULT '{}'::jsonb,
  personal_questionnaire jsonb DEFAULT '{}'::jsonb,
  form_documents jsonb DEFAULT '{}'::jsonb,
  podcast_long text,
  voice_short text,
  client_email_template text,
  ai_search_keywords text,
  ai_extra_info text,
  kosher_publication text,
  media_url text,
  media_type text,
  video_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_rights_category ON public.rights_reference(category);
CREATE INDEX idx_rights_subcategory ON public.rights_reference(subcategory);
CREATE INDEX idx_rights_priority ON public.rights_reference(priority_order);

ALTER TABLE public.rights_reference ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read rights reference"
  ON public.rights_reference FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage rights reference"
  ON public.rights_reference FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_rights_reference_updated_at
  BEFORE UPDATE ON public.rights_reference
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update n8n webhook URL to new endpoint
INSERT INTO public.site_settings (key, value)
VALUES ('n8n_webhook_url', 'https://N8N.l023131500.work/webhook/NEDARIM3873')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
