-- public.knowledge_chunks (vector-embedding knowledge base, likely a Lovable-
-- scaffolded AI feature) exists live but was never captured in this repo's
-- migrations. It had a policy (allow_all_inserts, FOR ALL, USING true, WITH
-- CHECK true) defined but RLS itself was NEVER ENABLED on the table -- in
-- Postgres, a disabled-RLS table ignores its policies entirely and grants
-- full access per the table's plain GRANTs instead, which here included
-- SELECT/INSERT/UPDATE/DELETE/TRUNCATE for anon and authenticated. The anon
-- key ships in every browser bundle, so this table was writable/truncatable
-- by anyone on the internet, unauthenticated. No code in this repo (app
-- source or the chat/search-lessons/ai-match-teacher/api edge functions)
-- reads or writes it -- every real consumer of AI data in this project goes
-- through an edge function using SUPABASE_SERVICE_ROLE_KEY, which bypasses
-- RLS entirely (rolbypassrls=true), so locking this table down to
-- service_role-only changes no working behavior.

create table if not exists public.knowledge_chunks (
  id text primary key,
  knowledge_base_id text not null,
  content text not null,
  embedding vector,
  category text,
  metadata jsonb,
  created_at timestamptz default now()
);

create index if not exists knowledge_chunks_kb_idx on public.knowledge_chunks (knowledge_base_id);
create index if not exists knowledge_chunks_hnsw_idx on public.knowledge_chunks using hnsw (embedding vector_cosine_ops);

alter table public.knowledge_chunks enable row level security;

-- Was FOR ALL / true / true -- with RLS enabled this would still be a full
-- anon/authenticated open door, so it is dropped rather than kept. No
-- known consumer needs anon/authenticated access; service_role (used by
-- every edge function that could plausibly touch this table) bypasses RLS
-- regardless of policies.
drop policy if exists allow_all_inserts on public.knowledge_chunks;
