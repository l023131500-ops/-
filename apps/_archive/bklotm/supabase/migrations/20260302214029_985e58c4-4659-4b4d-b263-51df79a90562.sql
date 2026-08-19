
-- Add new detailed fields to rights_reference for 12-parameter system
ALTER TABLE public.rights_reference
  ADD COLUMN IF NOT EXISTS plain_description text,
  ADD COLUMN IF NOT EXISTS economic_necessity integer,
  ADD COLUMN IF NOT EXISTS financial_potential text,
  ADD COLUMN IF NOT EXISTS accompanying_benefit text,
  ADD COLUMN IF NOT EXISTS bureaucratic_pitfalls text,
  ADD COLUMN IF NOT EXISTS how_to_apply text;
