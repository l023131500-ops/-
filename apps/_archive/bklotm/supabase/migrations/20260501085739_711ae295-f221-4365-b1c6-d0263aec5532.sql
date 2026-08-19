ALTER TABLE public.rights_reference
  ADD COLUMN IF NOT EXISTS what_you_get text,
  ADD COLUMN IF NOT EXISTS exact_parameters text,
  ADD COLUMN IF NOT EXISTS details_to_prepare text,
  ADD COLUMN IF NOT EXISTS gold_tip text,
  ADD COLUMN IF NOT EXISTS physical_form_url text,
  ADD COLUMN IF NOT EXISTS voice_message_text text;