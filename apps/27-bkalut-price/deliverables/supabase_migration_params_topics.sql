-- Migration: admin-only "מאגר פרמטרים ונושאים" knowledge base.
-- Holds extensible parameter / topic entries that admin uses internally for
-- mapping family / economic / health / employment / housing conditions to
-- rights and opportunities. Never exposed to public endpoints.

CREATE TABLE IF NOT EXISTS params_topics (
  id              BIGSERIAL PRIMARY KEY,
  title           TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT '',
  sub_category    TEXT NOT NULL DEFAULT '',
  profile_conditions_json TEXT NOT NULL DEFAULT '[]',
  description     TEXT NOT NULL DEFAULT '',
  tags_json       TEXT NOT NULL DEFAULT '[]',
  priority        INTEGER NOT NULL DEFAULT 50,
  source          TEXT NOT NULL DEFAULT '',
  notes           TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_params_topics_category ON params_topics(category);
CREATE INDEX IF NOT EXISTS idx_params_topics_priority ON params_topics(priority);

ALTER TABLE params_topics ENABLE ROW LEVEL SECURITY;

-- Restrict reads/writes to service_role only (admin server). Adjust policies
-- if your team uses a different role mapping. The app currently uses the
-- service role for all DB access.
CREATE POLICY IF NOT EXISTS params_topics_service_full ON params_topics
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
