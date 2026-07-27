# Migrate-SupabaseProject.ps1
#
# Copy a Supabase project's schemas AND DATA into a project on your own account,
# then verify the copy before anything is repointed at it.
#
# The guiding rule: this NEVER writes to, alters, or drops anything in the source.
# pg_dump is read-only, the source connection is opened read-only where possible,
# and the script refuses to run if source and target look like the same database.
# The source stays live and serving until you decide to switch over.
#
# WHY NOT "rebuild the schema from the code": several of these projects hold real
# data (rights_reference ~104 rows, price catalogue ~117k products, ~1,137
# recordings, plus payment records). Rebuilding from code yields a correct but
# EMPTY database - repointing a deployment at it turns a working system into a
# blank one. So: copy, verify counts, then switch.
#
# WHAT THE PAT CAN AND CANNOT DO
#   The Supabase Management API (PAT) can create the project and read its API
#   keys - Use-SupabasePat.ps1 does that part. It CANNOT hand out the database
#   password, so the dump/restore step needs two Postgres connection strings that
#   you copy from each dashboard: Settings -> Database -> Connection string (URI).
#
# USAGE
#   $env:SRC_DB_URL = 'postgresql://postgres:<pw>@db.<source-ref>.supabase.co:5432/postgres'
#   $env:DST_DB_URL = 'postgresql://postgres:<pw>@db.<target-ref>.supabase.co:5432/postgres'
#   .\scripts\Migrate-SupabaseProject.ps1 -Schemas public -Label trerolyv-22
#
#   Connection strings are read from the environment on purpose - passing them as
#   arguments would put the database password into your shell history.
#
#   Add -DryRun to dump and report only, restoring nothing.

[CmdletBinding()]
param(
  [string[]]$Schemas = @('public'),
  [Parameter(Mandatory)][string]$Label,
  [string]$OutDir = "$PSScriptRoot\..\_migrate",
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

function Fail($m) { Write-Host "`n[FAIL] $m" -ForegroundColor Red; exit 1 }
function Step($m) { Write-Host "`n=== $m" -ForegroundColor Cyan }
function Ok($m)   { Write-Host "  [ok] $m" -ForegroundColor Green }
function Warn($m) { Write-Host "  [!!] $m" -ForegroundColor Yellow }

# ---------------------------------------------------------------- preflight ---
Step 'Preflight'

foreach ($tool in 'pg_dump', 'pg_restore', 'psql') {
  if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
    Fail @"
$tool is not on PATH. The PostgreSQL client tools are not installed on this machine.

Pick one:
  * PostgreSQL 16 Windows installer - deselect "PostgreSQL Server", keep
    "Command Line Tools": https://www.postgresql.org/download/windows/
    Then add C:\Program Files\PostgreSQL\16\bin to PATH.
  * Or the standalone binaries zip from the same page (no install, just unzip
    and add its \bin to PATH for this session).

The server major version here is Postgres 17, so use client tools >= 16;
an older pg_dump will refuse with a server-version mismatch.
"@
  }
}
Ok 'pg_dump / pg_restore / psql found'

$src = $env:SRC_DB_URL
$dst = $env:DST_DB_URL
if (-not $src) { Fail 'SRC_DB_URL is not set (source connection string).' }
if (-not $DryRun -and -not $dst) { Fail 'DST_DB_URL is not set (target connection string).' }

# Never let a typo point the restore back at the source.
if (-not $DryRun) {
  $srcHost = ([uri]$src).Host
  $dstHost = ([uri]$dst).Host
  if ($srcHost -eq $dstHost) {
    Fail "SRC_DB_URL and DST_DB_URL resolve to the same host ($srcHost). Refusing to restore a database onto itself."
  }
  Ok "source $srcHost  ->  target $dstHost"
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$dumpFile = Join-Path $OutDir "$Label-$stamp.dump"

# --------------------------------------------------------- count the source ---
# Counted BEFORE and compared AFTER. This is the whole point of the exercise:
# a restore that "succeeded" but moved no rows must not look like success.
$countSql = @"
select table_schema || '.' || table_name as t,
       (xpath('/row/c/text()',
              query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name),
                           false, true, '')))[1]::text::bigint as n
