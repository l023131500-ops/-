# Use-SupabasePat.ps1
#
# The Supabase Management API steps that a Personal Access Token CAN do, so that
# the moment a PAT exists the whole sequence runs unattended:
#
#   -Action ListProjects   what the token can actually see (run this first)
#   -Action CreateProject  create a project under your org
#   -Action GetKeys        read a project's anon + service_role keys
#   -Action SetAuthUrls    Site URL = https://more30.com, redirects = /**
#   -Action LeadsPolicy    print the safe anon-INSERT / authenticated-SELECT SQL
#
# The PAT is read from $env:SUPABASE_ACCESS_TOKEN and is never printed, never
# written to disk, and never passed as an argument (which would land it in shell
# history). Retrieved keys are printed once, to paste into Vercel - they are not
# saved anywhere by this script.
#
# NOTE: a PAT cannot retrieve the database password, so it cannot do the data
# copy. That is Migrate-SupabaseProject.ps1, which takes connection strings.
#
# USAGE
#   $env:SUPABASE_ACCESS_TOKEN = 'sbp_...'
#   .\scripts\Use-SupabasePat.ps1 -Action ListProjects
#   .\scripts\Use-SupabasePat.ps1 -Action GetKeys -Ref bieebmnmkffwbqlsfozh
#   .\scripts\Use-SupabasePat.ps1 -Action SetAuthUrls -Ref <new-ref>

[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [ValidateSet('ListProjects','CreateProject','GetKeys','SetAuthUrls','LeadsPolicy')]
  [string]$Action,
  [string]$Ref,
  [string]$Name,
  [string]$OrgId  = 'rbwengwuxwujbgsynwcs',
  [string]$Region = 'eu-central-1',
  [string]$SiteUrl = 'https://more30.com',
  [string]$LeadsTable = 'public.kupot_leads'
)

$ErrorActionPreference = 'Stop'
$api = 'https://api.supabase.com/v1'

if ($Action -ne 'LeadsPolicy') {
  $pat = $env:SUPABASE_ACCESS_TOKEN
  if (-not $pat) {
    Write-Host "SUPABASE_ACCESS_TOKEN is not set.`nGet one at https://supabase.com/dashboard/account/tokens, then:`n  `$env:SUPABASE_ACCESS_TOKEN = 'sbp_...'" -ForegroundColor Yellow
    exit 1
  }
  $headers = @{ Authorization = "Bearer $pat"; 'Content-Type' = 'application/json' }
}

function Call($method, $path, $body) {
  $args = @{ Uri = "$api$path"; Method = $method; Headers = $headers; TimeoutSec = 120 }
  if ($body) { $args.Body = ($body | ConvertTo-Json -Depth 10 -Compress) }
  try { Invoke-RestMethod @args }
  catch {
    $code = $_.Exception.Response.StatusCode.value__
    if ($code -eq 401) { throw "401 - the token is invalid or expired." }
    if ($code -eq 403) { throw "403 - the token is valid but has no access to this project. It belongs to a different account or organisation." }
    if ($code -eq 404) { throw "404 - no such project ref ($Ref) on this account." }
    throw "$method $path -> $code"
  }
}

