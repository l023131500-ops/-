-- Bulk upload sessions table
CREATE TABLE public.bulk_upload_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(12), 'hex'),
  org_name TEXT DEFAULT '',
  contact_phone TEXT DEFAULT '',
  contact_email TEXT DEFAULT '',
  contact_address TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bulk_upload_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read bulk_upload_sessions"
  ON public.bulk_upload_sessions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert bulk_upload_sessions"
  ON public.bulk_upload_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update bulk_upload_sessions"
  ON public.bulk_upload_sessions FOR UPDATE
  USING (true) WITH CHECK (true);

-- Add columns to lessons
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS bulk_session_id UUID,
  ADD COLUMN IF NOT EXISTS is_sent BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_lessons_bulk_session ON public.lessons(bulk_session_id);

-- Allow public delete on lessons that belong to a bulk session and not yet sent
CREATE POLICY "Anyone can delete unsent bulk lessons"
  ON public.lessons FOR DELETE
  USING (bulk_session_id IS NOT NULL AND is_sent = false);

-- Insert one default session
INSERT INTO public.bulk_upload_sessions (token, org_name, contact_phone, contact_email)
VALUES ('main', 'איגוד השיעורים', '', '');