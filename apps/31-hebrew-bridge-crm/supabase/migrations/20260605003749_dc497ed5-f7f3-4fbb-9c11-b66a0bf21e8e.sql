
-- ============================================================
-- 1. partner_assignments: hide admin_notes from authenticated
-- ============================================================
REVOKE SELECT ON public.partner_assignments FROM authenticated;
GRANT SELECT (id, client_id, partner_id, treatment_status, partner_feedback_notes, created_at, updated_at)
  ON public.partner_assignments TO authenticated;

-- ============================================================
-- 2. Storage policies for client-documents bucket
-- ============================================================
-- Admins: full access to every file in client-documents
CREATE POLICY "client_docs_admin_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'client-documents' AND private.has_role(auth.uid(), 'admin'));

CREATE POLICY "client_docs_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'client-documents' AND private.has_role(auth.uid(), 'admin'));

-- Partners: read files for clients currently assigned to them
CREATE POLICY "client_docs_partner_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND EXISTS (
      SELECT 1 FROM public.partner_assignments pa
      WHERE pa.partner_id = auth.uid()
        AND pa.client_id::text = (storage.foldername(name))[1]
        AND pa.treatment_status IN ('sent', 'in_progress')
    )
  );

-- ============================================================
-- 3. Global Event Bridge: central event log + triggers
-- ============================================================
CREATE TABLE IF NOT EXISTS public.global_event_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  source_table text NOT NULL,
  source_id uuid NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.global_event_log TO authenticated;
GRANT ALL ON public.global_event_log TO service_role;

ALTER TABLE public.global_event_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "global_event_log_admin_read" ON public.global_event_log
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_global_event_log_created_at
  ON public.global_event_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_global_event_log_source
  ON public.global_event_log (source_table, source_id);

-- Trigger function: emit changes to global_event_log
CREATE OR REPLACE FUNCTION public.emit_global_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _event_type text;
  _source_id uuid;
  _payload jsonb;
BEGIN
  IF TG_TABLE_NAME = 'client_profiles' THEN
    _source_id := COALESCE(NEW.id, OLD.id);
    IF TG_OP = 'INSERT' THEN
      _event_type := 'client_profile_created';
      _payload := jsonb_build_object('payment_status', NEW.payment_status, 'lead_source', NEW.lead_source);
    ELSIF TG_OP = 'UPDATE' THEN
      _event_type := 'client_profile_updated';
      _payload := jsonb_build_object(
        'payment_status_before', OLD.payment_status,
        'payment_status_after', NEW.payment_status,
        'documents_count', jsonb_array_length(COALESCE(NEW.uploaded_documents, '[]'::jsonb))
      );
    END IF;
  ELSIF TG_TABLE_NAME = 'tasks' THEN
    _source_id := COALESCE(NEW.id, OLD.id);
    IF TG_OP = 'INSERT' THEN
      _event_type := 'task_created';
      _payload := jsonb_build_object(
        'client_id', NEW.client_id, 'partner_id', NEW.partner_id,
        'status', NEW.status, 'priority', NEW.priority, 'title', NEW.title
      );
    ELSIF TG_OP = 'UPDATE' THEN
      _event_type := 'task_updated';
      _payload := jsonb_build_object(
        'client_id', NEW.client_id, 'partner_id', NEW.partner_id,
        'status_before', OLD.status, 'status_after', NEW.status,
        'priority_before', OLD.priority, 'priority_after', NEW.priority
      );
    END IF;
  END IF;

  IF _event_type IS NOT NULL THEN
    INSERT INTO public.global_event_log (event_type, source_table, source_id, payload)
    VALUES (_event_type, TG_TABLE_NAME, _source_id, _payload);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_client_profiles_global_event ON public.client_profiles;
CREATE TRIGGER trg_client_profiles_global_event
  AFTER INSERT OR UPDATE ON public.client_profiles
  FOR EACH ROW EXECUTE FUNCTION public.emit_global_event();

DROP TRIGGER IF EXISTS trg_tasks_global_event ON public.tasks;
CREATE TRIGGER trg_tasks_global_event
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.emit_global_event();
