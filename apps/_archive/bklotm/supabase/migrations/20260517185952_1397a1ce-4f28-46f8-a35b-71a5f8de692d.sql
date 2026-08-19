-- Add legacy column aliases for backward compatibility with existing admin UI.
ALTER TABLE public.rights_reference
  ADD COLUMN IF NOT EXISTS topic_number integer,
  ADD COLUMN IF NOT EXISTS podcast_text text,
  ADD COLUMN IF NOT EXISTS questionnaire jsonb,
  ADD COLUMN IF NOT EXISTS exact_parameters text,
  ADD COLUMN IF NOT EXISTS details_to_prepare text,
  ADD COLUMN IF NOT EXISTS service_link text,
  ADD COLUMN IF NOT EXISTS physical_form_url text,
  ADD COLUMN IF NOT EXISTS voice_message_text text,
  ADD COLUMN IF NOT EXISTS client_message_template text,
  ADD COLUMN IF NOT EXISTS required_docs_list jsonb,
  ADD COLUMN IF NOT EXISTS qualification_questions jsonb,
  ADD COLUMN IF NOT EXISTS plain_description text,
  ADD COLUMN IF NOT EXISTS economic_necessity integer,
  ADD COLUMN IF NOT EXISTS financial_potential text,
  ADD COLUMN IF NOT EXISTS accompanying_benefit text,
  ADD COLUMN IF NOT EXISTS bureaucratic_pitfalls text;

UPDATE public.rights_reference SET
  topic_number = COALESCE(topic_number, priority_order),
  podcast_text = COALESCE(podcast_text, podcast_long),
  voice_message_text = COALESCE(voice_message_text, voice_short),
  client_message_template = COALESCE(client_message_template, client_email_template),
  questionnaire = COALESCE(questionnaire, eligibility_questions),
  qualification_questions = COALESCE(qualification_questions, personal_questionnaire),
  required_docs_list = COALESCE(required_docs_list, form_documents),
  plain_description = COALESCE(plain_description, public_description),
  exact_parameters = COALESCE(exact_parameters, qualifying_cases),
  details_to_prepare = COALESCE(details_to_prepare, prepare_in_advance),
  service_link = COALESCE(service_link, official_links);

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY priority_order NULLS LAST, category, topic_name) AS rn
  FROM public.rights_reference
)
UPDATE public.rights_reference r
SET topic_number = numbered.rn
FROM numbered
WHERE r.id = numbered.id AND r.topic_number IS NULL;

CREATE INDEX IF NOT EXISTS idx_rights_topic_number ON public.rights_reference(topic_number);