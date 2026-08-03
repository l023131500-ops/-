-- Health-funds podcast columns (additive, idempotent).
-- Adds narration script + generated-audio metadata to hf_topics.
-- Does NOT modify or remove any existing column or data.

ALTER TABLE IF EXISTS public.hf_topics
  ADD COLUMN IF NOT EXISTS podcast_script     TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS podcast_audio_url  TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS podcast_status     TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS podcast_updated_at TEXT;
