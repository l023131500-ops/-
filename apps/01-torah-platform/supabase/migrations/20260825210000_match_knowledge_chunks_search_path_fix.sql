-- more30 · 01 torah-platform — fix function_search_path_mutable advisor warning
-- ============================================================================
-- public.match_knowledge_chunks(vector, text, integer) (the pgvector similarity
-- lookup backing the knowledge_chunks/RAG table) was defined without
-- `set search_path`, unlike the RLS hardening already applied to
-- knowledge_chunks itself (20260825183100). A mutable search_path lets a
-- caller who can create objects in a schema earlier in their session's
-- search_path shadow the unqualified `knowledge_chunks` table reference
-- inside the function body — not currently reachable by an unprivileged
-- caller here since the table's RLS lockdown already returns zero rows to
-- anon/authenticated, but it is the standing gap the advisor flags and the
-- one-line fix costs nothing.
--
-- ALTER FUNCTION ... SET search_path only attaches a configuration parameter
-- to the function; it does not redefine the body, so behavior is unchanged.
-- ============================================================================

alter function public.match_knowledge_chunks(vector, text, integer)
  set search_path = public, pg_temp;
