-- 18 torah-editor-mvp (Supabase bieebmnmkffwbqlsfozh)
-- ---------------------------------------------------------------------------
-- `/orech/api/htr/jobs` returned 500 with
--   {"error":"permission denied for schema otvedaf"}
--
-- The HTR tables live in a dedicated `otvedaf` schema. 0001_htr_jobs granted
-- USAGE on it to `anon` and `authenticated` — but not to `service_role`, which
-- is the only role the API actually connects as (lib/supabase.ts builds an
-- admin client from SUPABASE_SERVICE_ROLE_KEY precisely to bypass RLS).
-- Measured before this migration:
--   has_schema_privilege('service_role','otvedaf','USAGE')  -> false
--   has_schema_privilege('anon','otvedaf','USAGE')          -> true
--   has_schema_privilege('authenticated','otvedaf','USAGE') -> true
--
-- So every backend read and write against htr_jobs failed, and the whole
-- handwriting module was unreachable regardless of which engine was configured.

grant usage on schema otvedaf to service_role;

grant all privileges on all tables    in schema otvedaf to service_role;
grant all privileges on all sequences in schema otvedaf to service_role;
grant all privileges on all functions in schema otvedaf to service_role;

-- Tables added later must not reintroduce the same gap.
alter default privileges in schema otvedaf
  grant all privileges on tables to service_role;
alter default privileges in schema otvedaf
  grant all privileges on sequences to service_role;

-- Note on anon/authenticated: they keep the USAGE they already had. The client
-- never talks to this schema directly (the page goes through /api), and RLS on
-- htr_jobs still governs what those roles can see, so nothing is widened here.
