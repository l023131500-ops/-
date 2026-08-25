-- more30 · 36 nadlan-pro — close a real grant hole on np_tabu_document_analysis_save
-- ============================================================================
-- Verification for 0153 found that `revoke all ... from public` does NOT
-- remove EXECUTE for `authenticated`/`anon` on a newly created function in
-- the `public` schema on this project: Supabase's default privileges grant
-- EXECUTE ON FUNCTIONS to anon/authenticated/service_role at CREATE time,
-- and `public` is a separate pseudo-role from those -- revoking from `public`
-- only removes the "everyone" grant, not the three explicit ones already
-- attached by the default-privileges rule. A live rolled-back test proved
-- this concretely: an ordinary authenticated office owner was able to call
-- np_tabu_document_analysis_save directly and forge an analysis result,
-- defeating the "only the service-role Edge Function may write this" design
-- documented in 0153's own comment.
-- ============================================================================

revoke execute on function public.np_tabu_document_analysis_save(jsonb) from authenticated, anon;
