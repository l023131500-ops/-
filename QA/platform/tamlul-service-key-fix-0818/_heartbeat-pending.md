Supabase MCP not connected this session (repeated ToolSearch for
execute_sql-style tools returned no matches, no "still connecting" status
either). Pending core.run_progress row to insert when MCP is available:

phase: round-4-functional-fix
task: 02 tamlul - SUPABASE_SERVICE_ROLE_KEY BOM fix + redeploy (commit cac3db1)
status: partial
note: BOM corruption in Vercel env var confirmed and fixed via raw REST API
  (scripts/Set-VercelEnv.ps1 CLI path did NOT actually fix it, contrary to
  its own doc comment - flag for someone to re-verify/fix the script).
  Coupon redemption still broken: cached SUPABASE_SERVICE_ROLE_KEY value
  (shared by apps 01/02/03 .env.local) is invalid against Supabase project
  bieebmnmkffwbqlsfozh directly (401), independent of Vercel. Needs a
  current key from Supabase (Management API or dashboard) to finish -
  logged as follow-up to core.issues #239. Evidence:
  QA/platform/tamlul-service-key-fix-0818/_results.md