from information_schema.tables
where table_type = 'BASE TABLE'
  and table_schema = any('{$($Schemas -join ',')}')
order by 1;
"@

Step 'Row counts at the source (read-only)'
$before = & psql $src -A -F "`t" -t -c $countSql
if ($LASTEXITCODE -ne 0) { Fail 'Could not read the source. Check SRC_DB_URL and that your IP is allowed.' }
$before | ForEach-Object { if ($_ -match '\S') { "  $_" } }
$beforeMap = @{}
$before | ForEach-Object { if ($_ -match '^(\S+)\t(\d+)$') { $beforeMap[$matches[1]] = [int64]$matches[2] } }
Ok "$($beforeMap.Count) tables, $(($beforeMap.Values | Measure-Object -Sum).Sum) rows total"

# ------------------------------------------------------------------- dump ----
Step 'Dump (read-only; the source is never modified)'
$schemaArgs = @(); foreach ($s in $Schemas) { $schemaArgs += @('-n', $s) }
& pg_dump $src --format=custom --no-owner --no-privileges @schemaArgs --file=$dumpFile
if ($LASTEXITCODE -ne 0) { Fail 'pg_dump failed. Nothing was changed anywhere.' }
Ok "wrote $dumpFile ($([math]::Round((Get-Item $dumpFile).Length/1MB,1)) MB)"

if ($DryRun) {
  Warn 'DryRun: stopping before restore. The dump above is a complete, restorable backup.'
  exit 0
}

# ---------------------------------------------------------------- restore ----
# --no-owner / --no-privileges: role names differ between projects.
# Errors are NOT fatal on their own - "already exists" on the bootstrap schema is
# normal - so the row-count comparison below is what actually decides success.
Step 'Restore into the target'
& pg_restore --dbname=$dst --no-owner --no-privileges --disable-triggers --verbose $dumpFile 2>&1 |
  Select-String -Pattern 'error|ERROR' | Select-Object -First 25 | ForEach-Object { Warn $_.Line }
Ok 'restore finished (see any errors above)'

# ----------------------------------------------------------------- verify ----
Step 'Verify: target row counts vs source'
$after = & psql $dst -A -F "`t" -t -c $countSql
$afterMap = @{}
$after | ForEach-Object { if ($_ -match '^(\S+)\t(\d+)$') { $afterMap[$matches[1]] = [int64]$matches[2] } }

$bad = @()
foreach ($t in ($beforeMap.Keys | Sort-Object)) {
  $b = $beforeMap[$t]; $a = if ($afterMap.ContainsKey($t)) { $afterMap[$t] } else { -1 }
  $mark = if ($a -eq $b) { 'ok  ' } else { 'DIFF' }
  if ($a -ne $b) { $bad += "$t (source=$b target=$a)" }
  "  [$mark] {0,-45} {1,8} -> {2,8}" -f $t, $b, $a
}

Write-Host ""
if ($bad.Count -eq 0) {
  Ok "MATCH - every table copied with identical row counts."
  Write-Host @"

The copy is verified. The source is untouched and still serving.
Only now is it safe to repoint a deployment, and only after you have also:
  1. recreated RLS policies and grants (pg_dump carries policies, but confirm),
  2. recreated storage buckets and any Edge Functions (NOT part of a DB dump),
  3. swapped SUPABASE_URL + keys in the Vercel project and redeployed.
Keep the source project alive until the new one has run for a while.
"@ -ForegroundColor Green
} else {
  Warn "MISMATCH in $($bad.Count) table(s):"
  $bad | ForEach-Object { Warn "  $_" }
  Fail 'Do NOT repoint anything. The source is untouched - investigate and re-run.'
}
