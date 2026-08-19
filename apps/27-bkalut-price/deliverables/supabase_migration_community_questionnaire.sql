-- Migration: Community Gabbai Questionnaire module ("שאלוני גבאי קהילות").
--
-- Adds the `community_*` tables used by the admin /#/community-questionnaires
-- area and the public /#/community/:slug pages. Submissions are dispatched on
-- the shared webhook bus with payload source `community_gabbai_questionnaire`.
--
-- This module is fully separate from the rights database and financial CRM.
-- Safe to run multiple times — uses IF NOT EXISTS everywhere.

CREATE TABLE IF NOT EXISTS community_questionnaires (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  intro_text TEXT,
  success_text TEXT,
  collect_contact INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS community_questions (
  id BIGSERIAL PRIMARY KEY,
  questionnaire_id BIGINT NOT NULL,
  label TEXT NOT NULL,
  help_text TEXT,
  type TEXT NOT NULL DEFAULT 'text',
  required INTEGER NOT NULL DEFAULT 0,
  options_json TEXT NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS community_questionnaire_links (
  id BIGSERIAL PRIMARY KEY,
  questionnaire_id BIGINT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  label TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS community_questionnaire_submissions (
  id BIGSERIAL PRIMARY KEY,
  questionnaire_id BIGINT NOT NULL,
  link_id BIGINT,
  slug TEXT,
  answers_json TEXT NOT NULL DEFAULT '{}',
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  community_name TEXT,
  webhook_status TEXT NOT NULL DEFAULT 'pending',
  webhook_log_id INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS community_questions_q_idx ON community_questions (questionnaire_id);
CREATE INDEX IF NOT EXISTS community_links_q_idx ON community_questionnaire_links (questionnaire_id);
CREATE INDEX IF NOT EXISTS community_subs_q_idx ON community_questionnaire_submissions (questionnaire_id);