switch ($Action) {

  'ListProjects' {
    $p = Call GET '/projects'
    Write-Host "`nProjects this token can reach:`n" -ForegroundColor Cyan
    $p | ForEach-Object { "  {0,-24} {1,-34} {2,-16} {3}" -f $_.id, $_.name, $_.region, $_.status }
    Write-Host "`nTotal: $($p.Count)" -ForegroundColor Cyan
    Write-Host @"

Cross-check against the refs this monorepo needs:
  bieebmnmkffwbqlsfozh  (01, 02, 03, 18)
  trerolyvxxxxxxxxxxxx  (22)   <- confirm the full ref from the dashboard
  jhbeelzvxxxxxxxxxxxx  (30)
  csjekrvukbdznetsrodj  (06, 12, 17, 27)
Any ref missing from the list above is on another account - that is the account to log into.
"@ -ForegroundColor DarkGray
  }

  'CreateProject' {
    if (-not $Name) { throw 'CreateProject needs -Name.' }
    $pw = -join ((48..57) + (65..90) + (97..122) + (35,37,43,45,61,63,64) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
    $r = Call POST '/projects' @{ name = $Name; organization_id = $OrgId; region = $Region; db_pass = $pw }
    Write-Host "`nCreated: $($r.id)  ($($r.name))" -ForegroundColor Green
    Write-Host "DB password (shown once - store it in your password manager NOW):" -ForegroundColor Yellow
    Write-Host "  $pw"
    Write-Host "`nConnection string for Migrate-SupabaseProject.ps1:" -ForegroundColor Cyan
    Write-Host "  postgresql://postgres:$pw@db.$($r.id).supabase.co:5432/postgres"
    Write-Host "`nProvisioning takes a couple of minutes; wait for status ACTIVE_HEALTHY." -ForegroundColor DarkGray
  }

  'GetKeys' {
    if (-not $Ref) { throw 'GetKeys needs -Ref.' }
    $k = Call GET "/projects/$Ref/api-keys"
    Write-Host "`nAPI keys for $Ref  (paste into Vercel; not stored by this script)`n" -ForegroundColor Cyan
    $k | ForEach-Object { "  {0,-16} {1}" -f $_.name, $_.api_key }
    Write-Host "`n  URL: https://$Ref.supabase.co" -ForegroundColor Cyan
    Write-Host @"

Then, per deployment:
  .\scripts\Set-VercelEnv.ps1 -Project <proj> -Name SUPABASE_URL              -Value https://$Ref.supabase.co
  .\scripts\Set-VercelEnv.ps1 -Project <proj> -Name SUPABASE_SERVICE_ROLE_KEY -Value <service_role>
and redeploy - NEXT_PUBLIC_* / VITE_* values are baked in at build time.
"@ -ForegroundColor DarkGray
  }

  'SetAuthUrls' {
    if (-not $Ref) { throw 'SetAuthUrls needs -Ref.' }
    # This is the other half of the /nihul 401: without more30.com in the allow
    # list, the magic link falls back to the Site URL and the session is created
    # somewhere the admin cannot reach.
    $null = Call PATCH "/projects/$Ref/config/auth" @{
      site_url = $SiteUrl
      uri_allow_list = "$SiteUrl/**,$SiteUrl"
    }
    $c = Call GET "/projects/$Ref/config/auth"
    Write-Host "`nAuth config for $Ref now:" -ForegroundColor Green
    Write-Host "  site_url       = $($c.site_url)"
    Write-Host "  uri_allow_list = $($c.uri_allow_list)"
  }

  'LeadsPolicy' {
    Write-Host @"

Safe policy for the leads table ($LeadsTable): the public form may INSERT,
nobody may read with the anon key, signed-in staff may read.
Run in the owning project's SQL editor.

-- see what exists today before changing anything
select policyname, cmd, roles from pg_policies
where schemaname || '.' || tablename = '$LeadsTable';

alter table $LeadsTable enable row level security;

-- 1. close public reads at BOTH levels (a grant alone still exposes rows)
revoke select on $LeadsTable from anon;
-- drop policyname(s) returned above that allow SELECT to anon:
-- drop policy "<name>" on $LeadsTable;

-- 2. keep the public form working: INSERT only
grant insert on $LeadsTable to anon;
create policy "anon can submit a lead"
  on $LeadsTable for insert to anon with check (true);

-- 3. reading is for signed-in staff only
grant select on $LeadsTable to authenticated;
create policy "authenticated can read leads"
  on $LeadsTable for select to authenticated using (true);

Verify afterwards:
  POST with an empty body  -> 400 (not-null)  = the form still works
  GET with the anon key    -> 401             = reads are closed
"@ -ForegroundColor Cyan
  }
}
