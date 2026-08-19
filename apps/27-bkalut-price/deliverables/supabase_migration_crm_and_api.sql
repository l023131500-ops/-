-- ============================================================
-- bkalut-app: CRM upgrade + automation API + catalog settings
-- Run after the previous deliverables migrations.
-- Idempotent: uses IF NOT EXISTS everywhere.
-- ============================================================

-- ---------- 1. Automation configs: seed rows for new features ----------
INSERT INTO public.automation_configs (key, label, description, enabled, endpoint_url, secret_ref, config_json, last_status, updated_at)
VALUES
  ('automation_api', 'API חיצוני / אוטומציות',
   'טוקן ויכולת לקבוע אם הגישה ל-/api/external/* מצריכה טוקן.',
   1, '', '', '{"requireToken":true,"tokenHash":"","tokenPrefix":""}', 'idle', NOW())
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.automation_configs (key, label, description, enabled, endpoint_url, secret_ref, config_json, last_status, updated_at)
VALUES
  ('catalog_settings', 'הגדרות קטלוג ציבורי',
   'תצוגת כפתורים בעמוד קטלוג הזכויות הציבורי.',
   1, '', '', '{"exactStateSearchEnabled":true}', 'idle', NOW())
ON CONFLICT (key) DO NOTHING;

-- ---------- 2. Financial CRM tables ----------
CREATE TABLE IF NOT EXISTS public.fin_tasks (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  assignee_id BIGINT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fin_tasks_client ON public.fin_tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_fin_tasks_assignee ON public.fin_tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_fin_tasks_status ON public.fin_tasks(status);

CREATE TABLE IF NOT EXISTS public.fin_messages (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL,
  sender_role TEXT NOT NULL,
  sender_name TEXT,
  body TEXT NOT NULL,
  channel TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fin_messages_client ON public.fin_messages(client_id);
CREATE INDEX IF NOT EXISTS idx_fin_messages_unread ON public.fin_messages(client_id) WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS public.fin_documents (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL,
  title TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'other',
  status TEXT NOT NULL DEFAULT 'pending',
  url TEXT,
  storage_key TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  notes TEXT,
  uploaded_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fin_documents_client ON public.fin_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_fin_documents_status ON public.fin_documents(client_id, status);

CREATE TABLE IF NOT EXISTS public.fin_activity_log (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL,
  kind TEXT NOT NULL,
  ref_id BIGINT,
  title TEXT NOT NULL,
  detail TEXT,
  actor_role TEXT,
  actor_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fin_activity_client ON public.fin_activity_log(client_id);
CREATE INDEX IF NOT EXISTS idx_fin_activity_kind ON public.fin_activity_log(kind);

CREATE TABLE IF NOT EXISTS public.fin_reminders (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL,
  related_kind TEXT,
  related_id BIGINT,
  title TEXT NOT NULL,
  body TEXT,
  due_at TIMESTAMPTZ NOT NULL,
  channel TEXT NOT NULL DEFAULT 'internal',
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fin_reminders_client ON public.fin_reminders(client_id);
CREATE INDEX IF NOT EXISTS idx_fin_reminders_due ON public.fin_reminders(due_at) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.fin_reports (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL,
  period_month TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  summary TEXT,
  metrics_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fin_reports_client ON public.fin_reports(client_id);
CREATE INDEX IF NOT EXISTS idx_fin_reports_month ON public.fin_reports(client_id, period_month);

-- ---------- 3. RLS lockdown for new CRM tables ----------
-- All CRM tables follow the existing pattern: enable RLS, no public access.
-- The app reads/writes via service_role from the Express backend.
ALTER TABLE public.fin_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='fin_tasks' AND policyname='service_role_all_fin_tasks'
  ) THEN
    CREATE POLICY service_role_all_fin_tasks ON public.fin_tasks
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='fin_messages' AND policyname='service_role_all_fin_messages') THEN
    CREATE POLICY service_role_all_fin_messages ON public.fin_messages FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='fin_documents' AND policyname='service_role_all_fin_documents') THEN
    CREATE POLICY service_role_all_fin_documents ON public.fin_documents FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='fin_activity_log' AND policyname='service_role_all_fin_activity_log') THEN
    CREATE POLICY service_role_all_fin_activity_log ON public.fin_activity_log FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='fin_reminders' AND policyname='service_role_all_fin_reminders') THEN
    CREATE POLICY service_role_all_fin_reminders ON public.fin_reminders FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='fin_reports' AND policyname='service_role_all_fin_reports') THEN
    CREATE POLICY service_role_all_fin_reports ON public.fin_reports FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ---------- 4. Coach assignment column on fin_clients (idempotent) ----------
ALTER TABLE public.fin_clients ADD COLUMN IF NOT EXISTS coach_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_fin_clients_coach ON public.fin_clients(coach_id);

-- ============================================================
-- Done.
-- ============================================================
